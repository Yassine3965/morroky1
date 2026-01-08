export default class ProductDetailScreen {
    constructor(container, { productId }) {
        this.container = container;
        this.productId = productId;
        this.state = {
            product: null,
            loading: true,
            error: null,
            currentImageIndex: 0
        };
        this.render();
        this.fetchData();
    }

    async fetchData() {
        this._setState({ loading: true });
        try {
            // Import here to avoid circular dependencies
            const { default: MerchantService } = await import('../../services/merchant.service');
            const product = await MerchantService.getProductById(this.productId);

            if (!product) {
                throw new Error('Product not found');
            }

            this._setState({
                product,
                loading: false,
                error: null,
                currentImageIndex: 0
            });
        } catch (err) {
            console.error('Failed to fetch product:', err);
            this._setState({ loading: false, error: 'Product not found' });
        }
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
        // Thumbnail click handlers
        this.container.addEventListener('click', (e) => {
            const target = e.target;

            // Back button
            if (target.id === 'back-btn') {
                const state = window.appState || {};
                state.setState({ screen: 'world' });
                window.location.hash = '#';
                return;
            }

            // Thumbnail click
            const thumbnail = target.closest('.thumbnail');
            if (thumbnail) {
                const index = parseInt(thumbnail.dataset.index);
                this._setState({ currentImageIndex: index });
            }
        });
    }

    template() {
        if (this.state.loading) {
            return `
                <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-morroky-blue"></div>
                </div>
            `;
        }

        if (this.state.error || !this.state.product) {
            return `
                <div class="min-h-screen bg-gray-50 flex items-center justify-center rtl">
                    <div class="text-center p-12 bg-white rounded-3xl shadow-xl max-w-md">
                        <h2 class="text-2xl font-black text-red-600 mb-4">المنتج غير موجود</h2>
                        <p class="text-gray-600 mb-6">لم نتمكن من العثور على المنتج المطلوب.</p>
                        <button id="back-btn" class="bg-morroky-blue text-white px-8 py-3 rounded-2xl font-bold">العودة</button>
                    </div>
                </div>
            `;
        }

        const { product, currentImageIndex } = this.state;
        const images = product.image_urls || [];
        const currentImage = images[currentImageIndex] || 'https://placehold.co/600x600';

        // Prepare up to 3 thumbnails (exclude current image to avoid duplicate)
        const thumbnails = images
            .map((img, idx) => ({ img, idx }))
            .filter(({ idx }) => idx !== currentImageIndex)
            .slice(0, 3);

        return `
            <div class="min-h-screen bg-gray-50 rtl">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b">
                    <div class="max-w-6xl mx-auto px-6 py-4">
                        <div class="flex items-center justify-between">
                            <button id="back-btn" class="flex items-center text-gray-600 hover:text-morroky-blue transition">
                                <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                                العودة
                            </button>
                            <h1 class="text-2xl font-bold text-gray-900">${product.name}</h1>
                            <div class="w-20"></div> <!-- Spacer -->
                        </div>
                    </div>
                </header>

                <!-- Product Content -->
                <div class="max-w-6xl mx-auto px-6 py-8">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <!-- Image Gallery -->
                        <div class="space-y-4">
                            <!-- Main Image -->
                            <div class="aspect-square bg-white rounded-2xl shadow-lg overflow-hidden">
                                <img
                                    src="${currentImage}"
                                    alt="${product.name}"
                                    class="w-full h-full object-cover"
                                    id="main-image"
                                />
                            </div>

                            <!-- Thumbnails (up to 3) -->
                            ${thumbnails.length > 0 ? `
                                <div class="flex items-center gap-3">
                                    ${thumbnails.map(t => `
                                        <div class="thumbnail w-20 h-20 bg-white rounded-lg overflow-hidden border-2 cursor-pointer transition ${
                                            t.idx === currentImageIndex ? 'border-morroky-blue' : 'border-gray-200 hover:border-gray-300'
                                        }" data-index="${t.idx}">
                                            <img
                                                src="${t.img}"
                                                alt="صورة ${t.idx + 1}"
                                                class="w-full h-full object-cover"
                                            />
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Product Info -->
                        <div class="space-y-6">
                            <div>
                                <h1 class="text-3xl font-black text-gray-900 mb-2">${product.name}</h1>
                                <div class="flex items-center space-x-4 rtl:space-x-reverse">
                                    <span class="text-3xl font-bold text-morroky-green">${product.price} درهم</span>
                                </div>
                            </div>

                            <!-- Description -->
                            ${product.description ? `
                                <div>
                                    <h3 class="text-lg font-bold text-gray-900 mb-3">الوصف</h3>
                                    <p class="text-gray-600 leading-relaxed">${product.description}</p>
                                </div>
                            ` : ''}

                            <!-- Additional Info -->
                            <div class="bg-gray-50 rounded-xl p-6">
                                <h3 class="text-lg font-bold text-gray-900 mb-4">معلومات إضافية</h3>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">المعرف:</span>
                                        <span class="font-medium">${product.id}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">عدد الصور:</span>
                                        <span class="font-medium">${images.length}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">تاريخ الإضافة:</span>
                                        <span class="font-medium">${new Date(product.created_at).toLocaleDateString('ar')}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="space-y-3">
                                <button class="w-full bg-morroky-blue text-white font-bold py-4 rounded-xl hover:bg-morroky-dark transition">
                                    تواصل مع التاجر
                                </button>
                                <button class="w-full border-2 border-morroky-blue text-morroky-blue font-bold py-4 rounded-xl hover:bg-morroky-blue hover:text-white transition">
                                    مشاركة المنتج
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
