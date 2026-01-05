import MerchantService from '../../services/merchant.service.js';
import { supabase } from '../../services/supabase.js';
import Toast from '../base/Toast.js';
import state from '../../managers/state-manager.js';

export class ProductLandingScreen {
    constructor(options) {
        this.productId = options.productId;
        this.product = null;
        this.landingPageConfig = null;
    }

    async onRendered() {
        if (!this.productId) {
            state.setState({ screen: 'gateway' });
            return;
        }
        await this.fetchProductData();
        this.updateView();
    }

    async fetchProductData() {
        try {
            const product = await MerchantService.getProductById(this.productId);
            if (!product || !product.landing_page_config) {
                this.product = null;
                this.landingPageConfig = null;
                Toast.show('صفحة الهبوط غير متوفرة لهذا المنتج.', 'error');
                return;
            }
            this.product = product;
            this.landingPageConfig = product.landing_page_config;
        } catch (error) {
            console.error('Failed to load product data:', error);
            Toast.show('فشل في تحميل بيانات المنتج.', 'error');
            this.product = null;
            this.landingPageConfig = null;
        }
    }

    updateView() {
        if (!this.product || !this.landingPageConfig) {
            this.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 glass-morphism rounded-3xl max-w-md">
                        <h2 class="text-2xl font-black text-gray-800 mb-4">عذراً، صفحة المنتج غير موجودة</h2>
                        <p class="text-gray-500 mb-6">قد يكون الرابط خاطئ أو أن المنتج لم يعد متوفراً.</p>
                        <button onclick="window.location.hash = '#/__world'" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة للاستكشاف</button>
                    </div>
                </div>
            `;
            return;
        }

        const { title, description, sections } = this.landingPageConfig;

        let sectionsHtml = sections.map(section => {
            switch (section.type) {
                case 'hero':
                    return `<div class="hero-section" style="background-image: url('${section.imageUrl || this.product.image_url}');">
                                <h1>${section.title || title}</h1>
                                <p>${section.subtitle || description}</p>
                            </div>`;
                case 'features':
                    const featuresHtml = section.features.map(feature => `<li><strong>${feature.title}:</strong> ${feature.description}</li>`).join('');
                    return `<div class="features-section">
                                <h2>${section.title}</h2>
                                <ul>${featuresHtml}</ul>
                            </div>`;
                case 'gallery':
                    const imagesHtml = section.images.map(img => `<img src="${img}" alt="Gallery image">`).join('');
                    return `<div class="gallery-section">
                                <h2>${section.title}</h2>
                                <div class="gallery-images">${imagesHtml}</div>
                            </div>`;
                default:
                    return '';
            }
        }).join('');

        this.innerHTML = `
            <div class="landing-page-container">
                <header>
                    <h1>${title}</h1>
                    <p>${description}</p>
                </header>
                <main>
                    ${sectionsHtml}
                </main>
                <footer>
                    <button id="buy-now-btn">شراء الآن</button>
                </footer>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const buyButton = this.querySelector('#buy-now-btn');
        if (buyButton) {
            buyButton.addEventListener('click', () => {
                //  TODO: Implement order/checkout logic
                Toast.show('سيتم توجيهك لصفحة الدفع قريباً!');
            });
        }
    }
}
