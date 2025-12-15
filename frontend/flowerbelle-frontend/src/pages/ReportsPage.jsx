import React, { useState, useEffect, useCallback, useMemo } from 'react';
import reportService from '../services/reportService';
import inventoryService from '../services/inventoryService';
import { useTheme } from '../contexts/ThemeContext';
import {
  DollarSign,
  Download,
  Package,
  Loader2,
  TrendingUp,
  CreditCard,
  Activity,
  BarChart2,
  Banknote,
  X,
  Calendar,
  Clock,
  CalendarDays,
  CalendarRange,
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
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
  buttonGhost: "hover:bg-[#8FBC8F]/10 text-gray-600 dark:text-gray-300 hover:text-[#8FBC8F] dark:hover:text-[#8FBC8F] transition-colors",
  input: "w-full bg-gray-50 dark:bg-[#2C2C2E] border border-[#D4C4B0] dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FBC8F] transition-all"
};

const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ReportsPage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);

  // --- DASHBOARD STATE ---
  const [period, setPeriod] = useState('all');
  const [salesData, setSalesData] = useState([]);

  // NEW: Store RAW inventory data separately so we can filter it locally
  const [rawInventoryData, setRawInventoryData] = useState([]);

  // NEW: Dashboard Sorting/Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState('stock_desc');



  // --- EXPORT STATE ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOption, setExportOption] = useState('day');
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDays, setSelectedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Helper constants for export
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Helper functions for day selection
  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };
  const selectAllDays = () => setSelectedDays([...weekDays]);
  const clearAllDays = () => setSelectedDays([]);


  const chartColors = {
    grid: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#9ca3af' : '#6b7280',
    barStart: '#8FBC8F',
    barEnd: '#A8D4A8',
  };

  const periodOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const salesResponse = await reportService.getSalesAnalytics({ period });
      const inventoryResponse = await inventoryService.getProducts({ limit: 100 });


      // Process Sales Data
      const salesApiData = salesResponse.data || salesResponse;
      const rawTrendData = salesApiData.daily_trend || [];

      // Use the label field from API for display, keep all entries (including zeros)
      const processedSalesData = rawTrendData.map(item => ({
        date: item.day,
        displayDate: item.label || formatDateForDisplay(item.day),
        total_sales: parseFloat(item.total || 0),
        transactions: item.count || 0
      }));

      setSalesData(processedSalesData);



      // Process Inventory Data (Store RAW data now, don't slice yet)
      const rawInvData = inventoryResponse.data?.results || inventoryResponse.data || [];
      if (Array.isArray(rawInvData)) {
        const cleanInvData = rawInvData
          .map(item => ({
            name: item.name,
            stock: parseInt(item.current_stock || item.quantity || 0, 10),
          }))
          .filter(item => item.stock > 0);

        setRawInventoryData(cleanInvData);
      }
    } catch (error) {
      console.error('❌ Reports Error:', error);
      toast.error('Could not load data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // NEW: Calculate Display Inventory based on Filters/Sort
  // NEW: Calculate Display Inventory based on Filters/Sort
  const fullSortedInventory = useMemo(() => {
    let data = [...rawInventoryData];

    // 1. Filter by Search
    if (searchTerm) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Sort
    data.sort((a, b) => {
      if (sortConfig === 'stock_desc') return b.stock - a.stock;
      if (sortConfig === 'stock_asc') return a.stock - b.stock;
      if (sortConfig === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return data;
  }, [rawInventoryData, searchTerm, sortConfig]);

  const filteredInventoryData = useMemo(() => fullSortedInventory.slice(0, 7), [fullSortedInventory]);



  const summary = useMemo(() => {
    const totalSales = salesData.reduce((acc, curr) => acc + curr.total_sales, 0);
    const totalTxns = salesData.reduce((acc, curr) => acc + curr.transactions, 0);
    const avgOrder = totalTxns > 0 ? totalSales / totalTxns : 0;
    return { total: totalSales, transactions: totalTxns, average: avgOrder };
  }, [salesData]);

  // ... (Keep handleExport, CustomTooltip as is) ...
  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Report...');

    try {
      // Determine parameters based on selection
      let queryPeriod = exportOption;
      let queryDate = '';

      // Daily - use specificDate
      if (exportOption === 'day') {
        queryDate = specificDate;
      }

      // Weekly - validate days selected
      if (exportOption === 'week' && selectedDays.length === 0) {
        toast.error("Please select at least one day", { id: toastId });
        setExporting(false);
        return;
      }

      const queryParams = {
        period: queryPeriod,
        include_products: true,
        ...(exportOption === 'day' && { specific_date: queryDate }),
        ...(exportOption === 'week' && { selected_days: selectedDays.join(',') }),
        ...(exportOption === 'month' && { month: selectedMonth, year: selectedYear }),
        ...(exportOption === 'year' && { year: selectedYear }),
      };


      const response = await reportService.exportReport('sales', 'PDF', queryParams);

      if (!response || !response.data) {
        throw new Error('No response received from server');
      }

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = `Report_${queryDate || queryPeriod}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (filenameMatch) filename = filenameMatch[1];
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Download complete!', { id: toastId });
      setShowExportModal(false);

    } catch (error) {
      console.error('❌ EXPORT FAILED:', error);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };




  const handleExportInventory = () => {
    try {
      console.log('📦 Export Inventory - rawInventoryData:', rawInventoryData);
      console.log('📦 Export Inventory - fullSortedInventory:', fullSortedInventory);

      if (!fullSortedInventory || !fullSortedInventory.length) {
        toast.error("No inventory data to export. Check if products exist.");
        return;
      }

      const headers = ['Product Name', 'Stock Level'];
      const rows = fullSortedInventory.map(item => [
        `"${item.name || 'Unknown'}"`,
        Number(item.stock || 0)
      ]);

      console.log('📦 Export Inventory - CSV rows:', rows);

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      console.log('📦 Export Inventory - CSV content length:', csvContent.length);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_${sortConfig}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Inventory report downloaded");
    } catch (err) {
      console.error("Export Error:", err);
      toast.error("Failed to export inventory report");
    }
  };


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1A1A1D] p-3 sm:p-4 shadow-xl rounded-xl border border-gray-100 dark:border-[#8FBC8F]/20 min-w-[120px] sm:min-w-[150px]">
          <p className={`text-[10px] sm:text-xs font-bold ${THEME.primaryText} uppercase mb-1 sm:mb-2 tracking-wide`}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm mb-1 last:mb-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: entry.color || '#8FBC8F' }} />
                <span className="text-gray-600 dark:text-gray-400 font-medium">{entry.name}</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {entry.name !== 'Stock' && '₱'}
                {parseFloat(entry.value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <Loader2 className={`animate-spin w-10 h-10 mx-auto mt-20 ${THEME.primaryText}`} />;

  return (
    <div className={`min-h-screen ${THEME.pageBg} p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 relative">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between gap-4 sm:gap-6 items-center">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] bg-clip-text text-transparent flex items-center gap-2 sm:gap-3 justify-center md:justify-start">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-[#8FBC8F]" strokeWidth={2} /> Analytics
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-[#2F4F4F] dark:text-gray-300 font-medium mt-2">Overview of your sales performance and inventory</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className={`p-1 rounded-xl flex shadow-sm ${THEME.cardBase} w-full sm:w-auto overflow-x-auto`}>
              {periodOptions.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${period === p.value
                    ? `${THEME.gradientBg} text-white shadow-md`
                    : THEME.buttonGhost
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all w-full sm:w-auto ${THEME.buttonPrimary}`}
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* --- EXPORT MODAL (User-Friendly Redesign) --- */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Export Report</h3>
                      <p className="text-white/80 text-sm">Download sales data as PDF</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">

                {/* Step 1: Select Period */}
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#8FBC8F] text-white text-xs flex items-center justify-center">1</span>
                    Select Period
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'day', label: 'Day', icon: <Clock className="w-5 h-5" /> },
                      { id: 'week', label: 'Week', icon: <CalendarDays className="w-5 h-5" /> },
                      { id: 'month', label: 'Month', icon: <CalendarRange className="w-5 h-5" /> },
                      { id: 'year', label: 'Year', icon: <Calendar className="w-5 h-5" /> },
                      { id: 'all', label: 'All', icon: <BarChart2 className="w-5 h-5" /> },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setExportOption(opt.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${exportOption === opt.id
                          ? 'bg-[#8FBC8F] text-white shadow-lg shadow-[#8FBC8F]/30'
                          : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#3C3C3E]'
                          }`}
                      >
                        {opt.icon}
                        <span className="text-xs font-bold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Make Selection */}
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#8FBC8F] text-white text-xs flex items-center justify-center">2</span>
                    {exportOption === 'day' && 'Pick a Date'}
                    {exportOption === 'week' && 'Select Days'}
                    {exportOption === 'month' && 'Pick Month & Year'}
                    {exportOption === 'year' && 'Pick Year'}
                    {exportOption === 'all' && 'Ready to Export'}
                  </p>

                  {/* Daily - Date Picker */}
                  {exportOption === 'day' && (
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E] text-gray-800 dark:text-white focus:border-[#8FBC8F] focus:outline-none cursor-pointer"
                    />
                  )}

                  {/* Weekly - Day Selection */}
                  {exportOption === 'week' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button onClick={selectAllDays} className="px-4 py-2 text-sm font-bold text-[#8FBC8F] bg-[#8FBC8F]/10 rounded-lg hover:bg-[#8FBC8F]/20">Select All</button>
                        <button onClick={clearAllDays} className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-[#2C2C2E] rounded-lg hover:bg-gray-200">Clear</button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {weekDays.map((day) => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`p-3 rounded-xl text-sm font-bold transition-all ${selectedDays.includes(day)
                              ? 'bg-[#8FBC8F] text-white shadow-md'
                              : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                              }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      {selectedDays.length === 0 && (
                        <p className="text-sm text-orange-500 font-medium">⚠️ Please select at least one day</p>
                      )}
                    </div>
                  )}

                  {/* Monthly - Month & Year */}
                  {exportOption === 'month' && (
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E] text-gray-800 dark:text-white focus:border-[#8FBC8F] focus:outline-none cursor-pointer"
                      >
                        {months.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E] text-gray-800 dark:text-white focus:border-[#8FBC8F] focus:outline-none cursor-pointer"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Yearly - Year Selection */}
                  {exportOption === 'year' && (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E] text-gray-800 dark:text-white focus:border-[#8FBC8F] focus:outline-none cursor-pointer"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}

                  {/* All Time - Info */}
                  {exportOption === 'all' && (
                    <div className="p-4 rounded-xl bg-[#8FBC8F]/10 border-2 border-[#8FBC8F]/30">
                      <p className="text-[#8FBC8F] font-medium flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" />
                        Export all sales data from the beginning
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={exporting || (exportOption === 'week' && selectedDays.length === 0)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8FBC8F] to-[#2E8B57] text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {exporting ? (
                    <><Loader2 className="animate-spin w-5 h-5" /> Generating...</>
                  ) : (
                    <><Download className="w-5 h-5" /> Download PDF</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- CHARTS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Sales Performance Chart */}
          <div className={`lg:col-span-2 p-4 sm:p-5 md:p-7 rounded-2xl sm:rounded-3xl flex flex-col h-[500px] sm:h-[550px] md:h-[600px] ${THEME.cardBase}`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
              <div>
                <h3 className={`text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 ${THEME.headingText}`}>
                  <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FBC8F]" /> Sales Performance
                </h3>
                <p className={`text-xs sm:text-sm ${THEME.subText}`}>Actual Revenue Trends</p>
              </div>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#8FBC8F]/5 to-[#A8D4A8]/10 border border-[#8FBC8F]/20">
                <div className="flex items-center gap-1 sm:gap-2 text-[#8FBC8F] mb-0.5 sm:mb-1">
                  <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Sales</span>
                </div>
                <p className={`text-base sm:text-xl md:text-2xl font-extrabold ${THEME.headingText}`}>₱{summary.total.toLocaleString()}</p>
              </div>

              <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-1 sm:gap-2 text-blue-500 dark:text-blue-400 mb-0.5 sm:mb-1">
                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider">Transactions</span>
                </div>
                <p className={`text-base sm:text-xl md:text-2xl font-extrabold ${THEME.headingText}`}>{summary.transactions}</p>
              </div>

              <div className="p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-800/10 border border-emerald-100 dark:border-emerald-800/30">
                <div className="flex items-center gap-1 sm:gap-2 text-emerald-500 dark:text-emerald-400 mb-0.5 sm:mb-1">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider">Avg. Order</span>
                </div>
                <p className={`text-base sm:text-xl md:text-2xl font-extrabold ${THEME.headingText}`}>₱{summary.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* The Chart */}
            <div className="flex-1 min-h-0 w-full">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.barStart} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.barEnd} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} strokeOpacity={0.5} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fill: chartColors.text, fontSize: 9, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: chartColors.text, fontSize: 9, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? `₱${(val / 1000).toFixed(0)}k` : `₱${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="total_sales" name="Sales" fill="url(#colorSales)" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center opacity-50">
                    <DollarSign className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3" />
                    <p className="font-medium text-xs sm:text-sm">No sales data found for this period</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Products Chart (NOW FILTERABLE) */}
          <div className={`lg:col-span-1 p-4 sm:p-5 md:p-7 rounded-2xl sm:rounded-3xl flex flex-col h-[500px] sm:h-[550px] md:h-[600px] ${THEME.cardBase}`}>
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 ${THEME.headingText}`}>
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FBC8F]" /> Inventory
                  </h3>
                  <p className={`text-xs sm:text-sm ${THEME.subText}`}>
                    {sortConfig === 'stock_desc' ? 'Top Stocked Products' :
                      sortConfig === 'stock_asc' ? 'Lowest Stocked Products' : 'Products A-Z'}
                  </p>
                </div>
                <button
                  onClick={handleExportInventory}
                  className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${THEME.headingText}`}
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
              {filteredInventoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={filteredInventoryData} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} strokeOpacity={0.5} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={70}
                      tick={{ fill: chartColors.text, fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="stock" name="Stock" radius={[0, 6, 6, 0]} barSize={24}>
                      {filteredInventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8FBC8F' : '#A8D4A8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center opacity-50">
                    <Package className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3" />
                    <p className="font-medium text-xs sm:text-sm">No Products Found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
