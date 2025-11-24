// File: supershyyy-git/belleshop/BelleShop-37e5086b339f270f7e9688e8de855886caaa2376/frontend/flowerbelle-frontend/src/services/forecastingService.js
import api from './api'; // <-- IMPORTANT: Use the configured api instance

// REMOVED: import axios, import authService, API_URL, and getAuthHeaders functions

// 1. Generate Forecast (POST)
export const generateForecast = async (productId, forecastDays = 30, trainingDays = 90) => {
    try {
        const payload = {
            product_id: productId,
            forecast_days: forecastDays,
            training_days: trainingDays
        };
        
        // Use the imported 'api' instance. URL path is relative.
        // It uses the correct base URL and automatically handles auth and trailing slash.
        // Expects: POST https://flowerbelle-backend.onrender.com/api/forecasting/generate/
        const response = await api.post('/forecasting/generate', payload); 
        return response.data;
    } catch (error) {
        console.error("❌ Error generating forecast:", error.message);
        throw error;
    }
};

// 2. Get Forecast Summary (GET)
export const getForecastSummary = async (productId) => {
    try {
        // Use the imported 'api' instance.
        // URL is clean: /forecasting/summary/{productId}
        // api.js ensures the correct base URL and adds the trailing slash: /api/forecasting/summary/6/
        const response = await api.get(`/forecasting/summary/${productId}`);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching forecast summary:", error.message);
        throw error;
    }
};

// 3. Get Dashboard Stats (GET)
export const getDashboardStats = async () => {
    try {
        // Use the imported 'api' instance.
        // Expects: GET https://flowerbelle-backend.onrender.com/api/forecasting/dashboard-stats/
        const response = await api.get('/forecasting/dashboard-stats');
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching dashboard stats:", error.message);
        throw error;
    }
};