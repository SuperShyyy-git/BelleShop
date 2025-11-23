import React, { useState, useEffect, useCallback, useMemo } from 'react';
import reportService from '../services/reportService'; 
import inventoryService from '../services/inventoryService'; 
import { useTheme } from '../contexts/ThemeContext'; 
import { DollarSign, Download, Package, Loader2, TrendingUp, CreditCard, Activity, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
    
    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
    buttonGhost: "hover:bg-[#FF69B4]/10 text-gray-600 dark:text-gray-300 hover:text-[#FF69B4] dark:hover:text-[#FF77A9] transition-colors"
};

// --- HELPER: Format date for display on X-axis ---
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ReportsPage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('month');
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);

  const chartColors = {
    grid: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#9ca3af' : '#6b7280',
    barStart: '#FF69B4', // Pink
    barEnd: '#FF77A9',   // Light Pink
  };

  const periodOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const salesResponse = await reportService.getSalesAnalytics({ period });
      const inventoryResponse = await inventoryService.getProducts({ limit: 100 }); 

      const salesApiData = salesResponse.data || salesResponse;
      const rawTrendData = salesApiData.daily_trend || [];
      
      const processedSalesData = rawTrendData
        .map(item => ({
          date: item.day,
          displayDate: formatDateForDisplay(item.day),
          total_sales: parseFloat(item.total || 0),
          transactions: item.count || 0
        }))
        .filter(item => item.total_sales > 0);
      
      setSalesData(processedSalesData);

      const rawInvData = inventoryResponse.data?.results || inventoryResponse.data || [];
      if (Array.isArray(rawInvData)) {
        setInventoryData(rawInvData
          .map(item => ({
            name: item.name,
            stock: parseInt(item.current_stock || item.quantity || 0, 10),
          }))
          .filter(item => item.stock > 0)
          .sort((a, b) => b.stock - a.stock)
          .slice(0, 5)
        );
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

  const summary = useMemo(() => {
    const totalSales = salesData.reduce((acc, curr) => acc + curr.total_sales, 0);
    const totalTxns = salesData.reduce((acc, curr) => acc + curr.transactions, 0);
    const avgOrder = totalTxns > 0 ? totalSales / totalTxns : 0;
    return { total: totalSales, transactions: totalTxns, average: avgOrder };
  }, [salesData]);

  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating Report...');
    
    try {
      const response = await reportService.exportReport('sales', 'PDF', { period });
      
      if (!response || !response.data) {
        throw new Error('No response received from server');
      }

      // Create Blob and Download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/pdf' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Sales_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report downloaded!', { id: toastId });
      
    } catch (error) {
      console.error('❌ EXPORT FAILED:', error);
      let errorMsg = 'Export failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMsg = `Endpoint not found. Please contact support.`;
        } else if (error.response.status === 403) {
          errorMsg = 'Permission denied. Please check your access rights.';
        } else if (error.response.status === 500) {
          errorMsg = 'Server error. Please check Django console for details.';
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast.error(errorMsg, { id: toastId, duration: 5000 });
      
    } finally {
      setExporting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1A1A1D] p-4 shadow-xl rounded-xl border border-gray-100 dark:border-[#FF69B4]/20 min-w-[150px]">
          <p className={`text-xs font-bold ${THEME.primaryText} uppercase mb-2 tracking-wide`}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#FF69B4' }} />
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${THEME.pageBg}`}>
        <Loader2 className={`animate-spin w-10 h-10 ${THEME.primaryText}`}/>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${THEME.pageBg} p-4 sm:p-6 lg:p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
          <div className="text-center md:text-left">
            <h1 className={`text-4xl font-extrabold flex items-center gap-3 justify-center md:justify-start ${THEME.gradientText}`}>
              <TrendingUp className="w-8 h-8 text-[#FF69B4]" strokeWidth={2.5} /> Analytics Dashboard
            </h1>
            <p className={`text-lg ${THEME.subText} mt-1 ml-1`}>Overview of your sales performance and inventory</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className={`p-1 rounded-xl flex shadow-sm ${THEME.cardBase}`}>
              {periodOptions.map((p) => (
                <button 
                  key={p.value} 
                  onClick={() => setPeriod(p.value)} 
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    period === p.value 
                      ? `${THEME.gradientBg} text-white shadow-md` 
                      : THEME.buttonGhost
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all ${THEME.buttonPrimary}`}
            >
              {exporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sales Performance Chart */}
          <div className={`lg:col-span-2 p-7 rounded-3xl flex flex-col h-[600px] ${THEME.cardBase}`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${THEME.headingText}`}>
                    <BarChart2 className="w-5 h-5 text-[#FF69B4]" /> Sales Performance
                </h3>
                <p className={`text-sm ${THEME.subText}`}>Actual Revenue Trends</p>
              </div>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Total Sales */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FF69B4]/5 to-[#FF77A9]/10 border border-[#FF69B4]/20">
                <div className="flex items-center gap-2 text-[#FF69B4] mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
                </div>
                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>₱{summary.total.toLocaleString()}</p>
              </div>
              
              {/* Transactions */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 mb-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Transactions</span>
                </div>
                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>{summary.transactions}</p>
              </div>
              
              {/* Avg Order */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-800/10 border border-emerald-100 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Avg. Order</span>
                </div>
                <p className={`text-2xl font-extrabold ${THEME.headingText}`}>₱{summary.average.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              </div>
            </div>

            {/* The Chart */}
            <div className="flex-1 min-h-0 w-full">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.barStart} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartColors.barEnd} stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} strokeOpacity={0.5} />
                    <XAxis 
                        dataKey="displayDate" 
                        tick={{ fill: chartColors.text, fontSize: 11, fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        interval="preserveStartEnd" 
                        minTickGap={30} 
                        dy={10}
                    />
                    <YAxis 
                        tick={{ fill: chartColors.text, fontSize: 11, fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => val >= 1000 ? `₱${(val/1000).toFixed(0)}k` : `₱${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="total_sales" name="Sales" fill="url(#colorSales)" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center opacity-50">
                    <DollarSign className="w-16 h-16 mx-auto mb-3" />
                    <p className="font-medium">No sales data found for this period</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Products Chart */}
          <div className={`lg:col-span-1 p-7 rounded-3xl flex flex-col h-[600px] ${THEME.cardBase}`}>
            <div className="mb-6">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${THEME.headingText}`}>
                  <Package className="w-5 h-5 text-[#FF69B4]" /> Top Products
              </h3>
              <p className={`text-sm ${THEME.subText}`}>By volume quantity</p>
            </div>
            
            <div className="flex-1 min-h-0 w-full">
              {inventoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={inventoryData} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} strokeOpacity={0.5}/>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fill: chartColors.text, fontSize: 11, fontWeight: 600 }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="stock" name="Stock" radius={[0, 6, 6, 0]} barSize={32}>
                      {inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#FF69B4' : '#FF77A9'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center opacity-50">
                    <Package className="w-16 h-16 mx-auto mb-3" />
                    <p className="font-medium">No Products</p>
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