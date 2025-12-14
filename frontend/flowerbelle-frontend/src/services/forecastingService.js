// File: src/services/forecastingService.js
import api from './api';

// 1. Generate Forecast (POST)
export const generateForecast = async (productId, forecastDays = 30, trainingDays = 365) => {
    try {
        const payload = {
            product_id: productId,
            forecast_days: forecastDays,
            training_days: trainingDays
        };
        
        // Added trailing slash '/' which is standard for Django APIs
        const response = await api.post('/forecasting/generate/', payload); 
        return response.data;
    } catch (error) {
        // Improved error logging
        console.error("❌ Error generating forecast:", error.response?.data || error.message);
        throw error;
    }
};

// 2. Get Forecast Summary (GET)
export const getForecastSummary = async (productId) => {
    try {
        // Added trailing slash
        const response = await api.get(`/forecasting/summary/${productId}/`);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching forecast summary:", error.message);
        throw error;
    }
};

// 3. Get Dashboard Stats (GET)
export const getDashboardStats = async () => {
    try {
        // Added trailing slash
        const response = await api.get('/forecasting/dashboard-stats/');
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching dashboard stats:", error.message);
        throw error;
    }
};
