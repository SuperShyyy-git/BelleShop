import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import { 
    Plus, Edit, Trash2, Search, Package, FolderPlus, 
    Tags, Truck, Filter, Loader2, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddProductModal from '../components/inventory/AddProductModal';
import CategoryModal from '../components/inventory/CategoryModal';
import SupplierModal from '../components/inventory/SupplierModal';

// --- THEME CONSTANTS (Aligned with DashboardPage) ---
const THEME = {
    // Text Colors
    primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
    headingText: "text-gray-800 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    
    // Gradients
    gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9]",
    
    // Backgrounds & Cards (Glassmorphism match)
    pageBg: "bg-gradient-to-br from-white via-[#E5E5E5]/20 to-[#FF69B4]/5 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1A1A1D]",
    cardBase: "bg-gradient-to-br from-white to-[#E5E5E5]/30 dark:from-[#1A1A1D] dark:to-[#1A1A1D]/80 border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 shadow-xl shadow-[#FF69B4]/5 dark:shadow-black/20 backdrop-blur-sm",
    
    // Inputs & Controls
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 focus:border-[#FF69B4] dark:focus:border-[#FF77A9] text-gray-700 dark:text-gray-200",
    
    // Tables
    tableHeader: "bg-gradient-to-br from-[#E5E5E5]/50 to-[#E5E5E5]/30 dark:from-[#1A1A1D]/50 dark:to-[#1A1A1D]/30 text-gray-500 dark:text-gray-400",
    tableRowHover: "hover:bg-gradient-to-r hover:from-[#FF69B4]/5 hover:to-transparent dark:hover:from-[#FF69B4]/10",
    
    // Buttons
    buttonOutline: "px-5 py-2.5 bg-white dark:bg-[#1A1A1D] border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 text-[#FF69B4] dark:text-[#FF77A9] hover:bg-gradient-to-br hover:from-[#FF69B4]/5 hover:to-[#FF77A9]/5 hover:border-[#FF69B4] dark:hover:border-[#FF77A9] transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:shadow-[#FF69B4]/20 rounded-xl flex items-center gap-2",
    buttonPrimary: "px-5 py-2.5 bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white font-bold rounded-xl shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
};

const getErrorMessage = (error) => {
    if (!error.response) return "Network error. Please check your connection.";
    const data = error.response.data;
    if (data?.detail) return data.detail;
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length > 0) {
            const firstKey = keys[0];
            const firstError = data[firstKey];
            const message = Array.isArray(firstError) ? firstError[0] : firstError;
            const fieldLabel = firstKey.charAt(0).toUpperCase() + firstKey.slice(1);
            return `${fieldLabel}: ${message}`;
        }
    }
    return "An unexpected error occurred.";
};

