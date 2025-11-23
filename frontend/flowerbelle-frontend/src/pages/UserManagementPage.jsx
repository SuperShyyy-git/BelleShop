import React, { useEffect, useState } from 'react';
import userService from '../services/userService';
import UserFormModal from '../components/users/UserFormModal';
import { 
    Users, PlusCircle, Trash2, Edit, Shield, 
    CheckCircle, XCircle, Loader2, UserCog, AlertCircle 
} from 'lucide-react';
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
    
    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
    
    // Table
    tableHeader: "bg-gray-50/50 dark:bg-[#1A1A1D]/50 border-b border-gray-200 dark:border-[#FF69B4]/10",
    tableRow: "hover:bg-[#FF69B4]/5 dark:hover:bg-[#FF69B4]/10 transition-colors duration-200 border-b border-gray-100 dark:border-gray-800/50 last:border-0"
};

// -----------------------------------------------------------------------------
// USER MANAGEMENT PAGE
// -----------------------------------------------------------------------------
const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States for Modals/Editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); 

    // --- Data Fetching ---
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await userService.getAllUsers();
            if (response.data && Array.isArray(response.data.results)) {
                setUsers(response.data.results);
            } else if (Array.isArray(response.data)) {
                setUsers(response.data); 
            } else {
                setUsers([]); 
                throw new Error("Unexpected data format.");
            }
        } catch (err) {
            console.error('Error loading users:', err);
            let message = 'Failed to load users.';
            if (err.response && err.response.data && err.response.data.detail) {
                message = err.response.data.detail;
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- CRUD Handlers ---
    const handleAddUser = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (userId) => {
        const userTarget = users.find(u => u.id === userId);
        if (!userTarget) return;

        // CASE 1: User is ACTIVE -> Deactivate
        if (userTarget.is_active) {
            if (!window.confirm(`Are you sure you want to DEACTIVATE user: ${userTarget.username}?`)) return;

            try {
                await userService.deactivateUser(userId); 
                setUsers(prevUsers => 
                    prevUsers.map(u => u.id === userId ? { ...u, is_active: false } : u)
                );
                toast.success(`User '${userTarget.username}' deactivated!`);
            } catch (error) {
                toast.error('Failed to deactivate user.');
            }
        } 
        // CASE 2: User is INACTIVE -> Permanent Delete
        else {
            if (!window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to permanently delete '${userTarget.username}'?`)) return;

            const loadingToast = toast.loading("Deleting user...");

            try {
                await userService.deleteUser(userId); 
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
                toast.dismiss(loadingToast);
                toast.success(`User '${userTarget.username}' permanently deleted!`);
            } catch (error) {
                toast.dismiss(loadingToast);
                console.error("Delete error:", error);
                const errMsg = error.response?.data?.detail || 'Failed to delete user.';
                toast.error(errMsg, { duration: 5000 });
            }
        }
    };

    const handleSaveUser = async (formData) => {
        try {
            if (currentUser) {
                await userService.updateUser(currentUser.id, formData);
                toast.success(`User '${formData.username}' updated successfully!`);
            } else {
                await userService.createUser(formData);
                toast.success(`User '${formData.username}' created successfully!`);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            const errMsg = error.response?.data?.username?.[0] || error.response?.data?.detail || 'Failed to save user.';
            toast.error(errMsg);
        }
    };
    
    // --- Helper for Role Styles ---
    const getRoleStyle = (role) => {
        switch (role?.toUpperCase()) {
            case 'OWNER':
                return 'bg-[#FF69B4]/10 text-[#FF69B4] dark:text-[#FF77A9] border-[#FF69B4]/30'; 
            case 'ADMIN':
                return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
            default: // STAFF
                return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        }
    };

    // --- Rendering Logic ---
    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${THEME.pageBg}`}>
                <div className="text-center">
                    <Loader2 className={`w-12 h-12 ${THEME.primaryText} animate-spin mx-auto mb-4`} />
                    <p className={`font-medium ${THEME.subText}`}>Loading users...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-screen p-6 ${THEME.pageBg}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white dark:bg-[#1e1e1e] border-2 border-red-100 dark:border-red-900/30 rounded-3xl p-8 shadow-xl flex items-center gap-5">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${THEME.headingText}`}>Error Loading Users</h3>
                            <p className="text-red-500 dark:text-red-400 font-medium mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-4xl font-extrabold flex items-center gap-3 ${THEME.gradientText}`}>
                            <Users className={THEME.primaryText} size={32} strokeWidth={2.5} /> User Management
                        </h1>
                        <p className={`text-lg ${THEME.subText} mt-1 ml-1`}>Manage system access, roles, and permissions.</p>
                    </div>
                    
                    <button 
                        onClick={handleAddUser}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${THEME.buttonPrimary}`}
                    >
                        <PlusCircle className="w-5 h-5" strokeWidth={2.5} />
                        Add New User
                    </button>
                </div>

                {/* Users Table Card */}
                <div className={`rounded-3xl overflow-hidden ${THEME.cardBase}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={THEME.tableHeader}>
                                <tr>
                                    <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>User</th>
                                    <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Full Name</th>
                                    <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Role</th>
                                    <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Status</th>
                                    <th className={`p-5 text-xs font-bold uppercase tracking-wider text-center ${THEME.subText}`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                {users.map((user) => (
                                    <tr key={user.id} className={THEME.tableRow}>
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner border ${
                                                    user.role === 'OWNER' ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                }`}>
                                                    <span className={`font-bold text-lg ${user.role === 'OWNER' ? 'text-[#FF69B4]' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-sm ${THEME.headingText}`}>{user.username}</div>
                                                    {user.email && <div className="text-xs text-gray-400 dark:text-gray-500">{user.email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className={`font-medium ${THEME.headingText}`}>
                                                {user.full_name || <span className="text-gray-400 dark:text-gray-600 italic text-sm">Not provided</span>}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 w-fit shadow-sm ${getRoleStyle(user.role)}`}>
                                                {user.role === 'OWNER' ? <Shield size={12} /> : <UserCog size={12} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1.5 shadow-sm ${
                                                user.is_active 
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' 
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'
                                            }`}>
                                                {user.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button 
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className={`p-2 rounded-xl transition-all ${
                                                        user.is_active 
                                                            ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                                            : 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40'
                                                    }`}
                                                    title={user.is_active ? "Deactivate User" : "Permanently Delete User"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className={`p-12 text-center ${THEME.subText} italic`}>
                                            <Users className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                            <h3 className="text-xl font-bold mb-1">No users found</h3>
                                            <p className="opacity-80 cursor-pointer hover:text-[#FF69B4] transition-colors" onClick={handleAddUser}>
                                                Create your first user
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Component */}
            {isModalOpen && (
                <UserFormModal 
                    isOpen={isModalOpen}
                    user={currentUser} 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};

export default UserManagementPage;