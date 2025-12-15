import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import posService from '../services/posService';
import userService from '../services/userService';
import {
    Activity, Search, Filter, Download, Calendar,
    User, Clock, ArrowUpDown, ChevronDown, Loader2,
    ShoppingCart, Package, RotateCcw, DollarSign, X,
    ChevronRight, AlertTriangle, Eye, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors) ---
const THEME = {
    primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
    headingText: "text-[#2F4F4F] dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
    pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",
    cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-xl",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] dark:focus:border-[#A8D4A8] text-gray-900 dark:text-white",
    buttonPrimary: "bg-gradient-to-r from-[#2E5B2E] to-[#3D6B3D] text-white shadow-lg shadow-[#2E5B2E]/50 hover:shadow-[#2E5B2E]/70 hover:-translate-y-0.5 transition-all duration-200",
    buttonDanger: "bg-gradient-to-r from-[#2E5B2E] to-[#3D6B3D] text-white shadow-lg shadow-[#2E5B2E]/50 hover:shadow-[#2E5B2E]/70 hover:-translate-y-0.5 transition-all duration-200",
    tableHeader: "bg-gradient-to-br from-[#F5E6E0]/50 to-[#E8D5C4]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30",
    tableRow: "hover:bg-[#8FBC8F]/5 dark:hover:bg-[#8FBC8F]/10 transition-colors duration-200"
};

