// src/services/posService.js

import api from './api';

const posService = {
  // Create a new sales transaction (checkout)
  // ✅ FIX: No colon, no ID. Just POST to the collection.
  checkout: async (transactionData) => {
    return await api.post('/pos/transactions/', transactionData);
  },

  // Get all transactions
  getTransactions: async (params = {}) => {
    return await api.get('/pos/transactions/', { params });
  },

  // Get single transaction
  // ✅ FIX: Used backticks ` ` for template literal
  getTransaction: async (id) => {
    return await api.get(`/pos/transactions/${id}/`);
  },

  // Void a transaction
  // ✅ FIX: Used backticks ` ` for template literal
  voidTransaction: async (id, reason) => {
    return await api.post(`/pos/transactions/${id}/void/`, { reason });
  },

  // Get sales report
  getSalesReport: async (params = {}) => {
    return await api.get('/pos/sales-report/', { params });
  },

  // Get today's sales
  getTodaySales: async () => {
    return await api.get('/pos/today-sales/');
  },
};

export default posService;