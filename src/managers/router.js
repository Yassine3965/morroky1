import state from './state-manager';
import AuthorizationService from '../services/authorization.service';
import GatewayScreen from '../components/screens/GatewayScreen';
import WorldScreen from '../components/screens/WorldScreen';
import MerchantScreen from '../components/screens/MerchantScreen';
import AdminScreen from '../components/screens/AdminScreen';
import MerchantDashboardScreen from '../components/screens/MerchantDashboardScreen';
import AuthScreen from '../components/screens/AuthScreen';
import LandingPageEditorScreen from '../components/screens/LandingPageEditorScreen.js';
import { ProductLandingScreen } from '../components/screens/ProductLandingScreen.js';

/**
 * Application Router
 * Handles navigation between different screens and URL routing
 *
 * Features:
 * - Hash-based routing for deep linking
 * - Screen management and rendering
 * - State-driven navigation
 * - Secret routes for admin functionality
 */
class Router {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
        this.currentScreen = null;
    }

    /**
     * Initialize the router
     * Sets up hash change listeners and state subscriptions
     */
    init() {
        // Initialize authorization service
        AuthorizationService.init();

        // Handle URL hash for secret route: #/__admin or #/__manage/ID
        const handleHash = async () => {
            const hash = window.location.hash;
            if (hash === '#/__admin') {
                // Check authorization before allowing admin access
                const isAuthorized = await AuthorizationService.isAuthorizedForScreen('admin');
                if (isAuthorized) {
                    state.setState({ screen: 'admin' });
                } else {
                    // Redirect to gateway if not authorized
                    state.setState({ screen: 'gateway' });
                    state.showToast('غير مصرح لك بالوصول إلى هذه الصفحة', 'error');
                }
            } else if (hash.startsWith('#/__manage/')) {
                const merchantId = hash.split('/')[2];
                if (merchantId) {
                    // Check authorization before allowing merchant dashboard access
                    const isAuthorized = await AuthorizationService.isAuthorizedForScreen('merchant-dashboard');
                    if (isAuthorized) {
                        state.setState({ screen: 'merchant-dashboard', merchantId: merchantId });
                    } else {
                        // Redirect to gateway if not authorized
                        state.setState({ screen: 'gateway' });
                        state.showToast('غير مصرح لك بالوصول إلى هذه الصفحة', 'error');
                    }
                }
            } else if (hash.startsWith('#/product/')) {
                const productId = hash.split('/')[2];
                if (productId) {
                    state.setState({ screen: 'product-landing', productId: productId });
                }
            }
        };

        window.addEventListener('hashchange', handleHash);
        handleHash();

        state.subscribe((s) => {
            this.navigate(s.screen, s);
        });
    }

    /**
     * Navigate to a specific screen
     * @param {string} screenName - Name of the screen to navigate to
     * @param {Object} appState - Application state to pass to the screen
     */
    async navigate(screenName, appState = {}) {
        // Check authorization for protected screens
        const protectedScreens = ['admin', 'merchant-dashboard', 'merchant', 'landing-page-editor'];
        if (protectedScreens.includes(screenName)) {
            const isAuthorized = await AuthorizationService.isAuthorizedForScreen(screenName);
            if (!isAuthorized) {
                // Redirect to gateway if not authorized
                state.setState({ screen: 'gateway' });
                state.showToast('غير مصرح لك بالوصول إلى هذه الصفحة', 'error');
                return;
            }
        }

        // Clear previous screen if needed
        this.root.innerHTML = '';

        let screenInstance;
        switch (screenName) {
            case 'gateway':
                screenInstance = new GatewayScreen({ showRegistration: appState.showRegistration });
                break;
            case 'auth':
                screenInstance = new AuthScreen();
                break;
            case 'world':
                screenInstance = new WorldScreen();
                break;
            case 'merchant':
                screenInstance = new MerchantScreen();
                break;
            case 'admin':
                screenInstance = new AdminScreen();
                break;
            case 'merchant-dashboard':
                screenInstance = new MerchantDashboardScreen({ merchantId: appState.merchantId });
                break;
            case 'landing-page-editor':
                screenInstance = new LandingPageEditorScreen({ productId: appState.productId, merchantId: appState.merchantId });
                break;
            case 'product-landing':
                screenInstance = new ProductLandingScreen({ productId: appState.productId });
                break;
            default:
                screenInstance = new GatewayScreen({ showRegistration: appState.showRegistration });
        }

        if (screenInstance) {
            // Render the screen template and set up event handlers
            this.root.innerHTML = screenInstance.template();
            screenInstance.container = this.root;

            // Call onRendered if it exists
            if (typeof screenInstance.onRendered === 'function') {
                screenInstance.onRendered();
            }
        }
    }
}

export default Router;
