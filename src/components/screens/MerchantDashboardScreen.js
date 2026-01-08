import MerchantService from "../../services/merchant.service";
import StorageService from "../../services/storage.service";
import LocationManager from "../../managers/location-manager";
import state from "../../managers/state-manager";
import AuthService from "../../services/auth.service.js";

export default class MerchantDashboardScreen {
    constructor(container, { merchantId }) {
        this.container = container;
        this.merchantId = merchantId;
        this.state = {
            merchant: null,
            products: [],
            loading: true,
            error: null,
            isUploading: false,
            uploadMessage: ''
        };
        this.submitBound = false;
        this.isAddingProduct = false;
        this.mount();
    }

    mount() {
        if (!this.merchantId) {
            this._setState({ loading: false, error: 'No merchant ID provided.' });
            return;
        }
        this.render();
        this.fetchData();
    }

    _setState(partialState) {
        this.state = { ...this.state, ...partialState };
        this.render();
    }

    render() {
        this.container.innerHTML = this.template();
        this.bindEvents();
    }

    bindEvents() {
        // Bind click events (rebind each render since DOM is replaced)
        this.container.addEventListener('click', async (e) => {
            const target = e.target;

            // Back link
            if (target.id === 'back-link') {
                state.setState({ screen: 'gateway' });
                window.location.hash = '#';
            }
            // Logout
            if (target.id === 'btn-logout' || target.id === 'btn-logout-products') {
                await AuthService.logout();
                state.setState({ screen: 'gateway' });
                window.location.hash = '#';
            }

            // Upload slots for product images
            const uploadSlot = e.target.closest('[id^="upload-slot-"]');
            if (uploadSlot) {
                const index = uploadSlot.id.split('-').pop();
                this.handleUploadSlotClick(e, index);
            }

            // Remove image buttons
            for (let i = 0; i < 4; i++) {
                if (target.id === `remove-${i}`) {
                    this.removeImagePreview(i);
                    break;
                }
            }

            // Open product picker modal for landing page
            if (target.id === 'create-landing-page-btn') {
                this.openLpModal();
            }

            // Close landing page modal
            if (target.id === 'close-lp-modal' || e.target.closest('#landing-page-modal') && !e.target.closest('.modal-content')) {
                this.closeLpModal();
            }

            // Select product for landing page
            const lpProductItem = target.closest('.lp-product-item');
            if (lpProductItem) {
                const productId = lpProductItem.dataset.productId;
                this.closeLpModal();
                state.setState({ screen: 'landing-page-editor', productId, merchantId: this.merchantId });
            }

            // Delete product
            const deleteBtn = target.closest('.delete-product-btn');
            if (deleteBtn) {
                const productId = deleteBtn.dataset.productId;
                this.handleDeleteProduct(productId);
            }
        });

        // Bind submit only once to prevent duplicates
        if (!this.submitBound) {
            this.container.addEventListener('submit', async (e) => {
                // Add new product
                if (e.target.id === 'add-product-form') {
                    e.preventDefault();
                    this.handleAddProduct(e.target);
                }
            });
            this.submitBound = true;
        }

        // Bind change events (rebind each render) - handle file selection immediately
        this.container.addEventListener('change', (e) => {
            const target = e.target;

            // Multiple image uploads for new product - trigger immediately on first file selection
            for (let i = 0; i < 4; i++) {
                if (target.id === `prod-image-${i}` && target.files && target.files[0]) {
                    e.stopPropagation();
                    this.handleImagePreview(target.files[0], i);
                    break;
                }
            }

            // Uploads
            if (target.id === 'logo-input' && target.files && target.files[0]) this.handleFileUpload(target.files[0], 'logo');
            if (target.id === 'background-input' && target.files && target.files[0]) this.handleFileUpload(target.files[0], 'background');
            if (target.classList.contains('product-image-input') && target.files && target.files[0]) {
                const productId = target.dataset.productId;
                this.handleFileUpload(target.files[0], 'product', productId);
            }
        }, true); // Use capture phase for immediate handling
    }

