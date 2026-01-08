import { supabase } from './supabase';

class MerchantService {
    constructor() {
        this.tableName = 'merchants';
    }

    async registerMerchant(merchantData) {
        try {
            // Get current user to link as owner
            const { data: { user } } = await supabase.auth.getUser();
            const ownerId = user ? user.id : null;

            // Store merchant data with location as JSONB
            const { data, error } = await supabase
                .from(this.tableName)
                .insert([
                    {
                        ...merchantData,
                        status: 'pending',
                        location: merchantData.location,
                        owner_id: ownerId
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return data.id;
        } catch (e) {
            // Remove sensitive error details before rethrowing
            const error = new Error('Failed to register merchant');
            error.originalError = e;
            throw error;
        }
    }

    async getMerchantByOwnerId(userId) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('owner_id', userId)
            .single(); // Assuming one shop per merchant for now

        if (error) return null;
        return data;
    }

    async getVerifiedMerchants(filters = {}) {
        let query = supabase
            .from(this.tableName)
            .select('*')
            .eq('status', 'verified');

        // Apply filters (assuming these colums exist or we filter JSONB)
        // For simple filtering on JSONB columns in Supabase:
        if (filters.streetId) {
            query = query.eq('location->>streetId', filters.streetId);
        }
        if (filters.kissariaId) {
            query = query.eq('location->>kissariaId', filters.kissariaId);
        }
        if (filters.alley) {
            query = query.eq('location->>alley', filters.alley);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getAllMerchants(filters = {}) {
        let query = supabase
            .from(this.tableName)
            .select('*');

        // Apply filters
        if (filters.streetId) {
            query = query.eq('location->>streetId', filters.streetId);
        }
        if (filters.kissariaId) {
            query = query.eq('location->>kissariaId', filters.kissariaId);
        }
        if (filters.alley) {
            query = query.eq('location->>alley', filters.alley);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getPendingMerchants() {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    }

    async verifyMerchant(id) {
        const { error } = await supabase
            .from(this.tableName)
            .update({ status: 'verified', updated_at: new Date() })
            .eq('id', id);

        if (error) throw error;
    }

    async updateMerchantLogo(id, logoUrl) {
        const { error } = await supabase
            .from(this.tableName)
            .update({ logo_url: logoUrl })
            .eq('id', id);
        if (error) throw error;
    }

    async updateMerchantBackground(id, backgroundUrl) {
        const { error } = await supabase
            .from(this.tableName)
            .update({ background_url: backgroundUrl })
            .eq('id', id);
        if (error) throw error;
    }

    async addProduct(productData) {
        // Ensure image_urls is an array (max 4). Pad with nulls to keep a consistent length.
        const rawImages = Array.isArray(productData.image_urls)
            ? productData.image_urls
            : productData.image_urls ? [productData.image_urls] : [];
        const normalized = rawImages.slice(0, 4);
        while (normalized.length < 4) normalized.push(null);

        const processedData = {
            ...productData,
            image_urls: normalized
        };

        const { data, error } = await supabase
            .from('products')
            .insert([processedData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getProductsByMerchantId(merchantId) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async getProductById(productId) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        if (error) throw error;
        return data;
    }

    async getMerchantById(id) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    async deleteProduct(productId) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        if (error) throw error;
    }

    async updateProductImage(productId, imageUrl) {
        const { error } = await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('id', productId);
        if (error) throw error;
    }

    async updateProductImages(productId, imageUrls) {
        // Ensure imageUrls is an array
        const raw = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        const normalized = raw.slice(0, 4);
        while (normalized.length < 4) normalized.push(null);

        const { error } = await supabase
            .from('products')
            .update({ image_urls: normalized })
            .eq('id', productId);
        if (error) throw error;
    }

    async addProductImage(productId, imageUrl) {
        // Get current images and add the new one
        const product = await this.getProductById(productId);
        const currentImages = product.image_urls || [];
        const updatedImages = [...currentImages, imageUrl];

        // Limit to 4 images max
        if (updatedImages.length > 4) {
            updatedImages.splice(0, updatedImages.length - 4);
        }

        await this.updateProductImages(productId, updatedImages);
    }

    async updateProductLandingPage(productId, config) {
        const { error } = await supabase
            .from('products')
            .update({ landing_page_config: config })
            .eq('id', productId);
        if (error) throw error;
    }
}

export default new MerchantService();
