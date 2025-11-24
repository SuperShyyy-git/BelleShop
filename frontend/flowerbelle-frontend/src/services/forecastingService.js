import axios from 'axios';
import authService from './authService';

// Use localhost for local dev, or your Render URL if deployed
const API_URL = 'http://localhost:8000/api';

const getAuthHeaders = () => {
    const token = authService.getToken ? authService.getToken() : null;
    return {
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        }
    };
};

// 1. Generate Forecast (POST)
export const generateForecast = async (productId, forecastDays = 30, trainingDays = 90) => {
    try {
        const payload = {
            product_id: productId,
            forecast_days: forecastDays,
            training_days: trainingDays
        };
        const response = await axios.post(`${API_URL}/forecasting/generate/`, payload, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("❌ Error generating forecast:", error.message);
        throw error;
    }
};

// 2. Get Forecast Summary (GET)
export const getForecastSummary = async (productId) => {
    try {
        // Matches urls.py: path('summary/<int:days>/', ...) 
        // Note: Your backend expects 'days' or 'productId'. 
        // Based on your last backend code, it was path('summary/<int:days>/').
        // Let's assume you want the forecast for a specific product ID based on your page logic.
        // If your backend view expects an ID, ensure your urls.py uses <int:product_id> or similar.
        // For now, consistent with your previous frontend attempt:
        const response = await axios.get(`${API_URL}/forecasting/summary/${productId}/`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching forecast summary:", error.message);
        throw error;
    }
};

// 3. Get Dashboard Stats (GET)
export const getDashboardStats = async () => {
    try {
        const response = await axios.get(`${API_URL}/forecasting/dashboard-stats/`, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching dashboard stats:", error.message);
        throw error;
    }
};