const InventoryPage = () => {
    const queryClient = useQueryClient();

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false); 
    
    const [productToEdit, setProductToEdit] = useState(null);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [supplierToEdit, setSupplierToEdit] = useState(null);

    // View toggle: 'products', 'categories', or 'suppliers'
    const [activeView, setActiveView] = useState('products'); 

    // --- QUERIES ---
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await inventoryService.getCategories();
            const catData = res.data;
            return Array.isArray(catData) ? catData : (catData.results || []);
        }
    });

    const { data: productsData, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
        queryKey: ['inventory', searchQuery, selectedCategory],
        queryFn: async () => {
            const res = await inventoryService.getProducts({
                search: searchQuery,
                category: selectedCategory,
            });
            const prodData = res.data;
            let normalizedProducts = Array.isArray(prodData) ? prodData : Array.isArray(prodData.results) ? prodData.results : [];

            return normalizedProducts.map((p) => ({
                ...p,
                unit_price: Number(p.unit_price) || 0,
                current_stock: Number(p.current_stock) || 0,
                reorder_level: Number(p.reorder_level) || 10,
                image_url: p.image_url || null,
                category_name: p.category_name || (p.category ? categories.find(c => c.id === p.category)?.name : 'Uncategorized'),
            }));
        },
        staleTime: 5 * 60 * 1000, 
    });
    
    const products = productsData || [];

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await inventoryService.getSuppliers();
            const supData = res.data;
            return Array.isArray(supData) ? supData : (supData.results || []);
        }
    });

    useEffect(() => {
        setIsSearching(productsFetching);
    }, [productsFetching]);

    // --- HANDLERS ---
    const handleSearchKeyDown = (e) => { if (e.key === 'Enter') setSearchQuery(searchTerm); };
    const handleSearchClick = () => { setSearchQuery(searchTerm); };
    const handleClearSearch = () => { setSearchTerm(''); setSearchQuery(''); };

    // --- MUTATIONS ---
    const saveProductMutation = useMutation({
        mutationFn: async ({ id, productData }) => id ? await inventoryService.updateProduct(id, productData) : await inventoryService.createProduct(productData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success(variables.id ? 'Product updated! 💾' : 'Product added! 🎉');
            handleCloseProductModal();
        },
        onError: (error) => toast.error(getErrorMessage(error))
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (id) => await inventoryService.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success('Product deleted successfully');
        },
        onError: (error) => toast.error(getErrorMessage(error))
    });

    const saveCategoryMutation = useMutation({
        mutationFn: async ({ id, categoryData }) => id ? await inventoryService.updateCategory(id, categoryData) : await inventoryService.createCategory(categoryData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success(variables.id ? 'Category updated! 💾' : 'Category added! 🎉');
            handleCloseCategoryModal();
        },
        onError: (error) => toast.error(getErrorMessage(error))
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id) => {
            const { data: productsInUse } = await inventoryService.getProducts({ category: id });
            if (productsInUse.results && productsInUse.results.length > 0) {
                throw new Error(`Cannot delete category. ${productsInUse.results.length} products are currently assigned to it.`);
            }
            return await inventoryService.deleteCategory(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Category deleted successfully');
        },
        onError: (error) => toast.error(error.message || getErrorMessage(error))
    });

    const saveSupplierMutation = useMutation({
        mutationFn: async ({ id, supplierData }) => id ? await inventoryService.updateSupplier(id, supplierData) : await inventoryService.createSupplier(supplierData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success(variables.id ? 'Supplier updated! 💾' : 'Supplier added! 🎉');
            handleCloseSupplierModal();
        },
        onError: (error) => toast.error(getErrorMessage(error))
    });

    const deleteSupplierMutation = useMutation({
        mutationFn: async (id) => await inventoryService.deleteSupplier(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success('Supplier deleted successfully');
        },
        onError: (error) => toast.error(getErrorMessage(error))
    });

    // Modal Handlers
    const handleOpenAddProductModal = () => { setProductToEdit(null); setIsProductModalOpen(true); };
    const handleOpenEditProductModal = (product) => { setProductToEdit(product); setIsProductModalOpen(true); };
    const handleCloseProductModal = () => { setIsProductModalOpen(false); setProductToEdit(null); };
    const handleSaveProduct = async (productData) => { try { await saveProductMutation.mutateAsync({ id: productToEdit?.id, productData }); return true; } catch (error) { return false; } };
    const handleDeleteProduct = async (id) => { if (!window.confirm('Are you sure you want to permanently delete this product?')) return; deleteProductMutation.mutate(id); };

    const handleOpenAddCategoryModal = () => { setCategoryToEdit(null); setIsCategoryModalOpen(true); };
    const handleOpenEditCategoryModal = (category) => { setCategoryToEdit(category); setIsCategoryModalOpen(true); };
    const handleCloseCategoryModal = () => { setIsCategoryModalOpen(false); setCategoryToEdit(null); };
    const handleSaveCategory = async (categoryData) => { try { await saveCategoryMutation.mutateAsync({ id: categoryToEdit?.id, categoryData }); return true; } catch (error) { return false; } };
    const handleDeleteCategory = async (id) => { if (!window.confirm('WARNING: Deleting a category cannot be undone and may affect associated products. Proceed?')) return; deleteCategoryMutation.mutate(id); };

    const handleOpenAddSupplierModal = () => { setSupplierToEdit(null); setIsSupplierModalOpen(true); };
    const handleOpenEditSupplierModal = (supplier) => { setSupplierToEdit(supplier); setIsSupplierModalOpen(true); };
    const handleCloseSupplierModal = () => { setIsSupplierModalOpen(false); setSupplierToEdit(null); };
    const handleSaveSupplier = async (supplierData) => { try { await saveSupplierMutation.mutateAsync({ id: supplierToEdit?.id, supplierData }); return true; } catch (error) { return false; } };
    const handleDeleteSupplier = async (id) => { if (!window.confirm('Delete this supplier?')) return; deleteSupplierMutation.mutate(id); };

    if (productsLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${THEME.pageBg}`}>
                <div className="text-center">
                    <Loader2 className={`w-12 h-12 ${THEME.primaryText} animate-spin mx-auto mb-4`} />
                    <p className={`${THEME.subText} font-medium`}>Loading inventory...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-4xl font-extrabold flex items-center gap-3 ${THEME.gradientText}`}>
                            <Package className={THEME.primaryText} size={32} strokeWidth={2.5} /> Inventory Management
                        </h1>
                        <p className={`text-lg ${THEME.subText} mt-1 ml-1`}>Track products, organize categories, and manage suppliers.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleOpenAddSupplierModal} className={THEME.buttonOutline}>
                            <Truck size={18} /> <span className="hidden sm:inline">Add Supplier</span>
                        </button>

                        <button onClick={handleOpenAddCategoryModal} className={THEME.buttonOutline}>
                            <FolderPlus size={18} /> <span className="hidden sm:inline">Add Category</span>
                        </button>
                        
                        <button onClick={handleOpenAddProductModal} className={THEME.buttonPrimary}>
                            <Plus size={20} strokeWidth={3} /> <span>Add Product</span>
                        </button>
                    </div>
                </div>

                {/* --- VIEW TOGGLE TABS --- */}
                <div className="flex p-1 bg-white dark:bg-[#1A1A1D] rounded-2xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 w-fit shadow-lg shadow-[#FF69B4]/5">
                    {[
                        { id: 'products', label: 'Products', icon: Package, count: products.length },
                        { id: 'categories', label: 'Categories', icon: Tags, count: categories.length },
                        { id: 'suppliers', label: 'Suppliers', icon: Truck, count: suppliers.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id)}
                            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                activeView === tab.id 
                                    ? `${THEME.gradientBg} text-white shadow-lg shadow-[#FF69B4]/30` 
                                    : `${THEME.subText} hover:bg-gray-50 dark:hover:bg-[#1A1A1D]/50`
                            }`}
                        >
                            <tab.icon size={18} /> {tab.label} <span className="text-sm opacity-80 font-normal">({tab.count})</span>
                        </button>
                    ))}
                </div>

                {/* ================= PRODUCTS VIEW ================= */}
                {activeView === 'products' && (
                    <div className="space-y-6">
                        {/* Search & Filter Bar */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? THEME.primaryText : 'text-gray-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Search products by name or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all shadow-sm ${THEME.inputBase}`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isSearching && <Loader2 className={`w-5 h-5 ${THEME.primaryText} animate-spin`} />}
                                    {searchTerm && !isSearching && <button onClick={handleClearSearch} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><X size={16} /></button>}
                                    <button onClick={handleSearchClick} className={`text-white px-3 py-1.5 rounded-lg transition-all text-sm font-semibold ${THEME.gradientBg}`}>Search</button>
                                </div>
                            </div>

                            <div className="relative min-w-[200px]">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className={`w-full appearance-none pl-4 pr-10 py-3 rounded-xl font-medium outline-none cursor-pointer shadow-sm ${THEME.inputBase}`}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                </select>
                                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className={`overflow-hidden rounded-3xl ${THEME.cardBase}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                    <thead className={THEME.tableHeader}>
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Image</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Stock</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Reorder</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                        {products.map((product) => {
                                            const isLowStock = product.current_stock <= product.reorder_level;
                                            return (
                                                <tr key={product.id} className={`transition-colors duration-200 ${THEME.tableRowHover}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-[#1A1A1D] border border-[#E5E5E5] dark:border-[#FF69B4]/30 flex items-center justify-center">
                                                            {product.image_url ? (
                                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-6 h-6 text-gray-400" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className={`font-bold ${THEME.headingText}`}>{product.name}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-3 py-1 rounded-full bg-[#E5E5E5]/50 dark:bg-[#1A1A1D] text-gray-600 dark:text-gray-300 text-xs font-bold border border-[#E5E5E5] dark:border-[#FF69B4]/20">
                                                            {product.category_name || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                                                            isLowStock ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-[#FF69B4]/5 dark:bg-[#FF69B4]/10 text-[#FF69B4] dark:text-[#FF77A9] border-[#FF69B4]/20'
                                                        }`}>
                                                            {product.current_stock}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 font-semibold ${THEME.subText}`}>{product.reorder_level}</td>
                                                    <td className={`px-6 py-4 font-extrabold ${THEME.primaryText}`}>₱{product.unit_price.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleOpenEditProductModal(product)} 
                                                                className={`p-2 rounded-lg text-[#FF69B4] dark:text-[#FF77A9] hover:bg-[#FF69B4]/10 transition-all`}
                                                                title="Edit Product"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteProduct(product.id)} 
                                                                className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {products.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className={`px-6 py-12 text-center ${THEME.subText} italic`}>
                                                    <Package className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                                    No products found. Adjust your search or filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= CATEGORIES VIEW ================= */}
                {activeView === 'categories' && (
                    <div className={`overflow-hidden rounded-3xl ${THEME.cardBase}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                <thead className={THEME.tableHeader}>
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Category Name</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Product Count</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                    {categories.map((category) => (
                                        <tr key={category.id} className={`transition-colors duration-200 ${THEME.tableRowHover}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#FF69B4]/10 dark:bg-[#1A1A1D] border border-[#FF69B4]/20 dark:border-[#FF69B4]/30 flex items-center justify-center flex-shrink-0">
                                                        <Tags className="w-5 h-5 text-[#FF69B4]" />
                                                    </div>
                                                    <span className={`font-bold ${THEME.headingText}`}>{category.name}</span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 ${THEME.subText} max-w-xs truncate`}>{category.description || '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full bg-[#E5E5E5]/50 dark:bg-[#1A1A1D] text-gray-600 dark:text-gray-300 text-xs font-bold border border-[#E5E5E5] dark:border-[#FF69B4]/20">
                                                    {category.product_count || 0} products
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleOpenEditCategoryModal(category)} 
                                                        className={`p-2 rounded-lg text-[#FF69B4] dark:text-[#FF77A9] hover:bg-[#FF69B4]/10 transition-all`}
                                                        title="Edit Category"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(category.id)} 
                                                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                                                        title="Delete Category"
                                                        disabled={deleteCategoryMutation.isPending}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className={`px-6 py-12 text-center ${THEME.subText} italic`}>
                                                <Tags className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                                No categories found. Click 'Add Category' to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ================= SUPPLIERS VIEW ================= */}
                {activeView === 'suppliers' && (
                    <div className={`overflow-hidden rounded-3xl ${THEME.cardBase}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                <thead className={THEME.tableHeader}>
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Supplier Name</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Contact Person</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Contact Details</th>
                                        <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#FF69B4]/20">
                                    {suppliers.map((supplier) => (
                                        <tr key={supplier.id} className={`transition-colors duration-200 ${THEME.tableRowHover}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF69B4]/10 to-[#FF77A9]/20 dark:bg-[#1A1A1D] border border-[#FF69B4]/20 flex items-center justify-center flex-shrink-0">
                                                        <Truck className="w-5 h-5 text-[#FF69B4]" />
                                                    </div>
                                                    <span className={`font-bold ${THEME.headingText}`}>{supplier.name}</span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 font-medium ${THEME.subText}`}>{supplier.contact_person || '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold ${THEME.headingText}`}>{supplier.phone}</span>
                                                    <span className={`text-sm italic ${THEME.subText}`}>{supplier.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleOpenEditSupplierModal(supplier)} 
                                                        className={`p-2 rounded-lg text-[#FF69B4] dark:text-[#FF77A9] hover:bg-[#FF69B4]/10 transition-all`}
                                                        title="Edit Supplier"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteSupplier(supplier.id)} 
                                                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                                                        title="Delete Supplier"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {suppliers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className={`px-6 py-12 text-center ${THEME.subText} italic`}>
                                                <Truck className="w-16 h-16 mx-auto mb-3 opacity-50" />
                                                No suppliers found. Click 'Add Supplier' to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- MODALS --- */}
                <AddProductModal 
                    isOpen={isProductModalOpen} 
                    onClose={handleCloseProductModal} 
                    onSave={handleSaveProduct} 
                    categories={categories} 
                    suppliers={suppliers} 
                    productToEdit={productToEdit} 
                />
                <CategoryModal 
                    isOpen={isCategoryModalOpen} 
                    onClose={handleCloseCategoryModal} 
                    onSave={handleSaveCategory} 
                    categoryToEdit={categoryToEdit} 
                />
                <SupplierModal 
                    isOpen={isSupplierModalOpen} 
                    onClose={handleCloseSupplierModal} 
                    onSave={handleSaveSupplier} 
                    supplierToEdit={supplierToEdit} 
                />
            </div>
        </div>
    );
};

export default InventoryPage;