
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

class Router {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
        this.currentScreen = null;
    }

    init() {
        // The new router is "dumb" and no longer handles authorization.
        // It only maps URL hash changes to state changes.
        const handleHash = () => {
            const hash = window.location.hash;
            if (hash === '#/__admin') {
                state.setState({ screen: 'admin' });
            } else if (hash.startsWith('#/__manage/')) {
                const merchantId = hash.split('/')[2];
                if (merchantId) {
                    state.setState({ screen: 'merchant-dashboard', merchantId: merchantId });
                }
            } else if (hash.startsWith('#/product/')) {
                const productId = hash.split('/')[2];
                if (productId) {
                    state.setState({ screen: 'product-landing', productId: productId });
                }
            }
        };

        window.addEventListener('hashchange', handleHash);

        // The subscription is the single source of truth for rendering.
        // Any change to the state's `screen` property will trigger a navigation.
        state.subscribe((s) => {
            this.navigate(s.screen, s);
        });

        // On initial page load, check the hash. If a hash is present and matches a route,
        // it will trigger the subscription via setState. 
        handleHash();

        // We need an initial navigation for the case where there is no hash.
        // The subscription only fires on state CHANGE. The initial state is already set.
        this.navigate(state.getState().screen, state.getState());
    }

    navigate(screenName, appState = {}) {
        // All authorization logic is removed. The screen components themselves are
        // responsible for fetching their data. RLS will enforce security at the
        // database level, and the screen can handle any resulting errors.

        // Basic guard to prevent re-rendering the same component unnecessarily
        if (this.currentScreen === screenName && screenName !== 'merchant') return;

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
            default:
                new GatewayScreen(this.root);
        }
    }
}

export default Router;
