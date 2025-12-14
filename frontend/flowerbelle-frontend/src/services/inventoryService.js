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

// Function to calculate total pages from paginated response
const calculateTotalPages = (count, pageSize) => {
    if (count === 0) return 1;
    return Math.ceil(count / pageSize);
};


const inventoryService = {
  // ========== PRODUCTS ==========
  
  // Get all products - Returns paginated response from backend ListAPIView
  getProducts: async (params = {}) => {
    return await api.get('/inventory/products/', { params });
  },

  // Get single product
  getProduct: async (id) => {
    return await api.get(`/inventory/products/${id}/`);
  },

  // Create product (Uses FormData for file uploads)
  createProduct: async (productData) => {
    const dataToSend = productData instanceof FormData ? productData : toFormData(productData);
    
    return await api.post('/inventory/products/', dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Update product (Uses FormData for file uploads)
  updateProduct: async (id, productData) => {
    const dataToSend = productData instanceof FormData ? productData : toFormData(productData);

    // Using PATCH for partial updates, PUT for full replacement (using PUT for compatibility)
    return await api.put(`/inventory/products/${id}/`, dataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Delete product (Triggers soft-delete/deactivation)
  deleteProduct: async (id) => {
    return await api.delete(`/inventory/products/${id}/`);
  },

  // Restore product (Sets is_active = True)
  restoreProduct: async (id) => {
    return await api.patch(`/inventory/products/${id}/`, { is_active: true });
  },

  // 🔄 AUDIT TRAIL FUNCTION (NEW) 🔄
  getProductHistory: async (productId, page = 1, pageSize = 20) => {
    try {
        const url = `/inventory/products/${productId}/history/`;
        const response = await api.get(url, {
            params: { page, page_size: pageSize },
        });

        const data = response.data;
        
        return {
            results: data.results,
            count: data.count,
            totalPages: calculateTotalPages(data.count, pageSize), 
            currentPage: page,
        };
    } catch (error) {
        throw error;
    }
  },

  // ========== CATEGORIES ==========
  
  getCategories: async () => {
    return await api.get('/inventory/categories/');
  },
  
  getCategoryDetails: async (id) => { 
    return await api.get(`/inventory/categories/${id}/`);
  },

  createCategory: async (categoryData) => {
    return await api.post('/inventory/categories/', categoryData);
  },

  updateCategory: async (id, categoryData) => { 
    return await api.patch(`/inventory/categories/${id}/`, categoryData);
  },

  deleteCategory: async (id) => {
    return await api.delete(`/inventory/categories/${id}/`);
  },

  // ========== SUPPLIERS ==========
  
  getSuppliers: async () => {
    return await api.get('/inventory/suppliers/');
  },
  
  getSupplierDetails: async (id) => { 
    return await api.get(`/inventory/suppliers/${id}/`);
  },

  createSupplier: async (supplierData) => {
    return await api.post('/inventory/suppliers/', supplierData);
  },

  updateSupplier: async (id, supplierData) => { 
    return await api.patch(`/inventory/suppliers/${id}/`, supplierData);
  },

  deleteSupplier: async (id) => {
    return await api.delete(`/inventory/suppliers/${id}/`);
  },

  // ========== INVENTORY MOVEMENTS ==========
  
  getInventoryMovements: async (params = {}) => {
    return await api.get('/inventory/movements/', { params });
  },
  
  getMovementDetails: async (id) => { 
    return await api.get(`/inventory/movements/${id}/`);
  },

  createInventoryMovement: async (movementData) => {
    return await api.post('/inventory/movements/', movementData);
  },

  adjustStock: async (adjustmentData) => {
    return await api.post('/inventory/stock-adjustment/', adjustmentData);
  },
  
  // ========== LOW STOCK ALERTS ==========
  
  getLowStockAlerts: async (params = {}) => {
    return await api.get('/inventory/alerts/', { params });
  },
  
  getAlertDetails: async (id) => {
    return await api.get(`/inventory/alerts/${id}/`);
  },

  acknowledgeAlert: async (id) => {
    return await api.post(`/inventory/alerts/${id}/acknowledge/`);
  },

  resolveAlert: async (id) => {
    return await api.post(`/inventory/alerts/${id}/resolve/`);
  },

  // ========== REPORTS ==========
  
  getInventoryReport: async () => {
    return await api.get('/inventory/reports/inventory/');
  },

  getCategoryReport: async () => {
    return await api.get('/inventory/reports/categories/');
  },

};

export default inventoryService;
