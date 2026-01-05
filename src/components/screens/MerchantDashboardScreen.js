import MerchantService from '../../services/merchant.service';
import StorageService from '../../services/storage.service';
import LocationManager from '../../managers/location-manager';
import state from '../../managers/state-manager';
import LandingPageEditorScreen from './LandingPageEditorScreen.js';

export default class MerchantDashboardScreen {
    constructor(props = {}) {
        this.merchantId = props.merchantId; // Must be passed via router
        this.state = {
            merchant: null,
            products: [],
            loading: true,
            uploading: false
        };
    }

    /**
     * Update component state and re-render
     * @param {Object} partialState - Partial state to merge
     */
    setState(partialState) {
        this.state = { ...this.state, ...partialState };

        // Re-render the component with updated state
        if (this.container) {
            this.container.innerHTML = this.template();

            // Re-bind events after re-rendering
            this.bindEvents();
        }
    }

    async onRendered() {
        if (!this.merchantId) {
            state.showToast('خطأ: لا يوجد معرف تاجر!', 'error');
            return;
        }
        await this.fetchData();
        this.bindEvents();

        // Auto refresh has been removed.
    }

    onRemoved() {
        // Clear refresh interval when component is removed
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    async fetchData() {
        try {
            // Add timeout protection to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: Failed to load data within 10 seconds')), 10000)
            );

            const [merchant, products] = await Promise.race([
                Promise.all([
                    MerchantService.getMerchantById(this.merchantId),
                    MerchantService.getProductsByMerchantId(this.merchantId)
                ]),
                timeoutPromise
            ]);

            if (!merchant) {
                throw new Error('Merchant not found');
            }

            this.state = { ...this.state, merchant, products, loading: false };
        } catch (err) {
            // Improved error handling with user feedback
            console.error('Failed to fetch merchant data:', err.message);
            state.showToast('فشل تحميل بيانات المتجر: ' + (err.message.includes('Timeout') ? 'انتهت المهلة، يرجى التحقق من اتصال الإنترنت' : 'حدث خطأ ما'), 'error');
            this.state = { ...this.state, loading: false };
        }
    }

