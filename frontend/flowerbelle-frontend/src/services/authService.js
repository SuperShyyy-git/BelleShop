import api from './api';
import Cookies from 'js-cookie'; // <-- ADDED: For token consistency

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const authService = {
    // Login user
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login/', credentials);
            
            // Store tokens in cookies (aligning with api.js interceptor)
            if (response.data.access) {
                // Access token (short expiry, set to expire in 1 hour)
                Cookies.set(ACCESS_TOKEN_KEY, response.data.access, { expires: 1/24, sameSite: 'Strict' }); 
                // Refresh token (long expiry, set to expire in 7 days)
                Cookies.set(REFRESH_TOKEN_KEY, response.data.refresh, { expires: 7, sameSite: 'Strict' });
            }
            
            if (response.data.user) {
                // User object remains in localStorage
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            
            return response.data;
        } catch (error) {
            console.error('Login error:', error.response?.data || error);
            throw error;
        }
    },

    // Register new user
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register/', userData);
            return response.data;
        } catch (error) {
            console.error('Registration error:', error.response?.data || error);
            throw error;
        }
    },

    // Logout user
    logout: () => {
        Cookies.remove(ACCESS_TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        localStorage.removeItem('user');
    },

    // Get current user from localStorage
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    },

    // Get access token (used by api.js request interceptor)
    getToken: () => {
        return Cookies.get(ACCESS_TOKEN_KEY);
    },
    
    // Get refresh token (used by api.js response interceptor for refresh logic)
    getRefreshToken: () => {
        return Cookies.get(REFRESH_TOKEN_KEY);
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = Cookies.get(ACCESS_TOKEN_KEY);
        return !!token;
    },

    // Refresh token - Simplified to only return the refresh token utility
    // (Actual refresh logic moved to api.js interceptor)
    refreshToken: async () => {
        try {
            const refreshToken = authService.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            // Note: This block is technically redundant since api.js handles it now, but harmless.
            const response = await api.post('/auth/token/refresh/', {
                refresh: refreshToken
            });

            if (response.data.access) {
                Cookies.set(ACCESS_TOKEN_KEY, response.data.access, { expires: 1/24, sameSite: 'Strict' });
            }

            return response.data;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }
};

export default authService;
