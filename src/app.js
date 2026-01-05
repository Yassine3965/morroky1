import './styles/main.css';
import Router from './managers/router';
import { setupAnimations } from './managers/animations';
import state from './managers/state-manager';

document.addEventListener('DOMContentLoaded', () => {
    setupAnimations();
    const router = new Router('app-root');
    router.init();

    // Force initial navigation
    const initialState = state.getState();
    router.navigate(initialState.screen, initialState);

    // Initialize toast notifications
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
    state.toast.container = document.getElementById('toast-container');
    state.toast.render();

    // Initialize confirm dialog
    document.body.insertAdjacentHTML('beforeend', '<div id="confirm-dialog-container"></div>');
    state.confirmDialog.container = document.getElementById('confirm-dialog-container');
    state.confirmDialog.render();
});
