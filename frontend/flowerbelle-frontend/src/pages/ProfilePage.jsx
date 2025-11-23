import React, { useState, useEffect } from 'react';
import userService from '../services/userService';
import Loading from '../components/common/Loading';
import { User, Mail, Phone, Lock, Save, Shield, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast'; 

// --- THEME CONSTANTS ---
const THEME = {
    // Text Colors
    primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
    headingText: "text-gray-900 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    
    // Gradients
    gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9]",
    
    // Backgrounds
    pageBg: "bg-gradient-to-br from-white via-[#FFE4E1]/20 to-[#FF69B4]/10 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#2C1A21]",
    
    // Components
    cardBase: "bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#FF69B4]/20 shadow-lg shadow-[#FF69B4]/5 dark:shadow-black/20",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 focus:border-[#FF69B4] dark:focus:border-[#FF77A9] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
    
    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200"
};

const ProfilePage = () => {
    const [userData, setUserData] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirm: '',
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // --- 1. Fetch Current User Data ---
    const fetchUserData = async () => {
        setLoading(true);
        try {
            const response = await userService.getUserDetail('me'); 
            const user = response.data;
            
            setUserData(user);
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                // Robust check: backend sends 'phone', frontend uses 'phone_number'
                phone_number: user.phone_number || user.phone || '',
                password: '',
                password_confirm: '',
            });
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            toast.error("Failed to load profile details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // --- 2. Handle Form Changes ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- 3. Handle Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        // Validation check for password match
        if (formData.password !== formData.password_confirm) {
            toast.error("Passwords do not match.");
            setIsSaving(false);
            return;
        }

        // --- CRITICAL FIX: Change key from 'phone_number' to 'phone' ---
        const dataToSubmit = {
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone_number, // <--- THIS IS THE FIX
        };

        // Add password fields only if a new password was entered
        if (formData.password) {
            dataToSubmit.password = formData.password;
        }

        console.log("Submitting Profile Update:", dataToSubmit);

        try {
            await userService.updateUser('me', dataToSubmit); 
            toast.success("Profile updated successfully! 💾");
            
            // Clear passwords after successful update
            setFormData(prev => ({ ...prev, password: '', password_confirm: '' }));
            
            // Re-fetch data to reflect any server-side changes
            await fetchUserData(); 

        } catch (error) {
            console.error("Profile update failed:", error.response?.data || error);
            const errMsg = error.response?.data?.email?.[0] || 
                           error.response?.data?.password?.[0] || 
                           "Failed to save profile. Check data.";
            toast.error(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !userData) {
        return <Loading message="Loading profile..." />;
    }
    
    const labelClass = `flex items-center gap-2 text-sm font-bold ${THEME.subText} mb-2 uppercase tracking-wide`;
    
    return (
        <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
            <div className="max-w-5xl mx-auto space-y-6 pb-6">
                
                {/* Header Section */}
                <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ${THEME.gradientBg}`}>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-inner">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold mb-1 text-white tracking-tight">{userData.full_name}</h1>
                            <div className="flex items-center gap-4 text-white/90 font-medium">
                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                                    <Shield className="w-4 h-4" />
                                    {userData.role}
                                </span>
                                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                                    <User className="w-4 h-4" />
                                    @{userData.username}
                                </span>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                            <CheckCircle className="w-5 h-5 text-green-300" />
                            <span className="text-sm font-bold">Active Account</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Main Form Section */}
                    <div className={`lg:col-span-2 rounded-3xl ${THEME.cardBase}`}>
                        <div className="p-6 border-b border-gray-200 dark:border-[#FF69B4]/10">
                            <h2 className={`text-xl font-bold ${THEME.headingText}`}>Personal Information</h2>
                            <p className={`text-sm ${THEME.subText} mt-0.5`}>Update your account details below</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            
                            {/* Full Name */}
                            <div>
                                <label className={labelClass}>
                                    <User className="w-4 h-4" />
                                    Full Name
                                </label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase}`}
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className={labelClass}>
                                    <Mail className="w-4 h-4" />
                                    Email Address <span className="text-[#FF69B4]">*</span>
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase}`}
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className={labelClass}>
                                    <Phone className="w-4 h-4" />
                                    Phone Number
                                </label>
                                <input
                                    id="phone_number"
                                    name="phone_number" // Keep this name for state management
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase}`}
                                    placeholder="e.g., +63 912 345 6789"
                                />
                            </div>

                            {/* Password Section */}
                            <div className="bg-gray-50/50 dark:bg-[#1A1A1D]/50 p-6 rounded-2xl border border-gray-200 dark:border-[#FF69B4]/20 mt-6">
                                <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-[#FF69B4]/10 pb-2 ${THEME.headingText}`}>
                                    <Lock className="w-4 h-4 text-[#FF69B4]" /> Change Password
                                </h3>
                                <p className={`text-xs ${THEME.subText} mb-4`}>Leave both fields blank to keep your current password</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* New Password */}
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${THEME.subText}`}>
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl outline-none transition-all pr-10 ${THEME.inputBase}`}
                                                placeholder="Min. 8 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF69B4] transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${THEME.subText}`}>
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password_confirm"
                                                name="password_confirm"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={formData.password_confirm}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl outline-none transition-all pr-10 ${THEME.inputBase}`}
                                                placeholder="Re-enter password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF69B4] transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${THEME.buttonPrimary}`}
                                >
                                    <Save className="w-5 h-5" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        
                        {/* Account Status */}
                        <div className={`rounded-3xl p-6 ${THEME.cardBase}`}>
                            <h3 className={`text-lg font-bold mb-4 ${THEME.headingText}`}>Account Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <span className={`text-sm font-medium ${THEME.subText}`}>Status</span>
                                    <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="w-4 h-4" />
                                        Active
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A1A1D] rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className={`text-sm font-medium ${THEME.subText}`}>Role</span>
                                    <span className={`text-sm font-bold ${THEME.headingText}`}>{userData.role}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A1A1D] rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className={`text-sm font-medium ${THEME.subText}`}>Username</span>
                                    <span className={`text-sm font-bold ${THEME.headingText}`}>@{userData.username}</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Tip */}
                        <div className="bg-sky-50 dark:bg-sky-900/10 rounded-3xl border border-sky-100 dark:border-sky-800/30 p-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-sky-500 dark:text-sky-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-sky-900 dark:text-sky-200 mb-1">Security Tip</h4>
                                    <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed font-medium">
                                        Change your password regularly and never share it with anyone. Use a strong password with a mix of letters, numbers, and symbols.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;