    async fetchData() {
        this._setState({ loading: true });
        try {
            // RLS will ensure only the owner or an admin can fetch this data.
            const [merchant, products] = await Promise.all([
                MerchantService.getMerchantById(this.merchantId),
                MerchantService.getProductsByMerchantId(this.merchantId)
            ]);

            if (!merchant) {
                throw new Error('Merchant not found or you do not have permission to view it.');
            }

            this._setState({ merchant, products, loading: false, error: null });
        } catch (err) {
            console.error('Failed to fetch merchant data:', err);
            this._setState({ loading: false, error: 'Access Denied. You may not have permission to view this page.' });
        }
    }

    async handleAddProduct(form) {
        if (this.isAddingProduct) return;

        const name = form.querySelector('#prod-name').value;
        const price = form.querySelector('#prod-price').value;

        if (!name || !price) {
            state.showToast('Please fill in product name and price.', 'error');
            return;
        }

        // Collect all uploaded images
        const imageUrls = [];
        for (let i = 0; i < 4; i++) {
            const fileInput = form.querySelector(`#prod-image-${i}`);
            if (fileInput && fileInput.files[0]) {
                this._setUploading(true, `Uploading image ${i + 1}...`);
                try {
                    const imageUrl = await StorageService.uploadImage(fileInput.files[0], `products/${this.merchantId}`);
                    imageUrls.push(imageUrl);
                } catch (err) {
                    console.error(`Failed to upload image ${i + 1}:`, err);
                    // Continue with other images even if one fails
                }
            }
        }

        if (imageUrls.length === 0) {
            state.showToast('Please upload at least one product image.', 'error');
            return;
        }

        this.isAddingProduct = true;
        this._setUploading(true, 'Adding product...');
        try {
            await MerchantService.addProduct({
                merchant_id: this.merchantId,
                name,
                price: parseFloat(price),
                image_urls: imageUrls
            });
            state.showToast('Product added successfully!', 'success');
            form.reset();

            // Clear all image previews
            for (let i = 0; i < 4; i++) {
                this.removeImagePreview(i);
            }

            await this.fetchData();
        } catch (err) {
            state.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this._setUploading(false);
            this.isAddingProduct = false;
        }
    }

    handleDeleteProduct(productId) {
        state.showConfirm({
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This cannot be undone.',
            onConfirm: async () => {
                this._setUploading(true, 'Deleting product...');
                try {
                    await MerchantService.deleteProduct(productId);
                    state.showToast('Product deleted.', 'success');
                    await this.fetchData(); // Refresh list
                } catch (err) {
                    state.showToast(`Error: ${err.message}`, 'error');
                } finally {
                    this._setUploading(false);
                }
            }
        });
    }

