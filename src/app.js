import './styles/main.css';
import Router from './managers/router';
import { setupAnimations } from './managers/animations';
import state from './managers/state-manager';
import AuthService from './services/auth.service';
import MerchantService from './services/merchant.service';
import { supabase } from './services/supabase';

document.addEventListener('DOMContentLoaded', async () => {
    setupAnimations();

    // Initialize router first to show loading state
    const router = new Router('app-root');
    router.init();

    // Show loading state initially
    state.setState({ screen: 'gateway' });
    router.navigate('gateway', {});

    let authResolved = false;
    let routerInitialized = false;

    const initializeRouter = () => {
        if (routerInitialized) return;
        routerInitialized = true;

        // Initialize UI components
        document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
        state.toast.container = document.getElementById('toast-container');
        state.toast.render();

        document.body.insertAdjacentHTML('beforeend', '<div id="confirm-dialog-container"></div>');
        state.confirmDialog.container = document.getElementById('confirm-dialog-container');
        state.confirmDialog.render();
    };

    const handleAuthState = async (event, user) => {
        if (authResolved) return; // Prevent duplicate handling
        authResolved = true;

        console.log('Auth state changed:', event, user ? 'User logged in' : 'No user');

        try {
            if (event === 'SIGNED_IN' && user) {
                // User successfully authenticated via OAuth
                console.log('User authenticated, checking merchant data...');

                // Add timeout to prevent hanging
                const merchantPromise = MerchantService.getMerchantByOwnerId(user.id);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Merchant lookup timeout')), 5000)
                );

                const shop = await Promise.race([merchantPromise, timeoutPromise]);

                if (shop) {
                    console.log('Merchant found, redirecting to dashboard...');
                    state.setState({ screen: 'merchant-dashboard', merchantId: shop.id });
                    window.location.hash = `#/__manage/${shop.id}`;
                } else {
                    console.log('No merchant found, redirecting to registration...');
                    state.setState({ screen: 'gateway', showRegistration: true });
                    window.location.hash = '#';
                }
            } else {
                // No authenticated user - proceed with normal routing
                console.log('No authenticated user, showing gateway...');
                const initialState = state.getState();
                router.navigate(initialState.screen, initialState);
            }
        } catch (err) {
            console.error('Auth handling failed:', err);
            // On error, show gateway screen
            state.setState({ screen: 'gateway' });
            router.navigate('gateway', {});
        }

        // Initialize router components after auth is resolved
        initializeRouter();
    };

    try {
        // Ensure supabase is properly initialized before any auth calls
        if (!supabase || !supabase.auth) {
            throw new Error('Supabase client not properly initialized');
        }

        console.log('Setting up auth state listener...');

        // Set up auth state listener - this will consume OAuth tokens from URL
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state change detected:', event);
            handleAuthState(event, session?.user || null);
        });

        console.log('Checking current session...');

        // Check current session - this will trigger SIGNED_IN if OAuth tokens were consumed
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Session check error:', error);
            handleAuthState('SIGNED_OUT', null);
        } else if (session?.user) {
            console.log('Existing session found, handling auth...');
            handleAuthState('SIGNED_IN', session.user);
        } else {
            console.log('No existing session, handling as signed out...');
            handleAuthState('SIGNED_OUT', null);
        }
    } catch (err) {
        console.error('Supabase initialization error:', err);
        // Fallback: show gateway screen without auth
        handleAuthState('SIGNED_OUT', null);
    }
});