const ActivityLogPage = () => {
    const queryClient = useQueryClient();

    // Filters
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [actionType, setActionType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Transaction Details Modal
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [selectedItemsToRefund, setSelectedItemsToRefund] = useState([]);

    // Fetch users for employee filter
    const { data: usersData } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            const res = await userService.getAllUsers();
            return res.data?.results || res.data || [];
        }
    });

    // Fetch transactions as activity data
    const { data: transactionsData, isLoading } = useQuery({
        queryKey: ['activity-log', selectedEmployee, startDate, endDate],
        queryFn: async () => {
            const params = {};
            if (selectedEmployee) params.user_id = selectedEmployee;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const res = await posService.getTransactions(params);
            return res.data?.results || res.data || [];
        }
    });

    // Fetch Details for Selected Transaction
    const { data: currentTransactionDetails } = useQuery({
        queryKey: ['transaction', selectedTransaction?.id],
        queryFn: async () => await posService.getTransaction(selectedTransaction.id),
        enabled: !!selectedTransaction,
    });

    const details = currentTransactionDetails?.data || selectedTransaction;

    // Void Mutation
    const voidMutation = useMutation({
        mutationFn: async ({ id, reason }) => await posService.voidTransaction(id, reason),
        onSuccess: () => {
            toast.success("Transaction voided/returned successfully!");
            setIsVoidModalOpen(false);
            setVoidReason('');
            setSelectedTransaction(null);
            queryClient.invalidateQueries({ queryKey: ['activity-log'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to void transaction");
        }
    });

    const handleVoidSubmit = () => {
        if (selectedItemsToRefund.length === 0) {
            toast.error("Please select at least one product to refund.");
            return;
        }
        if (!voidReason.trim()) {
            toast.error("Please provide a reason for voiding/returning.");
            return;
        }
        // Include selected items in the reason for tracking
        const selectedProductNames = selectedItemsToRefund.map(item =>
            `${item.product_name} x${item.quantity}`
        ).join(', ');
        const enhancedReason = `Items returned: [${selectedProductNames}]. Reason: ${voidReason}`;
        voidMutation.mutate({ id: selectedTransaction.id, reason: enhancedReason });
    };

    const users = usersData || [];
    const transactions = transactionsData || [];

    // Transform transactions into activity log entries
    const activityLog = useMemo(() => {
        let activities = transactions.map(txn => {
            // Parse refund details from void_reason if it's a VOID transaction
            let refundInfo = null;
            if (txn.status === 'VOID' && txn.void_reason) {
                // Try to extract refunded items from the format: "Items returned: [Product x2, Product2 x1]. Reason: ..."
                const match = txn.void_reason.match(/Items returned: \[([^\]]+)\]/);
                if (match) {
                    const refundedItems = match[1].split(',').map(s => s.trim()).filter(s => s);
                    const totalItems = txn.items?.length || 0;
                    refundInfo = {
                        refundedCount: refundedItems.length,
                        totalCount: totalItems,
                        isPartial: refundedItems.length < totalItems && totalItems > 0
                    };
                }
            }

            return {
                id: txn.id,
                timestamp: new Date(txn.created_at),
                employee: txn.user_name || txn.created_by_name || 'System',
                employeeId: txn.user || txn.created_by,
                action: txn.status === 'VOID' ? 'REFUND' : 'SALE',
                status: txn.status,
                description: `#${txn.transaction_number}`,
                amount: parseFloat(txn.total_amount) || 0,
                details: txn.payment_method || 'Cash',
                customer: txn.customer_name || 'Walk-in',
                reference: txn.transaction_number,
                refundInfo: refundInfo,
                rawTransaction: txn
            };
        });

        // Filter by action type
        if (actionType) {
            activities = activities.filter(a => a.action === actionType);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            activities = activities.filter(a =>
                a.employee.toLowerCase().includes(term) ||
                a.description.toLowerCase().includes(term) ||
                a.customer.toLowerCase().includes(term) ||
                a.reference.toLowerCase().includes(term)
            );
        }

        // Sort
        activities.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'created_at':
                    comparison = a.timestamp - b.timestamp;
                    break;
                case 'employee':
                    comparison = a.employee.localeCompare(b.employee);
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'action':
                    comparison = a.action.localeCompare(b.action);
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return activities;
    }, [transactions, actionType, searchTerm, sortField, sortOrder]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const sales = activityLog.filter(a => a.action === 'SALE');
        const refunds = activityLog.filter(a => a.action === 'REFUND');
        return {
            totalActions: activityLog.length,
            totalSales: sales.length,
            totalRefunds: refunds.length,
            totalRevenue: sales.reduce((sum, a) => sum + a.amount, 0)
        };
    }, [activityLog]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const clearFilters = () => {
        setSelectedEmployee('');
        setStartDate('');
        setEndDate('');
        setActionType('');
        setSearchTerm('');
    };

    const hasActiveFilters = selectedEmployee || startDate || endDate || actionType || searchTerm;

    // Export to CSV
    const handleExport = () => {
        if (activityLog.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Date/Time', 'Employee', 'Action', 'Description', 'Customer', 'Amount', 'Reference'];
        const rows = activityLog.map(a => [
            a.timestamp.toLocaleString(),
            a.employee,
            a.action,
            a.description,
            a.customer,
            `₱${a.amount.toFixed(2)}`,
            a.reference
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `activity_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Activity log exported!');
    };

    const getActionStyle = (action) => {
        switch (action) {
            case 'SALE':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'REFUND':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'SALE':
                return <ShoppingCart className="w-4 h-4" />;
            case 'REFUND':
                return <RotateCcw className="w-4 h-4" />;
            default:
                return <Activity className="w-4 h-4" />;
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', {
        style: 'currency', currency: 'PHP'
    }).format(val || 0);

    const StatusBadge = ({ status }) => {
        const styles = {
            COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            VOID: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
        const displayStatus = status === 'VOID' ? 'RETURNED' : status;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {displayStatus}
            </span>
        );
    };

    return (
        <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] bg-clip-text text-transparent flex items-center gap-3">
                            <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-[#8FBC8F]" strokeWidth={2} />
                            Activity Log
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-[#2F4F4F] dark:text-gray-300 font-medium mt-2">
                            Track employee actions, transactions, and manage returns
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`rounded-2xl p-5 ${THEME.cardBase}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#8FBC8F]/10 rounded-xl">
                                <Activity className="w-5 h-5 text-[#8FBC8F]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Total Actions</p>
                                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>{stats.totalActions}</p>
                            </div>
                        </div>
                    </div>
                    <div className={`rounded-2xl p-5 ${THEME.cardBase}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Sales</p>
                                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>{stats.totalSales}</p>
                            </div>
                        </div>
                    </div>
                    <div className={`rounded-2xl p-5 ${THEME.cardBase}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <RotateCcw className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Returns</p>
                                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>{stats.totalRefunds}</p>
                            </div>
                        </div>
                    </div>
                    <div className={`rounded-2xl p-5 ${THEME.cardBase}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                                <DollarSign className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Revenue</p>
                                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>₱{stats.totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`rounded-2xl p-5 ${THEME.cardBase}`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-[#8FBC8F]" />
                            <h2 className={`text-lg font-bold ${THEME.headingText}`}>Filters & Search</h2>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Search */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Employee, customer, transaction #..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none ${THEME.inputBase}`}
                                />
                            </div>
                        </div>

                        {/* Employee Filter */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Employee
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl outline-none appearance-none cursor-pointer ${THEME.inputBase}`}
                                >
                                    <option value="">All Employees</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Action Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Action Type
                            </label>
                            <div className="relative">
                                <select
                                    value={actionType}
                                    onChange={(e) => setActionType(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl outline-none appearance-none cursor-pointer ${THEME.inputBase}`}
                                >
                                    <option value="">All Actions</option>
                                    <option value="SALE">Sales Only</option>
                                    <option value="REFUND">Returns Only</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Date Range
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">From</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className={`w-full pl-14 pr-3 py-3 rounded-xl outline-none ${THEME.inputBase}`}
                                        />
                                    </div>
                                </div>
                                <span className="text-gray-400 font-medium">→</span>
                                <div className="flex-1">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">To</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className={`w-full pl-10 pr-3 py-3 rounded-xl outline-none ${THEME.inputBase}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Table */}
                <div className={`rounded-2xl overflow-hidden ${THEME.cardBase}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-[#8FBC8F]" />
                        </div>
                    ) : activityLog.length === 0 ? (
                        <div className="text-center py-20">
                            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className={`text-xl font-bold ${THEME.headingText} mb-2`}>No Activity Found</h3>
                            <p className={THEME.subText}>Try adjusting your filters to see more results.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={THEME.tableHeader}>
                                    <tr>
                                        <th
                                            onClick={() => handleSort('created_at')}
                                            className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-[#8FBC8F] transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Date/Time
                                                {sortField === 'created_at' && <ArrowUpDown className="w-3 h-3" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('employee')}
                                            className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-[#8FBC8F] transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Employee
                                                {sortField === 'employee' && <ArrowUpDown className="w-3 h-3" />}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('action')}
                                            className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-[#8FBC8F] transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                Action
                                                {sortField === 'action' && <ArrowUpDown className="w-3 h-3" />}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th
                                            onClick={() => handleSort('amount')}
                                            className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-[#8FBC8F] transition-colors"
                                        >
                                            <div className="flex items-center justify-end gap-2">
                                                Amount
                                                {sortField === 'amount' && <ArrowUpDown className="w-3 h-3" />}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                    {activityLog.map((activity) => (
                                        <tr key={activity.id} className={THEME.tableRow}>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className={`font-medium text-sm ${THEME.headingText}`}>
                                                        {activity.timestamp.toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {activity.timestamp.toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#8FBC8F]/10 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-[#8FBC8F]">
                                                            {activity.employee.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className={`font-medium ${THEME.headingText}`}>{activity.employee}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit ${getActionStyle(activity.action)}`}>
                                                        {getActionIcon(activity.action)}
                                                        {activity.action}
                                                    </span>
                                                    {activity.refundInfo && (
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium pl-1">
                                                            {activity.refundInfo.refundedCount} of {activity.refundInfo.totalCount} items returned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`font-medium text-sm ${THEME.headingText}`}>{activity.description}</p>
                                                <p className="text-xs text-gray-400">{activity.details}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm ${THEME.subText}`}>{activity.customer}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold text-lg ${activity.action === 'REFUND' ? 'text-red-500' : 'text-[#8FBC8F]'}`}>
                                                    {activity.action === 'REFUND' ? '-' : ''}₱{activity.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => setSelectedTransaction(activity.rawTransaction)}
                                                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${THEME.headingText}`}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* Transaction Details Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedTransaction(null)}
                    />

                    {/* Modal */}
                    <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${THEME.cardBase}`}>
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-[#5F8F5F] to-[#7DAF7D] p-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                                <p className="text-sm text-white/80">{details?.transaction_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 space-y-6">
                            {/* Transaction Info */}
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm text-gray-500">Status</span>
                                    <StatusBadge status={details?.status} />
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500">Date</span>
                                    <span className={`font-medium ${THEME.headingText}`}>
                                        {new Date(details?.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500">Customer</span>
                                    <span className={`font-medium ${THEME.headingText}`}>
                                        {details?.customer_name || 'Walk-in'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Cashier</span>
                                    <span className={`font-medium ${THEME.headingText} flex items-center gap-1.5`}>
                                        <User className="w-3 h-3" />
                                        {details?.created_by_name || details?.created_by?.full_name || 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${THEME.subText}`}>Items Purchased</h3>
                                <div className="space-y-3">
                                    {details?.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs text-gray-500">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${THEME.headingText}`}>{item.product_name}</p>
                                                    <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} / ea</p>
                                                </div>
                                            </div>
                                            <span className={`font-medium ${THEME.headingText}`}>
                                                {formatCurrency(item.line_total || (item.quantity * item.unit_price))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 space-y-2">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(details?.subtotal || details?.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold text-lg ${THEME.headingText}`}>Total</span>
                                    <span className={`text-2xl font-extrabold ${THEME.gradientText}`}>
                                        {formatCurrency(details?.total_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Return/Void Action */}
                            {details?.status === 'COMPLETED' && (
                                <div className="p-4 rounded-xl border border-[#8FBC8F]/30 bg-[#8FBC8F]/5 dark:bg-[#8FBC8F]/10 dark:border-[#8FBC8F]/30">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#2F4F4F] dark:text-[#8FBC8F] mb-2">
                                        <RotateCcw className="w-4 h-4" /> Return / Void Transaction
                                    </h4>
                                    <p className="text-xs text-[#2F4F4F]/70 dark:text-gray-400 mb-4">
                                        Click below to select specific products you want to refund.
                                    </p>
                                    <button
                                        onClick={() => {
                                            // Pre-select all items when opening the void modal
                                            setSelectedItemsToRefund(details?.items || []);
                                            setIsVoidModalOpen(true);
                                        }}
                                        className={`w-full py-2.5 rounded-lg text-sm font-bold ${THEME.buttonPrimary}`}
                                    >
                                        Select Products to Return
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Void Confirmation Modal with Product Selection */}
            {isVoidModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl ${THEME.cardBase}`}>
                        {/* Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                            <h3 className={`text-xl font-extrabold mb-1 ${THEME.headingText}`}>Select Products to Refund</h3>
                            <p className={`text-sm ${THEME.subText}`}>
                                Transaction <b>{selectedTransaction?.transaction_number}</b>
                            </p>
                        </div>

                        {/* Product Selection List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-[#151515]">
                            {/* Select All / Deselect All */}
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => setSelectedItemsToRefund(details?.items || [])}
                                    className="flex-1 py-3 px-4 text-sm font-bold rounded-xl bg-[#8FBC8F] text-white hover:bg-[#7DAF7D] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    Select All
                                </button>
                                <button
                                    onClick={() => setSelectedItemsToRefund([])}
                                    className="flex-1 py-3 px-4 text-sm font-bold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Square className="w-4 h-4" />
                                    Deselect All
                                </button>
                            </div>

                            {/* Product Items */}
                            {details?.items?.map((item, idx) => {
                                const isSelected = selectedItemsToRefund.some(i => i.product === item.product || i.id === item.id);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedItemsToRefund(prev => prev.filter(i => i.product !== item.product && i.id !== item.id));
                                            } else {
                                                setSelectedItemsToRefund(prev => [...prev, item]);
                                            }
                                        }}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                                            ? 'border-[#8FBC8F] bg-[#8FBC8F]/10 dark:bg-[#8FBC8F]/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${isSelected
                                                ? 'bg-[#8FBC8F] text-white'
                                                : 'border-2 border-gray-300 dark:border-gray-600'
                                                }`}>
                                                {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm truncate ${THEME.headingText}`}>
                                                    {item.product_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.quantity}x @ {formatCurrency(item.unit_price)}
                                                </p>
                                            </div>

                                            {/* Line Total */}
                                            <span className={`font-bold text-sm ${isSelected ? 'text-[#8FBC8F]' : THEME.headingText}`}>
                                                {formatCurrency(item.line_total || (item.quantity * item.unit_price))}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Refund Summary & Reason */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e]">
                            {/* Refund Total */}
                            <div className="flex justify-between items-center mb-3 p-3 rounded-lg bg-[#8FBC8F]/10 dark:bg-[#8FBC8F]/20">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Refund Total:</span>
                                <span className="text-xl font-extrabold text-[#8FBC8F]">
                                    {formatCurrency(
                                        selectedItemsToRefund.reduce((sum, item) =>
                                            sum + (item.line_total || (item.quantity * item.unit_price)), 0
                                        )
                                    )}
                                    <span className="text-xs text-gray-500 ml-1">
                                        of {formatCurrency(details?.total_amount)}
                                    </span>
                                </span>
                            </div>

                            {/* Reason Input */}
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Reason for Return *
                            </label>
                            <textarea
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="e.g. Customer returned items, Wrong entry..."
                                className={`w-full h-20 p-3 rounded-xl mb-4 text-sm resize-none ${THEME.inputBase}`}
                            />

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setIsVoidModalOpen(false);
                                        setVoidReason('');
                                        setSelectedItemsToRefund([]);
                                    }}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-base text-gray-700 dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md hover:shadow-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVoidSubmit}
                                    disabled={voidMutation.isPending || selectedItemsToRefund.length === 0}
                                    className="flex-[1.5] py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-[#E57373] to-[#EF5350] text-white shadow-lg shadow-red-300/40 hover:shadow-red-400/60 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-md"
                                >
                                    {voidMutation.isPending ? 'Processing...' : `🔄 Confirm Return (${selectedItemsToRefund.length} items)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogPage;
