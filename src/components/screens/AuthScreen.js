import AuthService from '../../services/auth.service';
import MerchantService from '../../services/merchant.service';
import state from '../../managers/state-manager';
import Router from '../../managers/router';

export default class AuthScreen {
    constructor(props = {}) {
        this.state = {
            mode: 'login', // 'login' or 'register'
            loading: false,
            error: null
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

    onRendered() {
        this.bindEvents();
    }

    onUpdated() {
        this.bindEvents();
    }

    bindEvents() {
        // Toggle Mode
        this.container.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.state = { ...this.state, mode, error: null };
            });
        });

        // Google Sign In
        this.container.querySelector('#btn-google')?.addEventListener('click', async () => {
            try {
                this.setState({ loading: true, error: null });
                await AuthService.signInWithGoogle();
            } catch (err) {
                // Clean error handling - don't expose sensitive details
                this.setState({ loading: false, error: 'تعذر الاتصال بخدمة Google' });
            }
        });

        // Form Submit
        const form = this.container.querySelector('#auth-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = this.container.querySelector('#email').value;
            const password = this.container.querySelector('#password').value;

            if (password.length < 6) {
                this.setState({ error: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' });
                return;
            }

            this.setState({ loading: true, error: null });

            try {
                if (this.state.mode === 'register') {
                    await AuthService.signUp(email, password);
                    // After signup, user is logged in automatically by Supabase usually

                    // Check if they need to create a shop (they are new)
                    // We can show a success message or redirect to Registration Modal logic
                    // For flow simplicity:
                    state.showToast('تم إنشاء الحساب بنجاح! يرجى تسجيل محلك الآن.', 'success');
                    this.openRegistrationModal();
                } else {
                    const { user } = await AuthService.signIn(email, password);
                    await this.handlePostLogin(user);
                }
            } catch (err) {
                // Clean error handling - don't expose sensitive details to console
                const errorMessage = err.message === 'Invalid login credentials' ? 'البريد أو كلمة السر خاطئة' : 'حدث خطأ أثناء عملية المصادقة';
                this.setState({ loading: false, error: errorMessage });
            }
        });

        // Back Button
        this.container.querySelector('#btn-back')?.addEventListener('click', () => {
            state.setState({ screen: 'gateway' });
        });
    }

    async handlePostLogin(user) {
        // Check if this user already has a shop
        try {
            const shop = await MerchantService.getMerchantByOwnerId(user.id);
            if (shop) {
                // Redirect to Dashboard
                state.setState({ screen: 'merchant-dashboard', merchantId: shop.id });
            } else {
                // Redirect to Register Shop
                this.openRegistrationModal();
            }
        } catch (err) {
            this.setState({ loading: false, error: 'حدث خطأ أثناء جلب بيانات التاجر' });
        }
    }

    openRegistrationModal() {
        // We need to trigger the registration modal flow.
        // Since the current architecture spawns the modal from Gateway, 
        // we can hack it slightly or just navigate to gateway and open it.
        // Better approach: Let's redirect to a 'create-shop' screen or update state to show modal.

        // Temporary: Navigate to gateway but trigger modal manually? 
        // Or simply render the registration logic here?

        // Let's assume we want to stay in "Auth" context but show registration form.
        // For now, let's redirect to Gateway and auto-open modal if possible, 
        // or just stay here and tell user to click "Register Shop" (User experience could be better).

        // Cleanest flow: Navigate to 'merchant-registration' screen (we don't have it as screen yet).
        // Let's create a temporary state in state-manager so Gateway opens it.
        state.setState({ screen: 'gateway', showRegistration: true });
    }

    template() {
        const { mode, loading, error } = this.state;

        return `
            <div class="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-black">
                <!-- Starry Background (Simple CSS implementation) -->
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse"></div>
                <div class="absolute inset-0 bg-gradient-to-b from-transparent to-morroky-blue/20"></div>

                <!-- Glass Card -->
                <div class="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl rtl text-white animate-fade-in-up">
                    
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-gradient-to-tr from-morroky-red to-orange-500 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30 mb-4">
                            🔐
                        </div>
                        <h1 class="text-3xl font-black mb-2">${mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلينا'}</h1>
                        <p class="text-white/60 text-sm">بوابة التجار - Morroky</p>
                    </div>

                    <!-- Tabs -->
                    <div class="flex p-1 bg-black/20 rounded-xl mb-6">
                        <button data-mode="login" class="auth-tab flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}">
                            تسجيل دخول
                        </button>
                        <button data-mode="register" class="auth-tab flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}">
                            إنشاء حساب
                        </button>
                    </div>

                    ${error ? `
                        <div class="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl mb-6 text-sm text-center">
                            ${error}
                        </div>
                    ` : ''}

                    <form id="auth-form" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-white/80 mb-1 indent-1">البريد الإلكتروني</label>
                            <input type="email" id="email" class="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-morroky-red focus:bg-black/50 outline-none transition-colors" placeholder="name@example.com" required />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-white/80 mb-1 indent-1">كلمة المرور</label>
                            <input type="password" id="password" autocomplete="new-password" class="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-morroky-red focus:bg-black/50 outline-none transition-colors" placeholder="••••••••" required />
                        </div>

                        <button type="submit" class="w-full bg-gradient-to-r from-morroky-red to-orange-500 hover:to-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-900/50 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed" ${loading ? 'disabled' : ''}>
                            ${loading ? 'جاري المعالجة...' : (mode === 'login' ? 'الدخول للوحة التحكم' : 'إنشاء حساب جديد')}
                        </button>

                        <button type="button" id="btn-google" class="w-full bg-white text-gray-800 font-bold py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mt-4">
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6" />
                            <span>المتابعة باستخدام Google</span>
                        </button>
                    </form>
                    
                    <button id="btn-back" class="w-full mt-4 text-white/40 text-sm hover:text-white transition-colors">
                        العودة للرئيسية
                    </button>
                </div>
            </div>
        `;
    }
}
