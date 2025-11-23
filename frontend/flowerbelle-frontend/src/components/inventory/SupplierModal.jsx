import React, { useState, useEffect } from 'react';
import { X, Truck, User, Phone, Mail, MapPin, Save } from 'lucide-react';

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

const SupplierModal = ({ isOpen, onClose, onSave, supplierToEdit = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '' 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        setFormData({
          name: supplierToEdit.name || '',
          contact_person: supplierToEdit.contact_person || '',
          phone: supplierToEdit.phone || '',
          email: supplierToEdit.email || '',
          address: supplierToEdit.address || ''
        });
      } else {
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await onSave(formData);
    setLoading(false);
    if (success) onClose();
  };

  if (!isOpen) return null;

  const labelClass = `flex items-center gap-1.5 text-xs font-bold ${THEME.subText} mb-1.5 uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`${THEME.modalBg} rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-[#FF69B4]/20 flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#FF69B4]/10 bg-gray-50/50 dark:bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-[#1A1A1D] rounded-2xl shadow-sm border border-gray-100 dark:border-[#FF69B4]/20">
                <Truck className="w-6 h-6 text-[#FF69B4]" />
            </div>
            <div>
                <h2 className={`text-xl font-bold ${THEME.headingText}`}>
                    {supplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <p className={`text-sm font-medium ${THEME.primaryText}`}>Partner Details</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Supplier Name */}
            <div>
                <label className={labelClass}>Supplier Name <span className="text-[#FF69B4]">*</span></label>
                <input
                    type="text" name="name" required
                    value={formData.name} onChange={handleChange}
                    placeholder=""
                    className={THEME.inputBase}
                />
            </div>
            
            {/* Contact Person */}
            <div>
                <label className={labelClass}><User size={14} className="text-[#FF69B4]"/> Contact Person</label>
                <input
                    type="text" name="contact_person"
                    value={formData.contact_person} onChange={handleChange}
                    placeholder=""
                    className={THEME.inputBase}
                />
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}><Phone size={14} className="text-[#FF69B4]"/> Phone</label>
                    <input
                        type="text" name="phone"
                        value={formData.phone} onChange={handleChange}
                        placeholder=""
                        className={THEME.inputBase}
                    />
                </div>
                <div>
                    <label className={labelClass}><Mail size={14} className="text-[#FF69B4]"/> Email</label>
                    <input
                        type="email" name="email"
                        value={formData.email} onChange={handleChange}
                        placeholder=""
                        className={THEME.inputBase}
                    />
                </div>
            </div>

            {/* Address */}
            <div>
                <label className={labelClass}><MapPin size={14} className="text-[#FF69B4]"/> Address</label>
                <textarea
                    name="address"
                    value={formData.address} onChange={handleChange}
                    placeholder="Complete business address..."
                    rows="3"
                    className={`${THEME.inputBase} resize-none`}
                />
            </div>

            {/* Footer Actions */}
            <div className="pt-4 flex gap-4">
                <button
                    type="button" onClick={onClose}
                    className={`flex-1 py-3.5 font-bold rounded-xl shadow-sm ${THEME.buttonSecondary}`}
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit" disabled={loading}
                    className={`flex-1 py-3.5 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${THEME.buttonPrimary}`}
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : (supplierToEdit ? 'Update Supplier' : 'Save Supplier')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;