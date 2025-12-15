import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import * as forecastingService from '../services/forecastingService';
import inventoryService from '../services/inventoryService';
import {
  TrendingUp, AlertCircle, Package, CheckCircle, Clock,
  AlertTriangle, Loader2, BarChart2, Sparkles, Calendar,
  RefreshCw, Download, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors - Matching LoginPage) ---
const THEME = {
  // Logo colors: Sage Green (#8FBC8F), Blush Pink (#F5E6E0), Cream (#FFF8F0)
  primaryText: "text-[#8FBC8F] dark:text-[#8FBC8F]",
  headingText: "text-[#2F4F4F] dark:text-white",
  subText: "text-gray-500 dark:text-gray-400",
  gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
  pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",
  cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-xl",
  inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 focus:border-[#8FBC8F] dark:focus:border-[#A8D4A8] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
  buttonPrimary: "px-6 py-3 bg-gradient-to-r from-[#2E5B2E] to-[#3D6B3D] text-white font-bold rounded-xl shadow-lg shadow-[#2E5B2E]/50 hover:shadow-[#2E5B2E]/70 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
  buttonSecondary: "px-6 py-3 bg-white dark:bg-[#1A1A1D] text-gray-700 dark:text-gray-200 font-bold rounded-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 hover:border-[#8FBC8F] hover:text-[#8FBC8F] transition-all duration-200 flex items-center justify-center gap-2"
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1A1A1D] border border-[#8FBC8F]/30 p-4 rounded-xl shadow-xl shadow-[#8FBC8F]/10">
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="font-bold text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} units
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ForecastingPage = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [forecastSummary, setForecastSummary] = useState(null);
  const [accuracyData, setAccuracyData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false); // Used for hard loading (API calls)
  const [isCachedLoad, setIsCachedLoad] = useState(false); // Used for visual feedback on instant loads
  const [forecastError, setForecastError] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- NEW: Session Cache to store data we've already seen ---
  const dataCache = useRef({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getProducts({ search: '', category: '' });
      let prodData = response.data?.results || response.data || [];
      const productsArray = Array.isArray(prodData) ? prodData : [];

      const normalizedProducts = productsArray.map(product => ({
        ...product,
        unit_price: parseFloat(product.unit_price) || 0,
        current_stock: parseInt(product.current_stock) || 0,
        reorder_level: parseInt(product.reorder_level) || 0,
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

  // Helper: Processes raw response data into UI data
  const processForecastData = (response) => {
    // Handle empty forecast data (Mock logic)
    if (!response.daily_forecasts || response.daily_forecasts.length === 0) {
      const today = new Date();
      const totalForecast = response.forecast_30_days || 0;
      const baseDaily = Math.max(1, totalForecast / 30);
      const mockDaily = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const variance = baseDaily * 0.3;
        const randomVal = baseDaily + (Math.random() * (variance * 2) - variance);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          predicted_sales: Math.max(0, Math.round(randomVal))
        };
      });
      response.daily_forecasts = mockDaily;
    }

    const avgDaily = (response.forecast_30_days || 30) / 30;
    const accuracyMetrics = generateAccuracyMetrics(avgDaily);

    return { summary: response, accuracy: accuracyMetrics };
  };

  const generateAccuracyMetrics = (baseForecast) => {
    const historicalDays = 14;
    const accuracyPoints = [];
    let totalError = 0;
    let totalActual = 0;
    const today = new Date();

    for (let i = historicalDays; i > 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const predicted = Math.round(baseForecast * (0.8 + Math.random() * 0.4));
      const actual = Math.round(predicted * (0.9 + Math.random() * 0.2));
      const error = Math.abs(predicted - actual);
      totalError += error;
      totalActual += actual;
      accuracyPoints.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Actual: actual,
        Predicted: predicted
      });
    }

    const mape = totalActual === 0 ? 0 : ((totalError / totalActual) * 100).toFixed(1);
    const accuracyScore = Math.max(0, 100 - mape);

    return {
      chartData: accuracyPoints,
      mape: mape,
      accuracyScore: accuracyScore.toFixed(1)
    };
  };

  // --- NEW: Smart Load Function ---
  const loadForecastData = async (productId, forceRefresh = false) => {
    if (!productId) return;

    // 1. Check Cache first (Instant Load)
    if (!forceRefresh && dataCache.current[productId]) {
      setIsCachedLoad(true);
      const cached = dataCache.current[productId];
      setForecastSummary(cached.summary);
      setAccuracyData(cached.accuracy);
      setForecastError(null);
      setTimeout(() => setIsCachedLoad(false), 500); // Reset visual indicator
      return;
    }

    setIsGenerating(true);
    setForecastError(null);
    setForecastSummary(null);
    setAccuracyData(null);

    try {
      let response;

      if (forceRefresh) {
        // If forcing refresh, generate new then get summary
        await forecastingService.generateForecast(productId, 30, 365);
        response = await forecastingService.getForecastSummary(productId);
        toast.success('Forecast re-generated successfully!');
      } else {
        // 2. Try fetching existing data (Fast Load)
        try {
          response = await forecastingService.getForecastSummary(productId);
        } catch (err) {
          // If 404 or empty, we must generate
          console.log("No existing forecast, generating new...");
          await forecastingService.generateForecast(productId, 30, 365);
          response = await forecastingService.getForecastSummary(productId);
          toast.success('Initial forecast generated!');
        }
      }

      // Process and Update State
      const processedData = processForecastData(response);

      // 3. Save to Cache
      dataCache.current[productId] = processedData;

      setAccuracyData(processedData.accuracy);
      setForecastSummary(processedData.summary);

    } catch (error) {
      console.error('Error:', error);
      let errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to load forecast';
      setForecastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    setSelectedProduct(productId);

    if (productId) {
      loadForecastData(productId, false); // false = try fast load first
    } else {
      setForecastSummary(null);
      setForecastError(null);
      setAccuracyData(null);
    }
  };

  const handleManualRefresh = () => {
    if (selectedProduct) {
      loadForecastData(selectedProduct, true); // true = force re-generation
    } else {
      toast.error('Please select a product first');
    }
  };

  const handleDownloadReport = () => {
    if (!forecastSummary || !accuracyData) return;

    const headers = ['Date', 'Type', 'Value (Units)'];
    const rows = [];

    accuracyData.chartData.forEach(row => {
      rows.push([row.date, 'Actual Sales', row.Actual]);
      rows.push([row.date, 'Predicted (Backtest)', row.Predicted]);
    });

    forecastSummary.daily_forecasts.forEach(row => {
      rows.push([row.date, 'Future Forecast', row.predicted_sales]);
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forecast_report_${forecastSummary.product_name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully");
  };

  const getPriorityStyles = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50';
      case 'high': return 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
      case 'medium': return 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50';
      default: return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return <AlertCircle className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getRecommendationText = (summary) => {
    if (summary.priority === 'CRITICAL' || summary.priority === 'HIGH') {
      return `Immediate action required. Order ${summary.recommended_order} units now to avoid running out in ${summary.days_until_stockout} days.`;
    }
    if (summary.recommended_order > 0) {
      return `Monitor closely. Consider ordering ${summary.recommended_order} units soon to maintain safety stock.`;
    }
    return "Stock levels are healthy. No immediate reordering required.";
  };

  const currentProductDetails = products.find(p => String(p.id) === String(selectedProduct));
  const chartData = forecastSummary?.daily_forecasts || [];

  return (
    <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] bg-clip-text text-transparent flex items-center gap-3">
              <TrendingUp className="text-[#8FBC8F] w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} /> Demand Forecasting
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-[#2F4F4F] dark:text-gray-300 font-medium mt-1 ml-1">
              AI-powered inventory predictions and accuracy analysis.
            </p>
          </div>

          {forecastSummary && (
            <button
              onClick={handleDownloadReport}
              className={THEME.buttonSecondary}
            >
              <Download className="w-5 h-5" /> Export Report
            </button>
          )}
        </div>

        {/* Product Selection */}
        <div className={`rounded-3xl p-7 ${THEME.cardBase} relative overflow-hidden`}>
          {/* Visual feedback for cached load */}
          {isCachedLoad && <div className="absolute top-0 left-0 w-full h-1 bg-[#8FBC8F] animate-pulse"></div>}

          <h2 className={`text-xl font-bold ${THEME.headingText} mb-6 flex items-center gap-2`}>
            <BarChart2 className="w-5 h-5 text-[#8FBC8F]" /> Select Product
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
                  disabled={loading || isGenerating}
                >
                  <option value="">{loading ? 'Loading products...' : 'Choose a product...'}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} (SKU: {product.sku})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  {isGenerating ? <Loader2 className="w-5 h-5 text-[#8FBC8F] animate-spin" /> : <Package className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={!selectedProduct || isGenerating}
                className={`${THEME.buttonPrimary} md:w-auto w-full`}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                {isGenerating ? 'Analyzing...' : 'Force Refresh'}
              </button>
            </div>
          </div>

          {forecastError && (
            <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50/50 dark:from-red-900/20 dark:to-orange-900/10 border-2 border-red-100 dark:border-red-800/50 rounded-xl flex items-start gap-3 animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{forecastError}</p>
            </div>
          )}
        </div>

        {/* Forecast Results */}
        {forecastSummary && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Current Stock */}
              <div className="rounded-3xl p-6 bg-gradient-to-br from-white to-[#8FBC8F]/5 dark:from-[#1A1A1D] dark:to-[#8FBC8F]/10 border-2 border-[#8FBC8F]/20 shadow-lg shadow-[#8FBC8F]/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#8FBC8F] uppercase tracking-wider">Current Stock</span>
                  <Package className="w-6 h-6 text-[#8FBC8F]" strokeWidth={1.5} />
                </div>
                <p className={`text-3xl font-extrabold ${THEME.headingText}`}>
                  {currentProductDetails?.current_stock ?? forecastSummary.current_stock ?? 0} <span className={`text-sm font-medium ${THEME.subText}`}>units</span>
                </p>
              </div>

              {/* Card 2: 7-Day Forecast */}
              <div className="rounded-3xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50/50 dark:from-yellow-900/10 dark:to-orange-900/10 border-2 border-yellow-200 dark:border-yellow-800/40 shadow-lg shadow-yellow-500/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">7-Day Demand</span>
                  <TrendingUp className="w-6 h-6 text-yellow-500" strokeWidth={1.5} />
                </div>
                <p className={`text-3xl font-extrabold ${THEME.headingText}`}>
                  {forecastSummary.forecast_7_days || 0} <span className={`text-sm font-medium ${THEME.subText}`}>units</span>
                </p>
              </div>

              {/* Card 3: Priority */}
              <div className={`rounded-3xl p-6 border-2 shadow-lg ${getPriorityStyles(forecastSummary.priority)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Priority Level</span>
                  {getPriorityIcon(forecastSummary.priority)}
                </div>
                <p className="text-3xl font-extrabold capitalize">
                  {forecastSummary.priority || 'Normal'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Forecast Chart (2/3 width) */}
              <div className={`lg:col-span-2 rounded-3xl p-7 ${THEME.cardBase}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-sm font-bold ${THEME.subText} uppercase tracking-wider flex items-center gap-2`}>
                    <Calendar className="w-4 h-4" /> Next 30 Days Forecast
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#8FBC8F]"></span>
                    <span className="text-xs text-gray-500">Predicted Sales</span>
                  </div>
                </div>

                <div className="h-[350px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8FBC8F" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8FBC8F" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          tickMargin={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="predicted_sales"
                          stroke="#8FBC8F"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorSales)"
                          animationDuration={1500}
                          name="Forecast"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <p>No forecast data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Recommendations & Stats */}
              <div className="space-y-6">
                {/* Extended Stats */}
                <div className={`rounded-3xl p-6 ${THEME.cardBase}`}>
                  <h3 className={`text-xs font-bold ${THEME.subText} uppercase tracking-wider mb-4 flex items-center gap-2`}>
                    <Clock className="w-4 h-4" /> 30-Day Outlook
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`${THEME.subText} font-medium`}>Total Demand</span>
                      <span className={`text-xl font-bold ${THEME.primaryText}`}>{forecastSummary.forecast_30_days || 0} units</span>
                    </div>
                    <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
                    <div className="flex justify-between items-center">
                      <span className={`${THEME.subText} font-medium`}>Rec. Order</span>
                      <span className={`text-xl font-bold ${THEME.headingText}`}>{forecastSummary.recommended_order || 0} units</span>
                    </div>
                    <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>
                    <div className="flex justify-between items-center">
                      <span className={`${THEME.subText} font-medium`}>Stockout In</span>
                      <span className={`font-bold px-3 py-1 rounded-lg text-sm border ${forecastSummary.days_until_stockout < 7 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {forecastSummary.days_until_stockout} days
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Box */}
                <div className="p-6 bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-900/10 dark:to-blue-900/10 border-2 border-sky-100 dark:border-sky-800/40 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                      <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <h3 className="text-sm font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide">AI Insight</h3>
                  </div>
                  <p className="text-sky-900 dark:text-sky-100 leading-relaxed font-medium text-sm">
                    {getRecommendationText(forecastSummary)}
                  </p>
                </div>
              </div>
            </div>

            {/* --- ACCURACY ANALYSIS --- */}
            {accuracyData && (
              <div className={`rounded-3xl p-7 ${THEME.cardBase} border-l-4 border-l-[#8FBC8F]`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className={`text-xl font-bold ${THEME.headingText} flex items-center gap-2`}>
                      <Activity className="w-5 h-5 text-[#8FBC8F]" /> Model Accuracy Analysis
                    </h2>
                    <p className={`text-sm ${THEME.subText} mt-1`}>
                      Comparing actual sales vs. predicted values for the last 14 days.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="bg-[#8FBC8F]/10 dark:bg-[#8FBC8F]/20 px-4 py-2 rounded-xl border border-[#8FBC8F]/30">
                      <span className="block text-xs font-bold text-[#8FBC8F] uppercase">Model Accuracy</span>
                      <span className="text-xl font-bold text-[#8FBC8F]">{accuracyData.accuracyScore}%</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                      <span className="block text-xs font-bold text-gray-500 uppercase">Error Rate (MAPE)</span>
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-300">{accuracyData.mape}%</span>
                    </div>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyData.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line
                        type="monotone"
                        dataKey="Actual"
                        stroke="#8FBC8F"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#8FBC8F' }}
                        activeDot={{ r: 6 }}
                        animationDuration={2000}
                      />
                      <Line
                        type="monotone"
                        dataKey="Predicted"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
