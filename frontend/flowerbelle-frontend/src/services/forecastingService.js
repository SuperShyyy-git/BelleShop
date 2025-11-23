import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = 'http://localhost:8000/api/forecasting';

// Get auth token from Cookies
const getAuthHeader = () => {
  const token = Cookies.get('access_token');
  
  // Debug logging
  console.log('🔑 Token from Cookies:', token ? 'Found' : 'Missing');
  if (token) {
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
  } else {
    console.error('❌ No token found! User needs to log in.');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

const forecastingService = {
  // Generate a new forecast for a product
  generateForecast: async (productId, forecastDays = 30, trainingDays = 90) => {
    try {
      // Ensure all values are integers
      const payload = {
        product_id: parseInt(productId),
        forecast_days: parseInt(forecastDays),
        training_days: parseInt(trainingDays)
      };
      
      console.log('🚀 Generating forecast via service...', payload);
      
      const response = await axios.post(
        `${API_URL}/generate/`,
        payload,
        { headers: getAuthHeader() }
      );
      
      console.log('✅ Forecast generated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error generating forecast:', error.response?.data || error.message);
      console.error('❌ Full error details:', error.response);
      throw error;
    }
  },

  // Get forecast summary for a specific product
  getForecastSummary: async (productId) => {
    try {
      console.log('📊 Fetching forecast summary for product:', productId);
      // FIX: Added 'forecasts/' to match Django URL pattern
      const response = await axios.get(`${API_URL}/forecasts/summary/${productId}/`, {
        headers: getAuthHeader()
      });
      console.log('✅ Forecast summary retrieved:', response.data);
      return response;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No forecast summary found for product:', productId);
      }
      console.error('❌ Error fetching forecast summary:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all forecasts
  getAllForecasts: async () => {
    try {
      const response = await axios.get(`${API_URL}/forecasts/`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      throw error;
    }
  },

  // Get forecast for a specific product
  getForecastByProduct: async (productId) => {
    try {
      const response = await axios.get(`${API_URL}/forecasts/${productId}/`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No forecast found for product:', productId);
        return null;
      }
      console.error('Error fetching forecast:', error);
      throw error;
    }
  },

  // Get forecasting statistics
  getStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  // Delete a forecast
  deleteForecast: async (forecastId) => {
    try {
      await axios.delete(`${API_URL}/forecasts/${forecastId}/`, {
        headers: getAuthHeader()
      });
      return true;
    } catch (error) {
      console.error('Error deleting forecast:', error);
      throw error;
    }
  }
};

export default forecastingService;