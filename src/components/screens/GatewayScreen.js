import state from '../../managers/state-manager';
import MerchantRegistrationModal from '../modals/MerchantRegistrationModal';

export default class GatewayScreen {
    constructor(container, props = {}) {
        this.container = container;
        this.props = props;
        this.render();
    }

    render() {
        this.container.innerHTML = this.template();
        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelector('#btn-buyer').addEventListener('click', () => {
            state.setState({ userType: 'buyer', screen: 'world' });
        });

        this.container.querySelector('#btn-merchant').addEventListener('click', () => {
            state.setState({ userType: 'merchant', screen: 'auth' });
        });

        // Check if we need to show registration modal (coming from Auth)
        if (this.props.showRegistration) {
            const modalRoot = document.getElementById('modals-root');
            if (modalRoot) {
                const registrationModal = new MerchantRegistrationModal();
                registrationModal.mount(modalRoot);
            }
            // Clear the flag from state so it doesn't re-trigger
            state.setState({ showRegistration: false });
        }
    }

    template() {
        return `
            <div class="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
                <div class="max-w-md w-full text-center space-y-8 animate-fade-in relative z-10">
                    <div>
                        <h1 class="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-morroky-red to-orange-500 mb-2 tracking-tighter drop-shadow-2xl">MORROKY</h1>
                        <p class="text-gray-300 text-lg">الواقع أولاً ← المنصة تعكس الواقع فقط</p>
                    </div>
                
                    <div class="grid grid-cols-1 gap-6 pt-8">
                        <button id="btn-buyer" class="group relative glass-card p-0 rounded-2xl overflow-hidden shadow-2xl h-32 flex items-center justify-center">
                            <div class="absolute inset-0 bg-gradient-to-r from-morroky-green/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="relative z-10 flex flex-col items-center justify-center">
                                <span class="text-3xl font-bold mb-1 text-white group-hover:scale-110 transition-transform">أنا مشتري 🛍️</span>
                                <span class="text-sm text-gray-400 group-hover:text-white transition-colors">أبحث عن سلع بالجملة والتقسيط</span>
                            </div>
                        </button>
                
                        <button id="btn-merchant" class="group relative glass-card p-0 rounded-2xl overflow-hidden shadow-2xl h-32 flex items-center justify-center">
                            <div class="relative z-10 flex flex-col items-center justify-center">
                                <span class="text-3xl font-bold mb-1 text-white group-hover:scale-110 transition-transform">أنا تاجر 🏪</span>
                                <span class="text-sm text-gray-400 group-hover:text-white transition-colors">أريد توثيق محلي وعرض سلعي</span>
                            </div>
                        </button>
                    </div>
                
                    <p class="text-gray-600 text-sm mt-12 mix-blend-screen">خريطة رقمية واقعية للأسواق المغربية</p>
                </div>
            </div>
        `;
    }
}