    handleImagePreview(file, index) {
        const uploadSlot = this.container.querySelector(`#upload-slot-${index}`);
        const uploadIcon = this.container.querySelector(`#upload-icon-${index}`);
        const uploadText = this.container.querySelector(`#upload-text-${index}`);
        const previewImage = this.container.querySelector(`#preview-${index}`);
        const removeButton = this.container.querySelector(`#remove-${index}`);

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                uploadSlot.classList.add('border-morroky-blue');
                uploadIcon.classList.add('hidden');
                uploadText.classList.add('hidden');
                previewImage.classList.remove('hidden');
                removeButton.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    removeImagePreview(index) {
        const uploadSlot = this.container.querySelector(`#upload-slot-${index}`);
        const uploadIcon = this.container.querySelector(`#upload-icon-${index}`);
        const uploadText = this.container.querySelector(`#upload-text-${index}`);
        const previewImage = this.container.querySelector(`#preview-${index}`);
        const removeButton = this.container.querySelector(`#remove-${index}`);
        const fileInput = this.container.querySelector(`#prod-image-${index}`);

        // Reset the file input
        fileInput.value = '';

        // Reset UI
        uploadSlot.classList.remove('border-morroky-blue');
        uploadIcon.classList.remove('hidden');
        uploadText.classList.remove('hidden');
        previewImage.classList.add('hidden');
        removeButton.classList.add('hidden');
        previewImage.src = '';
    }

    async handleFileUpload(file, type, entityId = null) {
        if (!file) return;

        this._setUploading(true, `Uploading ${type}...\``);
        try {
            const path = type === 'product' ? `products/${this.merchantId}` : type;
            const url = await StorageService.uploadImage(file, path);

            switch (type) {
                case 'logo':
                    await MerchantService.updateMerchantLogo(this.merchantId, url);
                    break;
                case 'background':
                    await MerchantService.updateMerchantBackground(this.merchantId, url);
                    break;
                case 'product':
                    await MerchantService.updateProductImage(entityId, url);
                    break;
            }
            state.showToast(`${type} updated successfully!`, 'success');
            await this.fetchData();
        } catch (err) {
            state.showToast(`Upload failed: ${err.message}`, 'error');
        } finally {
            this._setUploading(false);
        }
    }

    _setUploading(isUploading, uploadMessage = '') {
        this._setState({ isUploading, uploadMessage });
    }

    handleUploadSlotClick(e, index) {
        // Prevent the click from triggering any other event listeners, like on the input itself
        e.preventDefault();
        e.stopPropagation();

        const fileInput = this.container.querySelector(`#prod-image-${index}`);
        if (fileInput) {
            // Programmatically click the hidden file input
            fileInput.click();
        }
    }

    openLpModal() {
        const modal = this.container.querySelector('#landing-page-modal');
        if(modal) modal.classList.remove('hidden');
    }

    closeLpModal() {
        const modal = this.container.querySelector('#landing-page-modal');
        if(modal) modal.classList.add('hidden');
    }

    template() {
        if (this.state.loading) return `<div class="p-12 text-center text-gray-500">جاري تحميل لوحة التحكم...</div>`;
        
        if (this.state.error) {
             return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 bg-white rounded-3xl shadow-xl max-w-md">
                        <h2 class="text-2xl font-black text-red-600 mb-4">تم رفض الوصول</h2>
                        <p class="text-gray-600 mb-6">ليس لديك صلاحية لعرض هذه الصفحة. يرجى تسجيل الدخول بحساب صحيح.</p>
                        <button id="btn-logout" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة وتسجيل الدخول</button>
                    </div>
                </div>
            `;
        }

        const { merchant: m, products } = this.state;

        return `
            <div class="min-h-screen bg-gray-50 p-6 rtl relative">
                ${this.state.isUploading ? `
                    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div class="bg-white p-6 rounded-2xl flex flex-col items-center">
                            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-morroky-blue mb-4"></div>
                            <p class="font-bold">${this.state.uploadMessage}</p>
                        </div>
                    </div>
                ` : ''}

                <div id="landing-page-modal" class="fixed inset-0 bg-black/60 z-[101] hidden flex items-center justify-center p-4">
                    <div class="modal-content bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-slide-up">
                       <div class="p-8">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-bold text-gray-900">اختر منتج للصفحة المقصودة</h2>
                                <button id="close-lp-modal" class="text-gray-400 hover:text-morroky-red text-2xl">&times;</button>
                            </div>
                            <div class="max-h-[60vh] overflow-y-auto space-y-3">
                                ${products.length > 0 ? products.map(p => `
                                    <div class="lp-product-item flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-morroky-blue hover:bg-blue-50 transition cursor-pointer" data-product-id="${p.id}">
                                        <div class="flex items-center gap-4">
                                            <img src="${(p.image_urls && p.image_urls[0]) || p.image_url || 'https://placehold.co/100x100'}" class="w-16 h-16 rounded-lg object-cover" />
                                            <div>
                                                <h3 class="font-bold text-gray-800">${p.name}</h3>
                                                <p class="text-sm text-morroky-green font-bold">${p.price} درهم</p>
                                            </div>
                                        </div>
                                        <button class="text-blue-600 font-bold text-sm">تخصيص</button>
                                    </div>
                                `).join('') : '<p class="text-center text-gray-500 py-8">يجب إضافة منتجات أولاً.</p>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="max-w-4xl mx-auto">
                     <header class="mb-8 flex justify-between items-center">
                        <div>
                            <h1 class="text-3xl font-black text-gray-900">إدارة: ${m.name}</h1>
                        </div>
                        <a href="javascript:void(0)" id="back-link" class="text-blue-600 font-bold hover:underline">العودة إلى الرئيسية</a>
                    </header>

                    <!-- Main Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Left Column: Branding -->
                        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
                            <h2 class="text-xl font-bold mb-4">العلامة التجارية</h2>
                            <div class="flex flex-col items-center">
                                <div class="w-32 h-32 rounded-full bg-gray-100 overflow-hidden mb-4 border-4 border-white shadow-lg relative group">
                                    <img src="${m.logo_url || 'https://placehold.co/200x200'}" class="w-full h-full object-cover" />
                                    <label class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-white font-bold text-xs">
                                        تغيير
                                        <input type="file" id="logo-input" accept="image/*" class="hidden" />
                                    </label>
                                </div>
                                <div class="w-full h-32 rounded-xl bg-white overflow-hidden mb-4 border-4 border-white shadow-lg relative group">
                                     <div class="absolute inset-0 opacity-10" style="background-image: url('${m.background_url || ''}'); background-size: cover; background-position: center;"></div>
                                     <label class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-white font-bold text-sm z-20">
                                        تغيير الخلفية
                                        <input type="file" id="background-input" accept="image/*" class="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Products -->
                        <div class="md:col-span-2 space-y-8">
                            <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 class="text-xl font-bold mb-4">إضافة منتج جديد</h2>
                                <form id="add-product-form" class="space-y-4">
                                    <!-- Form fields -->
                                     <input type="text" id="prod-name" class="w-full p-3 bg-gray-50 rounded-xl border" placeholder="اسم المنتج" required />
                                     <input type="number" id="prod-price" class="w-full p-3 bg-gray-50 rounded-xl border" placeholder="السعر (درهم)" required />

                                     <!-- Multiple Image Upload Grid -->
                                     <div class="space-y-2">
                                         <label class="block text-sm font-medium text-gray-700">صور المنتج (حتى 4 صور)</label>
                                         <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                             ${[0, 1, 2, 3].map(index => `
                                                 <div class="relative">
                                                     <div id="upload-slot-${index}" class="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-morroky-blue transition-colors bg-white p-2 relative">
                                                         <div id="upload-icon-${index}" class="text-gray-400 group-hover:text-morroky-blue pointer-events-none">
                                                             <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                                             </svg>
                                                         </div>
                                                         <span id="upload-text-${index}" class="text-xs text-gray-500 mt-1 pointer-events-none">إضافة صورة</span>
                                                     </div>
                                                     <input type="file" id="prod-image-${index}" accept="image/*" class="hidden" />
                                                     <img id="preview-${index}" class="hidden absolute inset-0 w-full h-full object-cover rounded-lg z-10" />
                                                     <button type="button" id="remove-${index}" class="hidden absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 z-10">×</button>
                                                 </div>
                                             `).join('')}
                                         </div>
                                     </div>

                                    <button type="submit" class="w-full bg-morroky-blue text-white font-bold py-3 rounded-xl">+ إضافة منتج</button>
                                </form>
                            </div>

                            <div>
                                <div class="flex justify-between items-center mb-4">
                                    <h2 class="text-xl font-bold">منتجاتي (${products.length})</h2>
                                    <button id="btn-logout-products" class="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600">تسجيل الخروج</button>
                                </div>
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    ${products.map(p => `
                                        <div class="bg-white rounded-2xl overflow-hidden border group relative">
                                            <img src="${(p.image_urls && p.image_urls[0]) || p.image_url || 'https://placehold.co/300x300'}" class="h-32 w-full object-cover" />
                                             <div class="p-3">
                                                <h3 class="font-bold text-sm truncate">${p.name}</h3>
                                                <p class="text-morroky-green font-bold text-sm">${p.price} DH</p>
                                                <button data-product-id="${p.id}" class="delete-product-btn absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100">🗑️</button>
                                                <label class="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer">
                                                    📷
                                                    <input type="file" data-product-id="${p.id}" class="product-image-input hidden" accept="image/*" />
                                                </label>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
