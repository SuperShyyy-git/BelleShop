import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// --- CONFIGURATION ---
// Ensure this matches your Django backend URL
const API_BASE_URL = 'http://localhost:8000/api'; 
const ACCESS_TOKEN_KEY = 'access_token';

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

// --- RESPONSE INTERCEPTOR (Global Error Handling) ---
api.interceptors.response.use(
    (response) => {
        // Success - return response as-is
        return response;
    },
    (error) => {
        // Debugging: Detailed log if an export fails
        if (error.config?.url?.includes('export')) {
            console.error('❌ Export API Error:', {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message,
                response: error.response?.data
            });
        }
        
        // 1. Handle Network Errors (Server down / No internet)
        if (!error.response) {
            toast.error("Cannot connect to server. Check your internet.");
            return Promise.reject(error);
        }

        // 2. Handle Unauthorized (401) - Session Expired
        if (error.response.status === 401) {
            // Check if we are already on the login page to avoid loops
            if (window.location.pathname !== '/login') {
                toast.error("Session expired. Please log in again.");
                // Optional: Clear cookies logic here
                // Cookies.remove(ACCESS_TOKEN_KEY);
            }
        }
        
        // 3. Handle Not Found (404)
        if (error.response.status === 404) {
            // We suppress the Toast for 404s to avoid UI spam. 
            // We let the individual component handle the empty state.
            console.warn(`404 Not Found: ${error.config?.url}`);
        }

        // 4. Handle Server Errors (500+)
        if (error.response.status >= 500) {
            toast.error("Server error. Please try again later.");
        }

        return Promise.reject(error);
    }
);

export default api;