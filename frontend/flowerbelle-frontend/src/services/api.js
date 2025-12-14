import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import authService from './authService'; // <-- ADDED: For token management helpers

// --- CONFIGURATION ---
// Environment variable should be: https://flowerbelle-backend.onrender.com/api
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Debug: Log the API URL being used
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 Environment Variable:', process.env.REACT_APP_API_URL);
console.log('🔧 All Environment Variables:', process.env);

const ACCESS_TOKEN_KEY = 'access_token';

// --- Token Refresh Queue Management ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
// --- END Token Refresh Queue Management ---


const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Timeout after 30 seconds to prevent hanging requests
    timeout: 30000, 
});

// --- REQUEST INTERCEPTOR (Attach Token & Fix URL) ---
api.interceptors.request.use(
    (config) => {
        // 1. Inject Auth Token
        // NOTE: authService.js now handles getting the token from cookies, which is ideal
        const token = Cookies.get(ACCESS_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // 2. ✅ DJANGO COMPATIBILITY FIX: Ensure Trailing Slashes
        // Django defaults to APPEND_SLASH=True, so we ensure requests match that.
        if (config.url) {
            if (!config.url.includes('?')) {
                // No query params - just add slash if missing
                if (!config.url.endsWith('/')) {
                    config.url = `${config.url}/`;
                }
            } else {
                // Has query params (e.g. /sales/?period=month)
                // We need to insert the slash BEFORE the '?'
                const [path, query] = config.url.split('?');
                if (!path.endsWith('/')) {
                    config.url = `${path}/?${query}`;
                }
            }
        }
        
        // 3. Debug log for exports (Helps troubleshoot 404s)
        if (config.url && config.url.includes('export')) {
            console.log('🔍 API Request:', {
                method: config.method,
                url: config.url,
                fullURL: `${API_BASE_URL}${config.url.startsWith('/') ? config.url : '/' + config.url}`,
                params: config.params,
                responseType: config.responseType
            });
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR (Global Error Handling & Token Refresh) ---
api.interceptors.response.use(
    (response) => {
        // Success - return response as-is
        return response;
    },
    async (error) => { // <-- MADE ASYNC for token refresh logic
        const { config, response } = error;
        const originalRequest = config;
        
        // Debugging: Detailed log if an export fails
        if (originalRequest?.url?.includes('export')) {
            console.error('❌ Export API Error:', {
                status: response?.status,
                url: originalRequest?.url,
                message: error.message,
                response: response?.data
            });
        }
        
        // 1. Handle Network Errors (Server down / No internet)
        if (!response) {
            toast.error("Cannot connect to server. Check your internet.");
            return Promise.reject(error);
        }

        const isAuthRefreshEndpoint = response.config.url.includes('/auth/token/refresh/');
        
        // 2. Handle Unauthorized (401) - Token expired/invalid logic
        if (response.status === 401 && !originalRequest._retry && !isAuthRefreshEndpoint) {
            
            // Queue the failed request if a refresh is already in progress
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            // Start the refresh process
            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = authService.getRefreshToken(); // Get refresh token from authService
            
            if (refreshToken) {
                try {
                    // Use axios directly to prevent this refresh request from triggering its own infinite retry loop
                    const refreshResponse = await axios.post(
                        `${API_BASE_URL}/auth/token/refresh/`, 
                        { refresh: refreshToken }
                    );
                    
                    const newAccessToken = refreshResponse.data.access;
                    
                    // Update token in cookies for future requests
                    Cookies.set(ACCESS_TOKEN_KEY, newAccessToken, { expires: 1/24, sameSite: 'Strict' });
                    
                    // Update default header for subsequent requests
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    
                    // Retry the original failed request
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    
                    // Resolve all queued promises
                    processQueue(null, newAccessToken);

                    return api(originalRequest);

                } catch (refreshError) {
                    // If refresh failed, log out and inform the user
                    console.error('❌ Token refresh failed. Logging out.', refreshError);
                    toast.error("Session expired. Please log in again.");
                    authService.logout();
                    processQueue(refreshError, null);
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
            
            // If no refresh token exists, proceed to manual logout/redirect flow below
        }
        
        // Handle general 401 (e.g., if refresh failed or no refresh token existed)
        if (response.status === 401 && !isAuthRefreshEndpoint) {
            if (window.location.pathname !== '/login') {
                toast.error("Session expired. Please log in again.");
                authService.logout();
            }
        }
        
        // 3. Handle Not Found (404)
        if (response.status === 404) {
            // We suppress the Toast for 404s to avoid UI spam. 
            // We let the individual component handle the empty state.
            console.warn(`404 Not Found: ${originalRequest?.url}`);
        }

        // 4. Handle Server Errors (500+)
        if (response.status >= 500) {
            toast.error("Server error. Please try again later.");
        }

        return Promise.reject(error);
    }
);

export default api;
