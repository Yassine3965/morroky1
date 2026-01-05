import Toast from '../components/base/Toast.js';
import ConfirmDialog from '../components/base/ConfirmDialog.js';

/**
 * Global State Manager for the Morroky application
 * Handles application state, toast notifications, and confirmation dialogs
 *
 * Features:
 * - Centralized state management
 * - Pub/Sub pattern for state changes
 * - Integrated toast notifications
 * - Confirmation dialog management
 */
class StateManager {
    constructor() {
        this.state = {
            screen: 'gateway', // gateway, world, merchant
            userType: null,    // buyer, merchant
            location: {
                city: null,
                district: null,
                market: null,
                street: null,
                kissaria: null,
                alley: null,
                shopNumber: null
            },
            selectedMerchant: null,
            currentUser: null,
            isLoading: false,
            error: null
        };
        this.subscribers = [];
        this.toast = new Toast();
        this.confirmDialog = new ConfirmDialog();
    }

    /**
     * Subscribe to state changes
     * @param {Function} fn - Callback function to receive state updates
     * @returns {Function} Unsubscribe function
     */
    subscribe(fn) {
        this.subscribers.push(fn);
        // Call immediately with current state
        fn(this.state);
        return () => {
            this.subscribers = this.subscribers.filter(subscriber => subscriber !== fn);
        };
    }

    /**
     * Update application state
     * @param {Object} partial - Partial state to merge with current state
     */
    setState(partial) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...partial };

        // Only notify if state actually changed
        if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
            this.subscribers.forEach(fn => fn(this.state));
        }
    }

    /**
     * Get current application state
     * @returns {Object} Current state
     */
    getState() {
        return this.state;
    }

    // Toast notification methods

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, info)
     * @param {number} duration - Display duration in milliseconds
     */
    showToast(message, type = 'success', duration = 3000) {
        this.toast.show(message, type, duration);
    }

    /**
     * Hide current toast notification
     */
    hideToast() {
        this.toast.hide();
    }

    // Confirm dialog methods

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     */
    showConfirm(options) {
        this.confirmDialog.show(options);
    }

    /**
     * Hide confirmation dialog
     */
    hideConfirm() {
        this.confirmDialog.hide();
    }
}

export default new StateManager();
