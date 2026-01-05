export default class Toast {
    constructor(props = {}) {
        this.state = {
            visible: false,
            message: '',
            type: 'success', // 'success', 'error', 'info'
            duration: 3000
        };
        this.timeoutId = null;
    }

    show(message, type = 'success', duration = 3000) {
        this.state = {
            visible: true,
            message,
            type,
            duration
        };

        // Render immediately
        this.render();

        // Auto hide after duration
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
            this.hide();
        }, duration);
    }

    hide() {
        this.state.visible = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.render();
    }

    render() {
        const container = this.container || document.getElementById('toast-container');
        if (!container) {
            // Silently fail in production - container will be created by app initialization
            return;
        }

        container.innerHTML = this.template();
    }

    template() {
        const { visible, message, type } = this.state;

        if (!visible) return '';

        const typeClasses = {
            success: 'bg-green-500 border-green-600',
            error: 'bg-red-500 border-red-600',
            info: 'bg-blue-500 border-blue-600'
        };

        const icon = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        return `
            <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
                <div class="flex items-center gap-3 ${typeClasses[type]} text-white px-6 py-4 rounded-xl shadow-lg border-l-4 min-w-80 max-w-md">
                    <div class="text-2xl">${icon[type]}</div>
                    <div class="flex-1 text-sm font-medium">${message}</div>
                    <button class="text-white/80 hover:text-white text-xl" onclick="this.closest('.fixed').remove()">&times;</button>
                </div>
            </div>
        `;
    }
}
