import React, { useState, useEffect } from 'react';
import forecastingService from '../services/forecastingService';
import inventoryService from '../services/inventoryService';
import { TrendingUp, AlertCircle, Package, CheckCircle, Clock, AlertTriangle, Loader2, BarChart2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// --- THEME CONSTANTS (Aligned with Inventory/Dashboard) ---
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
    
    // Buttons
    buttonPrimary: "px-6 py-3 bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white font-bold rounded-xl shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
};

const ForecastingPage = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastSummary, setForecastSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getProducts({ search: '', category: '' });
      
      let prodData = response.data;
      if (prodData && prodData.results) {
        prodData = prodData.results;
      }
      
      const productsArray = Array.isArray(prodData) ? prodData : [];
      
      const normalizedProducts = productsArray.map(product => ({
        ...product,
        unit_price: parseFloat(product.unit_price) || 0,
        current_stock: parseInt(product.current_stock) || 0,
        reorder_level: parseInt(product.reorder_level) || 0,
        maximum_stock: parseInt(product.maximum_stock) || 0
      }));
      
      setProducts(normalizedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastSummary = async (productId) => {
    try {
      const response = await forecastingService.getForecastSummary(productId);
      setForecastSummary(response.data);
      setForecastError(null);
    } catch (error) {
      console.error('Error fetching forecast summary:', error);
      setForecastSummary(null);
      
      if (error.response?.status === 404) {
        setForecastError('No forecast available yet. Click "Generate Forecast" to create one.');
      } else {
        setForecastError('Failed to load forecast summary.');
      }
    }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    setSelectedProduct(productId);
    setForecastSummary(null);
    setForecastError(null);

    if (productId) {
      fetchForecastSummary(productId);
    }
  };

  const handleGenerateForecast = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }

    setIsGenerating(true);
    setForecastError(null);
    
    try {
      await forecastingService.generateForecast(
        selectedProduct, 
        30, // forecastDays
        90  // trainingDays
      );
      
      toast.success('Forecast generated successfully!');
      await fetchForecastSummary(selectedProduct);
    } catch (error) {
      console.error('Error generating forecast:', error);
      let errorMessage = 'Failed to generate forecast';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setForecastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper for Priority Colors with matching styling
  const getPriorityStyles = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
      case 'medium':
        return 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
      case 'low':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      case 'low': return <CheckCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- Header --- */}
        <div className="flex flex-col gap-2">
          <h1 className={`text-4xl font-extrabold flex items-center gap-3 ${THEME.gradientText}`}>
            <TrendingUp className={THEME.primaryText} size={32} strokeWidth={2.5} /> Demand Forecasting
          </h1>
          <p className={`text-lg ${THEME.subText} mt-1 ml-1`}>
            Generate AI-powered demand forecasts to optimize your inventory.
          </p>
        </div>

        {/* --- Product Selection Card --- */}
        <div className={`rounded-3xl p-7 ${THEME.cardBase}`}>
          <h2 className={`text-xl font-bold ${THEME.headingText} mb-6 flex items-center gap-2`}>
            <BarChart2 className="w-5 h-5 text-[#FF69B4]" /> Select Product
          </h2>
          
          <div className="flex flex-col gap-2">
            <label className={`block text-sm font-bold ${THEME.subText} uppercase tracking-wide`}>
              Product to Forecast
            </label>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <select
                  value={selectedProduct}
                  onChange={handleProductChange}
                  className={`w-full appearance-none pl-4 pr-10 py-3 rounded-xl font-medium outline-none cursor-pointer shadow-sm transition-all ${THEME.inputBase}`}
                  disabled={loading}
                >
                  <option value="">
                    {loading ? 'Loading products...' : 'Choose a product...'}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Package className="w-5 h-5 text-gray-400 group-hover:text-[#FF69B4] transition-colors" />
                </div>
              </div>
              
              <button
                onClick={handleGenerateForecast}
                disabled={!selectedProduct || isGenerating}
                className={`${THEME.buttonPrimary} md:w-auto w-full`}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGenerating ? 'Analyzing...' : 'Generate Forecast'}
              </button>
            </div>

            <p className={`text-xs ${THEME.subText} mt-2 flex items-center gap-1`}>
              <CheckCircle className="w-3 h-3" /> {products.length} products available for analysis
            </p>
          </div>

          {/* Error Message */}
          {forecastError && (
            <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50/50 dark:from-red-900/20 dark:to-orange-900/10 border-2 border-red-100 dark:border-red-800/50 rounded-xl flex items-start gap-3 animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{forecastError}</p>
            </div>
          )}
        </div>

        {/* --- Forecast Summary --- */}
        {forecastSummary && (
          <div className={`rounded-3xl p-7 ${THEME.cardBase} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <h2 className={`text-xl font-bold ${THEME.headingText} mb-6 flex items-center gap-2`}>
                <TrendingUp className="w-5 h-5 text-[#FF69B4]" /> Forecast Results
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Current Stock Card - "Pink" Themed */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-[#FF69B4]/5 to-[#FF77A9]/10 dark:from-[#FF69B4]/10 dark:to-[#FF77A9]/5 border-2 border-[#FF69B4]/20 dark:border-[#FF69B4]/30 shadow-lg shadow-[#FF69B4]/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#FF69B4] dark:text-[#FF77A9] uppercase tracking-wider">Current Stock</span>
                  <Package className="w-6 h-6 text-[#FF69B4]" strokeWidth={1.5} />
                </div>
                <p className={`text-3xl font-extrabold ${THEME.headingText}`}>
                  {forecastSummary.current_stock || 0} <span className={`text-sm font-medium ${THEME.subText}`}>units</span>
                </p>
              </div>

              {/* Predicted Demand - Yellow/Warning Themed */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50/50 dark:from-yellow-900/10 dark:to-orange-900/10 border-2 border-yellow-200 dark:border-yellow-800/40 shadow-lg shadow-yellow-500/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">7-Day Demand</span>
                  <TrendingUp className="w-6 h-6 text-yellow-500" strokeWidth={1.5} />
                </div>
                <p className={`text-3xl font-extrabold ${THEME.headingText}`}>
                  {forecastSummary.forecast_7_days || 0} <span className={`text-sm font-medium ${THEME.subText}`}>units</span>
                </p>
              </div>

              {/* Priority - Dynamic Color */}
              <div className={`rounded-2xl p-6 border-2 shadow-lg ${getPriorityStyles(forecastSummary.priority)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Priority Level</span>
                  {getPriorityIcon(forecastSummary.priority)}
                </div>
                <p className="text-3xl font-extrabold capitalize">
                  {forecastSummary.priority || 'Normal'}
                </p>
              </div>
            </div>

            {/* Forecast Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extended Forecast */}
              <div className="rounded-2xl p-6 bg-white/50 dark:bg-[#1A1A1D]/50 border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20">
                <h3 className={`text-xs font-bold ${THEME.subText} uppercase tracking-wider mb-4 flex items-center gap-2`}>
                    <Clock className="w-4 h-4" /> Extended Forecast
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-[#1A1A1D] rounded-xl border border-[#E5E5E5] dark:border-[#FF69B4]/10 shadow-sm">
                    <span className={`${THEME.subText} font-medium`}>Next 14 Days</span>
                    <span className={`text-lg font-bold ${THEME.primaryText}`}>
                      {forecastSummary.forecast_14_days || 0} units
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-[#1A1A1D] rounded-xl border border-[#E5E5E5] dark:border-[#FF69B4]/10 shadow-sm">
                    <span className={`${THEME.subText} font-medium`}>Next 30 Days</span>
                    <span className={`text-lg font-bold ${THEME.primaryText}`}>
                      {forecastSummary.forecast_30_days || 0} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory Health */}
              <div className="rounded-2xl p-6 bg-white/50 dark:bg-[#1A1A1D]/50 border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20">
                <h3 className={`text-xs font-bold ${THEME.subText} uppercase tracking-wider mb-4 flex items-center gap-2`}>
                    <Package className="w-4 h-4" /> Inventory Health
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className={`${THEME.subText} font-medium`}>Reorder Point:</span>
                    <span className={`font-extrabold ${THEME.headingText} text-lg`}>
                      {forecastSummary.reorder_level || 0} units
                    </span>
                  </div>
                  <div className="w-full h-0.5 bg-[#E5E5E5] dark:bg-[#FF69B4]/20"></div>
                  <div className="flex justify-between items-center">
                    <span className={`${THEME.subText} font-medium`}>Estimated Stockout:</span>
                    <span className={`font-bold px-3 py-1 rounded-lg text-sm border ${
                        forecastSummary.days_until_stockout < 7 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50' 
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    }`}>
                      {forecastSummary.days_until_stockout ? `${forecastSummary.days_until_stockout} days` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Box */}
            {forecastSummary.recommendation && (
              <div className="mt-6 p-6 bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-900/10 dark:to-blue-900/10 border-2 border-sky-100 dark:border-sky-800/40 rounded-2xl flex gap-5 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/30">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide mb-1.5">AI Recommendation</h3>
                    <p className="text-sky-900 dark:text-sky-100 leading-relaxed font-medium">{forecastSummary.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastingPage;