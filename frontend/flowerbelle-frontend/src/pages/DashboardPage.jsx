import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import reportService from '../services/reportService';
import { useAuth } from '../contexts/AuthContext';
import { 
     ShoppingBag, Package, AlertTriangle, 
    Clock, ArrowRight, RefreshCw, ListOrdered,
    Banknote
} from 'lucide-react';

/**
 * StatCard Component
 * Displays a single key metric in a clickable, color-coded card.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, color, to, isAlert }) => {
    const Wrapper = to ? Link : 'div';
    
    const colorClasses = {
        green: "text-emerald-500 dark:text-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-800/10",
        pink: "text-pink-500 dark:text-pink-400 bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-900/10 dark:to-pink-800/10",
        red: "text-red-500 dark:text-red-400 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/10",
        blue: "text-pink-500 dark:text-pink-400 bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-900/10 dark:to-pink-800/10",
        gold: "text-pink-600 dark:text-pink-400 bg-gradient-to-br from-pink-50 to-rose-100/50 dark:from-pink-900/10 dark:to-rose-800/10"
    };
    const iconStyle = colorClasses[color] || colorClasses.blue;

    return (
        <Wrapper 
            to={to || '#'} 
            className={`
                group relative rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-7 transition-all duration-300 
                border-2 ${isAlert ? 'border-red-300/60 dark:border-red-600/40' : 'border-gray-100 dark:border-gray-800/50'} 
                bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-800/40 dark:to-gray-900/40
                hover:shadow-2xl hover:shadow-gray-300/20 dark:hover:shadow-black/40
                backdrop-blur-sm
                ${to ? 'cursor-pointer hover:-translate-y-1' : ''} 
            `}
        >
            {isAlert && (
                <div className="absolute -top-2 -right-2 z-10">
                    <span className="relative flex h-4 w-4 sm:h-5 sm:w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 dark:bg-red-500 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-gradient-to-br from-red-400 to-red-500 shadow-lg shadow-red-500/30"></span>
                    </span>
                </div>
            )}

            <div className="flex items-start justify-between mb-3 sm:mb-4 md:mb-5">
                <div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{title}</p>
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg ${iconStyle}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                </div>
            </div>

            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 text-gray-800 dark:text-gray-100 transition-colors">{value}</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            
            {to && (
                <div className="mt-3 sm:mt-4 md:mt-5 flex items-center text-xs sm:text-sm font-medium text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View Details <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
            )}
        </Wrapper>
    );
};

/**
 * ProductCard Component
 * Displays a single top-selling product with its rank, units sold, and total sales.
 */
const ProductCard = ({ product, rank }) => {
    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    
    const getRankColor = (r) => {
        switch (r) {
            case 1: return "bg-gradient-to-br from-[#FF69B4] to-[#FF77A9] text-white shadow-xl shadow-[#FF69B4]/40";
            case 2: return "bg-gradient-to-br from-[#FF77A9] to-[#FF69B4]/80 text-white shadow-xl shadow-[#FF77A9]/40";
            case 3: return "bg-gradient-to-br from-[#FF69B4]/80 to-[#FF77A9]/70 text-white shadow-xl shadow-[#FF69B4]/30";
            default: return "bg-gradient-to-br from-[#E5E5E5] to-[#E5E5E5]/70 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 text-gray-700 dark:text-gray-300 border border-[#E5E5E5] dark:border-[#1A1A1D]";
        }
    };

    return (
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 border-[#E5E5E5] dark:border-[#1A1A1D] bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 hover:shadow-xl hover:shadow-[#FF69B4]/10 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-0.5">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg md:text-xl flex-shrink-0 ${getRankColor(rank)}`}>
                {rank}
            </div>
            
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{product.product__name}</h4>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                    <span className='font-semibold text-gray-700 dark:text-gray-300'>{product.total_quantity}</span> units sold
                </p>
            </div>
            
            <div className="text-sm sm:text-base md:text-lg font-bold text-[#FF69B4] dark:text-[#FF77A9] flex-shrink-0">
                {formatCurrency(product.total_sales)}
            </div>
        </div>
    );
};

/**
 * TransactionRow Component
 * Displays a single row in the recent transactions table.
 */
const TransactionRow = ({ transaction }) => {
    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <tr className="border-b border-[#E5E5E5] dark:border-[#1A1A1D] hover:bg-gradient-to-r hover:from-[#FF69B4]/5 hover:to-transparent dark:hover:from-[#FF69B4]/10 dark:hover:to-transparent transition-all duration-200">
            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-[#FF69B4] dark:text-[#FF77A9]">#{transaction.transaction_number}</td>
            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-800 dark:text-white">{formatCurrency(transaction.total_amount)}</td>
            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{transaction.created_by__full_name}</td>
            <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(transaction.created_at)}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono">{formatTime(transaction.created_at)}</span>
                </div>
            </td>
        </tr>
    );
};

