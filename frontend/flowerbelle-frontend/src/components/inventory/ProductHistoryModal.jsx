import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import inventoryService from '../../services/inventoryService';
import { History, Plus, RefreshCw, Trash2, Loader2 } from 'lucide-react'; 
import { toast } from 'react-hot-toast';

// --- THEME CONSTANTS (Copied from InventoryPage for standalone use) ---
const THEME = {
    primaryText: "text-[#8FBC8F] dark:text-[#A8D4A8]",
    headingText: "text-gray-800 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    pageBg: "bg-gradient-to-br from-white via-[#E5E5E5]/20 to-[#8FBC8F]/5 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1A1A1D]",
    cardBase: "bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 border-2 border-[#E5E5E5] dark:border-[#8FBC8F]/20 shadow-xl shadow-[#8FBC8F]/5 dark:shadow-black/20 backdrop-blur-sm",
    tableHeader: "bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 text-gray-500 dark:text-gray-400",
};

// Utility to format the history_type code using Lucide icons
const formatHistoryType = (type) => {
    switch (type) {
        case '+': return <span className="text-green-600 flex items-center font-semibold text-xs"><Plus size={14} className="mr-1" /> Created</span>;
        case '~': return <span className="text-blue-600 flex items-center font-semibold text-xs"><RefreshCw size={14} className="mr-1" /> Updated</span>;
        case '-': return <span className="text-red-600 flex items-center font-semibold text-xs"><Trash2 size={14} className="mr-1" /> Deleted</span>;
        default: return type;
    }
};

const ProductHistoryModal = ({ productId, productName, onClose }) => {
    const [page, setPage] = useState(1);
    const pageSize = 10; // Matches backend default pagination size
    
    // 🎯 Fetches data from the new endpoint /api/inventory/products/{pk}/history/
    const { data: historyData, isLoading, isFetching, error } = useQuery({
        queryKey: ['productHistory', productId, page],
        queryFn: () => inventoryService.getProductHistory(productId, page, pageSize),
        staleTime: 5 * 60 * 1000, 
    });

    const history = historyData?.results || [];
    const pagination = historyData || { currentPage: 1, totalPages: 1, count: 0 };
    
    useEffect(() => {
        if (error) {
            console.error('Audit History Fetch Error:', error);
            toast.error('Failed to load audit history.');
        }
    }, [error]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && !isFetching) {
            setPage(newPage);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 overflow-y-auto">
            <div className={`rounded-xl p-4 sm:p-6 max-w-6xl mx-auto my-10 shadow-2xl ${THEME.cardBase}`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className={`text-xl sm:text-2xl font-bold flex items-center ${THEME.headingText}`}>
                        <History className={`mr-2 w-6 h-6 ${THEME.primaryText}`} /> Audit Trail: {productName}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl font-light">&times;</button>
                </div>

                {/* Loading/Error State */}
                {(isLoading || isFetching) && (
                    <div className="text-center py-8">
                        <Loader2 className={`w-6 h-6 ${THEME.primaryText} animate-spin mx-auto mb-2`} />
                        <p className={`${THEME.subText} text-sm`}>Loading records...</p>
                    </div>
                )}
                
                {/* Data Table */}
                {!isLoading && !isFetching && (
                    history.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No audit records found for this product.</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className={THEME.tableHeader}>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock (After)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price (After)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#1A1A1D]/80 divide-y divide-gray-200 dark:divide-gray-700">
                                        {history.map((record) => (
                                            <tr key={record.history_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                    {new Date(record.history_date).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {formatHistoryType(record.history_type)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                    {record.history_user_name || (record.history_user ? `User ID: ${record.history_user}` : 'System')}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                    {record.current_stock}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    ₱{Number(record.unit_price).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {record.sku}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="mt-4 flex justify-between items-center text-sm">
                                <div className="text-gray-600 dark:text-gray-400">
                                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.count} total records)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1 || isFetching}
                                        className="px-3 py-1 text-sm font-medium text-white bg-[#8FBC8F] rounded-lg hover:bg-[#A8D4A8] disabled:opacity-50 transition-all"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages || isFetching}
                                        className="px-3 py-1 text-sm font-medium text-white bg-[#8FBC8F] rounded-lg hover:bg-[#A8D4A8] disabled:opacity-50 transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )
                )}
                
                <div className="mt-6 text-right border-t pt-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductHistoryModal;
