import './styles/main.css';
import Router from './managers/router';
import { setupAnimations } from './managers/animations';
import state from './managers/state-manager';
import AuthService from './services/auth.service';
import MerchantService from './services/merchant.service';

document.addEventListener('DOMContentLoaded', async () => {
    setupAnimations();

    // ✅ CRITICAL: Initialize auth listener FIRST before any routing or session checks
    // This ensures OAuth tokens from URL hash are consumed and session is established
    let authResolved = false;

    const handleAuthState = async (event, user) => {
        if (authResolved) return; // Prevent duplicate handling
        authResolved = true;

        console.log('Auth state changed:', event, user ? 'User logged in' : 'No user');

        if (event === 'SIGNED_IN' && user) {
            // User successfully authenticated via OAuth
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
        } else {
            // No authenticated user - proceed with normal routing
            const router = new Router('app-root');
            router.init();
            const initialState = state.getState();
            router.navigate(initialState.screen, initialState);
        }
    };

    // Set up auth state listener - this will consume OAuth tokens from URL
    AuthService.onAuthStateChange(handleAuthState);

    // Check current session - this will trigger SIGNED_IN if OAuth tokens were consumed
    const { data: { session } } = await AuthService.supabase.auth.getSession();
    if (session?.user) {
        handleAuthState('SIGNED_IN', session.user);
    } else {
        handleAuthState('SIGNED_OUT', null);
    }

    // Initialize UI components
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
    state.toast.container = document.getElementById('toast-container');
    state.toast.render();

    document.body.insertAdjacentHTML('beforeend', '<div id="confirm-dialog-container"></div>');
    state.confirmDialog.container = document.getElementById('confirm-dialog-container');
    state.confirmDialog.render();
});
