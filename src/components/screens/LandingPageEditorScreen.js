import state from '../../managers/state-manager.js';
import MerchantService from '../../services/merchant.service.js';

export default class LandingPageEditorScreen {
    constructor(props = {}) {
        this.productId = props.productId;
        this.merchantId = props.merchantId;
        this.state = {
            product: null,
            loading: true,
            landingPageConfig: {}
        };
    }

    async onRendered() {
        if (!this.productId || !this.merchantId) {
            state.showToast('خطأ: معرف المنتج أو التاجر غير موجود.', 'error');
            state.setState({ screen: 'merchant-dashboard', merchantId: this.merchantId });
            return;
        }
        await this.fetchProductData();
        this.bindEvents();
    }

    async fetchProductData() {
        try {
            const product = await MerchantService.getProductById(this.productId);
            if (product.merchant_id !== this.merchantId) {
                state.showToast('ليس لديك صلاحية لتعديل هذا المنتج.', 'error');
                state.setState({ screen: 'merchant-dashboard', merchantId: this.merchantId });
                return;
            }
            this.state = { ...this.state,
                product, 
                loading: false,
                landingPageConfig: product.landing_page_config || {}
            };
        } catch (error) {
            state.showToast('فشل في تحميل بيانات المنتج.', 'error');
            this.state = { ...this.state, loading: false };
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
        } catch (error) {
            state.showToast('فشل حفظ البيانات: ' + error.message, 'error');
        }
    }

    bindEvents() {
        this.container.querySelector('#back-to-dashboard')?.addEventListener('click', () => {
            state.setState({ screen: 'merchant-dashboard', merchantId: this.merchantId });
        });

        this.container.querySelector('#save-lp-btn')?.addEventListener('click', this.handleSave);
    }

    template() {
        if (this.state.loading) {
            return `<div class="p-10 text-center">جاري تحميل محرر صفحة الهبوط...</div>`;
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
                        <a href="javascript:void(0)" id="back-to-dashboard" class="text-blue-600 font-bold hover:underline">العودة للوحة التحكم</a>
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
