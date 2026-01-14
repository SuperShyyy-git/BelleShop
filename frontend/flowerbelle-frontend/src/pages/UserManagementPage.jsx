import React, { useEffect, useState } from 'react';
import userService from '../services/userService';
import UserFormModal from '../components/users/UserFormModal';
import {
    Users, PlusCircle, Trash2, Edit, Shield,
    CheckCircle, XCircle, Loader2, UserCog,
    Archive, RotateCcw, ArchiveRestore, Search, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors - Matching LoginPage) ---
const THEME = {
    // Logo colors: Sage Green (#8FBC8F), Blush Pink (#F5E6E0), Cream (#FFF8F0)
    primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
    headingText: "text-[#2F4F4F] dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#2E5B2E] to-[#3D6B3D]",
    pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",
    cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-xl",
    buttonPrimary: "bg-gradient-to-r from-[#2E5B2E] to-[#3D6B3D] text-white shadow-lg shadow-[#2E5B2E]/50 hover:shadow-[#2E5B2E]/70 hover:-translate-y-0.5 transition-all duration-200",
    tableHeader: "bg-gradient-to-br from-[#F5E6E0]/50 to-[#E8D5C4]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 border-b border-[#D4C4B0] dark:border-[#8FBC8F]/20",
    tableRow: "hover:bg-[#8FBC8F]/5 dark:hover:bg-[#8FBC8F]/10 transition-colors duration-200 border-b border-gray-100 dark:border-gray-800/50 last:border-0"
};

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // NEW: State to toggle between Active and Archived views
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'

    // NEW: Search and Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(''); // '' = All roles

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

    // --- Filter Users based on Tabs, Search, and Role ---
    const filteredUsers = users.filter(user => {
        // Filter by active/archived status
        const matchesStatus = viewMode === 'active' ? user.is_active : !user.is_active;

        // Filter by search term (username, name, email)
        const term = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            user.username?.toLowerCase().includes(term) ||
            user.full_name?.toLowerCase().includes(term) ||
            user.email?.toLowerCase().includes(term) ||
            user.first_name?.toLowerCase().includes(term) ||
            user.last_name?.toLowerCase().includes(term);

        // Filter by role
        const matchesRole = !roleFilter || user.role === roleFilter;

        return matchesStatus && matchesSearch && matchesRole;
    });

    // --- CRUD Handlers ---
    const handleAddUser = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    // ARCHIVE HANDLER (Soft Delete)
    const handleArchiveUser = async (user) => {
        if (!window.confirm(`Are you sure you want to ARCHIVE user: ${user.username}?`)) return;

        try {
            await userService.deactivateUser(user.id);
            setUsers(prevUsers =>
                prevUsers.map(u => u.id === user.id ? { ...u, is_active: false } : u)
            );
            toast.success(`User '${user.username}' archived successfully!`);
        } catch (error) {
            toast.error('Failed to archive user.');
        }
    };

    // RESTORE HANDLER (Re-activate)
    const handleRestoreUser = async (user) => {
        if (!window.confirm(`Restore user: ${user.username}?`)) return;

        try {
            // Assuming your update endpoint handles re-activation
            await userService.updateUser(user.id, { ...user, is_active: true });

            setUsers(prevUsers =>
                prevUsers.map(u => u.id === user.id ? { ...u, is_active: true } : u)
            );
            toast.success(`User '${user.username}' restored!`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to restore user.');
        }
    };

    // PERMANENT DELETE HANDLER
    const handleDeletePermanent = async (user) => {
        if (!window.confirm(`⚠️ PERMANENT DELETE WARNING ⚠️\n\nThis cannot be undone. Delete '${user.username}' forever?`)) return;

        const loadingToast = toast.loading("Deleting user...");

        try {
            await userService.deleteUser(user.id);
            setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
            toast.dismiss(loadingToast);
            toast.success(`User '${user.username}' permanently deleted!`);
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error("Delete error:", error);
            const errMsg = error.response?.data?.detail || 'Failed to delete user.';
            toast.error(errMsg);
        }
    };

    const handleSaveUser = async (formData) => {
        try {
            if (currentUser) {
                await userService.updateUser(currentUser.id, formData);
                toast.success(`User '${formData.username}' updated!`);
            } else {
                await userService.createUser(formData);
                toast.success(`User '${formData.username}' created!`);
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
                return 'bg-[#8FBC8F]/10 text-[#8FBC8F] dark:text-[#A8D4A8] border-[#8FBC8F]/30';
            case 'ADMIN':
                return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
            default:
                return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        }
    };

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center ${THEME.pageBg}`}>
            <Loader2 className={`w-10 h-10 ${THEME.primaryText} animate-spin`} />
        </div>
    );

    if (error) return (
        <div className={`min-h-screen p-6 ${THEME.pageBg}`}>
            <div className="max-w-7xl mx-auto bg-white dark:bg-[#1e1e1e] border border-red-200 p-8 rounded-2xl shadow-xl flex items-center gap-4">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Error Loading Users</h3>
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen ${THEME.pageBg} p-3 sm:p-4 lg:p-6 xl:p-8 transition-colors duration-200`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] bg-clip-text text-transparent flex items-center gap-3">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#8FBC8F]" strokeWidth={2} />
                            <span>User Management</span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-[#2F4F4F] dark:text-gray-300 font-medium mt-2">Manage system access and archives.</p>
                    </div>

                    <button
                        onClick={handleAddUser}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md transition-all ${THEME.buttonPrimary}`}
                    >
                        <PlusCircle className="w-5 h-5" />
                        Add New User
                    </button>
                </div>

                {/* TABS FOR VIEW MODE */}
                <div className="flex p-1 bg-gray-100 dark:bg-[#1e1e1e] rounded-xl w-fit border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'active'
                            ? 'bg-white dark:bg-gray-800 text-[#8FBC8F] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <CheckCircle size={16} />
                        Active Users
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-black/30 rounded-md">
                            {users.filter(u => u.is_active).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode('archived')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'archived'
                            ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <Archive size={16} />
                        Archived
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-black/30 rounded-md">
                            {users.filter(u => !u.is_active).length}
                        </span>
                    </button>
                </div>

                {/* Search and Filter Section */}
                <div className={`${THEME.cardBase} rounded-2xl p-4`}>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by username, name, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 bg-white/50 dark:bg-[#1A1A1D]/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8FBC8F]/50 focus:border-[#8FBC8F] transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Role Filter */}
                        <div className="relative sm:w-48">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 bg-white/50 dark:bg-[#1A1A1D]/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8FBC8F]/50 focus:border-[#8FBC8F] transition-all appearance-none cursor-pointer"
                            >
                                <option value="">All Roles</option>
                                <option value="OWNER">Owner</option>
                                <option value="STAFF">Staff</option>
                            </select>
                        </div>
                    </div>

                    {/* Results count */}
                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-semibold text-[#8FBC8F]">{filteredUsers.length}</span> of {users.filter(u => viewMode === 'active' ? u.is_active : !u.is_active).length} {viewMode === 'active' ? 'active' : 'archived'} users
                        {(searchTerm || roleFilter) && (
                            <button
                                onClick={() => { setSearchTerm(''); setRoleFilter(''); }}
                                className="ml-2 text-[#8FBC8F] hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="block lg:hidden grid grid-cols-1 gap-4">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className={`${THEME.cardBase} rounded-xl p-5 space-y-4`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner border ${user.role === 'OWNER' ? 'bg-[#8FBC8F]/10 border-[#8FBC8F]/30' : 'bg-gray-100 border-gray-200'
                                    }`}>
                                    <span className="font-bold text-lg text-gray-500">{user.username.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1">
                                    <div className={`font-bold ${THEME.headingText}`}>{user.username}</div>
                                    <div className="text-xs text-gray-400">{user.email}</div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                {viewMode === 'active' ? (
                                    <>
                                        <button onClick={() => handleEditUser(user)} className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 font-medium text-xs flex items-center justify-center gap-2">
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button onClick={() => handleArchiveUser(user)} className="flex-1 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 font-medium text-xs flex items-center justify-center gap-2">
                                            <Archive size={14} /> Archive
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleRestoreUser(user)} className="flex-1 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-medium text-xs flex items-center justify-center gap-2">
                                            <RotateCcw size={14} /> Restore
                                        </button>
                                        <button onClick={() => handleDeletePermanent(user)} className="flex-1 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 font-medium text-xs flex items-center justify-center gap-2">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className={`hidden lg:block rounded-3xl overflow-hidden ${THEME.cardBase}`}>
                    <table className="w-full text-left">
                        <thead className={THEME.tableHeader}>
                            <tr>
                                <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Username</th>
                                <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Name</th>
                                <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Role</th>
                                <th className={`p-5 text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Status</th>
                                <th className={`p-5 text-xs font-bold uppercase tracking-wider text-center ${THEME.subText}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={THEME.tableRow}>
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner border ${user.role === 'OWNER' ? 'bg-[#8FBC8F]/10 border-[#8FBC8F]/30' : 'bg-gray-100 border-gray-200'
                                                }`}>
                                                <span className="font-bold text-gray-500">{user.username.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${THEME.headingText}`}>{user.username}</div>
                                                <div className="text-xs text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`p-5 font-medium ${THEME.headingText}`}>{user.full_name || '-'}</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 w-fit ${getRoleStyle(user.role)}`}>
                                            {user.role === 'OWNER' ? <Shield size={12} /> : <UserCog size={12} />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1.5 ${user.is_active
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                            {user.is_active ? <CheckCircle size={12} /> : <Archive size={12} />}
                                            {user.is_active ? 'Active' : 'Archived'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {viewMode === 'active' ? (
                                                <>
                                                    <button onClick={() => handleEditUser(user)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#8FBC8F]" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleArchiveUser(user)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500" title="Archive User">
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleRestoreUser(user)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-500" title="Restore User">
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeletePermanent(user)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete Permanently">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center opacity-60">
                                        {viewMode === 'active' ? (
                                            <>
                                                <Users className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                                <h3 className="text-xl font-bold">No active users</h3>
                                                <p className="cursor-pointer hover:text-[#8FBC8F]" onClick={handleAddUser}>Create one?</p>
                                            </>
                                        ) : (
                                            <>
                                                <ArchiveRestore className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                                <h3 className="text-xl font-bold">No archived users</h3>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <UserFormModal
                        isOpen={isModalOpen}
                        user={currentUser}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveUser}
                    />
                )}
            </div>
        </div>
    );
};

export default UserManagementPage;
