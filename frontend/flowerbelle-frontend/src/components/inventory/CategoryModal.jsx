import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Tags, Plus, ArrowLeft, Save } from 'lucide-react';

// --- THEME CONSTANTS ---
const THEME = {
    // Text Colors
    primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
    headingText: "text-gray-900 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    
    // Components
    modalBg: "bg-white dark:bg-[#1e1e1e]",
    inputBase: "w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-[#FF69B4]/30 bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white font-medium focus:border-[#FF69B4] dark:focus:border-[#FF77A9] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600",
    
    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
    buttonSecondary: "border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
};

const CategoryModal = ({ isOpen, onClose, onSave, categoryToEdit, categories = [], onEditCategory, onDeleteCategory }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('add');

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setFormData({ name: categoryToEdit.name || '', description: categoryToEdit.description || '' });
        setViewMode('add');
      } else {
        setFormData({ name: '', description: '' });
        setViewMode('add');
      }
    }
  }, [categoryToEdit, isOpen]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const success = await onSave(formData);
      if (success) handleClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    setViewMode('add');
    onClose();
  };

  const switchToAddMode = () => {
    setFormData({ name: '', description: '' });
    setViewMode('add');
  };

  if (!isOpen) return null;

  const labelClass = `block text-xs font-bold ${THEME.subText} mb-1.5 uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`${THEME.modalBg} rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-[#FF69B4]/20 flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#FF69B4]/10 bg-gray-50/50 dark:bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-[#1A1A1D] rounded-2xl shadow-sm border border-gray-100 dark:border-[#FF69B4]/20">
               <Tags className="w-6 h-6 text-[#FF69B4]" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${THEME.headingText}`}>
                {viewMode === 'list' ? 'Manage Categories' : categoryToEdit ? 'Edit Category' : 'Add New Category'}
              </h3>
              <p className={`text-sm font-medium ${THEME.primaryText}`}>Inventory Settings</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 rounded-full transition-all" disabled={isSubmitting}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' ? (
            // --- LIST VIEW ---
            <div className="p-6">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className={`text-sm font-medium ${THEME.subText}`}>Manage your product categories below.</p>
                <button onClick={switchToAddMode} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm whitespace-nowrap ${THEME.buttonPrimary}`}>
                  <Plus className="w-4 h-4" strokeWidth={3} /> Add New
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md transition-all hover:border-[#FF69B4]/30 dark:hover:border-[#FF69B4]/30 group">
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg ${THEME.primaryText}`}>{category.name}</h4>
                      {category.description && <p className={`text-sm mt-1 line-clamp-1 ${THEME.subText}`}>{category.description}</p>}
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <Tags size={12} className="text-[#FF69B4]" />
                        <span className={`text-xs font-bold ${THEME.subText}`}>{category.product_count || 0} products</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEditCategory && onEditCategory(category)} className="p-2 text-gray-400 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 rounded-xl transition-all">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => onDeleteCategory && onDeleteCategory(category.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-12 bg-gray-50/50 dark:bg-[#1A1A1D] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                    <Tags className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className={`font-medium ${THEME.subText}`}>No categories found.</p>
                    <button onClick={switchToAddMode} className={`mt-3 font-bold underline ${THEME.primaryText}`}>Create your first category</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // --- FORM VIEW ---
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {categories.length > 0 && !categoryToEdit && (
                <button type="button" onClick={() => setViewMode('list')} className={`group flex items-center gap-2 text-sm font-bold mb-2 transition-colors ${THEME.primaryText}`}>
                  <div className="p-1 rounded-full bg-[#FF69B4]/10 group-hover:bg-[#FF69B4] group-hover:text-white transition-all">
                    <ArrowLeft size={14} />
                  </div> Back to list
                </button>
              )}
              <div>
                <label className={labelClass}>Category Name <span className="text-[#FF69B4]">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={THEME.inputBase} placeholder="e.g., Bouquets, Vases, Gifts" required disabled={isSubmitting} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className={`${THEME.inputBase} resize-none`} placeholder="Describe what belongs in this category..." disabled={isSubmitting} />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={handleClose} className={`flex-1 py-3 font-bold rounded-xl shadow-sm ${THEME.buttonSecondary}`} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className={`flex-1 py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 ${THEME.buttonPrimary}`} disabled={isSubmitting}>
                  <Save size={18} /> {isSubmitting ? 'Saving...' : categoryToEdit ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;