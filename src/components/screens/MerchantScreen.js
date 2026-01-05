import state from '../../managers/state-manager';
import MerchantService from '../../services/merchant.service';
import LocationManager from '../../managers/location-manager';

export default class MerchantScreen {
  constructor(props = {}) {
    this.state = {
      merchant: null,
      products: [],
      loading: true
    };
    this.container = null;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this.container) {
      this.container.innerHTML = this.template();
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    document.getElementById('btn-home')?.addEventListener('click', () => {
      state.setState({ screen: 'world' });
    });
  }

  async onRendered() {
    const s = state.getState();
    if (s.selectedMerchantId) {
      await this.fetchMerchant(s.selectedMerchantId);
    } else {
      this.setState({ loading: false });
    }

    this.setupEventListeners();
  }

  async fetchMerchant(id) {
    try {
      const [merchant, products] = await Promise.all([
        MerchantService.getMerchantById(id),
        MerchantService.getProductsByMerchantId(id)
      ]);

      this.setState({
        merchant,
        products: products || [],
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch merchant details', err);
      this.setState({ loading: false });
    }
  }

  template() {
    if (this.state.loading) {
      return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center">
                        <div class="inline-block w-8 h-8 border-4 border-morroky-red border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p class="text-gray-500 font-bold">جاري تحميل بيانات المتجر...</p>
                    </div>
                </div>
            `;
    }

    const m = this.state.merchant;
    const products = this.state.products;

    if (!m) {
      return `
                <div class="min-h-screen flex items-center justify-center bg-gray-50 rtl">
                    <div class="text-center p-12 glass-morphism rounded-3xl max-w-md">
                        <h2 class="text-2xl font-black text-gray-800 mb-4">عذراً، المتجر غير موجود</h2>
                        <button id="btn-home" class="bg-morroky-dark text-white px-8 py-3 rounded-2xl font-bold">العودة للخريطة</button>
                    </div>
                </div>
            `;
    }

    return `
            <div class="min-h-screen bg-gray-50 rtl pb-20">
                <!-- Cover/Header Area -->
                <div class="h-64 bg-gradient-to-r from-morroky-dark to-morroky-red relative overflow-hidden">
                    <!-- Pattern overlay -->
                    <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/moroccan-flower.png')]"></div>
                    
                    <button id="btn-home" class="absolute top-6 right-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold transition-all z-20">
                        ← العودة
                    </button>
                </div>

                <div class="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
                    <div class="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div class="flex flex-col md:flex-row items-center md:items-end gap-6 w-full md:w-auto">
                            <!-- Logo -->
                            <div class="w-40 h-40 bg-white rounded-full p-2 shadow-2xl overflow-hidden border-4 border-white flex-shrink-0">
                                <img src="${m.logo_url || 'https://placehold.co/400x400?text=Store'}" class="w-full h-full rounded-full object-cover bg-gray-50" />
                            </div>
                            
                            <div class="text-center md:text-right pb-4">
                                <div class="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <span class="bg-morroky-green/10 text-morroky-green text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Verified Store</span>
                                </div>
                                <h1 class="text-4xl md:text-5xl font-black text-gray-900 mb-2">${m.name}</h1>
                                <p class="text-gray-500 font-medium text-lg flex items-center justify-center md:justify-start gap-1">
                                    📍 ${LocationManager.formatAddress(m.location || {})}
                                </p>
                            </div>
                        </div>

                        <a href="https://wa.me/${m.phone?.replace('0', '212')}?text=مرحباً، أود الاستفسار عن منتج" target="_blank" class="w-full md:w-auto bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-lg shadow-green-200 flex items-center justify-center gap-3 mb-4 md:mb-0">
                            <span>تواصل عبر واتساب</span>
                            <span class="text-2xl">💬</span>
                        </a>
                    </div>
                </div>

                <div class="max-w-6xl mx-auto px-6 mt-12">
                    <h3 class="text-2xl font-black text-gray-900 mb-8 border-b border-gray-100 pb-4 inline-block">المنتجات المميزة 🛍️</h3>
                    
                    ${products.length === 0 ? `
                        <div class="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                            <div class="text-6xl mb-4">📦</div>
                            <h3 class="text-xl font-bold text-gray-800">لا توجد منتجات حالياً</h3>
                            <p class="text-gray-400 mt-2">صاحب المتجر لم يقم بإضافة أي منتجات بعد.</p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            ${products.map(p => `
                                <div class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-gray-100 group cursor-pointer">
                                    <div class="h-64 bg-gray-100 relative overflow-hidden">
                                        <img src="${p.image_url || 'https://placehold.co/600x600?text=No+Image'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                                            <span class="text-white font-bold text-sm">عرض التفاصيل</span>
                                        </div>
                                    </div>
                                    <div class="p-5">
                                        <div class="flex justify-between items-start mb-2">
                                            <h3 class="font-bold text-gray-900 text-lg leading-tight line-clamp-2 min-h-[3rem]">${p.name}</h3>
                                        </div>
                                        <div class="flex items-center justify-between mt-4">
                                            <span class="text-2xl font-black text-morroky-blue">${p.price} <span class="text-xs text-gray-400 font-medium">DH</span></span>
                                            <button class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-morroky-red hover:text-white transition-colors">
                                                🛒
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
  }
}
