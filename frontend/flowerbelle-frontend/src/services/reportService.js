import api from './api';

const reportService = {

  // ============================
  // DASHBOARD
  // ============================
  getDashboard: async (params = {}) => {
    console.log('🔍 [reportService] Fetching dashboard data...');
    try {
      const response = await api.get('/reports/dashboard/', { params });
      console.log('✅ [reportService] Dashboard response received:', response.data);
      console.log('📊 Today Sales:', response.data.today_sales);
      console.log('📊 Today Transactions:', response.data.today_transactions);
      console.log('📊 Week Sales:', response.data.week_sales);
      return response;
    } catch (error) {
      console.error('❌ [reportService] Dashboard fetch failed:', error);
      throw error;
    }
  },

  getDashboardHistory: (params = {}) =>
    api.get('/reports/dashboard/history/', { params }),

  // ============================
  // ANALYTICS
  // ============================
  getSalesAnalytics: async (params = {}) => {
    try {
      return await api.get('/reports/sales-summary/', { params });
    } catch (error) {
      console.error('Sales Analytics Error:', error);
      return { data: { daily_trend: [], total_sales: 0, transactions: 0 } };
    }
  },

  getInventoryAnalytics: (params = {}) =>
    api.get('/reports/analytics/inventory/', { params }),

  // ============================
  // INVENTORY (STOCK-LIST)
  // ============================
  getInventoryStockList: async (params = {}) => {
    try {
      return await api.get('/reports/inventory/stock-list/', { params });
    } catch (error) {
      return { data: [] };
    }
  },

  // ============================
  // REPORTS (P&L, STAFF)
  // ============================
  getProfitLoss: (params = {}) =>
    api.get('/reports/profit-loss/', { params }),

  getStaffPerformance: (params = {}) =>
    api.get('/reports/staff-performance/', { params }),

  // ============================
  // ✅ FIXED EXPORT FUNCTION
  // ============================
  exportReport: async (report_type, export_format, filters = {}) => {
    const typePath = String(report_type).toLowerCase().trim();
    
    console.log(`🚀 Requesting Export:`, {
      report_type,
      export_format,
      filters
    });

    try {
      const response = await api.get(`reports/export/${typePath}`, {  // ← No leading /
        params: {
          format: export_format.toUpperCase(),
          ...filters
        },
        responseType: 'blob',
        timeout: 30000
      });
      
      return response;
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  },

  scheduleExport: (report_type, export_format, filters = {}) =>
    api.post('/reports/export/', { report_type, export_format, ...filters }),

  getExportList: (params = {}) =>
    api.get('/reports/exports/', { params })

};

export default reportService;