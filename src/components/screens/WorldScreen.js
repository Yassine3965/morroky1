import state from '../../managers/state-manager';
import MerchantRegistrationModal from '../modals/MerchantRegistrationModal';
import MerchantService from '../../services/merchant.service';
import LocationManager from '../../managers/location-manager';

export default class WorldScreen {
  constructor(props = {}) {
    this.state = {
      merchants: [],
      loading: true,
      filters: {
        streetId: '',
        kissariaId: '',
        alley: ''
      },
      options: {
        streets: [],
        kissarias: [],
        alleys: []
      }
    };
  }

  async onRendered() {
    // Initial fetch
    await Promise.all([
      this.fetchMerchants(),
      this.loadStreets()
    ]);

    this.bindEvents();
  }

  bindEvents() {
    // Navigation
    document.getElementById('btn-back')?.addEventListener('click', () => {
      state.setState({ screen: 'gateway' });
    });

    document.getElementById('btn-register-merchant')?.addEventListener('click', () => {
      const modalRoot = document.getElementById('modals-root');
      const registrationModal = new MerchantRegistrationModal();
      registrationModal.mount(modalRoot);
    });

    // Merchant Card Clicks
    this.container.querySelectorAll('.merchant-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Check if card is just for visual (optional, depending on reqs, but here enabled)
        const id = card.getAttribute('data-id');
        state.setState({ screen: 'merchant', selectedMerchantId: id });
      });
    });

    // Filter Change Handlers
    const streetSelect = document.getElementById('filter-street');
    const kissariaSelect = document.getElementById('filter-kissaria');
    const alleySelect = document.getElementById('filter-alley');

    streetSelect?.addEventListener('change', async (e) => {
      const streetId = e.target.value;
      const newFilters = { streetId, kissariaId: '', alley: '' };

      // Update Options
      const kissarias = streetId ? await LocationManager.getOptions('kissaria', { streetId }) : [];

      this.state = {
        filters: newFilters,
        options: { ...this.state.options, kissarias, alleys: [] },
        loading: true // Show spinner while re-fetching
      };
      await this.fetchMerchants();
    });

    kissariaSelect?.addEventListener('change', async (e) => {
      const kissariaId = e.target.value;
      const newFilters = { ...this.state.filters, kissariaId, alley: '' };

      // Update Options
      const alleys = kissariaId ? await LocationManager.getOptions('alley', {
        streetId: this.state.filters.streetId,
        kissariaId
      }) : [];

      this.state = {
        filters: newFilters,
        options: { ...this.state.options, alleys },
        loading: true
      };
      await this.fetchMerchants();
    });

    alleySelect?.addEventListener('change', async (e) => {
      const alley = e.target.value;
      const newFilters = { ...this.state.filters, alley };
      this.state = { ...this.state, filters: newFilters, loading: true };
      await this.fetchMerchants();
    });

    // Rejection reasons click
    this.container.querySelectorAll('[data-merchant-id-rejections]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click navigation
        const merchantId = el.getAttribute('data-merchant-id-rejections');
        const merchant = this.state.merchants.find(m => m.id === merchantId);
        
        if (merchant) {
          // Placeholder data for rejection reasons
          const reasons = merchant.rejection_reasons || ['المنتج لا يطابق الوصف', 'جودة سيئة'];
          const reasonsText = reasons.map(r => `- زبون: ${r}`).join('\n');
          alert(`أسباب الرفض لمتجر ${merchant.name}:\n\n${reasonsText}`);
        }
      });
    });

    // Show address click
    this.container.querySelectorAll('.show-address-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click navigation
        const merchantId = btn.getAttribute('data-merchant-id-address');
        const addressContainer = this.container.querySelector(`#address-container-${merchantId}`);
        if (addressContainer) {
          addressContainer.style.display = 'block';
          btn.style.display = 'none';
        }
      });
    });
  }

  async loadStreets() {
    const streets = await LocationManager.getOptions('street');
    this.state = { ...this.state, options: { ...this.state.options, streets } };
  }

  async fetchMerchants() {
    try {
      // Filter out empty strings from filters object to avoid sending empty queries
      const activeFilters = {};
      Object.keys(this.state.filters).forEach(key => {
        if (this.state.filters[key]) activeFilters[key] = this.state.filters[key];
      });

      const merchants = await MerchantService.getAllMerchants(activeFilters);
      this.state = { ...this.state, merchants, loading: false };
    } catch (err) {
      console.error('Failed to fetch merchants', err);
      this.state = { ...this.state, loading: false };
    }
  }

  template() {
    const s = state.getState();
    const { filters, options, merchants, loading } = this.state;

    const renderStars = (rating) => {
      let stars = '';
      const fullStars = Math.floor(rating);
      const halfStar = rating % 1 !== 0;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
      for (let i = 0; i < fullStars; i++) {
        stars += '<span class="text-yellow-400 text-lg">★</span>';
      }
      if (halfStar) {
        // For simplicity, showing a full star for a half star. Can be improved with a proper half-star icon.
        stars += '<span class="text-yellow-400 text-lg">★</span>';
      }
      for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="text-gray-300 text-lg">★</span>';
      }
      return stars;
    };

    return `
      <div class="min-h-screen flex flex-col bg-gray-50 rtl">
        <!-- Header -->
        <header class="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div class="flex items-center space-x-4 space-x-reverse">
            <h2 class="text-2xl font-black text-morroky-red">MORROKY</h2>
            <div class="h-6 w-px bg-gray-200 mx-4"></div>
            <span class="text-gray-600 font-medium">${s.userType === 'merchant' ? 'لوحة التاجر' : 'استكشاف الأسواق'}</span>
          </div>
          
          <button id="btn-back" class="text-sm text-gray-500 hover:text-morroky-red transition-colors">
            خروج
          </button>
        </header>

        <!-- Main Content -->
        <main class="flex-1 p-6">
          <div class="max-w-7xl mx-auto">
            <div class="glass-morphism rounded-3xl p-8 mb-8 text-center border-dashed border-2 border-gray-200">
              <h3 class="text-3xl font-bold text-gray-800 mb-4">مرحباً بك في عالم موروكي</h3>
              <p class="text-gray-600 max-w-2xl mx-auto">
                هذه هي الخريطة الرقمية للأسواق المغربية. استكشف محلات درب عمر الموثقة.
              </p>
            </div>

            <!-- Filter Bar -->
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
                <div class="flex flex-col md:flex-row items-center gap-4">
                    <div class="flex items-center gap-2 text-morroky-dark font-bold whitespace-nowrap">
                        <span class="text-xl">🔍</span>
                        <span>تصفية حسب:</span>
                    </div>
                    
                    <select id="filter-street" class="w-full md:w-auto flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morroky-red outline-none transition-all">
                        <option value="">كل الشوارع</option>
                        ${options.streets.map(opt => `<option value="${opt.id}" ${filters.streetId === opt.id ? 'selected' : ''}>${opt.name}</option>`).join('')}
                    </select>

                    <select id="filter-kissaria" ${!filters.streetId ? 'disabled' : ''} class="w-full md:w-auto flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morroky-red outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">كل القيساريات</option>
                        ${options.kissarias.map(opt => `<option value="${opt.id}" ${filters.kissariaId === opt.id ? 'selected' : ''}>${opt.name}</option>`).join('')}
                    </select>

                    <select id="filter-alley" ${!filters.kissariaId ? 'disabled' : ''} class="w-full md:w-auto flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morroky-red outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">كل الأزقة</option>
                        ${options.alleys.map(opt => `<option value="${opt.id}" ${filters.alley === opt.id ? 'selected' : ''}>${opt.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Content Area -->
            <div class="mb-10 min-h-[400px]">
                    <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-black text-gray-900">المحلات الموثقة</h2>
                    <div class="flex items-center gap-3">
                        <span class="bg-morroky-green/10 text-morroky-green px-3 py-1 rounded-full text-xs font-bold">
                            ${merchants.length} متجر متوفر
                        </span>
                    </div>
                </div>

                ${loading ? `
                    <div class="flex flex-col items-center justify-center py-20">
                        <div class="w-12 h-12 border-4 border-morroky-red border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p class="text-gray-400 font-bold">جاري تحديث القائمة...</p>
                    </div>
                ` : merchants.length === 0 ? `
                    <div class="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-gray-100">
                        <div class="text-6xl mb-4 opacity-20">🏪</div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">لا يوجد تجار هنا حالياً</h3>
                        <p class="text-gray-500">حاول تغيير خيارات التصفية للعثور على المزيد.</p>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        ${merchants.map(m => {
                          // Placeholder data for new fields
                          const rating = m.rating || 4.5;
                          const successful_sales = m.successful_sales || 123;
                          const unsuccessful_sales = m.unsuccessful_sales || 4;
                          const background_url = m.background_url || ''; // Placeholder for background image

                          return `
                            <div data-id="${m.id}" class="merchant-card relative bg-white rounded-3xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer border-2 border-transparent hover:border-morroky-gold">
                                
                                <!-- Faded Background Image -->
                                ${background_url ? `<img src="${background_url}" alt="" class="absolute inset-0 w-full h-full object-cover opacity-10">` : ''}

                                <!-- Content Container -->
                                <div class="relative p-5 flex flex-col justify-between h-full">
                                    <div>
                                        <!-- Header with Logo and Name -->
                                        <div class="flex items-center gap-4 mb-4">
                                            <div class="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden shadow-md border-2 border-gray-100 bg-white">
                                                <img src="${m.logo_url || 'https://placehold.co/100x100?text=Logo'}" alt="${m.name} Logo" class="w-full h-full object-cover">
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex justify-between items-start">
                                                    <h3 class="text-xl font-black text-gray-900">${m.name}</h3>
                                                    ${m.status === 'verified' ? `
                                                        <div class="flex-shrink-0 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-1" title="متجر موثق">
                                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                                <!-- Ratings -->
                                                <div class="flex items-center gap-2">
                                                    <div class="flex items-center">
                                                        ${renderStars(rating)}
                                                    </div>
                                                    <span class="text-xs text-gray-500 font-bold">(${rating.toFixed(1)})</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Sales Stats -->
                                        <div class="flex items-center gap-4 text-xs">
                                            <div class="flex items-center gap-1 text-green-600 font-bold">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                                <span>${successful_sales} بيع ناجح</span>
                                            </div>
                                            <div class="flex items-center gap-1 text-red-600 font-bold cursor-pointer hover:underline" data-merchant-id-rejections="${m.id}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                <span>${unsuccessful_sales} بيع غير ناجح</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Address Button and Container -->
                                    <div class="mt-4">
                                        <button data-merchant-id-address="${m.id}" class="show-address-btn w-full text-center px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-bold">
                                            اظهر عنوان هذا المحل
                                        </button>
                                        <div id="address-container-${m.id}" class="text-sm text-gray-500 mt-2 font-medium" style="display: none;">
                                            ${LocationManager.formatAddress(m.location || {})}
                                        </div>
                                    </div>
                                </div>
                            </div>
                          `;
                        }).join('')}
                    </div>
                `}
            </div>

            ${s.userType === 'merchant' ? `
              <div class="flex justify-center mt-12 pb-12">
                <button id="btn-register-merchant" class="bg-morroky-dark text-white px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-2xl flex items-center gap-3">
                  <span>سجل محلك الآن</span>
                  <span class="text-xl">🚀</span>
                </button>
              </div>
            ` : ''}
          </div>
        </main>
      </div>
    `;
  }
}
