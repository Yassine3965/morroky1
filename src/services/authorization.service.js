import { supabase } from './supabase';
import AuthService from './auth.service';

/**
 * Authorization Service
 * Handles role-based access control and user permissions
 */
class AuthorizationService {
    constructor() {
        this.currentUserRole = null;
        this.authSubscription = null;
    }

    /**
     * Initialize authorization service and set up auth state listener
     */
    init() {
        this.authSubscription = AuthService.onAuthStateChange(async (event, session) => {
            try {
                if (session && session.user && session.user.id) {
                    await this.fetchUserRole(session.user.id);
                } else {
                    this.currentUserRole = null;
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                this.currentUserRole = null;
            }
        });
    }

    /**
     * Fetch user role from Supabase metadata
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} User role or null
     */
    async fetchUserRole(userId) {
        try {
            // Get user metadata from Supabase
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error('Error fetching user:', error);
                this.currentUserRole = null;
                return null;
            }

            if (!user) {
                this.currentUserRole = null;
                return null;
            }

            // Check if user has role in user_metadata
            if (user.user_metadata && user.user_metadata.role) {
                this.currentUserRole = user.user_metadata.role;
                return this.currentUserRole;
            }

            // If no role in metadata, check if user is admin by checking admin table
            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (adminData && adminData.role) {
                this.currentUserRole = adminData.role;
                return this.currentUserRole;
            }

            // If no admin role found, check if user has merchant role
            const { data: merchantData, error: merchantError } = await supabase
                .from('merchants')
                .select('id')
                .eq('owner_id', userId)
                .single();

            if (merchantData) {
                this.currentUserRole = 'merchant';
                return this.currentUserRole;
            }

            // Default role for authenticated users
            this.currentUserRole = 'buyer';
            return this.currentUserRole;

        } catch (error) {
            console.error('Error fetching user role:', error);
            this.currentUserRole = null;
            return null;
        }
    }

    /**
     * Get current user role
     * @returns {string|null} Current user role or null if not authenticated
     */
    getCurrentRole() {
        return this.currentUserRole;
    }

    /**
     * Check if user has required role
     * @param {string|string[]} requiredRoles - Required role(s)
     * @returns {boolean} True if user has required role
     */
    hasRole(requiredRoles) {
        if (!this.currentUserRole) return false;

        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(this.currentUserRole);
        }

        return this.currentUserRole === requiredRoles;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is authenticated
     */
    async isAuthenticated() {
        const user = await AuthService.getCurrentUser();
        return !!user;
    }

    /**
     * Check if user is authorized for a specific screen
     * @param {string} screenName - Screen name to check authorization for
     * @returns {Promise<boolean>} True if user is authorized
     */
    async isAuthorizedForScreen(screenName) {
        const isAuth = await this.isAuthenticated();

        if (!isAuth) {
            return false;
        }

        // Define screen roles
        const screenRoles = {
            'gateway': ['buyer', 'merchant', 'admin'],
            'auth': ['buyer', 'merchant', 'admin'],
            'world': ['buyer', 'merchant', 'admin'],
            'merchant': ['merchant', 'admin'],
            'admin': ['admin'],
            'merchant-dashboard': ['merchant', 'admin'],
            'landing-page-editor': ['merchant', 'admin'],
            'product-landing': ['buyer', 'merchant', 'admin']
        };

        const requiredRoles = screenRoles[screenName] || ['buyer'];

        return this.hasRole(requiredRoles);
    }

    /**
     * Clean up authorization service
     */
    cleanup() {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
    }
}

export default new AuthorizationService();