    bindEvents() {
        // Back Link
        this.container.querySelector('#back-link')?.addEventListener('click', () => {
            state.setState({ screen: 'gateway' });
        });

        // Logo Upload
        const logoInput = this.container.querySelector('#logo-input');
        logoInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                this.setUploading(true, 'جاري رفع الشعار...');
                const url = await StorageService.uploadImage(file, 'logos');
                await MerchantService.updateMerchantLogo(this.merchantId, url);
                state.showToast('تم تحديث الشعار بنجاح!', 'success');
                await this.fetchData();
            } catch (err) {
                state.showToast('فشل رفع الشعار: ' + err.message, 'error');
            } finally {
                this.setUploading(false);
            }
        });

        // Background Image Upload
        const backgroundInput = this.container.querySelector('#background-input');
        backgroundInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                this.setUploading(true, 'جاري رفع خلفية الكرت...');
                const url = await StorageService.uploadImage(file, 'backgrounds');
                await MerchantService.updateMerchantBackground(this.merchantId, url);
                state.showToast('تم تحديث خلفية الكرت بنجاح!', 'success');
                await this.fetchData();
            } catch (err) {
                state.showToast('فشل رفع خلفية الكرت: ' + err.message, 'error');
            } finally {
                this.setUploading(false);
            }
        });

        // Rejection reasons click
        this.container.querySelectorAll('.show-reasons-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click navigation
                const merchantId = btn.getAttribute('data-merchant-id-rejections');
                const reasonsContainer = this.container.querySelector(`#reasons-container-${merchantId}`);
                if (reasonsContainer) {
                    // Toggle display
                    const isHidden = reasonsContainer.style.display === 'none' || !reasonsContainer.style.display;
                    reasonsContainer.style.display = isHidden ? 'block' : 'none';
                }
            });
        });

        // Landing Page Modal
        const createLandingPageBtn = this.container.querySelector('#create-landing-page-btn');
        const landingPageModal = this.container.querySelector('#landing-page-modal');
        const closeLpModalBtn = this.container.querySelector('#close-lp-modal');
        const lpProductList = this.container.querySelector('#lp-product-list');

        createLandingPageBtn?.addEventListener('click', () => {
            if (this.state.products.length > 0) {
                lpProductList.innerHTML = this.state.products.map(p => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-morroky-blue hover:bg-blue-50 transition cursor-pointer lp-product-item" data-product-id="${p.id}">
                        <div class="flex items-center gap-4">
                            <img src="${p.image_url || 'https://placehold.co/100x100?text=No+Image'}" class="w-16 h-16 rounded-lg object-cover" />
                            <div>
                                <h3 class="font-bold text-gray-800">${p.name}</h3>
                                <p class="text-sm text-morroky-green font-bold">${p.price} DH</p>
                            </div>
                        </div>
                        <button class="text-blue-600 font-bold text-sm">تخصيص</button>
                    </div>
                `).join('');
            } else {
                lpProductList.innerHTML = '<p class="text-center text-gray-500 py-8">يجب عليك إضافة منتجات أولاً.</p>';
            }
            landingPageModal.classList.remove('hidden');
        });

        closeLpModalBtn?.addEventListener('click', () => {
            landingPageModal.classList.add('hidden');
        });

        lpProductList?.addEventListener('click', (e) => {
            const productItem = e.target.closest('.lp-product-item');
            if (productItem) {
                const productId = productItem.dataset.productId;
                landingPageModal.classList.add('hidden');
                state.setState({ screen: 'landing-page-editor', productId: productId, merchantId: this.merchantId });
            }
        });

        // Add Product Form
        const productForm = this.container.querySelector('#add-product-form');
        productForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = this.container.querySelector('#prod-name').value;
            const price = this.container.querySelector('#prod-price').value;
            const imageInput = this.container.querySelector('#prod-image');
            const file = imageInput.files[0];

            if (!name || !price) {
                state.showToast('المرجو ملء اسم المنتج والسعر', 'error');
                return;
            }

            try {
                this.setUploading(true, 'جاري إضافة المنتج...');

                let imageUrl = null;
                if (file) {
                    imageUrl = await StorageService.uploadImage(file, 'products');
                }

                await MerchantService.addProduct({
                    merchant_id: this.merchantId,
                    name,
                    price: parseFloat(price),
                    image_url: imageUrl
                });

                state.showToast('تم إضافة المنتج بنجاح!', 'success');
                // Reset form
                productForm.reset();
                this.container.querySelector('#preview-prod').src = '';
                await this.fetchData();
            } catch (err) {
                state.showToast('حدث خطأ: ' + err.message, 'error');
            } finally {
                this.setUploading(false);
            }
        });

        // Delete Product Buttons
        this.container.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-product-btn')) {
                e.preventDefault();
                const productId = e.target.dataset.productId;

                state.showConfirm({
                    title: 'حذف المنتج',
                    message: 'هل أنت متأكد من حذف هذا المنتج؟ هذا الإجراء لا يمكن التراجع عنه.',
                    confirmText: 'حذف',
                    cancelText: 'إلغاء',
                    onConfirm: async () => {
                        try {
                            this.setUploading(true, 'جاري حذف المنتج...');
                            await MerchantService.deleteProduct(productId);
                            state.showToast('تم حذف المنتج بنجاح!', 'success');
                            await this.fetchData();
                        } catch (err) {
                            state.showToast('فشل حذف المنتج: ' + err.message, 'error');
                        } finally {
                            this.setUploading(false);
                        }
                    }
                });
            }
        });

        // Change Product Image
        this.container.addEventListener('change', async (e) => {
            if (e.target.classList.contains('product-image-input')) {
                const productId = e.target.dataset.productId;
                const file = e.target.files[0];

                if (!file) return;

                try {
                    this.setUploading(true, 'جاري تحديث صورة المنتج...');
                    const url = await StorageService.uploadImage(file, 'products');
                    await MerchantService.updateProductImage(productId, url);
                    state.showToast('تم تحديث صورة المنتج بنجاح!', 'success');
                    await this.fetchData();
                } catch (err) {
                    state.showToast('فشل تحديث الصورة: ' + err.message, 'error');
                } finally {
                    this.setUploading(false);
                }
            }
        });
    }

    setUploading(state, msg = '') {
        const overlay = this.container.querySelector('#upload-overlay');
        const msgEl = this.container.querySelector('#upload-msg');
        if (state) {
            overlay.classList.remove('hidden');
            msgEl.innerText = msg;
        } else {
            overlay.classList.add('hidden');
        }
    }

    template() {
        if (this.state.loading) return `<div class="p-10 text-center">جاري تحميل بيانات المتجر...</div>`;
        if (!this.state.merchant) return `<div class="p-10 text-center text-red-500">التاجر غير موجود! يرجى التحقق من معرف المتجر أو الاتصال بالدعم.</div>`;

        const m = this.state.merchant;

        return `
            <div class="min-h-screen bg-gray-50 p-6 rtl relative">
                <!-- Loading Overlay -->
                <div id="upload-overlay" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center">
                    <div class="bg-white p-6 rounded-2xl flex flex-col items-center">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-morroky-blue mb-4"></div>
                        <p id="upload-msg" class="font-bold">جاري المعالجة...</p>
                    </div>
                </div>

                <!-- Landing Page Product-Picker Modal -->
                <div id="landing-page-modal" class="fixed inset-0 bg-black/60 z-[101] hidden flex items-center justify-center p-4">
                    <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-slide-up">
                        <div class="p-8">
                            <div class="flex justify-between items-center mb-6">
                                <h2 class="text-2xl font-bold text-gray-900">اختر منتجاً لإنشاء صفحة هبوط له</h2>
                                <button id="close-lp-modal" class="text-gray-400 hover:text-morroky-red transition-colors text-2xl">&times;</button>
                            </div>
                            <div id="lp-product-list" class="max-h-[60vh] overflow-y-auto space-y-3">
                                <!-- Product items will be injected here -->
                            </div>
                        </div>
                    </div>
                </div>

                <div class="max-w-4xl mx-auto">
                    <header class="mb-8 flex justify-between items-center">
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-3xl font-black text-gray-900">إدارة متجر: ${m.name}</h1>
                                ${m.status === 'verified'
                ? `<div class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold border border-blue-200 flex items-center gap-1">
                                         <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                                         موثق
                                       </div>
                                       <!-- Congrats Message (Visible only ifVerified) -->
                                       <div class="hidden animate-bounce bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold">🎉 تمت عملية التوثيق بنجاح!</div>
                                       `
                : `<div class="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold border border-yellow-200">⏳ في انتظار التوثيق</div>`
            }
                            </div>
                            <p class="text-gray-500 mt-1">${LocationManager.formatAddress(m.location || {})}</p>
                            ${m.status === 'pending' ? '<p class="text-yellow-600 text-sm mt-1 bg-yellow-50 p-2 rounded-lg border border-yellow-100">ℹ️ متجرك قيد المراجعة حالياً، لكن يمكنك البدء بإضافة المنتجات وتجهيز المتجر.</p>' : ''}
                        </div>
                        <a href="javascript:void(0)" id="back-link" class="text-blue-600 font-bold hover:underline">العودة للرئيسية</a>
                    </header>

                    <!-- Sales Statistics -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <h2 class="text-xl font-bold mb-4">إحصائيات المبيعات</h2>
                        <div class="flex items-center gap-4 text-xs">
                            <div class="flex items-center gap-1 text-green-600 font-bold">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                <span>${m.successful_sales || 0} بيع ناجح</span>
                            </div>
                            <div class="show-reasons-btn flex items-center gap-1 text-red-600 font-bold cursor-pointer hover:underline" data-merchant-id-rejections="${m.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                <span>${m.unsuccessful_sales || 0} بيع غير ناجح</span>
                            </div>
                        </div>

                        <!-- Rejection Reasons Container -->
                        <div id="reasons-container-${m.id}" class="text-sm text-gray-500 mt-2 font-medium bg-red-50 p-3 rounded-lg border border-red-200" style="display: none;">
                            <h4 class="font-bold text-red-800 mb-1">أسباب الرفض:</h4>
                            <ul class="list-disc list-inside pr-4 text-red-700">
                                ${(m.rejection_reasons || ['المنتج لا يطابق الوصف', 'جودة سيئة']).map(reason => `<li>زبون: ${reason}</li>`).join('')}
                            </ul>
                        </div>
                    </div>

                    <!-- Marketing Section -->
                    <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                        <h2 class="text-xl font-bold mb-4">التسويق وصفحات الهبوط</h2>
                        <p class="text-gray-500 mb-4">أنشئ صفحات هبوط احترافية لمنتجاتك لزيادة مبيعاتك.</p>
                        <button id="create-landing-page-btn" class="w-full bg-morroky-gold text-white font-bold py-3 rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-200">
                            🚀 إنشاء أو تعديل صفحة هبوط
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <!-- Left Column: Branding -->
                        <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
                            <h2 class="text-xl font-bold mb-4">شعار المتجر</h2>
                            <div class="flex flex-col items-center">
                                <div class="w-32 h-32 rounded-full bg-gray-100 overflow-hidden mb-4 border-4 border-white shadow-lg relative group">
                                    <img src="${m.logo_url || 'https://placehold.co/200x200?text=Logo'}" class="w-full h-full object-cover" />
                                    <label class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white font-bold text-xs">
                                        تغيير
                                        <input type="file" id="logo-input" accept="image/*" class="hidden" />
                                    </label>
                                </div>
                                <p class="text-xs text-center text-gray-400">اضغط على الصورة لتغيير الشعار</p>
                            </div>

                            <hr class="border-gray-100 my-6" />

                            <!-- Background Image Section -->
                            <div>
                                <h2 class="text-xl font-bold mb-4 text-center">خلفية الكرت</h2>
                                <div class="flex flex-col items-center">
                                    <div class="w-full h-32 rounded-xl bg-white overflow-hidden mb-4 border-4 border-white shadow-lg relative group">

                                        <div class="absolute inset-0 opacity-10" style="background-image: url('${m.background_url || 'https://www.transparenttextures.com/patterns/moroccan-flower.png'}'); background-size: cover; background-position: center;"></div>

                                        <div class="relative z-10 flex flex-col items-center justify-center h-full text-gray-500">
                                            <p class="font-bold">معاينة الخلفية</p>
                                            <p class="text-xs">(ستظهر بهذا الشكل)</p>
                                        </div>

                                        <label class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-white font-bold text-sm z-20">
                                            تغيير الخلفية
                                            <input type="file" id="background-input" accept="image/*" class="hidden" />
                                        </label>
                                    </div>
                                    <p class="text-xs text-center text-gray-400">
                                        هذه الصورة ستظهر كخلفية شفافة لكرت متجرك.
                                        <br/>
                                        أفضل مقاس: 400x250 بكسل.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Products -->
                        <div class="md:col-span-2 space-y-8">
                            
                            <!-- Add Product Form -->
                            <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 class="text-xl font-bold mb-4">إضافة منتج جديد</h2>
                                <form id="add-product-form" class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-bold text-gray-700 mb-1">اسم المنتج</label>
                                            <input type="text" id="prod-name" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-morroky-blue outline-none" placeholder="اسم المنتج..." required />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-bold text-gray-700 mb-1">السعر (درهم)</label>
                                            <input type="number" id="prod-price" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-morroky-blue outline-none" placeholder="0.00" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-1">صورة المنتج</label>
                                        <input type="file" id="prod-image" accept="image/*" class="w-full p-2 bg-gray-50 rounded-xl border border-gray-200 text-sm" />
                                        <img id="preview-prod" class="h-20 w-20 object-cover rounded-lg mt-2 hidden" />
                                    </div>
                                    <button type="submit" class="w-full bg-morroky-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                                        + إضافة المنتج
                                    </button>
                                </form>
                            </div>

                            <!-- Products List -->
                            <div>
                                <h2 class="text-xl font-bold mb-4">منتجاتي (${this.state.products.length})</h2>
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    ${this.state.products.map(p => `
                                        <div class="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition relative group">
                                            <div class="h-32 bg-gray-100 relative">
                                                <img src="${p.image_url || 'https://placehold.co/300x300?text=No+Image'}" class="w-full h-full object-cover" />
                                                <!-- Change Image Button -->
                                                <label class="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                    📷
                                                    <input type="file" data-product-id="${p.id}" class="product-image-input hidden" accept="image/*" />
                                                </label>
                                            </div>
                                            <div class="p-3">
                                                <h3 class="font-bold text-gray-800 text-sm truncate">${p.name}</h3>
                                                <p class="text-morroky-green font-bold text-sm mt-1">${p.price} DH</p>
                                                <!-- Delete Button -->
                                                <button data-product-id="${p.id}" class="delete-product-btn absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                    ${this.state.products.length === 0 ? '<p class="text-gray-400 col-span-full text-center py-4">لم تقم بإضافة أي منتجات بعد.</p>' : ''}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
