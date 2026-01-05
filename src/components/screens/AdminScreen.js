import MerchantService from '../../services/merchant.service';
import state from '../../managers/state-manager';
import LocationManager from '../../managers/location-manager';

export default class AdminScreen {
  constructor(props = {}) {
    this.state = {
      pendingMerchants: [],
      loading: true
    };
  }

  async fetchPending() {
    try {
      const [pending, verified] = await Promise.all([
        MerchantService.getPendingMerchants(),
        MerchantService.getVerifiedMerchants()
      ]);

      this.state = {
        pendingMerchants: pending,
        verifiedMerchants: verified,
        loading: false
      };
    } catch (err) {
      console.error('Failed to fetch merchants', err);
      this.state = { ...this.state, loading: false };
    }
  }

  template() {
    if (this.state.loading) {
      return `<div class="p-12 text-center text-gray-500">جاري التحميل...</div>`;
    }

    return `
      <div class="min-h-screen bg-gray-50 p-6 rtl">
        <div class="max-w-5xl mx-auto">
          <header class="flex justify-between items-center mb-10">
            <h1 class="text-3xl font-black text-morroky-dark">لوحة الإدارة - المراجعة</h1>
            <button id="btn-logout" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold">خروج</button>
          </header>

                <div class="space-y-8">
                    <!-- Pending Section -->
                    <div>
                        <h2 class="font-bold text-gray-700 mb-4 px-2">تجار في انتظار التوثيق (${this.state.pendingMerchants.length})</h2>
                        <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                             ${this.state.pendingMerchants.length === 0 ? `
                                <div class="p-12 text-center text-gray-400">لا يوجد تجار حالياً للمراجعة.</div>
                              ` : this.state.pendingMerchants.map(m => `
                                <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                                  <div>
                                    <h3 class="text-xl font-bold text-gray-900">${m.name}</h3>
                                    <p class="text-sm text-gray-500 mt-1">📞 ${m.phone || 'بدون هاتف'}</p>
                                    <p class="text-xs text-morroky-green font-medium mt-2">📍 ${LocationManager.formatAddress(m.location || {})}</p>
                                  </div>
                                  <div class="flex gap-2">
                                    <button data-id="${m.id}" class="btn-verify bg-morroky-green text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">
                                      ✔️ توثيق المحل
                                    </button>
                                    <a href="#/__manage/${m.id}" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform flex items-center">
                                      ⚙️ إدارة
                                    </a>
                                  </div>
                                </div>
                              `).join('')}
                        </div>
                    </div>

                    <!-- Verified Section -->
                    <div>
                        <h2 class="font-bold text-gray-700 mb-4 px-2">تجار موثقين (${this.state.verifiedMerchants?.length || 0})</h2>
                         <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                             ${!this.state.verifiedMerchants || this.state.verifiedMerchants.length === 0 ? `
                                <div class="p-12 text-center text-gray-400">لا يوجد تجار موثقين.</div>
                              ` : this.state.verifiedMerchants.map(m => `
                                <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div>
                                    <h3 class="text-xl font-bold text-gray-900">${m.name}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                         <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">موثق ✅</span>
                                         <p class="text-sm text-gray-500">📞 ${m.phone || 'بدون هاتف'}</p>
                                    </div>
                                  </div>
                                  <div class="flex gap-2">
                                    <a href="#/__manage/${m.id}" class="bg-gray-100 text-gray-700 border border-gray-200 px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center">
                                      ⚙️ إعدادات المتجر
                                    </a>
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

  async onRendered() {
    // Fetch data first
    await this.fetchPending();

    // Handling logout
    // Event Delegation for robust handling
    this.container.addEventListener('click', async (e) => {
      // Handle Logout
      if (e.target.id === 'btn-logout') {
        state.setState({ screen: 'gateway', isAdmin: false });
        return;
      }

      // Handle Verification (Delegated)
      const btn = e.target.closest('.btn-verify');
      if (btn) {
        const id = btn.getAttribute('data-id');
        // No confirm dialog causing issues

        try {
          btn.disabled = true;
          btn.innerText = '⏳ جاري التوثيق...';

          await MerchantService.verifyMerchant(id);

          alert('✅ تم التوثيق بنجاح!');
          await this.fetchPending();
        } catch (err) {
          console.error("Verification failed:", err);
          alert('❌ خطأ: ' + err.message);
          btn.disabled = false;
          btn.innerText = '✔️ توثيق المحل';
        }
      }
    });
  }
}
