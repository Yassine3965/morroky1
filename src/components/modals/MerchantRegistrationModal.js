import LocationManager from '../../managers/location-manager';
import state from '../../managers/state-manager';
import MerchantService from '../../services/merchant.service';

export default class MerchantRegistrationModal {
  constructor(props = {}) {
    this.state = {
      formData: {
        name: '',
        phone: '',
        location: {}
      },
      step: 1
    };
  }

  template() {
    return `
      <div id="modal-container" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
          <div class="p-8">
            <div class="flex justify-between items-center mb-8">
              <h2 class="text-3xl font-black text-morroky-dark">تسجيل محل جديد</h2>
              <button id="close-modal" class="text-gray-400 hover:text-morroky-red transition-colors text-2xl">&times;</button>
            </div>

            <form id="registration-form" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="block text-sm font-bold text-gray-700">اسم المحل</label>
                  <input name="name" type="text" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morroky-red focus:border-transparent outline-none transition-all" placeholder="مثلاً: ملابس الأناقة">
                </div>
                <div class="space-y-2">
                  <label class="block text-sm font-bold text-gray-700">رقم الهاتف (واتساب)</label>
                  <input name="phone" type="tel" required class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-morroky-red focus:border-transparent outline-none transition-all" placeholder="06XXXXXXXX">
                </div>
              </div>

              <div class="border-t border-gray-100 pt-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">الموقع الدقيق (درب عمر)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Static Fields -->
                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">المدينة</label>
                    <input type="text" disabled value="الدار البيضاء" class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                  </div>
                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">السوق</label>
                    <input type="text" disabled value="درب عمر" class="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                  </div>

                  <!-- Dynamic Selects -->
                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">الشارع</label>
                    <select id="select-street" name="loc-street" required class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-morroky-green outline-none">
                      <option value="">اختر الشارع...</option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">القيسارية</label>
                    <select id="select-kissaria" name="loc-kissaria" disabled required class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-morroky-green outline-none">
                      <option value="">اختر الشارع أولاً...</option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">الزقة/الممر</label>
                    <select id="select-alley" name="loc-alley" disabled required class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-morroky-green outline-none">
                      <option value="">اختر القيسارية أولاً...</option>
                    </select>
                  </div>

                  <div class="space-y-1">
                    <label class="block text-xs font-bold text-gray-500">رقم المحل</label>
                    <input name="loc-shopNumber" type="text" required class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-morroky-green outline-none" placeholder="مثلاً: 12">
                  </div>
                </div>
              </div>

              <div class="pt-6">
                <button id="submit-btn" type="submit" class="w-full bg-morroky-red text-white py-4 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg select-none">
                  إرسال للتوثيق
                </button>
                <p class="text-xs text-gray-400 text-center mt-4">
                  بمجرد الإرسال، سيتم مراجعة طلبك وتوثيق محلك ليظهر للجميع.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  async onRendered() {
    const form = document.getElementById('registration-form');
    const streetSelect = document.getElementById('select-street');
    const kissariaSelect = document.getElementById('select-kissaria');
    const alleySelect = document.getElementById('select-alley');

    // Load initial streets
    const streets = await LocationManager.getOptions('street');
    streets.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      streetSelect.appendChild(opt);
    });

    streetSelect.addEventListener('change', async (e) => {
      const streetId = e.target.value;
      kissariaSelect.innerHTML = '<option value="">اختر القيسارية...</option>';
      kissariaSelect.disabled = !streetId;
      alleySelect.innerHTML = '<option value="">اختر القيسارية أولاً...</option>';
      alleySelect.disabled = true;

      if (streetId) {
        const kissariat = await LocationManager.getOptions('kissaria', { streetId });
        kissariat.forEach(k => {
          const opt = document.createElement('option');
          opt.value = k.id;
          opt.textContent = k.name;
          kissariaSelect.appendChild(opt);
        });
      }
    });

    kissariaSelect.addEventListener('change', async (e) => {
      const kissariaId = e.target.value;
      const streetId = streetSelect.value;
      alleySelect.innerHTML = '<option value="">اختر الزقة...</option>';
      alleySelect.disabled = !kissariaId;

      if (kissariaId) {
        const alleys = await LocationManager.getOptions('alley', { streetId, kissariaId });
        alleys.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.id;
          opt.textContent = a.name;
          alleySelect.appendChild(opt);
        });
      }
    });

    document.getElementById('close-modal').addEventListener('click', () => {
      this.container.innerHTML = '';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerText = 'جاري الإرسال...';

      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        location: {
          city: 'الدار البيضاء',
          market: 'درب عمر',
          streetId: formData.get('loc-street'),
          streetName: streetSelect.options[streetSelect.selectedIndex].text,
          kissariaId: formData.get('loc-kissaria'),
          kissariaName: kissariaSelect.options[kissariaSelect.selectedIndex].text,
          alley: formData.get('loc-alley'),
          shopNumber: formData.get('loc-shopNumber')
        }
      };

      try {
        const merchantId = await MerchantService.registerMerchant(data);
        // alert('تم إرسال طلبك بنجاح! سنقوم بالتواصل معك قريباً.'); // Removed
        this.container.innerHTML = '';

        // Redirect to Dashboard immediately
        state.setState({ screen: 'merchant-dashboard', merchantId: merchantId });
      } catch (err) {
        alert('حدث خطأ أثناء الإرسال. يرجى المحاولة لاحقاً.');
        submitBtn.disabled = false;
        submitBtn.innerText = 'إرسال للتوثيق';
      }
    });

    // Close on backdrop click
    document.getElementById('modal-container').addEventListener('click', (e) => {
      if (e.target.id === 'modal-container') {
        this.container.innerHTML = '';
      }
    });
  }
}
