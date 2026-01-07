import './styles/main.css';
import Router from './managers/router';
import { setupAnimations } from './managers/animations';
import state from './managers/state-manager';
import AuthService from './services/auth.service';
import MerchantService from './services/merchant.service';

document.addEventListener('DOMContentLoaded', async () => {
    setupAnimations();
    const router = new Router('app-root');
    router.init();

    // Check for OAuth callback and handle authentication
    const { data: { session }, error } = await AuthService.supabase.auth.getSession();
    if (session?.user) {
        // User is authenticated via OAuth, handle post-login logic
        try {
            const shop = await MerchantService.getMerchantByOwnerId(session.user.id);
            if (shop) {
                state.setState({ screen: 'merchant-dashboard', merchantId: shop.id });
                window.location.hash = `#/__manage/${shop.id}`;
            } else {
                state.setState({ screen: 'gateway', showRegistration: true });
                window.location.hash = '#';
            }
        } catch (err) {
            console.error('Post-login failed:', err);
            state.setState({ screen: 'auth' });
        }
    } else {
        // Check if this is an OAuth redirect to merchant dashboard
        const hash = window.location.hash;
        if (hash === '#/merchant-dashboard') {
            // User was redirected here but no session, redirect to auth
            state.setState({ screen: 'auth' });
            window.location.hash = '#';
        } else {
            // Force initial navigation for non-authenticated users
            const initialState = state.getState();
            router.navigate(initialState.screen, initialState);
        }
    }

    // Listen for auth state changes
    AuthService.onAuthStateChange(async (event, user) => {
        if (event === 'SIGNED_IN' && user) {
            try {
                const shop = await MerchantService.getMerchantByOwnerId(user.id);
                if (shop) {
                    state.setState({ screen: 'merchant-dashboard', merchantId: shop.id });
                    window.location.hash = `#/__manage/${shop.id}`;
                } else {
                    state.setState({ screen: 'gateway', showRegistration: true });
                    window.location.hash = '#';
                }
            } catch (err) {
                console.error('Post-login failed:', err);
                state.setState({ screen: 'auth' });
            }
        } else if (event === 'SIGNED_OUT') {
            state.setState({ screen: 'gateway' });
            window.location.hash = '#';
        }
    });

    // Initialize toast notifications
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
    state.toast.container = document.getElementById('toast-container');
    state.toast.render();

    // Initialize confirm dialog
    document.body.insertAdjacentHTML('beforeend', '<div id="confirm-dialog-container"></div>');
    state.confirmDialog.container = document.getElementById('confirm-dialog-container');
    state.confirmDialog.render();
});
