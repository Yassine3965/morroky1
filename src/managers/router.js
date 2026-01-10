
import state from './state-manager';
import GatewayScreen from '../components/screens/GatewayScreen';
import WorldScreen from '../components/screens/WorldScreen';
import MerchantScreen from '../components/screens/MerchantScreen';
import AdminScreen from '../components/screens/AdminScreen';
import MerchantDashboardScreen from '../components/screens/MerchantDashboardScreen';
import AuthScreen from '../components/screens/AuthScreen';
import LandingPageEditorScreen from '../components/screens/LandingPageEditorScreen.js';
import { ProductLandingScreen } from '../components/screens/ProductLandingScreen.js';
import MerchantWelcomeScreen from '../components/screens/MerchantWelcomeScreen';
import ProductDetailScreen from '../components/screens/ProductDetailScreen';

class Router {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
        this.currentScreen = null;
        this.isInitialized = false;
    }

    init() {
        // Handle browser history changes (back/forward buttons)
        window.addEventListener('popstate', (event) => {
            if (this.isInitialized) {
                this.handleRouteChange(window.location.pathname);
            }
        });

        // The subscription is the single source of truth for rendering.
        // Any change to the state's `screen` property will trigger a navigation.
        state.subscribe((s) => {
            this.navigate(s.screen, s);
        });

        // On initial page load, check the current path
        this.handleRouteChange(window.location.pathname);
        this.isInitialized = true;

        // We need an initial navigation for the case where there is no path.
        // The subscription only fires on state CHANGE. The initial state is already set.
        this.navigate(state.getState().screen, state.getState());
    }

    handleRouteChange(pathname) {
        if (pathname === '/admin') {
            state.setState({ screen: 'admin' });
        } else if (pathname.startsWith('/manage/')) {
            const merchantId = pathname.split('/')[2];
            if (merchantId) {
                state.setState({ screen: 'merchant-dashboard', merchantId: merchantId });
            }
        } else if (pathname === '/merchant-dashboard') {
            // Handle OAuth redirect for merchant dashboard
            // app.js will handle authentication and redirect to proper merchant dashboard
            state.setState({ screen: 'gateway' });
        } else if (pathname.startsWith('/product/')) {
            const productId = pathname.split('/')[2];
            if (productId) {
                state.setState({ screen: 'product-detail', productId: productId });
            }
        } else if (pathname === '/auth') {
            state.setState({ screen: 'auth' });
        } else if (pathname === '/world') {
            state.setState({ screen: 'world' });
        } else if (pathname.startsWith('/suppliers/')) {
            const supplierId = pathname.split('/')[2];
            if (supplierId) {
                // For now, just go to suppliers tab. The component will handle showing the supplier
                state.setState({ screen: 'merchant-dashboard', supplierId: supplierId });
            }
        } else if (pathname === '/' || pathname === '') {
            // Default route
            state.setState({ screen: 'gateway' });
        }
    }

    navigate(screenName, appState = {}, updateURL = true) {
        // All authorization logic is removed. The screen components themselves are
        // responsible for fetching their data. RLS will enforce security at the
        // database level, and the screen can handle any resulting errors.

        // Basic guard to prevent re-rendering the same component unnecessarily
        if (this.currentScreen === screenName && screenName !== 'merchant') return;

        // Update URL if requested
        if (updateURL) {
            const path = this.getPathForScreen(screenName, appState);
            if (path !== window.location.pathname) {
                window.history.pushState(null, '', path);
            }
        }

        this.root.innerHTML = '';
        this.currentScreen = screenName;

        switch (screenName) {
            case 'gateway':
                new GatewayScreen(this.root, { showRegistration: appState.showRegistration });
                break;
            case 'auth':
                new AuthScreen(this.root);
                break;
            case 'world':
                new WorldScreen(this.root);
                break;
            case 'merchant':
                new MerchantScreen(this.root, { merchantId: appState.selectedMerchantId });
                break;
            case 'admin':
                new AdminScreen(this.root);
                break;
            case 'merchant-dashboard':
                new MerchantDashboardScreen(this.root, { merchantId: appState.merchantId });
                break;
            case 'landing-page-editor':
                new LandingPageEditorScreen(this.root, { productId: appState.productId, merchantId: appState.merchantId });
                break;
            case 'product-landing':
                new ProductLandingScreen(this.root, { productId: appState.productId });
                break;
            case 'merchant-welcome':
                new MerchantWelcomeScreen(this.root);
                break;
            case 'product-detail':
                new ProductDetailScreen(this.root, { productId: appState.productId });
                break;
            default:
                new GatewayScreen(this.root);
        }
    }

    getPathForScreen(screenName, appState = {}) {
        switch (screenName) {
            case 'admin':
                return '/admin';
            case 'merchant-dashboard':
                return appState.merchantId ? `/manage/${appState.merchantId}` : '/merchant-dashboard';
            case 'product-detail':
                return appState.productId ? `/product/${appState.productId}` : '/';
            case 'world':
                return '/world';
            case 'auth':
                return '/auth';
            case 'landing-page-editor':
                return appState.productId ? `/landing-page-editor/${appState.productId}` : '/landing-page-editor';
            case 'merchant-dashboard':
                // Special case: if we have a supplierId, we're showing supplier details
                if (appState.supplierId) {
                    return `/suppliers/${appState.supplierId}`;
                }
                return appState.merchantId ? `/manage/${appState.merchantId}` : '/merchant-dashboard';
            default:
                return '/';
        }
    }
}

export default Router;