/**
 * DashboardPage Component
 * Main dashboard container, fetching and displaying all data.
 */
const DashboardPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: dashboard, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => { const response = await reportService.getDashboard(); return response.data; },
        refetchInterval: 30000, 
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await queryClient.invalidateQueries(['dashboard']);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 800); 
    };

    if (isLoading) return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-sky-500 dark:text-sky-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">Loading your dashboard...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="min-h-[50vh] flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full text-center p-6 sm:p-8 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/10 rounded-2xl sm:rounded-3xl border-2 border-red-200 dark:border-red-800/50 shadow-xl">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                <p className="font-semibold text-base sm:text-lg text-gray-800 dark:text-gray-100 mb-2">Unable to load dashboard</p>
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error.message || "Please check your connection and try again"}</p>
            </div>
        </div>
    );

    const { 
        today_sales = 0, today_transactions = 0, low_stock_count = 0, total_products = 0,
        week_sales = 0, week_transactions = 0, week_profit = 0, 
        top_products = [], recent_transactions = []
    } = dashboard || {};

    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { 
        style: 'currency', 
        currency: 'PHP', 
        minimumFractionDigits: 0 
    }).format(val || 0);

    return (
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-white via-[#E5E5E5]/20 to-[#FF69B4]/5 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1A1A1D] min-h-screen">
            
            {/* Header and Refresh Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent mb-1">Welcome Back! 👋</h1>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                        Hi <span className='font-semibold text-[#FF69B4] dark:text-[#FF77A9]'>{user?.full_name}</span>, here's what's happening with your business today.
                    </p>
                </div>
                
                <button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing} 
                    className="
                        px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white dark:bg-[#1A1A1D] 
                        border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 rounded-xl sm:rounded-2xl 
                        text-[#FF69B4] dark:text-[#FF77A9] 
                        hover:bg-gradient-to-br hover:from-[#FF69B4]/5 hover:to-[#FF77A9]/5 dark:hover:from-[#FF69B4]/10 dark:hover:to-[#FF77A9]/10 
                        hover:border-[#FF69B4] dark:hover:border-[#FF77A9]
                        flex items-center justify-center gap-2 transition-all duration-200 
                        font-medium shadow-sm hover:shadow-lg hover:shadow-[#FF69B4]/20 disabled:opacity-50
                        text-xs sm:text-sm md:text-base w-full sm:w-auto
                    "
                >
                    <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> 
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stock Alert Banner */}
            {low_stock_count > 0 && (
                <div className="p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 border-2 border-red-200 dark:border-red-800/50 flex items-start gap-3 sm:gap-4 shadow-lg">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Low Stock Alert</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 sm:mt-1.5 leading-relaxed">
                            You have <span className="font-bold text-red-600 dark:text-red-400">{low_stock_count} items</span> running low on stock. 
                            Consider restocking soon to avoid running out.
                        </p>
                        <Link to="/inventory" className="inline-flex items-center mt-2 sm:mt-3 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                            Review Inventory <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                <StatCard 
                    title="Today's Revenue" 
                    value={formatCurrency(today_sales)} 
                    subtitle="Compared to yesterday" 
                    icon={Banknote} 
                    color="pink" 
                    to="/reports?tab=daily" 
                />
                <StatCard 
                    title="Today's Orders" 
                    value={today_transactions} 
                    subtitle="Total transactions today" 
                    icon={ShoppingBag} 
                    color="pink" 
                    to="/reports?tab=daily" 
                />
                <StatCard 
                    title="Stock Alert" 
                    value={low_stock_count} 
                    subtitle={low_stock_count > 0 ? "Items needing replenishment" : "Inventory is healthy"} 
                    icon={AlertTriangle} 
                    color={low_stock_count > 0 ? "red" : "green"} 
                    to="/inventory" 
                    isAlert={low_stock_count > 0} 
                />
                <StatCard 
                    title="Total Products" 
                    value={total_products} 
                    subtitle="Active SKUs in stock" 
                    icon={Package} 
                    color="pink" 
                    to="/inventory" 
                />
            </div>

            {/* Combined Section: Weekly Stats & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                
                {/* Weekly Stats Card */}
                <div className="bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 rounded-2xl sm:rounded-3xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 p-4 sm:p-5 md:p-7 shadow-xl shadow-[#FF69B4]/5 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-5 md:mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF69B4]" strokeWidth={2} /> Weekly Summary
                    </h2>
                    
                    <div className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FF69B4]/10 to-[#FF77A9]/20 dark:from-[#FF69B4]/20 dark:to-[#FF77A9]/10 border-2 border-[#FF69B4]/30 dark:border-[#FF69B4]/40 mb-4 sm:mb-5 md:mb-6 shadow-lg shadow-[#FF69B4]/10">
                        <p className="text-xs sm:text-sm font-semibold text-[#FF69B4] dark:text-[#FF77A9] mb-1">Net Profit</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{formatCurrency(week_profit)}</p>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 border border-[#E5E5E5] dark:border-[#FF69B4]/10">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Total Sales</span>
                            <span className="font-bold text-sm sm:text-base text-gray-800 dark:text-white">{formatCurrency(week_sales)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 border border-[#E5E5E5] dark:border-[#FF69B4]/10">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Total Orders</span>
                            <span className="font-bold text-sm sm:text-base text-gray-800 dark:text-white">{week_transactions}</span>
                        </div>
                    </div>
                </div>

                {/* Top Products Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 rounded-2xl sm:rounded-3xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 p-4 sm:p-5 md:p-7 shadow-xl shadow-[#FF69B4]/5 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl">
                    <div className="flex justify-between items-center mb-4 sm:mb-5 md:mb-6">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ListOrdered className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF69B4]" strokeWidth={2} /> Top Products
                        </h2>
                        <Link to="/reports?tab=products" className="text-xs sm:text-sm font-medium text-[#FF69B4] dark:text-[#FF77A9] hover:text-[#FF77A9] dark:hover:text-[#FF69B4] flex items-center gap-1 transition-colors">
                            View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Link>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                        {top_products?.length > 0 ? (
                            top_products.slice(0, 5).map((product, index) => (
                                <ProductCard key={index} product={product} rank={index + 1} />
                            ))
                        ) : (
                            <div className="text-center py-8 sm:py-10 md:py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-[#E5E5E5] dark:border-[#FF69B4]/20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E5E5E5]/30 to-transparent dark:from-[#1A1A1D]/20 dark:to-transparent">
                                <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 opacity-50" />
                                <p className="text-xs sm:text-sm">No sales data available yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 rounded-2xl sm:rounded-3xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 overflow-hidden shadow-xl shadow-[#FF69B4]/5 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl">
                <div className="p-4 sm:p-5 md:p-7 border-b-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 flex justify-between items-center">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF69B4]" strokeWidth={2} /> Recent Activity
                    </h2>
                    <Link to="/transactions" className="text-xs sm:text-sm font-medium text-[#FF69B4] dark:text-[#FF77A9] hover:text-[#FF77A9] dark:hover:text-[#FF69B4] flex items-center gap-1 transition-colors">
                        View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Link>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                        <thead className="bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30">
                            <tr>
                                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order ID</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Staff</th>
                                <th className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                            {recent_transactions?.length > 0 ? (
                                recent_transactions.slice(0, 7).map((txn) => (
                                    <TransactionRow key={txn.id} transaction={txn} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-3 sm:px-4 md:px-6 py-8 sm:py-10 md:py-12 text-center text-gray-500 dark:text-gray-400">
                                        <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 opacity-50" />
                                        <p className="text-xs sm:text-sm">No recent transactions</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;