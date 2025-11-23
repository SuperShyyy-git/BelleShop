import api from './api';

/**
 * Helper to convert a plain JS object into FormData.
 * Critical Feature: Converts `null` images to empty strings ('') to trigger backend deletion.
 */
const toFormData = (data) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (key === 'image') {
      // CASE 1: New File Uploaded
      if (value instanceof File) {
        formData.append(key, value);
      } 
      // CASE 2: Image explicitly removed (UI sent null) -> Send empty string to delete
      else if (value === null) {
        formData.append(key, ''); 
      }
      // CASE 3: Existing URL (string) or undefined -> Do NOT append (Backend preserves current)
    } 
    else if (value !== null && value !== undefined) {
      // Append other fields normally
      formData.append(key, value);
    }
  });

  return formData;
};

const inventoryService = {
  // ========== PRODUCTS ==========
  
  // Get all products
  getProducts: async (params = {}) => {
    return await api.get('/inventory/products/', { params });
  },

  // Get single product
  getProduct: async (id) => {
    return await api.get(`/inventory/products/${id}/`);
  },

  // Create product
  createProduct: async (productData) => {
    // Convert plain object to FormData if it isn't already
    const dataToSend = productData instanceof FormData ? productData : toFormData(productData);
    
    return await api.post('/inventory/products/', dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Update product
  updateProduct: async (id, productData) => {
    // Convert plain object to FormData if it isn't already
    const dataToSend = productData instanceof FormData ? productData : toFormData(productData);

    return await api.put(`/inventory/products/${id}/`, dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Delete product
  deleteProduct: async (id) => {
    return await api.delete(`/inventory/products/${id}/`);
  },

  // ========== CATEGORIES ==========
  
  getCategories: async () => {
    return await api.get('/inventory/categories/');
  },

  createCategory: async (categoryData) => {
    return await api.post('/inventory/categories/', categoryData);
  },

  updateCategory: async (id, categoryData) => {
    return await api.put(`/inventory/categories/${id}/`, categoryData);
  },

  deleteCategory: async (id) => {
    return await api.delete(`/inventory/categories/${id}/`);
  },

  // ========== SUPPLIERS ==========
  
  getSuppliers: async () => {
    return await api.get('/inventory/suppliers/');
  },

  createSupplier: async (supplierData) => {
    return await api.post('/inventory/suppliers/', supplierData);
  },

  updateSupplier: async (id, supplierData) => {
    return await api.put(`/inventory/suppliers/${id}/`, supplierData);
  },

  deleteSupplier: async (id) => {
    return await api.delete(`/inventory/suppliers/${id}/`);
  },

  // ========== INVENTORY MOVEMENTS ==========
  
  getInventoryMovements: async (params = {}) => {
    return await api.get('/inventory/movements/', { params });
  },

  createInventoryMovement: async (movementData) => {
    return await api.post('/inventory/movements/', movementData);
  },

  // ========== LOW STOCK ALERTS ==========
  
  getLowStockAlerts: async (params = {}) => {
    return await api.get('/inventory/alerts/', { params });
  },

  acknowledgeLowStockAlert: async (id) => {
    return await api.post(`/inventory/alerts/${id}/acknowledge/`);
  },

  // ========== REPORTS ==========
  
  getInventoryReport: async () => {
    return await api.get('/inventory/reports/inventory/');
  },

  adjustStock: async (adjustmentData) => {
    return await api.post('/inventory/stock-adjustment/', adjustmentData);
  },
};

export default inventoryService;