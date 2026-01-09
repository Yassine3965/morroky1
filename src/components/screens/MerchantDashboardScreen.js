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
            suppliers: [],
            loading: true,
            error: null,
            isUploading: false,
            uploadMessage: '',
            currentTab: 'overview', // 'overview', 'products', 'suppliers'
            selectedSupplier: null,
            showAddModal: false,
            currentModal: null,
            editProductId: null
        };
        this.submitBound = false;
        this.isAddingProduct = false;

        // ربط حدث زر الرجوع في المتصفح
        window.onpopstate = () => this.handleBrowserBack();

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

    // دالة للتعامل مع زر الرجوع في المتصفح (Chrome Back Button)
    handleBrowserBack() {
        const editModal = document.getElementById('edit-product-modal');
        const lpModal = document.getElementById('landing-page-modal');

        // إذا كانت أي نافذة مفتوحة، نقوم بإغلاقها فقط
        if (editModal && !editModal.classList.contains('hidden')) {
            this.closeEditModal(false); // false لكي لا نغير الـ history مجدداً
        } else if (lpModal && !lpModal.classList.contains('hidden')) {
            this.closeLpModal(false);
        }
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

            // Edit product
            const editBtn = target.closest('.edit-product-btn');
            if (editBtn) {
                const productId = editBtn.dataset.productId;
                this.openEditModal(productId);
            }

            // Delete product
            const deleteBtn = target.closest('.delete-product-btn');
            if (deleteBtn) {
                const productId = deleteBtn.dataset.productId;
                this.handleDeleteProduct(productId);
            }

            // Close edit modal
            if (target.id === 'close-edit-modal' || (target.id === 'cancel-edit-btn' && e.target.closest('#edit-product-modal'))) {
                this.closeEditModal();
            }

            // Tab switching
            if (target.closest('.nav-tab')) {
                const tab = target.closest('.nav-tab').dataset.tab;
                this.setActiveTab(tab);
            }

            // Modal close
            if (target.id === 'close-modal' || (target.id === 'modal-overlay' && !target.closest('.modal-content'))) {
                this.closeModal();
            }

            // View store as customer
            if (target.id === 'view-store-btn') {
                this.viewStoreAsCustomer();
            }

            // Close add modal
            if (target.id === 'close-add-modal' || (target.closest('.fixed') && !target.closest('.modal-content') && this.state.showAddModal)) {
                this.toggleAddModal(false);
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
                // Edit product
                if (e.target.id === 'edit-product-form') {
                    e.preventDefault();
                    this.handleEditProduct(e.target);
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
                    e.stopImmediatePropagation();
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

            // Mock suppliers data for now
            const suppliers = [
                {
                    id: 's1',
                    name: "مصنع فاس للجلود والنسيج",
                    location: "فاس، المغرب",
                    verified: true,
                    category: "منسوجات",
                    items: [
                        { name: "قفطان حرير مطرز", retail: 1200, wholesale: 750, min: 5, img: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=300" },
                        { name: "بلغة فاسية أصيلة", retail: 250, wholesale: 110, min: 20, img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300" }
                    ]
                },
                {
                    id: 's2',
                    name: "ورشة مراكش للخزف التقليدي",
                    location: "مراكش، المغرب",
                    verified: true,
                    category: "خزف",
                    items: [
                        { name: "طبق زليج كبير", retail: 180, wholesale: 95, min: 10, img: "https://images.unsplash.com/photo-1534073737927-85f1dfa1913c?w=300" },
                        { name: "إناء ماء تقليدي", retail: 320, wholesale: 180, min: 8, img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300" }
                    ]
                }
            ];

            this._setState({ merchant, products, suppliers, loading: false, error: null });
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

        if (file && uploadSlot && uploadIcon && uploadText && previewImage && removeButton) {
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
        e.stopImmediatePropagation();

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

    openEditModal(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        // تحديث الرابط برمجياً ليعرف المتصفح أننا في خطوة جديدة
        window.history.pushState({ action: 'edit' }, '', `${window.location.hash}/edit-${productId}`);

        const modal = this.container.querySelector('#edit-product-modal');
        const form = this.container.querySelector('#edit-product-form');
        const productIdInput = this.container.querySelector('#edit-product-id');
        const nameInput = this.container.querySelector('#edit-product-name');
        const priceInput = this.container.querySelector('#edit-product-price');
        const descriptionInput = this.container.querySelector('#edit-product-description');

        // Fill form with current product data
        productIdInput.value = product.id;
        nameInput.value = product.name;
        priceInput.value = product.price;
        descriptionInput.value = product.description || '';

        // Show modal
        modal.classList.remove('hidden');
    }

    closeEditModal(shouldGoBack = true) {
        const modal = this.container.querySelector('#edit-product-modal');
        if(modal) modal.classList.add('hidden');

        // إذا أغلقنا النافذة يدوياً، نعود خطوة للخلف في تاريخ المتصفح
        if (shouldGoBack && window.location.hash.includes('/edit-')) {
            window.history.back();
        }
    }

    viewStoreAsCustomer() {
        // Generate store URL based on merchant ID or name
        // For now, we'll use a simple URL structure: /store/{merchantId}
        const storeUrl = `${window.location.origin}/#/merchant/${this.merchantId}`;

        // Open in new window/tab
        window.open(storeUrl, '_blank', 'noopener,noreferrer');
    }

    async handleEditProduct(form) {
        const productId = form.querySelector('#edit-product-id').value;
        const name = form.querySelector('#edit-product-name').value;
        const price = form.querySelector('#edit-product-price').value;
        const description = form.querySelector('#edit-product-description').value;

        if (!name || !price) {
            state.showToast('Please fill in product name and price.', 'error');
            return;
        }

        this._setUploading(true, 'Updating product...');
        try {
            await MerchantService.updateProduct(productId, {
                name,
                price: parseFloat(price),
                description
            });
            state.showToast('Product updated successfully!', 'success');
            this.closeEditModal();
            await this.fetchData(); // Refresh list
        } catch (err) {
            state.showToast(`Error: ${err.message}`, 'error');
        } finally {
            this._setUploading(false);
        }
    }

    setActiveTab(tab) {
        this._setState({ activeTab: tab });
    }

    openModal(type, data = null) {
        window.history.pushState({modal: type}, '', `#${type}`);
        this._setState({ currentModal: type, editProductId: data?.productId });
    }

    closeModal(goBack = true) {
        this._setState({ currentModal: null, editProductId: null });
        if (goBack) window.history.back();
    }

    renderOverview() {
        const { merchant, products } = this.state;
        const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
        const totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.sales_count || 0)), 0);

        return `
            <div class="animate-fade-in space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="glass-card p-8 rounded-[2rem] border-r-4 border-r-blue-600">
                        <p class="text-gray-500 font-bold text-sm mb-2">إجمالي المبيعات</p>
                        <h3 class="text-3xl font-black">${totalRevenue.toFixed(2)} <span class="text-sm font-medium">درهم</span></h3>
                        <div class="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-bold">
                            <span>+12%</span> 📈 منذ الشهر الماضي
                        </div>
                    </div>
                    <div class="glass-card p-8 rounded-[2rem] border-r-4 border-r-purple-600">
                        <p class="text-gray-500 font-bold text-sm mb-2">عدد الطلبات</p>
                        <h3 class="text-3xl font-black">${totalSales}</h3>
                        <div class="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-bold">
                            <span>+5%</span> 📦 أداء مستقر
                        </div>
                    </div>
                    <div class="glass-card p-8 rounded-[2rem] border-r-4 border-r-amber-500">
                        <p class="text-gray-500 font-bold text-sm mb-2">زوار المتجر</p>
                        <h3 class="text-3xl font-black">3.2k</h3>
                        <div class="mt-4 flex items-center gap-2 text-blue-500 text-sm font-bold">
                            <span>جديد</span> ✨ نمو في التفاعل
                        </div>
                    </div>
                </div>

                <div class="bg-white p-8 rounded-[2.5rem] border border-gray-100 min-h-[300px] flex items-center justify-center flex-col text-gray-400">
                    <div class="text-5xl mb-4">📊</div>
                    <p class="font-bold">مخطط البيانات سيظهر هنا عند توفر بيانات كافية</p>
                </div>
            </div>
        `;
    }

    renderProducts() {
        const { products } = this.state;

        return `
            <div class="animate-fade-in">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <h2 class="text-4xl font-black text-gray-900 mb-2">إدارة المخزون</h2>
                        <p class="text-gray-500">لديك <span class="text-blue-600 font-bold">${products.length}</span> منتجات معروضة حالياً</p>
                    </div>
                    <button onclick="app.openModal('add-product')" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                        <span class="text-xl">+</span> إضافة منتج جديد
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${products.map(p => `
                        <div class="product-card bg-white rounded-[2.5rem] overflow-hidden border border-gray-50 relative group transition-all duration-500 hover:shadow-2xl">
                            <div class="relative h-64 overflow-hidden">
                                <img src="${(p.image_urls && p.image_urls[0]) || p.image_url || 'https://placehold.co/400x400'}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold ${p.status === 'نشط' ? 'text-emerald-600' : 'text-amber-600'}">
                                    ● ${p.status || 'نشط'}
                                </div>
                                <!-- Quick Actions Overlay -->
                                <div class="action-overlay absolute inset-0 bg-black/20 backdrop-blur-sm opacity-0 flex items-center justify-center gap-3 transition-all duration-300 translate-y-4">
                                    <button onclick="app.openModal('edit-product', { productId: '${p.id}' })" class="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-lg">✏️</button>
                                    <button onclick="app.handleDeleteProduct('${p.id}')" class="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg">🗑️</button>
                                </div>
                            </div>
                            <div class="p-8">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">${p.category || 'أزياء'}</span>
                                    <span class="text-xs font-bold text-gray-400">${p.sales_count || 0} مبيعة</span>
                                </div>
                                <h3 class="font-bold text-lg text-gray-800 mb-3 truncate">${p.name}</h3>
                                <div class="flex justify-between items-center">
                                    <p class="text-2xl font-black text-gray-900">${p.price} <span class="text-xs font-medium text-gray-400">درهم</span></p>
                                    <button class="text-gray-300 hover:text-blue-600 transition-colors">•••</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSettings() {
        const { merchant } = this.state;

        return `
            <div class="animate-fade-in max-w-3xl mx-auto space-y-8">
                <section class="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 class="text-2xl font-black mb-8">الهوية البصرية</h3>
                    <div class="space-y-8">
                        <div class="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2rem] p-10 bg-gray-50 group hover:border-blue-200 transition-all">
                            <img src="${merchant.logo_url || 'https://placehold.co/200x200'}" class="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 group-hover:scale-105 transition-transform" />
                            <label class="text-blue-600 font-bold text-sm cursor-pointer">
                                تغيير شعار المتجر
                                <input type="file" id="logo-input" accept="image/*" class="hidden" />
                            </label>
                        </div>
                        <div class="space-y-4">
                            <label class="block font-bold text-gray-700">خلفية المتجر (Banner)</label>
                            <div class="h-48 rounded-[2rem] overflow-hidden relative group">
                                <img src="${merchant.background_url || 'https://placehold.co/1200x400'}" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer text-white font-bold">
                                    <label class="cursor-pointer">
                                        رفع صورة جديدة
                                        <input type="file" id="background-input" accept="image/*" class="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 class="text-2xl font-black mb-8">معلومات التواصل</h3>
                    <form id="settings-form" class="grid gap-6">
                        <input type="text" id="merchant-name" value="${merchant.name}" class="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border-none font-bold" />
                        <input type="text" id="merchant-whatsapp" placeholder="رابط الواتساب" value="${merchant.whatsapp_link || ''}" class="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border-none font-bold" />
                        <button type="submit" class="bg-black text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all">حفظ الإعدادات</button>
                    </form>
                </section>
            </div>
        `;
    }

    renderModal() {
        const { currentModal, editProductId, products } = this.state;

        if (currentModal === 'add-product') {
            return `
                <div id="modal-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101] flex items-center justify-center p-4">
                    <div class="modal-content bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div class="p-8">
                            <div class="flex justify-between items-center mb-8">
                                <h3 class="text-2xl font-black">إضافة منتج جديد</h3>
                                <button id="close-modal" class="text-gray-300 hover:text-red-500 text-3xl">&times;</button>
                            </div>
                            <form id="add-product-form" class="space-y-4">
                                <input type="text" id="prod-name" placeholder="اسم المنتج الفاخر" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
                                <div class="grid grid-cols-2 gap-4">
                                    <input type="number" id="prod-price" placeholder="السعر" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
                                    <select id="prod-category" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-500">
                                        <option value="أزياء">أزياء</option>
                                        <option value="ديكور">ديكور</option>
                                    </select>
                                </div>
                                <textarea placeholder="وصف موجز للمنتج..." id="prod-description" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 h-32"></textarea>

                                <!-- Image Upload Grid -->
                                <div class="space-y-2">
                                    <label class="block text-sm font-medium text-gray-700">صور المنتج (حتى 4 صور)</label>
                                    <div class="grid grid-cols-2 gap-4">
                                        ${[0, 1, 2, 3].map(index => `
                                            <div class="relative">
                                                <div id="upload-slot-${index}" class="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 transition-colors bg-white p-2 relative">
                                                    <div id="upload-icon-${index}" class="text-gray-400 group-hover:text-blue-600 pointer-events-none">
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

                                <div class="flex gap-4 mt-8">
                                    <button type="button" id="close-modal" class="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-200">إلغاء</button>
                                    <button type="submit" class="flex-1 py-4 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700">تأكيد ونشر</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        } else if (currentModal === 'edit-product' && editProductId) {
            const product = products.find(p => p.id === editProductId);
            if (!product) return '';

            return `
                <div id="modal-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101] flex items-center justify-center p-4">
                    <div class="modal-content bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div class="p-8">
                            <div class="flex justify-between items-center mb-8">
                                <h3 class="text-2xl font-black">تحرير المنتج</h3>
                                <button id="close-modal" class="text-gray-300 hover:text-red-500 text-3xl">&times;</button>
                            </div>
                            <form id="edit-product-form" class="space-y-4">
                                <input type="hidden" id="edit-product-id" value="${product.id}" />
                                <input type="text" id="edit-product-name" value="${product.name}" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
                                <div class="grid grid-cols-2 gap-4">
                                    <input type="number" id="edit-product-price" value="${product.price}" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
                                    <select id="edit-product-category" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-500">
                                        <option value="أزياء" ${product.category === 'أزياء' ? 'selected' : ''}>أزياء</option>
                                        <option value="ديكور" ${product.category === 'ديكور' ? 'selected' : ''}>ديكور</option>
                                    </select>
                                </div>
                                <textarea id="edit-product-description" class="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 h-32">${product.description || ''}</textarea>

                                <div class="flex gap-4 mt-8">
                                    <button type="button" id="close-modal" class="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-200">إلغاء</button>
                                    <button type="submit" class="flex-1 py-4 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700">حفظ التغييرات</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
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

        const { merchant, products, suppliers } = this.state;

        return `
            <div id="app" class="flex min-h-screen bg-slate-50 rtl">
                ${this.state.isUploading ? `
                    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div class="bg-white p-6 rounded-2xl flex flex-col items-center">
                            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                            <p class="font-bold">${this.state.uploadMessage}</p>
                        </div>
                    </div>
                ` : ''}

                <aside class="w-64 bg-white border-l border-slate-200 flex flex-col fixed h-full z-50">
                    <div class="p-6 border-b border-slate-50 flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
                        <h1 class="font-black text-xl tracking-tight text-slate-800">Morroky<span class="text-blue-600">Pro</span></h1>
                    </div>

                    <nav class="flex-grow p-4 space-y-1">
                        <p class="text-[10px] font-bold text-slate-400 px-4 mb-2 uppercase tracking-widest">الرئيسية</p>
                        ${this.navItem('overview', '📊', 'لوحة التحكم')}
                        ${this.navItem('products', '📦', 'منتجاتي')}
                        <div class="pt-6">
                            <p class="text-[10px] font-bold text-slate-400 px-4 mb-2 uppercase tracking-widest">B2B - الجملة</p>
                            ${this.navItem('suppliers', '🏢', 'سوق الموردين')}
                        </div>
                    </nav>

                    <div class="p-4 mt-auto">
                        <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p class="text-sm font-black text-slate-800 truncate">${merchant.name}</p>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${merchant.id}</p>
                        </div>
                    </div>
                </aside>

                <main class="flex-grow mr-64 bg-slate-50 min-h-screen relative">
                    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                        <div class="flex items-center gap-4 text-sm font-medium text-slate-500">
                            <span class="text-slate-800 font-bold">${this.getTabName()}</span>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="text-left">
                                <span class="block text-[10px] text-slate-400 font-bold leading-none">الرصيد</span>
                                <span class="text-sm font-black text-emerald-600">${merchant.balance || '0.00'} د.م</span>
                            </div>
                        </div>
                    </header>

                    <div class="p-8 max-w-7xl mx-auto">
                        ${this.renderBody()}
                    </div>

                    ${this.state.showAddModal ? this.renderAddModal() : ''}
                </main>
            </div>
        `;
    }

    navItem(id, icon, label) {
        const active = this.state.currentTab === id;
        return `
            <button onclick="app.setTab('${id}')" class="sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${active ? 'active' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}">
                <span class="text-lg opacity-80">${icon}</span>
                <span>${label}</span>
            </button>
        `;
    }

    getTabName() {
        const names = { overview: 'نظرة عامة', products: 'إدارة منتجاتي', suppliers: 'سوق الموردين' };
        return names[this.state.currentTab] || '';
    }

    renderBody() {
        switch(this.state.currentTab) {
            case 'products': return this.renderMerchantProducts();
            case 'suppliers': return this.state.selectedSupplier ? this.renderSupplierDetails() : this.renderSuppliersGrid();
            default: return this.renderOverview();
        }
    }

    renderOverview() {
        const { merchant, products } = this.state;
        const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);
        const totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.sales_count || 0)), 0);

        return `
            <div class="animate-in">
                <div class="mb-8">
                    <h2 class="text-2xl font-black text-slate-800">نظرة عامة على أداء متجرك</h2>
                    <p class="text-slate-500 text-sm">إحصائيات مبيعاتك وأداء المنتجات</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">إجمالي المبيعات</p>
                        <p class="text-2xl font-black text-slate-800">${totalRevenue.toFixed(2)} د.م</p>
                        <div class="mt-2 text-emerald-500 text-xs font-bold">+12% من الشهر الماضي</div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">عدد الطلبات</p>
                        <p class="text-2xl font-black text-slate-800">${totalSales}</p>
                        <div class="mt-2 text-emerald-500 text-xs font-bold">+8% من الشهر الماضي</div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">المنتجات النشطة</p>
                        <p class="text-2xl font-black text-slate-800">${products.length}</p>
                        <div class="mt-2 text-blue-500 text-xs font-bold">جميع المنتجات متاحة</div>
                    </div>
                </div>

                <div class="bg-white p-8 rounded-2xl border border-slate-200 card-shadow">
                    <h3 class="text-lg font-black text-slate-800 mb-4">أداء المنتجات</h3>
                    <div class="space-y-4">
                        ${products.slice(0, 5).map(p => `
                            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div class="flex items-center gap-4">
                                    <img src="${(p.image_urls && p.image_urls[0]) || p.image_url || 'https://placehold.co/50x50'}" class="w-10 h-10 rounded-lg object-cover" />
                                    <div>
                                        <p class="font-bold text-slate-800">${p.name}</p>
                                        <p class="text-sm text-slate-500">${p.price} د.م</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm font-bold text-slate-600">${p.sales_count || 0} مبيعة</p>
                                    <p class="text-xs text-slate-400">${((p.price || 0) * (p.sales_count || 0)).toFixed(2)} د.م</p>
                                </div>
                            </div>
                        `).join('')}
                        ${products.length === 0 ? '<p class="text-center text-slate-400 py-8">لا توجد منتجات بعد</p>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderMerchantProducts() {
        const { products } = this.state;

        return `
            <div class="animate-in">
                <div class="flex justify-between items-end mb-8">
                    <div>
                        <h2 class="text-2xl font-black text-slate-800">قائمة المنتجات</h2>
                        <p class="text-slate-500 text-sm">أضف وتحكم في المنتجات التي تظهر لزبائنك</p>
                    </div>
                    <button onclick="app.toggleAddModal(true)" class="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2">
                        <span>+</span> إضافة منتج جديد
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">إجمالي المنتجات</p>
                        <p class="text-xl font-black text-slate-800">${products.length}</p>
                    </div>
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">المنتجات النشطة</p>
                        <p class="text-xl font-black text-slate-800">${products.filter(p => p.status === 'نشط' || !p.status).length}</p>
                    </div>
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">إجمالي المبيعات</p>
                        <p class="text-xl font-black text-slate-800">${products.reduce((sum, p) => sum + (p.sales_count || 0), 0)}</p>
                    </div>
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 card-shadow">
                        <p class="text-slate-400 text-[10px] font-bold uppercase">متوسط السعر</p>
                        <p class="text-xl font-black text-slate-800">${products.length > 0 ? (products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toFixed(0) : 0} د.م</p>
                    </div>
                </div>

                <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow">
                    <table class="w-full text-right border-collapse">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                <th class="px-6 py-4 text-right">المنتج</th>
                                <th class="px-6 py-4 text-right">الحالة</th>
                                <th class="px-6 py-4 text-center">المخزون</th>
                                <th class="px-6 py-4 text-center">السعر</th>
                                <th class="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-sm">
                            ${products.map(p => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-4">
                                            <img src="${(p.image_urls && p.image_urls[0]) || p.image_url || 'https://placehold.co/50x50'}" class="w-10 h-10 rounded-lg object-cover" />
                                            <span class="font-bold">${p.name}</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${p.status === 'نشط' || !p.status ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                                            ${p.status || 'نشط'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-center font-medium">${p.stock || 0} قطعة</td>
                                    <td class="px-6 py-4 text-center font-black">${p.price} د.م</td>
                                    <td class="px-6 py-4 text-left">
                                        <button data-product-id="${p.id}" class="edit-product-btn text-slate-400 hover:text-blue-600">✏️</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${products.length === 0 ? '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400">لا توجد منتجات بعد. أضف منتجك الأول!</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderSuppliersGrid() {
        const { suppliers } = this.state;

        return `
            <div class="animate-in">
                <div class="mb-8">
                    <h2 class="text-2xl font-black text-slate-800">سوق الموردين (الجملة)</h2>
                    <p class="text-slate-500 text-sm">تصفح المصانع واحصل على أسعار الجملة الحصرية للتجار</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${suppliers.length > 0 ? suppliers.map(s => `
                        <div onclick="app.viewSupplier('${s.id}')" class="bg-white p-6 rounded-2xl border border-slate-100 card-shadow cursor-pointer hover:border-blue-400 transition-all group">
                            <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-50 transition-colors">🏢</div>
                            <h3 class="font-black text-lg text-slate-800 mb-1">${s.name}</h3>
                            <p class="text-slate-400 text-xs font-medium mb-4">📍 ${s.location}</p>
                            <button class="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">تصفح الكتالوج</button>
                        </div>
                    `).join('') : `
                        <div class="col-span-full bg-white p-12 rounded-2xl border border-slate-200 card-shadow text-center">
                            <div class="text-4xl mb-4">🏭</div>
                            <h3 class="font-black text-lg text-slate-800 mb-2">قريباً!</h3>
                            <p class="text-slate-500">سوق الموردين قيد التطوير وستكون متاحة قريباً</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderSupplierDetails() {
        const s = this.state.selectedSupplier;
        if (!s) return this.renderSuppliersGrid();

        return `
            <div class="animate-in">
                <button onclick="app.setTab('suppliers')" class="text-slate-400 font-bold text-sm mb-6 hover:text-blue-600 flex items-center gap-2">
                    ← العودة لجميع الموردين
                </button>
                <div class="bg-white p-8 rounded-3xl border border-slate-200 mb-8 card-shadow flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="text-right">
                        <h2 class="text-2xl font-black text-slate-900">${s.name}</h2>
                        <p class="text-slate-500 text-sm">كتالوج أسعار الجملة المخصص لمتجرك</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${s.items ? s.items.map(p => `
                        <div class="bg-white rounded-[2rem] border border-slate-100 overflow-hidden card-shadow">
                            <div class="h-48 relative">
                                <img src="${p.img}" class="w-full h-full object-cover" />
                                <div class="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-full text-[10px] font-bold">📦 أقل كمية: ${p.min}</div>
                            </div>
                            <div class="p-6 text-right">
                                <h4 class="font-bold text-slate-800 mb-4">${p.name}</h4>
                                <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl mb-4">
                                    <div class="text-center">
                                        <p class="text-[9px] text-slate-400 font-bold uppercase">التقسيط</p>
                                        <p class="text-xs line-through text-slate-300">${p.retail} د.م</p>
                                    </div>
                                    <div class="text-center border-r border-slate-200 pr-4">
                                        <p class="text-[9px] text-blue-500 font-bold uppercase">الجملة لك</p>
                                        <p class="text-lg font-black text-blue-600">${p.wholesale} د.م</p>
                                    </div>
                                </div>
                                <button class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-50">إضافة لطلبات الجملة</button>
                            </div>
                        </div>
                    `).join('') : '<p class="col-span-full text-center text-slate-400 py-8">لا توجد منتجات متاحة حالياً</p>'}
                </div>
            </div>
        `;
    }

    setTab(tab) {
        this._setState({
            currentTab: tab,
            selectedSupplier: null,
            showAddModal: false
        });
    }

    viewSupplier(id) {
        const supplier = this.state.suppliers.find(s => s.id === id);
        if (supplier) {
            this._setState({ selectedSupplier: supplier });
        }
    }

    toggleAddModal(val) {
        this._setState({ showAddModal: val });
    }

    renderAddModal() {
        return `
            <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in overflow-hidden">
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 class="text-xl font-black text-slate-800 text-right">إضافة منتج لمتجرك</h3>
                        <button onclick="app.toggleAddModal(false)" class="text-2xl text-slate-300 hover:text-rose-500 transition-colors">&times;</button>
                    </div>
                    <div class="p-8 space-y-4 text-right">
                        <div>
                            <label class="text-[10px] font-bold text-slate-400 uppercase">اسم المنتج</label>
                            <input type="text" id="prod-name" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase">السعر</label>
                                <input type="number" id="prod-price" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase">الكمية</label>
                                <input type="number" id="prod-stock" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                            </div>
                        </div>
                        <button onclick="app.handleAddProductFromModal()" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm">نشر الآن</button>
                    </div>
                </div>
            </div>
        `;
    }

    handleAddProductFromModal() {
        const name = document.getElementById('prod-name').value;
        const price = document.getElementById('prod-price').value;
        const stock = document.getElementById('prod-stock').value;

        if (!name || !price) {
            state.showToast('يرجى ملء اسم المنتج والسعر', 'error');
            return;
        }

        this.isAddingProduct = true;
        this._setUploading(true, 'جاري إضافة المنتج...');
        try {
            // For now, just add without images
            // TODO: Implement image upload in modal
            MerchantService.addProduct({
                merchant_id: this.merchantId,
                name,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                status: 'نشط'
            });
            state.showToast('تم إضافة المنتج بنجاح!', 'success');
            this.toggleAddModal(false);
            this.fetchData();
        } catch (err) {
            state.showToast(`خطأ: ${err.message}`, 'error');
        } finally {
            this._setUploading(false);
            this.isAddingProduct = false;
        }
    }
}
