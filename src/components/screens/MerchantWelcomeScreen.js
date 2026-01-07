import state from '../../managers/state-manager';
import { supabase } from '../../services/supabase';

export default class MerchantWelcomeScreen {
    constructor(container) {
        this.container = container;
        this.checkAuthAndRedirect();
        this.render();
    }

    async checkAuthAndRedirect() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            window.location.href = '/merchant/dashboard.html';
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-morroky-blue to-morroky-dark flex items-center justify-center p-6">
                <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center rtl">
                    <div class="mb-8">
                        <div class="w-24 h-24 bg-morroky-blue rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h1 class="text-4xl font-black text-gray-900 mb-4">مرحباً بك في موروكي!</h1>
                        <p class="text-xl text-gray-600 mb-6">شكراً لانضمامك إلينا. الآن يمكنك إنشاء متجرك الخاص وبدء بيع منتجاتك.</p>
                    </div>

                    <div class="bg-gray-50 rounded-2xl p-6 mb-8">
                        <h2 class="text-2xl font-bold text-gray-900 mb-4">ما يجب عليك فعله الآن:</h2>
                        <div class="text-right space-y-3">
                            <div class="flex items-start gap-3">
                                <span class="bg-morroky-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                                <p class="text-gray-700">اضغط على زر "إنشاء متجر" أدناه</p>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-morroky-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                                <p class="text-gray-700">املأ معلومات متجرك (الاسم، الوصف، الشعار)</p>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-morroky-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                                <p class="text-gray-700">أضف منتجاتك الأولى</p>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-morroky-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                                <p class="text-gray-700">انتظر موافقة الإدارة (سيتم إشعارك)</p>
                            </div>
                            <div class="flex items-start gap-3">
                                <span class="bg-morroky-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                                <p class="text-gray-700">ابدأ في بيع منتجاتك!</p>
                            </div>
                        </div>
                    </div>

                    <button id="create-store-btn" class="bg-morroky-blue text-white text-xl font-bold py-4 px-12 rounded-2xl hover:bg-morroky-dark transition duration-300 shadow-lg">
                        إنشاء متجر جديد
                    </button>

                    <p class="text-gray-500 mt-6 text-sm">
                        إذا كان لديك أي أسئلة، يمكنك التواصل معنا عبر الدعم الفني.
                    </p>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('create-store-btn').addEventListener('click', () => {
            // Navigate to merchant application or dashboard
            state.setState({ screen: 'gateway', showRegistration: 'merchant' });
        });
    }
}
