import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, User, Mail, Phone, Lock, Shield, Save, 
    UserPlus, UserCog, ArrowRight, AlertCircle 
} from 'lucide-react';

// Define roles
const ROLES = ['STAFF', 'OWNER']; 

const UserFormModal = ({ isOpen, user, onClose, onSave, currentUserId }) => {
    const navigate = useNavigate();
    
    // 1. Determine mode and set initial state
    const isEditing = !!user;
    const isEditingSelf = isEditing && user?.id === currentUserId;
    const title = isEditing ? 'Edit User' : 'Add New User';

    const [formData, setFormData] = useState({
        username: '',
        password: '', 
        password_confirm: '',
        full_name: '',
        email: '',
        phone_number: '',
        role: ROLES[0],
        is_active: true,
    });
    const [loading, setLoading] = useState(false);

    // 2. Load existing user data when editing
    useEffect(() => {
        if (isEditing && user) {
            setFormData({
                username: user.username || '',
                password: '',
                password_confirm: '',
                full_name: user.full_name || '',
                email: user.email || '',
                // Handle case where backend might send 'phone' OR 'phone_number'
                phone_number: user.phone_number || user.phone || '',
                role: user.role || ROLES[0],
                is_active: user.is_active !== undefined ? user.is_active : true,
            });
        } else {
            setFormData({
                username: '',
                password: '',
                password_confirm: '',
                full_name: '',
                email: '',
                phone_number: '',
                role: ROLES[0],
                is_active: true,
            });
        }
    }, [user, isEditing]);

    if (!isOpen) return null;

    // 3. Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // 4. Handle redirect to profile
    const handleGoToProfile = () => {
        onClose();
        navigate('/profile');
    };

    // 5. Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Create a copy of the data
        const dataToSubmit = { ...formData };
        
        // --- FIX STARTS HERE ---
        // We manually map 'phone_number' (frontend) to 'phone' (backend expectation)
        if (formData.phone_number) {
            dataToSubmit.phone = formData.phone_number;
        }
        // --- FIX ENDS HERE ---

        if (isEditing) {
            if (dataToSubmit.password === '') delete dataToSubmit.password;
            if (dataToSubmit.password_confirm === '') delete dataToSubmit.password_confirm;
        }

        try {
            await onSave(dataToSubmit);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- STYLES ---
    const inputClass = `w-full pl-4 pr-4 py-3 rounded-xl border-2 border-[#F7C9D3] dark:border-gray-700 focus:border-[#B36372] dark:focus:border-primary-500 focus:ring-4 focus:ring-[#B36372]/10 dark:focus:ring-primary-500/10 outline-none transition-all bg-white dark:bg-[#111] text-gray-700 dark:text-gray-200 font-medium disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:border-gray-200 dark:disabled:border-gray-700`;
    const labelClass = `flex items-center gap-1.5 text-sm font-bold text-[#B36372] dark:text-primary-400 mb-1.5 uppercase tracking-wide`;

    return (
        <div className="fixed inset-0 bg-[#B36372]/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            
            {/* Modal Content */}
            <div className="bg-[#FFF9F6] dark:bg-[#1e1e1e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-[#F7C9D3] dark:border-gray-700 flex flex-col transition-colors" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-[#F7C9D3] dark:border-gray-700 bg-[#FFFBF8] dark:bg-[#1e1e1e]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#F7C9D3]/20 dark:bg-gray-800 rounded-lg">
                            {isEditing ? <UserCog className="w-6 h-6 text-[#B36372] dark:text-primary-400" /> : <UserPlus className="w-6 h-6 text-[#B36372] dark:text-primary-400" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#B36372] dark:text-primary-400">{title}</h3>
                            <p className="text-[#D3A65D] dark:text-yellow-500 text-xs font-bold uppercase tracking-wider">User Details</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-[#F7C9D3] dark:text-gray-500 hover:text-[#B36372] dark:hover:text-white hover:bg-[#FFF9F6] dark:hover:bg-gray-800 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Self Edit Banner */}
                {isEditingSelf && (
                    <div className="mx-6 mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                You are editing your own account.
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                To change your password or personal contact details, please visit your profile page.
                            </p>
                            <button 
                                type="button" 
                                onClick={handleGoToProfile} 
                                className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white flex items-center gap-1 hover:underline"
                            >
                                Go to Profile <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    
                    {/* SECTION 1: Identity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>
                                <User size={14} /> Username <span className="text-red-400">*</span>
                            </label>
                            <input
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className={inputClass}
                                required
                                disabled={isEditing} 
                                placeholder=""
                            />
                            {isEditing && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">Username cannot be changed.</p>}
                        </div>

                        <div>
                            <label className={labelClass}>
                                <Shield size={14} /> Role <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`${inputClass} appearance-none cursor-pointer`}
                                required
                                disabled={isEditingSelf}
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* SECTION 2: Personal Details */}
                    <div>
                        <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                        <input
                            name="full_name"
                            type="text"
                            value={formData.full_name}
                            onChange={handleChange}
                            className={inputClass}
                            required
                            placeholder=""
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>
                                <Mail size={14} /> Email <span className="text-red-400">*</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={inputClass}
                                required
                                disabled={isEditingSelf}
                                placeholder=""
                            />
                        </div>
                        <div>
                            <label className={labelClass}>
                                <Phone size={14} /> Phone
                            </label>
                            <input
                                name="phone_number"
                                type="tel"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className={inputClass}
                                disabled={isEditingSelf}
                                placeholder=""
                            />
                        </div>
                    </div>

                    {/* SECTION 3: Security (Conditional) */}
                    {!isEditingSelf && (
                        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border-2 border-[#F7C9D3] dark:border-gray-700">
                            <h4 className="text-[#B36372] dark:text-primary-400 font-bold text-sm mb-4 flex items-center gap-2 border-b border-[#F7C9D3] dark:border-gray-700 pb-2">
                                <Lock size={14} /> Security Credentials
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                                        Password {isEditing ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={inputClass}
                                        required={!isEditing && !formData.password_confirm}
                                        placeholder={isEditing ? 'Leave blank to keep current' : 'Enter password'}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                                        Confirm Password {isEditing ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        name="password_confirm"
                                        type="password"
                                        value={formData.password_confirm}
                                        onChange={handleChange}
                                        className={inputClass}
                                        required={!isEditing && !formData.password}
                                        placeholder={isEditing ? 'Leave blank to keep current' : 'Confirm password'}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: Status (Edit Only) */}
                    {isEditing && !isEditingSelf && (
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                                <input
                                    id="is_active"
                                    name="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="peer absolute w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="block w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-[#B36372] dark:peer-checked:bg-primary-600 transition-colors"></div>
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                            </div>
                            <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                                User Account Active
                            </label>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-3.5 border-2 border-[#B36372] dark:border-gray-600 text-[#B36372] dark:text-gray-300 font-bold rounded-xl hover:bg-[#FFF9F6] dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        
                        {isEditingSelf ? (
                            <button 
                                type="button" 
                                onClick={handleGoToProfile} 
                                className="flex-1 py-3.5 bg-[#D3A65D] dark:bg-yellow-600 text-white font-bold rounded-xl hover:bg-[#C2954D] dark:hover:bg-yellow-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                Go to Profile <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button 
                                type="submit" 
                                className="flex-1 py-3.5 bg-[#B36372] dark:bg-primary-600 text-white font-bold rounded-xl hover:bg-[#9A5561] dark:hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                <Save size={20} />
                                {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;