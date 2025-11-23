import api from './api';

const authService = {
    // Login user
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login/', credentials);
            
            // Store token and user data in localStorage
            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);
            }
            
            if (response.data.user) {
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
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
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

    // Get token
    getToken: () => {
        return localStorage.getItem('token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        return !!token;
    },

    // Refresh token
    refreshToken: async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await api.post('/auth/token/refresh/', {
                refresh: refreshToken
            });

            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
            }

            return response.data;
        } catch (error) {
            console.error('Token refresh error:', error);
            authService.logout();
            throw error;
        }
    }
};

export default authService;