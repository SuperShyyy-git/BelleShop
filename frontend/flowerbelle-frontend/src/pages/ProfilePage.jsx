import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import authService from '../services/authService';
import Loading from '../components/common/Loading';
import { User, Mail, Phone, Lock, Save, Shield, CheckCircle, Eye, EyeOff, AlertCircle, LogOut, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors - Matching LoginPage) ---
const THEME = {
    // Logo colors: Sage Green (#8FBC8F), Blush Pink (#F5E6E0), Cream (#FFF8F0)
    // Text Colors
    primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
    headingText: "text-[#2F4F4F] dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",

    // Gradients
    gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]",

    // Backgrounds
    pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",

    // Components
    cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-xl",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] dark:focus:border-[#A8D4A8] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",

    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 hover:-translate-y-0.5 transition-all duration-200"
};

const ProfilePage = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
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
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [phoneError, setPhoneError] = useState('');

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

    // --- 1. Fetch Current User Data ---
    const fetchUserData = async () => {
        setLoading(true);
        try {
            const response = await userService.getUserDetail('me');
            const user = response.data;

            setUserData(user);
            setFormData({
                username: user.username || '',
                full_name: user.full_name || '',
                email: user.email || '',
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

    // --- 2b. Handle Phone Number Changes with Validation ---
    const handlePhoneChange = (e) => {
        let value = e.target.value;

        const cleaned = value.replace(/\D/g, '');

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

        const regex = /^09\d{9}$/;
        if (value && !regex.test(value)) {
            setPhoneError('Format: 09XXXXXXXXX (11 digits, e.g., 09175550123)');
        } else {
            setPhoneError('');
        }
    };

    // --- 3. Handle Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check password validation only on submit
        if (formData.password || formData.password_confirm) {
            if (!allRequirementsMet(formData.password)) {
                toast.error("Password does not meet all requirements.");
                return;
            }

            if (formData.password !== formData.password_confirm) {
                toast.error("Passwords do not match.");
                return;
            }
        }

        setIsSaving(true);

        const dataToSubmit = {
            username: formData.username,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone_number,
        };

        if (formData.password) {
            dataToSubmit.password = formData.password;
        }

        console.log("Submitting Profile Update:", dataToSubmit);

        try {
            await userService.updateUser('me', dataToSubmit);
            toast.success("Profile updated successfully! 💾");

            setFormData(prev => ({ ...prev, password: '', password_confirm: '' }));
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

    // --- 4. Handle Logout ---
    const handleLogout = () => {
        authService.logout();
        toast.success("Logged out successfully!");
        navigate('/login');
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
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-inner">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 text-white tracking-tight">{userData.full_name}</h1>
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
                        <div className="p-6 border-b border-gray-200 dark:border-[#8FBC8F]/10">
                            <h2 className={`text-xl font-bold ${THEME.headingText}`}>Personal Information</h2>
                            <p className={`text-sm ${THEME.subText} mt-0.5`}>Update your account details below</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                            {/* Username */}
                            <div>
                                <label className={labelClass}>
                                    <User className="w-4 h-4" />
                                    Username <span className="text-[#8FBC8F]">*</span>
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase}`}
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className={labelClass}>
                                    <User className="w-4 h-4" />
                                    Name <span className="text-[#8FBC8F]">*</span>
                                </label>
                                <input
                                    id="full_name"
                                    name="full_name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase}`}
                                    placeholder="Enter your Name"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className={labelClass}>
                                    <Mail className="w-4 h-4" />
                                    Email Address <span className="text-[#8FBC8F]">*</span>
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
                                    name="phone_number"
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={handlePhoneChange}
                                    className={`w-full px-4 py-3 rounded-xl outline-none transition-all ${THEME.inputBase} ${phoneError ? 'border-red-500 dark:border-red-500' : ''}`}
                                    placeholder="09175550123"
                                />
                                {phoneError && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {phoneError}
                                    </p>
                                )}
                            </div>

                            {/* Password Section */}
                            <div className="bg-gray-50/50 dark:bg-[#1A1A1D]/50 p-6 rounded-2xl border border-gray-200 dark:border-[#8FBC8F]/20 mt-6">
                                <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-[#8FBC8F]/10 pb-2 ${THEME.headingText}`}>
                                    <Lock className="w-4 h-4 text-[#8FBC8F]" /> Change Password
                                </h3>
                                <p className={`text-xs ${THEME.subText} mb-4`}>Leave both fields blank to keep your current password.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                className={`w-full px-4 py-3 rounded-xl outline-none transition-all pr-10 ${THEME.inputBase} ${formData.password && !allRequirementsMet(formData.password) ? 'border-red-500 dark:border-red-500' : ''
                                                    } ${formData.password && allRequirementsMet(formData.password) ? 'border-green-500 dark:border-green-500' : ''
                                                    }`}
                                                placeholder="Min. 8 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8FBC8F] transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {/* Requirements Checklist */}
                                        {formData.password && (
                                            <div className="mt-4 p-4 bg-white dark:bg-[#1A1A1D] rounded-xl border border-gray-200 dark:border-[#8FBC8F]/20">
                                                <p className={`text-xs font-bold mb-3 ${THEME.subText}`}>Requirements:</p>
                                                <div className="space-y-2">
                                                    <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).minLength ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {checkPasswordRequirements(formData.password).minLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                        Contains at least 8 characters
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {checkPasswordRequirements(formData.password).hasUppercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                        Includes at least 1 uppercase letter (A–Z)
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {checkPasswordRequirements(formData.password).hasLowercase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                        Includes at least 1 lowercase letter (a–z)
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-xs ${checkPasswordRequirements(formData.password).hasNumber ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {checkPasswordRequirements(formData.password).hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                        Includes at least 1 number (0–9)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                className={`w-full px-4 py-3 rounded-xl outline-none transition-all pr-10 ${THEME.inputBase} ${formData.password_confirm && formData.password !== formData.password_confirm ? 'border-red-500 dark:border-red-500' : ''
                                                    } ${formData.password_confirm && formData.password === formData.password_confirm && formData.password ? 'border-green-500 dark:border-green-500' : ''
                                                    }`}
                                                placeholder="Re-enter password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8FBC8F] transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                                        Your password is your personal key to access the system. Never share it with anyone.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={() => setShowLogoutModal(true)}
                            className="w-full px-6 py-4 bg-[#8FBC8F]/10 dark:bg-[#8FBC8F]/5 hover:bg-[#8FBC8F]/20 dark:hover:bg-[#8FBC8F]/10 text-[#8FBC8F] dark:text-[#A8D4A8] rounded-3xl font-bold flex items-center justify-center gap-2 border-2 border-[#8FBC8F]/30 dark:border-[#8FBC8F]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#8FBC8F]/20"
                        >
                            <LogOut className="w-5 h-5" />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-3xl ${THEME.cardBase} overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200`}>
                        <div className={`p-6 text-white ${THEME.gradientBg}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <LogOut className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Confirm Logout</h3>
                                    <p className="text-sm text-white/90">Are you sure you want to leave?</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className={`text-sm ${THEME.subText} mb-6`}>
                                You will be logged out of your account and redirected to the login page. Any unsaved changes will be lost.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-[#8FBC8F] dark:border-[#8FBC8F]/50 text-[#8FBC8F] dark:text-[#A8D4A8] hover:bg-[#8FBC8F]/5 dark:hover:bg-[#8FBC8F]/10 rounded-xl font-bold transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className={`flex-1 px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${THEME.buttonPrimary}`}
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
