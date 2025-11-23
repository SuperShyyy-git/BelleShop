import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import posService from '../services/posService';
import { Package, Search, ShoppingCart, Trash2, Plus, Minus, X, Receipt } from 'lucide-react';
import Loading from '../components/common/Loading';
import CheckoutModal from '../components/pos/CheckoutModal';
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
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
    buttonIcon: "bg-[#FF69B4]/10 text-[#FF69B4] hover:bg-[#FF69B4]/20 dark:bg-[#FF69B4]/20 dark:text-[#FF77A9] dark:hover:bg-[#FF69B4]/30"
};

const POSPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Fetch products
    const { data: productsData, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
        queryKey: ['pos-products', searchQuery, selectedCategory],
        queryFn: async () => {
            const params = { is_active: true };
            if (searchQuery && searchQuery.trim() !== '') params.search = searchQuery.trim();
            if (selectedCategory && selectedCategory !== '') params.category = selectedCategory;
            
            const res = await inventoryService.getProducts(params);
            const prodData = res.data;
            let normalizedProducts = Array.isArray(prodData) ? prodData : Array.isArray(prodData.results) ? prodData.results : [];

            let filteredProducts = normalizedProducts
                .filter(p => p.current_stock > 0)
                .map(p => ({
                    ...p,
                    unit_price: Number(p.unit_price) || 0,
                    current_stock: Number(p.current_stock) || 0,
                    reorder_level: Number(p.reorder_level) || 10,
                    image_url: p.image_url || null,
                    category_name: p.category_name || 'Uncategorized'
                }));
            
            if (selectedCategory && selectedCategory !== '') {
                const categoryId = parseInt(selectedCategory);
                filteredProducts = filteredProducts.filter(p => {
                    const productCategoryId = p.category || p.category_id;
                    return productCategoryId === categoryId;
                });
            }
            return filteredProducts;
        },
        staleTime: 0,
        cacheTime: 0,
    });

    useEffect(() => {
        setIsSearching(productsFetching);
    }, [productsFetching]);

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await inventoryService.getCategories();
            const catData = res.data;
            return Array.isArray(catData) ? catData : Array.isArray(catData.results) ? catData.results : [];
        }
    });

    const products = productsData || [];

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') setSearchQuery(searchTerm);
    };

    const handleSearchClick = () => setSearchQuery(searchTerm);

    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchQuery('');
    };

    // Checkout mutation
    const checkoutMutation = useMutation({
        mutationFn: async (checkoutData) => await posService.checkout(checkoutData),
        onSuccess: (response) => {
            toast.success(`Transaction completed! Transaction #${response.data.transaction_number}`);
            setCart([]);
            setIsCheckoutOpen(false);
            queryClient.invalidateQueries({ queryKey: ['pos-products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.detail || error.response?.data?.error || 'Failed to complete transaction.';
            toast.error(errorMessage);
        }
    });

    // Cart functions
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity >= product.current_stock) {
                toast.error(`Only ${product.current_stock} in stock.`);
                return;
            }
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            toast.success(`Added ${product.name}`);
        } else {
            setCart([...cart, { ...product, quantity: 1, current_stock: product.current_stock }]);
            toast.success(`${product.name} added`);
        }
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));

    const updateQuantity = (productId, newQuantity) => {
        const productInCart = cart.find(item => item.id === productId);
        if (!productInCart) return;

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQuantity > productInCart.current_stock) {
            toast.error(`Cannot exceed stock limit of ${productInCart.current_stock}`);
            return;
        }
        setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    };

    const clearCart = () => {
        if (window.confirm('Clear all items from cart?')) {
            setCart([]);
            toast.success('Cart cleared');
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const total = subtotal;

    const totals = { subtotal, tax: 0, total };

    const handleCheckout = async (checkoutData) => await checkoutMutation.mutateAsync(checkoutData);

    const openCheckout = () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        setIsCheckoutOpen(true);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-PH', { 
        style: 'currency', 
        currency: 'PHP', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val || 0);

    if (productsLoading) return <Loading message="Loading products..." />;

    return (
        <div className={`flex h-screen overflow-hidden ${THEME.pageBg}`}>
            
            {/* --- Left Side: Products Section --- */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Header & Filters */}
                <div className="bg-white/80 dark:bg-[#1e1e1e]/90 backdrop-blur-md p-6 shadow-sm border-b border-gray-200 dark:border-gray-800 z-10">
                    <h2 className={`text-3xl font-extrabold mb-4 flex items-center gap-3 ${THEME.gradientText}`}>
                        <Receipt className="w-8 h-8 text-[#FF69B4]" /> Point of Sale
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? 'text-[#FF69B4]' : 'text-gray-400 group-hover:text-[#FF69B4]'}`} />
                            <input
                                type="text"
                                placeholder="Search products by name/SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all shadow-sm ${THEME.inputBase}`}
                            />
                            
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                {searchTerm && !isSearching && (
                                    <button 
                                        onClick={handleClearSearch} 
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={handleSearchClick}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-bold ${THEME.buttonPrimary}`}
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                        
                        {/* Category Filter */}
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={`w-full sm:w-auto px-5 py-3 pr-10 rounded-xl outline-none shadow-sm cursor-pointer font-medium ${THEME.inputBase}`}
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            {/* Custom arrow or styling logic can go here if needed */}
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {isSearching && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-3 border-4 border-[#FF69B4]/30 border-t-[#FF69B4]"></div>
                                <p className={`text-lg font-bold ${THEME.primaryText}`}>Fetching products...</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-6">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className={`rounded-2xl p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 group ${THEME.cardBase}`}
                            >
                                {/* Image */}
                                <div className="w-full h-36 mb-4 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1D] relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                                    )}
                                    {/* Quick Add Overlay */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white dark:bg-[#1A1A1D] text-[#FF69B4] p-2 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div>
                                    <h3 className={`font-bold text-base mb-1 line-clamp-2 leading-snug ${THEME.headingText}`}>
                                        {product.name}
                                    </h3>
                                    <p className={`text-xs mb-3 font-medium ${THEME.subText}`}>
                                        {product.category_name}
                                    </p>
                                    
                                    <div className="flex items-end justify-between">
                                        <span className={`text-lg font-extrabold ${THEME.primaryText}`}>
                                            {formatCurrency(product.unit_price)}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                                            product.current_stock <= product.reorder_level 
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        }`}>
                                            {product.current_stock} Left
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {products.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400 dark:text-gray-600">
                                <Package className="w-24 h-24 mx-auto mb-4 opacity-20" />
                                <p className="text-2xl font-bold opacity-50">No Products Found</p>
                                <p className="text-base mt-2 opacity-50">Try a different search term or category.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Right Side: Cart Section --- */}
            <div className="w-96 min-w-96 bg-white dark:bg-[#1e1e1e] shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 z-30">
                {/* Cart Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-[#FFE4E1]/20 dark:from-[#1e1e1e] dark:to-[#2C1A21]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-[#FF69B4]/30 ${THEME.gradientBg}`}>
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-bold ${THEME.headingText}`}>Current Order</h3>
                                <p className={`text-xs ${THEME.subText}`}>{cart.length} Items</p>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button 
                                onClick={clearCart} 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                                title="Clear Cart"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-black/20">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-[#1A1A1D] rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700">
                                <ShoppingCart className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className={`text-lg font-bold ${THEME.headingText}`}>Cart is empty</p>
                            <p className={`text-sm ${THEME.subText}`}>Select products to add to order</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#1A1A1D] rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-3 group hover:border-[#FF69B4]/30 transition-all">
                                {/* Item Image */}
                                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-6 h-6 text-gray-300" />
                                        </div>
                                    )}
                                </div>

                                {/* Item Info & Controls */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold text-sm line-clamp-1 ${THEME.headingText}`}>{item.name}</h4>
                                        <button 
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <p className={`text-sm font-bold ${THEME.primaryText}`}>
                                            {formatCurrency(item.unit_price)}
                                        </p>
                                        
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                                            <button 
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <input 
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                className="w-8 text-center bg-transparent text-xs font-bold outline-none text-gray-900 dark:text-white"
                                            />
                                            <button 
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Totals */}
                {cart.length > 0 && (
                    <div className="bg-white dark:bg-[#1e1e1e] p-6 border-t border-gray-200 dark:border-gray-800 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
                                <span>Tax (0%)</span>
                                <span>{formatCurrency(0)}</span>
                            </div>
                            <div className="my-2 border-t border-dashed border-gray-300 dark:border-gray-700"></div>
                            <div className="flex justify-between items-end">
                                <span className={`text-lg font-bold ${THEME.headingText}`}>Total Amount</span>
                                <span className={`text-2xl font-extrabold ${THEME.gradientText}`}>
                                    {formatCurrency(total)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={openCheckout}
                            disabled={checkoutMutation.isPending}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transform active:scale-[0.98] disabled:opacity-70 disabled:transform-none ${THEME.buttonPrimary}`}
                        >
                            {checkoutMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
                        </button>
                    </div>
                )}
            </div>

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cart}
                totals={totals}
                onCheckout={handleCheckout}
            />
        </div>
    );
};

export default POSPage;