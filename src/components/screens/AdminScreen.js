
import MerchantService from '../../services/merchant.service';
import state from '../../managers/state-manager';
import LocationManager from '../../managers/location-manager';
import AuthService from '../../services/auth.service.js';

export default class AdminScreen {
    constructor(container) {
        this.container = container;
        this.state = {
            pendingMerchants: [],
            verifiedMerchants: [],
            loading: true,
            error: null // To hold any potential error message
        };
        this.mount();
    }

    async mount() {
        this.render(); // Initial render with loading state
        await this.fetchMerchants();
    }

    _setState(partialState) {
        this.state = { ...this.state, ...partialState };
        this.render();
    }

    render() {
        this.container.innerHTML = this.template();
        this.bindEvents();
    }

    bindEvents() {
        this.container.addEventListener('click', async (e) => {
            if (e.target.id === 'btn-logout') {
                await AuthService.logout();
                state.setState({ screen: 'gateway'});
                window.location.hash = '#'; // Reset hash
            }

            const verifyButton = e.target.closest('.btn-verify');
            if (verifyButton) {
                const merchantId = verifyButton.dataset.id;
                this.handleVerification(verifyButton, merchantId);
            }
        });
    }

    async fetchMerchants() {
        try {
            // RLS will enforce that only admins can fetch this data.
            // If a non-admin attempts this, it will throw an error.
            const [pending, verified] = await Promise.all([
                MerchantService.getPendingMerchants(),
                MerchantService.getVerifiedMerchants()
            ]);

            this._setState({ pendingMerchants: pending, verifiedMerchants: verified, loading: false });
        } catch (err) {
            console.error('Failed to fetch merchants for admin:', err);
            // This is the crucial part: if RLS blocks the request, we catch the error
            // and display an access denied message.
            this._setState({ loading: false, error: 'Access Denied. You do not have permission to view this page.' });
        }
    }

    async handleVerification(button, merchantId) {
        button.disabled = true;
        button.innerText = '⏳ جاري التوثيق...';
        try {
            await MerchantService.verifyMerchant(merchantId);
            state.showToast('✅ تم التوثيق بنجاح!', 'success');
            await this.fetchMerchants(); // Refresh the list
        } catch (err) {
            console.error("Verification failed:", err);
            state.showToast(`❌ خطأ: ${err.message}`, 'error');
            button.disabled = false;
            button.innerText = '✔️ توثيق المحل';
        }
    }

    template() {
        if (this.state.loading) {
            return `<div class="p-12 text-center text-gray-500">Loading...</div>`;
        }

        // If RLS blocked the data fetch, show an error screen.
        if (this.state.error) {
            return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 bg-white rounded-3xl shadow-xl max-w-md">
                        <h2 class="text-2xl font-black text-red-600 mb-4">وصول مرفوض</h2>
                        <p class="text-gray-600 mb-6">ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة. يرجى تسجيل الدخول بحساب مسؤول.</p>
                        <button id="btn-logout" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة وتسجيل الدخول</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="min-h-screen bg-gray-50 p-6 rtl">
                <div class="max-w-5xl mx-auto">
                    <header class="flex justify-between items-center mb-10">
                        <h1 class="text-3xl font-black text-morroky-dark">Admin Dashboard</h1>
                        <button id="btn-logout" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold">Logout</button>
                    </header>

                    <div class="space-y-8">
                        <div>
                            <h2 class="font-bold text-gray-700 mb-4 px-2">Pending Merchants (${this.state.pendingMerchants.length})</h2>
                            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 divide-y divide-gray-100">
                                ${this.state.pendingMerchants.length === 0
                                    ? `<div class="p-12 text-center text-gray-400">No merchants waiting for approval.</div>`
                                    : this.state.pendingMerchants.map(m => `
                                        <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                                            <div>
                                                <h3 class="text-xl font-bold text-gray-900">${m.name}</h3>
                                                <p class="text-sm text-gray-500 mt-1">📞 ${m.phone || 'No phone'}</p>
                                                <p class="text-xs text-morroky-green font-medium mt-2">📍 ${LocationManager.formatAddress(m.location || {})}</p>
                                            </div>
                                            <div class="flex gap-2">
                                                <button data-id="${m.id}" class="btn-verify bg-morroky-green text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">✔️ Verify</button>
                                                <a href="#/__manage/${m.id}" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">⚙️ Manage</a>
                                            </div>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>

                        <div>
                            <h2 class="font-bold text-gray-700 mb-4 px-2">Verified Merchants (${this.state.verifiedMerchants.length})</h2>
                            <div class="bg-white rounded-3xl shadow-xl border border-gray-100 divide-y divide-gray-100">
                                ${this.state.verifiedMerchants.length === 0
                                    ? `<div class="p-12 text-center text-gray-400">No verified merchants yet.</div>`
                                    : this.state.verifiedMerchants.map(m => `
                                        <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h3 class="text-xl font-bold text-gray-900">${m.name}</h3>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Verified ✅</span>
                                                    <p class="text-sm text-gray-500">📞 ${m.phone || 'No phone'}</p>
                                                </div>
                                            </div>
                                            <div class="flex gap-2">
                                                <a href="#/__manage/${m.id}" class="bg-gray-100 text-gray-700 border border-gray-200 px-6 py-2 rounded-xl font-bold hover:bg-gray-200">⚙️ Settings</a>
                                            </div>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
