import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import posService from '../services/posService';
import { Package, Search, ShoppingCart, X, ShoppingBagIcon, Plus, Minus, Trash2 } from 'lucide-react';
import Loading from '../components/common/Loading';
import CheckoutModal from '../components/pos/CheckoutModal';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors - Matching LoginPage) ---
const THEME = {
    // Logo colors: Sage Green (#8FBC8F), Blush Pink (#F5E6E0), Cream (#FFF8F0)
    primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
    headingText: "text-[#2F4F4F] dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]",
    pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",
    cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-xl",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] dark:focus:border-[#A8D4A8] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
    buttonPrimary: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 hover:-translate-y-0.5 transition-all duration-200",
    buttonIcon: "bg-[#8FBC8F]/10 text-[#8FBC8F] hover:bg-[#8FBC8F]/20 dark:bg-[#8FBC8F]/20 dark:text-[#8FBC8F] dark:hover:bg-[#8FBC8F]/30"
};

const POSPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [cart, setCart] = useState([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);

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
            // Don't close checkout modal - let user view the receipt first
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

    const getCartItemQuantity = (productId) => {
        const item = cart.find(i => i.id === productId);
        return item ? item.quantity : 0;
    };

    const updateQuantity = (productId, newQuantity) => {
        const product = cart.find(item => item.id === productId);
        if (!product) return;

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQuantity > product.current_stock) {
            toast.error(`Only ${product.current_stock} in stock.`);
            return;
        }

        setCart(cart.map(item =>
            item.id === productId ? { ...item, quantity: newQuantity } : item
        ));
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
        setIsCartPreviewOpen(false);
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

            {/* --- Main Products Section --- */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isCartPreviewOpen ? 'mr-0 sm:mr-[340px] md:mr-[380px]' : ''}`}>

                {/* Header & Filters */}
                <div className="bg-gradient-to-br from-white to-[#FFF8F0]/50 dark:from-[#1e1e1e] dark:to-[#1A1A1D] backdrop-blur-md p-4 sm:p-5 lg:p-6 shadow-xl border-b-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 z-10">
                    <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                            <ShoppingBagIcon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[#8FBC8F]" strokeWidth={2} /> Point of Sale
                        </h2>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 group">
                            <Search className={`absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isSearching ? 'text-[#8FBC8F]' : 'text-gray-400 group-hover:text-[#8FBC8F]'}`} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full pl-10 sm:pl-12 pr-24 sm:pr-28 py-2.5 sm:py-3 text-sm rounded-xl outline-none transition-all shadow-lg bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] dark:focus:border-[#A8D4A8] text-gray-900 dark:text-white placeholder:text-gray-400"
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
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 transition-all"
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
                                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 pr-10 text-sm rounded-xl outline-none shadow-lg cursor-pointer font-medium bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] text-gray-900 dark:text-white"
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
                                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full animate-spin mx-auto mb-2 sm:mb-3 border-4 border-[#8FBC8F]/30 border-t-[#8FBC8F]"></div>
                                <p className={`text-sm sm:text-base md:text-lg font-bold ${THEME.primaryText}`}>Fetching products...</p>
                            </div>
                        </div>
                    )}

                    {/* Responsive Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 pb-6">
                        {products.map((product) => {
                            const inCartQty = getCartItemQuantity(product.id);
                            const isInCart = inCartQty > 0;

                            return (
                                <div
                                    key={product.id}
                                    className={`rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 group ${THEME.cardBase} ${isInCart ? 'ring-2 ring-[#8FBC8F]' : ''}`}
                                >
                                    {/* Image */}
                                    <div
                                        onClick={() => !isInCart && addToCart(product)}
                                        className={`w-full h-24 sm:h-28 md:h-32 lg:h-36 mb-2 sm:mb-3 rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-[#1A1A1D] relative ${!isInCart ? 'cursor-pointer' : ''}`}
                                    >
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <Package className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-300 dark:text-gray-600" />
                                        )}
                                        {/* Quick Add Overlay */}
                                        {!isInCart && (
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white dark:bg-[#1A1A1D] text-[#8FBC8F] p-1.5 sm:p-2 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div>
                                        <h3 className={`font-bold text-[10px] sm:text-xs md:text-sm lg:text-base mb-0.5 sm:mb-1 line-clamp-2 leading-snug ${THEME.headingText}`}>
                                            {product.name}
                                        </h3>
                                        <p className={`text-[9px] sm:text-[10px] md:text-xs mb-1.5 sm:mb-2 font-medium ${THEME.subText}`}>
                                            {product.category_name}
                                        </p>

                                        <div className="flex items-end justify-between mb-2">
                                            <span className={`text-sm sm:text-base md:text-lg font-extrabold ${THEME.primaryText}`}>
                                                {formatCurrency(product.unit_price)}
                                            </span>
                                            <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider ${product.current_stock <= product.reorder_level
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                {product.current_stock} Left
                                            </span>
                                        </div>

                                        {/* Quantity Controls */}
                                        {isInCart ? (
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                <button
                                                    onClick={() => updateQuantity(product.id, inCartQty - 1)}
                                                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg p-1.5 sm:p-2 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                                                </button>
                                                <div className={`flex-1 text-center font-bold text-xs sm:text-sm ${THEME.primaryText}`}>
                                                    {inCartQty}
                                                </div>
                                                <button
                                                    onClick={() => updateQuantity(product.id, inCartQty + 1)}
                                                    className={`flex-1 rounded-lg p-1.5 sm:p-2 transition-colors ${THEME.buttonPrimary}`}
                                                >
                                                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(product)}
                                                className={`w-full rounded-lg py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition-all ${THEME.buttonPrimary}`}
                                            >
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

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

            {/* --- Floating Cart Icon Button (Hidden when cart panel is open) --- */}
            {cart.length > 0 && !isCartPreviewOpen && (
                <button
                    onClick={() => setIsCartPreviewOpen(true)}
                    className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#8FBC8F] to-[#2E8B57] shadow-2xl shadow-[#8FBC8F]/50 hover:shadow-[#8FBC8F]/70 hover:scale-110 transition-all duration-300 flex items-center justify-center z-40 group animate-bounce-slow"
                    title="View cart"
                    style={{ width: '72px', height: '72px' }}
                >
                    <div className="relative">
                        <ShoppingCart className="w-8 h-8 sm:w-9 sm:h-9 text-white" strokeWidth={2} />
                        <span className="absolute -top-3 -right-3 bg-white text-[#2E8B57] text-sm sm:text-base font-extrabold w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-[#2E8B57]/20">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    </div>
                </button>
            )}

            {/* --- CART SIDE PANEL (Non-blocking - Can still select products) --- */}
            {isCartPreviewOpen && (
                <div className="fixed top-0 right-0 h-full w-full sm:w-[340px] md:w-[380px] bg-white dark:bg-[#1A1A1D] z-30 shadow-2xl flex flex-col border-l-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 transform transition-transform duration-300">

                    {/* Panel Header */}
                    <div className="bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Your Cart</h2>
                                <p className="text-white/80 text-xs">{cart.reduce((sum, i) => sum + i.quantity, 0)} items</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCartPreviewOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-[#151515]">
                        {cart.length === 0 ? (
                            <div className="text-center py-12">
                                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-base font-bold text-gray-400 dark:text-gray-500">Cart is empty</p>
                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Click products to add</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#1e1e1e] rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
                                    {/* Product Name & Remove */}
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-xs text-gray-800 dark:text-white leading-tight flex-1 pr-2">{item.name}</h3>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 flex items-center justify-center"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Price & Quantity */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center bg-gray-100 dark:bg-[#252525] rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#303030]"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-white">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                disabled={item.quantity >= item.current_stock}
                                                className={`w-8 h-8 flex items-center justify-center ${item.quantity >= item.current_stock
                                                    ? 'text-gray-300 dark:text-gray-600'
                                                    : 'text-[#8FBC8F] hover:bg-[#8FBC8F]/20'
                                                    }`}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <p className="text-base font-bold text-[#8FBC8F]">
                                            ₱{(item.unit_price * item.quantity).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer - Total & Checkout */}
                    {cart.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-[#1e1e1e]">
                            {/* Total */}
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</span>
                                <span className="text-xl font-extrabold text-gray-800 dark:text-white">
                                    ₱{total.toLocaleString()}
                                </span>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCart([])}
                                    className="flex-1 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-xl transition-colors border border-red-200 dark:border-red-800/50 text-sm"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={openCheckout}
                                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white font-bold transition-all shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50"
                                >
                                    Checkout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
