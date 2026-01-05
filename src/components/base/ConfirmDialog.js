export default class ConfirmDialog {
    constructor(props = {}) {
        this.state = {
            visible: false,
            title: '',
            message: '',
            confirmText: 'نعم',
            cancelText: 'إلغاء',
            onConfirm: null,
            onCancel: null
        };
    }

    show({ title = '', message = '', confirmText = 'نعم', cancelText = 'إلغاء', onConfirm, onCancel }) {
        this.state = {
            visible: true,
            title,
            message,
            confirmText,
            cancelText,
            onConfirm,
            onCancel
        };
        this.render();
    }

    hide() {
        this.state.visible = false;
        this.render();
    }

    confirm() {
        if (this.state.onConfirm) {
            this.state.onConfirm();
        }
        this.hide();
    }

    cancel() {
        if (this.state.onCancel) {
            this.state.onCancel();
        }
        this.hide();
    }

    render() {
        const container = this.container || document.getElementById('confirm-dialog-container');
        if (!container) {
            console.error('Confirm dialog container not found');
            return;
        }

        container.innerHTML = this.template();
    }

    template() {
        const { visible, title, message, confirmText, cancelText } = this.state;

        if (!visible) return '';

        return `
            <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform animate-fade-in-up">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-yellow-100 rounded-full mx-auto flex items-center justify-center mb-4">
                            <span class="text-3xl">⚠️</span>
                        </div>
                        ${title ? `<h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>` : ''}
                        <p class="text-gray-600 mb-6">${message}</p>
                        <div class="flex gap-3">
                            <button class="confirm-cancel-btn flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors">
                                ${cancelText}
                            </button>
                            <button class="confirm-ok-btn flex-1 bg-morroky-red text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">
                                ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    onRendered() {
        // Bind events
        const cancelBtn = this.container.querySelector('.confirm-cancel-btn');
        const okBtn = this.container.querySelector('.confirm-ok-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }

        if (okBtn) {
            okBtn.addEventListener('click', () => this.confirm());
        }

        // Close on background click
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.cancel();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.visible) {
                this.cancel();
            }
        });
    }
}
