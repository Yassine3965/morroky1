
import MerchantService from '../../services/merchant.service.js';
import state from '../../managers/state-manager.js';

export class ProductLandingScreen {
    constructor(container, props = {}) {
        this.container = container;
        this.productId = props.productId;
        this.state = {
            product: null,
            loading: true,
            error: null
        };
        this.mount();
    }

    async mount() {
        if (!this.productId) {
            state.setState({ screen: 'gateway' });
            window.location.hash = '#';
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

    async fetchProductData() {
        try {
            const product = await MerchantService.getProductById(this.productId);
            if (!product) {
                throw new Error('Product not found.');
            }
            this._setState({
                product,
                loading: false,
                error: null
            });
        } catch (error) {
            console.error('Failed to load product data for landing page:', error);
            this._setState({ loading: false, error: 'Product not found or unavailable.' });
        }
    }

    bindEvents() {
        const buyButton = this.container.querySelector('#buy-now-btn');
        if (buyButton) {
            buyButton.addEventListener('click', () => {
                state.showToast('تم استلام طلبك! سنتواصل معك قريباً.', 'success');
            });
        }
        
        const backBtn = this.container.querySelector('#btn-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                state.setState({ screen: 'world' });
                window.location.hash = '#/__world';
            });
        }
    }

    template() {
        if (this.state.loading) {
            return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-morroky-red"></div>
                </div>
            `;
        }

        if (this.state.error || !this.state.product) {
            return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 bg-white rounded-3xl shadow-xl max-w-md">
                        <h2 class="text-2xl font-black text-gray-800 mb-4">عذراً، صفحة المنتج غير موجودة</h2>
                        <p class="text-gray-600 mb-6">قد يكون الرابط خاطئ أو أن المنتج لم يعد متوفراً.</p>
                        <button id="btn-back" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة للاستكشاف</button>
                    </div>
                </div>
            `;
        }

        const { product } = this.state;
        const config = product.landing_page_config || {};

        return `
            <div class="min-h-screen bg-white rtl">
                <!-- Simple Hero Section -->
                <div class="relative h-[60vh] bg-gray-900 overflow-hidden">
                    <img src="${(product.image_urls && product.image_urls[0]) || product.image_url || 'https://placehold.co/1200x800'}" class="w-full h-full object-cover opacity-60" />
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
                        <h1 class="text-4xl md:text-6xl font-black mb-4 animate-fade-in-down">${config.headline || product.name}</h1>
                        <p class="text-xl md:text-2xl text-white/80 max-w-2xl animate-fade-in">${config.description || 'منتج عالي الجودة من موروكي'}</p>
                    </div>
                </div>

                <!-- Product Details -->
                <div class="max-w-4xl mx-auto px-6 py-16">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 class="text-3xl font-bold mb-6">حول هذا المنتج</h2>
                            <p class="text-gray-600 leading-relaxed text-lg mb-8">
                                ${config.description || 'هذا المنتج متوفر في أسواق درب عمر بجودة عالية وسعر منافس.'}
                            </p>
                            <div class="flex items-center gap-4">
                                <span class="text-4xl font-black text-morroky-red">${product.price} <span class="text-sm">DH</span></span>
                                <button id="buy-now-btn" class="flex-1 bg-morroky-green text-white font-bold py-4 rounded-2xl text-xl hover:scale-105 transition-transform shadow-lg shadow-green-200">
                                    اطلب الآن 🛍️
                                </button>
                            </div>
                        </div>
                        <div class="rounded-3xl overflow-hidden shadow-2xl">
                            <img src="${(product.image_urls && product.image_urls[0]) || product.image_url || 'https://placehold.co/600x600'}" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <footer class="bg-gray-50 py-12 text-center border-t">
                    <p class="text-gray-400">© 2024 Morroky. جميع الحقوق محفوظة.</p>
                </header>
            </div>
        `;
    }
}
