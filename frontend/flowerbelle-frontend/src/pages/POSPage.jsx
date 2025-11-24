import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import posService from '../services/posService';
import { Package, Search, ShoppingCart, Trash2, Plus, Minus, X, ShoppingBagIcon } from 'lucide-react';
import Loading from '../components/common/Loading';
import CheckoutModal from '../components/pos/CheckoutModal';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS ---
const THEME = {
    primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
    headingText: "text-gray-900 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9]",
    pageBg: "bg-gradient-to-br from-white via-[#FFE4E1]/20 to-[#FF69B4]/10 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#2C1A21]",
    cardBase: "bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#FF69B4]/20 shadow-lg shadow-[#FF69B4]/5 dark:shadow-black/20",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 focus:border-[#FF69B4] dark:focus:border-[#FF77A9] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
    buttonIcon: "bg-[#FF69B4]/10 text-[#FF69B4] hover:bg-[#FF69B4]/20 dark:bg-[#FF69B4]/20 dark:text-[#FF77A9] dark:hover:bg-[#FF69B4]/30"
};

// Separate Cart Content Component for reusability
const CartContent = ({ cart, clearCart, removeFromCart, updateQuantity, subtotal, total, openCheckout, checkoutMutation, formatCurrency }) => {
    return (
        <>
            {/* Cart Header */}
            <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-[#FFE4E1]/20 dark:from-[#1e1e1e] dark:to-[#2C1A21]">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-[#FF69B4]/30 ${THEME.gradientBg}`}>
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className={`text-base sm:text-lg lg:text-xl font-bold ${THEME.headingText}`}>Current Order</h3>
                            <p className={`text-xs ${THEME.subText}`}>{cart.length} Items</p>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button 
                            onClick={clearCart} 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 sm:p-2 rounded-lg transition-all"
                            title="Clear Cart"
                        >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50/50 dark:bg-black/20">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 opacity-60">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-[#1A1A1D] rounded-full flex items-center justify-center mb-3 sm:mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        </div>
                        <p className={`text-base sm:text-lg font-bold ${THEME.headingText}`}>Cart is empty</p>
                        <p className={`text-xs sm:text-sm ${THEME.subText}`}>Select products to add to order</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-[#1A1A1D] rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-2 sm:gap-3 group hover:border-[#FF69B4]/30 transition-all">
                            {/* Item Image */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Item Info & Controls */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-bold text-xs sm:text-sm line-clamp-1 ${THEME.headingText}`}>{item.name}</h4>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                    >
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-end mt-1">
                                    <p className={`text-xs sm:text-sm font-bold ${THEME.primaryText}`}>
                                        {formatCurrency(item.unit_price)}
                                    </p>
                                    
                                    {/* Quantity Controls */}
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
                <div className="bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 lg:p-6 border-t border-gray-200 dark:border-gray-800 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                    <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                        <div className="flex justify-between text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                            <span>Tax (0%)</span>
                            <span>{formatCurrency(0)}</span>
                        </div>
                        <div className="my-1.5 sm:my-2 border-t border-dashed border-gray-300 dark:border-gray-700"></div>
                        <div className="flex justify-between items-end">
                            <span className={`text-base sm:text-lg font-bold ${THEME.headingText}`}>Total Amount</span>
                            <span className={`text-xl sm:text-2xl font-extrabold ${THEME.gradientText}`}>
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                        onClick={openCheckout}
                        disabled={checkoutMutation.isPending}
                        className={`w-full py-3 sm:py-3.5 lg:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl transform active:scale-[0.98] disabled:opacity-70 disabled:transform-none ${THEME.buttonPrimary}`}
                    >
                        {checkoutMutation.isPending ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                </div>
            )}
        </>
    );
};

const POSPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false); // Mobile cart drawer

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
            const paymentMethod = response?.data?.payment_method;
            const paymentReference = response?.data?.payment_reference;
            const transactionId = response?.data?.id || response?.data?.transaction_id;
            
            let transactionNumber;
            if (paymentReference && paymentReference.trim() !== '') {
                transactionNumber = paymentReference;
            } else if (transactionId) {
                transactionNumber = `TXN-${transactionId}`;
            } else if (paymentMethod === 'CASH') {
                const timestamp = new Date().getTime().toString().slice(-8);
                transactionNumber = `CASH-${timestamp}`;
            } else {
                transactionNumber = 'COMPLETED';
            }
            
            toast.success(`Transaction completed! Receipt #${transactionNumber}`);
            setCart([]);
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
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
        <div className={`flex h-screen overflow-hidden ${THEME.pageBg} relative`}>
            
            {/* --- Left Side: Products Section --- */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Header & Filters */}
                <div className="bg-white/80 dark:bg-[#1e1e1e]/90 backdrop-blur-md p-3 sm:p-4 lg:p-6 shadow-sm border-b border-gray-200 dark:border-gray-800 z-10">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold flex items-center gap-2 sm:gap-3 ${THEME.gradientText}`}>
                            <ShoppingBagIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-[#FF69B4]" /> Point of Sale
                        </h2>
                        
                        {/* Mobile Cart Button */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className={`lg:hidden relative p-2 sm:p-2.5 rounded-xl ${THEME.buttonPrimary}`}
                        >
                            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-white text-[#FF69B4] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isSearching ? 'text-[#FF69B4]' : 'text-gray-400 group-hover:text-[#FF69B4]'}`} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className={`w-full pl-10 sm:pl-12 pr-20 sm:pr-24 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm rounded-xl outline-none transition-all shadow-sm ${THEME.inputBase}`}
                            />
                            
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                                {searchTerm && !isSearching && (
                                    <button 
                                        onClick={handleClearSearch} 
                                        className="text-gray-400 hover:text-red-500 p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleSearchClick}
                                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold ${THEME.buttonPrimary}`}
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
                                className={`w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 pr-8 sm:pr-10 text-xs sm:text-sm rounded-xl outline-none shadow-sm cursor-pointer font-medium ${THEME.inputBase}`}
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 relative">
                    {isSearching && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
                            <div className="text-center">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full animate-spin mx-auto mb-2 sm:mb-3 border-4 border-[#FF69B4]/30 border-t-[#FF69B4]"></div>
                                <p className={`text-sm sm:text-base md:text-lg font-bold ${THEME.primaryText}`}>Fetching products...</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Responsive Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 pb-6">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className={`rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 group ${THEME.cardBase}`}
                            >
                                {/* Image */}
                                <div className="w-full h-24 sm:h-28 md:h-32 lg:h-36 mb-2 sm:mb-3 rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1D] relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Package className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-300 dark:text-gray-600" />
                                    )}
                                    {/* Quick Add Overlay */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white dark:bg-[#1A1A1D] text-[#FF69B4] p-1.5 sm:p-2 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div>
                                    <h3 className={`font-bold text-[10px] sm:text-xs md:text-sm lg:text-base mb-0.5 sm:mb-1 line-clamp-2 leading-snug ${THEME.headingText}`}>
                                        {product.name}
                                    </h3>
                                    <p className={`text-[9px] sm:text-[10px] md:text-xs mb-1.5 sm:mb-2 md:mb-3 font-medium ${THEME.subText}`}>
                                        {product.category_name}
                                    </p>
                                    
                                    <div className="flex items-end justify-between">
                                        <span className={`text-sm sm:text-base md:text-lg font-extrabold ${THEME.primaryText}`}>
                                            {formatCurrency(product.unit_price)}
                                        </span>
                                        <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider ${
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
                            <div className="col-span-full text-center py-12 sm:py-16 md:py-20 text-gray-400 dark:text-gray-600">
                                <Package className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 opacity-20" />
                                <p className="text-base sm:text-lg md:text-xl font-bold opacity-50">No Products Found</p>
                                <p className="text-xs sm:text-sm md:text-base mt-2 opacity-50">Try a different search term or category.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Desktop Cart Sidebar (hidden on mobile) --- */}
            <div className="hidden lg:flex w-80 xl:w-96 min-w-[320px] xl:min-w-[384px] bg-white dark:bg-[#1e1e1e] shadow-2xl flex-col border-l border-gray-200 dark:border-gray-800 z-30">
                <CartContent 
                    cart={cart}
                    clearCart={clearCart}
                    removeFromCart={removeFromCart}
                    updateQuantity={updateQuantity}
                    subtotal={subtotal}
                    total={total}
                    openCheckout={openCheckout}
                    checkoutMutation={checkoutMutation}
                    formatCurrency={formatCurrency}
                />
            </div>

            {/* --- Mobile Cart Drawer --- */}
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        onClick={() => setIsCartOpen(false)}
                    />
                    
                    {/* Drawer */}
                    <div className="lg:hidden fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-[#1e1e1e] shadow-2xl z-50 flex flex-col">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <CartContent 
                            cart={cart}
                            clearCart={clearCart}
                            removeFromCart={removeFromCart}
                            updateQuantity={updateQuantity}
                            subtotal={subtotal}
                            total={total}
                            openCheckout={openCheckout}
                            checkoutMutation={checkoutMutation}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </>
            )}

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