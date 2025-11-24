import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, User, Mail, Phone, Lock, Shield, Save, 
    UserPlus, UserCog, ArrowRight, AlertCircle, Eye, EyeOff, Check 
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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [phoneError, setPhoneError] = useState('');

    // 2. Load existing user data when editing
    useEffect(() => {
        if (isEditing && user) {
            setFormData({
                username: user.username || '',
                password: '',
                password_confirm: '',
                full_name: user.full_name || '',
                email: user.email || '',
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

    // --- Password Requirements Check ---
    const checkPasswordRequirements = (pwd) => {
        return {
            minLength: pwd.length >= 8,
            hasUppercase: /[A-Z]/.test(pwd),
            hasLowercase: /[a-z]/.test(pwd),
            hasNumber: /[0-9]/.test(pwd),
        };
    };

    const allRequirementsMet = (pwd) => {
        const reqs = checkPasswordRequirements(pwd);
        return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber;
    };

    // 3. Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // 3b. Handle phone number changes with validation
    const handlePhoneChange = (e) => {
        let value = e.target.value;
        
        // Remove all non-digit characters
        const cleaned = value.replace(/\D/g, '');
        
        // Limit to 11 digits and ensure it starts with 09
        if (cleaned.length > 0) {
            if (cleaned.startsWith('09')) {
                value = cleaned.substring(0, 11);
            } else if (cleaned.startsWith('9')) {
                value = '0' + cleaned.substring(0, 10);
            } else if (cleaned.startsWith('0')) {
                value = cleaned.substring(0, 11);
            } else {
                value = '09' + cleaned.substring(0, 9);
            }
        } else {
            value = '';
        }
        
        setFormData(prev => ({ ...prev, phone_number: value }));
        
        // Validate phone format: 09XXXXXXXXX (11 digits total)
        const regex = /^09\d{9}$/;
        if (value && !regex.test(value)) {
            setPhoneError('Format: 09XXXXXXXXX (11 digits, e.g., 09175550123)');
        } else {
            setPhoneError('');
        }
    };

    // 4. Handle redirect to profile
    const handleGoToProfile = () => {
        onClose();
        navigate('/profile');
    };

    // 5. Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check password validation only if password fields are filled
        if (formData.password || formData.password_confirm) {
            if (!allRequirementsMet(formData.password)) {
                alert("Password does not meet all requirements.");
                return;
            }
            
            if (formData.password !== formData.password_confirm) {
                alert("Passwords do not match.");
                return;
            }
        }

        setLoading(true);

        // Create a copy of the data
        const dataToSubmit = { ...formData };
        
        // Map 'phone_number' (frontend) to 'phone' (backend expectation)
        if (formData.phone_number) {
            dataToSubmit.phone = formData.phone_number;
        }

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

    // --- UPDATED STYLES WITH DASHBOARD COLORS ---
    const inputClass = `w-full pl-4 pr-4 py-3 rounded-xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 focus:border-[#FF69B4] dark:focus:border-[#FF77A9] focus:ring-4 focus:ring-[#FF69B4]/10 dark:focus:ring-[#FF77A9]/10 outline-none transition-all bg-white dark:bg-[#1A1A1D] text-gray-700 dark:text-gray-200 font-medium disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:border-gray-200 dark:disabled:border-gray-700`;
    const labelClass = `flex items-center gap-1.5 text-sm font-bold text-[#FF69B4] dark:text-[#FF77A9] mb-1.5 uppercase tracking-wide`;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            
            {/* Modal Content */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 flex flex-col transition-colors" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#FF69B4]/10 to-[#FF77A9]/20 dark:from-[#FF69B4]/20 dark:to-[#FF77A9]/10 rounded-2xl">
                            {isEditing ? <UserCog className="w-6 h-6 text-[#FF69B4] dark:text-[#FF77A9]" /> : <UserPlus className="w-6 h-6 text-[#FF69B4] dark:text-[#FF77A9]" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent">{title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">User Details</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#FF69B4] dark:hover:text-[#FF77A9] hover:bg-[#E5E5E5]/50 dark:hover:bg-gray-800 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Self Edit Banner */}
                {isEditingSelf && (
                    <div className="mx-6 mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
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
                                onChange={handlePhoneChange}
                                className={`${inputClass} ${phoneError ? 'border-red-500 dark:border-red-500' : ''}`}
                                disabled={isEditingSelf}
                                placeholder=""
                            />
                            {phoneError && (
                                <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {phoneError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: Security (Conditional) */}
                    {!isEditingSelf && (
                        <div className="bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 p-5 rounded-2xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20">
                            <h4 className="text-[#FF69B4] dark:text-[#FF77A9] font-bold text-sm mb-4 flex items-center gap-2 border-b-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 pb-2">
                                <Lock size={14} /> Security Credentials
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                {isEditing ? 'Leave blank to keep current password.' : 'Password requirements listed below.'}
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* New Password */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                                        Password {isEditing ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={`${inputClass} ${
                                                formData.password && !allRequirementsMet(formData.password) ? 'border-red-500 dark:border-red-500' : ''
                                            } ${
                                                formData.password && allRequirementsMet(formData.password) ? 'border-green-500 dark:border-green-500' : ''
                                            }`}
                                            required={!isEditing}
                                            placeholder={isEditing ? 'Leave blank to keep current' : 'Min. 8 characters'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF69B4] dark:hover:text-[#FF77A9] transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Requirements Checklist */}
                                    {formData.password && (
                                        <div className="mt-4 p-3 bg-white dark:bg-[#1A1A1D] rounded-xl border border-gray-200 dark:border-[#FF69B4]/20">
                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Requirements:</p>
                                            <div className="space-y-1.5">
                                                <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).minLength ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {checkPasswordRequirements(formData.password).minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    At least 8 characters
                                                </div>
                                                <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {checkPasswordRequirements(formData.password).hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    1 uppercase letter (A–Z)
                                                </div>
                                                <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {checkPasswordRequirements(formData.password).hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    1 lowercase letter (a–z)
                                                </div>
                                                <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasNumber ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {checkPasswordRequirements(formData.password).hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                    1 number (0–9)
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">
                                        Confirm Password {isEditing ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="password_confirm"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.password_confirm}
                                            onChange={handleChange}
                                            className={`${inputClass} ${
                                                formData.password_confirm && formData.password !== formData.password_confirm ? 'border-red-500 dark:border-red-500' : ''
                                            } ${
                                                formData.password_confirm && formData.password === formData.password_confirm && formData.password ? 'border-green-500 dark:border-green-500' : ''
                                            }`}
                                            required={!isEditing}
                                            placeholder={isEditing ? 'Leave blank to keep current' : 'Re-enter password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF69B4] dark:hover:text-[#FF77A9] transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Match Status */}
                                    {formData.password_confirm && (
                                        <div className="mt-4 flex items-center gap-2">
                                            {formData.password === formData.password_confirm && formData.password ? (
                                                <>
                                                    <Check className="w-5 h-5 text-green-500" />
                                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">Passwords match</span>
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-5 h-5 text-red-500" />
                                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">Passwords do not match</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: Status (Edit Only) */}
                    {isEditing && !isEditingSelf && (
                        <div className="flex items-center gap-3 bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 p-4 rounded-2xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20">
                            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                                <input
                                    id="is_active"
                                    name="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="peer absolute w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="block w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-[#FF69B4] peer-checked:to-[#FF77A9] transition-colors"></div>
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></div>
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
                            className="flex-1 py-3.5 border-2 border-[#FF69B4] dark:border-[#FF69B4]/50 text-[#FF69B4] dark:text-[#FF77A9] font-bold rounded-xl hover:bg-[#FF69B4]/5 dark:hover:bg-[#FF69B4]/10 transition-all shadow-sm hover:shadow-md"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        
                        {isEditingSelf ? (
                            <button 
                                type="button" 
                                onClick={handleGoToProfile} 
                                className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                Go to Profile <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button 
                                type="submit" 
                                className="flex-1 py-3.5 bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white font-bold rounded-xl hover:shadow-xl hover:shadow-[#FF69B4]/30 transition-all shadow-lg flex items-center justify-center gap-2"
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