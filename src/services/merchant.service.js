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
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
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
            .order('created_at', { ascending: false })
            .limit(50); // Limit to prevent too many
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

    async updateProductLandingPage(productId, config) {
        const { error } = await supabase
            .from('products')
            .update({ landing_page_config: config })
            .eq('id', productId);
        if (error) throw error;
    }
}

export default new MerchantService();
