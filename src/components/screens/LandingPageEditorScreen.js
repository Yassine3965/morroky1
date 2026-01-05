import state from '../../managers/state-manager.js';
import MerchantService from '../../services/merchant.service.js';

export default class LandingPageEditorScreen {
    constructor(container, props = {}) {
        this.container = container;
        this.productId = props.productId;
        this.merchantId = props.merchantId;
        this.state = {
            product: null,
            loading: true,
            error: null, // To handle access denied or not found
            landingPageConfig: {}
        };
        this.mount();
    }

    async mount() {
        if (!this.productId || !this.merchantId) {
            this._setState({ loading: false, error: 'خطأ: معرف المنتج أو التاجر غير موجود.' });
            return;
        }
        this.render(); // Initial render with loading state
        await this.fetchProductData();
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
        this.container.querySelector('#back-to-dashboard')?.addEventListener('click', () => {
            state.setState({ screen: 'merchant-dashboard', merchantId: this.merchantId });
            window.location.hash = `#/__manage/${this.merchantId}`;
        });

        this.container.querySelector('#save-lp-btn')?.addEventListener('click', this.handleSave);
    }

    async fetchProductData() {
        try {
            const product = await MerchantService.getProductById(this.productId);
            
            // RLS will handle if current user is not the owner
            // If MerchantService.getProductById(this.productId) returns null or throws an error
            // due to RLS, it will be caught here.
            if (!product || product.merchant_id !== this.merchantId) {
                throw new Error('Product not found or access denied.');
            }
            
            this._setState({
                product,
                loading: false,
                error: null,
                landingPageConfig: product.landing_page_config || {}
            });
        } catch (error) {
            console.error('Failed to fetch product data for LP editor:', error);
            this._setState({ loading: false, error: 'Access Denied. You do not have permission to edit this product.' });
        }
    }

    handleSave = async () => {
        const headline = this.container.querySelector('#lp-headline').value;
        const description = this.container.querySelector('#lp-description').value;
        
        const newConfig = {
            headline,
            description,
        };

        try {
            await MerchantService.updateProductLandingPage(this.productId, newConfig);
            state.showToast('تم حفظ صفحة الهبوط بنجاح!', 'success');
            // Optionally re-fetch to show latest config
            await this.fetchProductData();
        } catch (error) {
            state.showToast('فشل حفظ البيانات: ' + error.message, 'error');
        }
    }

    template() {
        if (this.state.loading) {
            return `<div class="p-10 text-center">جاري تحميل محرر صفحة الهبوط...</div>`;
        }

        if (this.state.error) {
            return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 bg-white rounded-3xl shadow-xl max-w-md">
                        <h2 class="text-2xl font-black text-red-600 mb-4">وصول مرفوض</h2>
                        <p class="text-gray-600 mb-6">ليس لديك الصلاحيات اللازمة لتعديل هذا المنتج. يرجى التأكد من أنك مالك المنتج.</p>
                        <button id="back-to-dashboard" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة للوحة التحكم</button>
                    </div>
                </div>
            `;
        }

        const { product, landingPageConfig } = this.state;

        return `
            <div class="min-h-screen bg-gray-50 p-6 rtl">
                <div class="max-w-4xl mx-auto">
                    <header class="mb-8 flex justify-between items-center">
                        <div>
                            <h1 class="text-3xl font-black text-gray-900">تخصيص صفحة الهبوط لـ: ${product.name}</h1>
                            <p class="text-gray-500">صمم صفحة جذابة لمنتجك لزيادة فرصة الشراء.</p>
                        </div>
                        <button id="back-to-dashboard" class="text-blue-600 font-bold hover:underline">العودة للوحة التحكم</button>
                    </header>

                    <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <div>
                            <label for="lp-headline" class="block text-sm font-bold text-gray-700 mb-1">العنوان الرئيسي الجذاب</label>
                            <input type="text" id="lp-headline" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value="${landingPageConfig.headline || ''}" placeholder="مثال: القفطان الملكي الذي سيغير إطلالتك!">
                        </div>
                        
                        <div>
                            <label for="lp-description" class="block text-sm font-bold text-gray-700 mb-1">وصف المنتج (لصفحة الهبوط)</label>
                            <textarea id="lp-description" rows="5" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" placeholder="اشرح تفاصيل المنتج بشكل مفصل وجذاب...">${landingPageConfig.description || ''}</textarea>
                        </div>

                        <div class="pt-4">
                            <button id="save-lp-btn" class="w-full bg-morroky-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
                                حفظ التغييرات
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
