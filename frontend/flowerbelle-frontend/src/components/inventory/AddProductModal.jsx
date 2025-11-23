import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2, Save, DollarSign, Package, AlertCircle } from 'lucide-react';

// --- THEME CONSTANTS ---
const THEME = {
  // Text Colors
  primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
  headingText: "text-gray-900 dark:text-white",
  subText: "text-gray-500 dark:text-gray-400",
  
  // Gradients
  gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
  
  // Components
  modalBg: "bg-white dark:bg-[#1e1e1e]",
  inputBase: "w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-[#FF69B4]/30 bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white font-medium focus:border-[#FF69B4] dark:focus:border-[#FF77A9] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600",
  
  // Buttons
  buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
  buttonSecondary: "border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
};

const AddProductModal = ({ isOpen, onClose, onSave, categories, suppliers, productToEdit }) => {
  const [formData, setFormData] = useState({
    name: '', category: '', supplier: '', unit_price: '', cost_price: '',
    current_stock: '', reorder_level: '10', sku: '', image: undefined // undefined = keep existing
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        category: productToEdit.category?.id || productToEdit.category || '',
        supplier: productToEdit.supplier?.id || productToEdit.supplier || '',
        unit_price: productToEdit.unit_price || '',
        cost_price: productToEdit.cost_price || '',
        current_stock: productToEdit.current_stock || '',
        reorder_level: productToEdit.reorder_level || '10',
        sku: productToEdit.sku || '',
        image: undefined // Important: undefined means "don't change image"
      });
      if (productToEdit.image_url) setImagePreview(productToEdit.image_url);
    } else {
      setFormData({
        name: '', category: '', supplier: '', unit_price: '', cost_price: '',
        current_stock: '', reorder_level: '10', sku: '', image: null
      });
      setImagePreview(null);
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  // Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) return setErrors(prev => ({ ...prev, image: 'Please select an image file' }));
      if (file.size > 5 * 1024 * 1024) return setErrors(prev => ({ ...prev, image: 'Image size should be less than 5MB' }));

      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: null }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null })); // Explicitly set to null to trigger delete
    setImagePreview(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.supplier) newErrors.supplier = 'Supplier is required';
    if (formData.cost_price && (isNaN(parseFloat(formData.cost_price)) || parseFloat(formData.cost_price) < 0)) newErrors.cost_price = 'Invalid cost price';
    if (isNaN(parseFloat(formData.unit_price)) || parseFloat(formData.unit_price) <= 0) newErrors.unit_price = 'Unit price must be > 0';
    if (isNaN(parseInt(formData.current_stock)) || parseInt(formData.current_stock) < 0) newErrors.current_stock = 'Stock must be 0 or greater';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      // --- FIX: Send plain object ---
      // The inventoryService.js will handle converting this to FormData
      // and converting 'image: null' to an empty string for deletion.
      const payload = {
        ...formData,
        is_active: true
      };

      const success = await onSave(payload);
      if (success) onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save product.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = `block text-xs font-bold ${THEME.subText} mb-1.5 uppercase tracking-wide`;
  const errorClass = `mt-1 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1`;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`${THEME.modalBg} rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-[#FF69B4]/20 flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#FF69B4]/10 bg-gray-50/50 dark:bg-[#1e1e1e]">
          <div>
            <h3 className={`text-2xl font-extrabold ${THEME.headingText}`}>{productToEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <p className={`text-sm font-medium ${THEME.primaryText}`}>Inventory Management</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 rounded-full transition-all" disabled={isSubmitting}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          {errors.submit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle size={20} /> <p className="font-bold">{errors.submit}</p>
            </div>
          )}

          {/* Top Section */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Upload */}
            <div className="w-full md:w-1/3">
              <label className={labelClass}>Product Image</label>
              <div className="relative group">
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#FF69B4] shadow-md aspect-square group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={handleRemoveImage} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all transform scale-90 hover:scale-100">
                        <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer bg-gray-50 dark:bg-[#1A1A1D] hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-[#FF69B4] dark:hover:border-[#FF69B4] transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400 group-hover:text-[#FF69B4] transition-colors">
                      <ImageIcon className="w-10 h-10 mb-3" />
                      <p className="text-xs font-bold uppercase tracking-wider">Upload Image</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
                  </label>
                )}
              </div>
              {errors.image && <p className={errorClass}>{errors.image}</p>}
            </div>

            {/* Main Fields */}
            <div className="flex-1 space-y-5">
              <div>
                <label className={labelClass}>Product Name <span className="text-[#FF69B4]">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={THEME.inputBase} placeholder="e.g. Red Roses Bouquet" disabled={isSubmitting} />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
              </div>
              
              <div>
                <label className={labelClass}>SKU</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} className={THEME.inputBase} placeholder="e.g. ROS-001" disabled={isSubmitting} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category <span className="text-[#FF69B4]">*</span></label>
                  <select name="category" value={formData.category} onChange={handleChange} className={`${THEME.inputBase} appearance-none cursor-pointer`} disabled={isSubmitting}>
                    <option value="">Select...</option>
                    {categories && categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  {errors.category && <p className={errorClass}>{errors.category}</p>}
                </div>
                <div>
                  <label className={labelClass}>Supplier <span className="text-[#FF69B4]">*</span></label>
                  <select name="supplier" value={formData.supplier} onChange={handleChange} className={`${THEME.inputBase} appearance-none cursor-pointer`} disabled={isSubmitting}>
                    <option value="">Select...</option>
                    {suppliers && suppliers.map((sup) => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                  </select>
                  {errors.supplier && <p className={errorClass}>{errors.supplier}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full my-2"></div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-[#1A1A1D] p-5 rounded-2xl border border-gray-200 dark:border-[#FF69B4]/10">
              <h4 className={`text-sm font-bold ${THEME.primaryText} mb-4 flex items-center gap-2 uppercase tracking-wider`}><DollarSign size={16} /> Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cost Price</label>
                  <input type="number" name="cost_price" value={formData.cost_price} onChange={handleChange} step="0.01" min="0" className={THEME.inputBase} placeholder="0.00" disabled={isSubmitting} />
                  {errors.cost_price && <p className={errorClass}>{errors.cost_price}</p>}
                </div>
                <div>
                  <label className={labelClass}>Unit Price</label>
                  <input type="number" name="unit_price" value={formData.unit_price} onChange={handleChange} step="0.01" min="0" className={THEME.inputBase} placeholder="0.00" disabled={isSubmitting} />
                  {errors.unit_price && <p className={errorClass}>{errors.unit_price}</p>}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#1A1A1D] p-5 rounded-2xl border border-gray-200 dark:border-[#FF69B4]/10">
               <h4 className={`text-sm font-bold ${THEME.primaryText} mb-4 flex items-center gap-2 uppercase tracking-wider`}><Package size={16} /> Inventory</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Stock</label>
                  <input type="number" name="current_stock" value={formData.current_stock} onChange={handleChange} min="0" className={THEME.inputBase} placeholder="0" disabled={isSubmitting} />
                  {errors.current_stock && <p className={errorClass}>{errors.current_stock}</p>}
                </div>
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input type="number" name="reorder_level" value={formData.reorder_level} onChange={handleChange} min="0" className={THEME.inputBase} placeholder="10" disabled={isSubmitting} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-[#FF69B4]/10 bg-gray-50/50 dark:bg-[#1e1e1e] flex gap-4">
          <button type="button" onClick={onClose} className={`flex-1 py-3.5 font-bold rounded-xl shadow-sm ${THEME.buttonSecondary}`} disabled={isSubmitting}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={`flex-1 py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${THEME.buttonPrimary}`} disabled={isSubmitting}>
            <Save size={18} /> {isSubmitting ? 'Saving...' : (productToEdit ? 'Update Product' : 'Save Product')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddProductModal;