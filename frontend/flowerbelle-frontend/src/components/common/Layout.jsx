import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api'; // Import API helper
// 1. Import Notification Components
import { Toaster, toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  LayoutDashboard, ShoppingCart, Package, FileText,
  TrendingUp, Menu, X, User, Flower, LogOut, Sun, Moon,
  Bell, AlertTriangle, Check, Activity
} from 'lucide-react';

// --- THEME CONSTANTS (Based on Belle Studio Logo Colors - Matching LoginPage) ---
const THEME = {
  // Logo colors: Sage Green (#8FBC8F), Blush Pink (#F5E6E0), Cream (#FFF8F0)
  primary: "#8FBC8F",
  gradientBg: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]",
  gradientText: "bg-gradient-to-r from-[#6B8E6B] to-[#8FBC8F] bg-clip-text text-transparent",
  pageBg: "bg-gradient-to-br from-[#FFF8F0] via-[#F5E6E0] to-[#E8D5C4] dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#1E2420]",
  cardBase: "bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 shadow-2xl",
  buttonPrimary: "bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] text-white shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 hover:-translate-y-0.5 transition-all duration-200"
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 2. Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  // 3. Helper to fetch notifications
  const fetchNotifications = async () => {
    try {
      if (user) {
        const response = await api.get('/inventory/notifications/recent/');
        setNotifications(response.data);
        setUnreadCount(response.data.length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  // 4. Initial Fetch & Polling
  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds to keep it fresh
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 5. NEW FUNCTION: Mark notification as read (Acknowledge)
  const markAsRead = async (id, e) => {
    e.stopPropagation(); // Prevent dropdown from closing or navigation
    e.preventDefault();

    try {
      await api.post(`/inventory/alerts/${id}/acknowledge/`);
      toast.success("Notification cleared");

      // Update UI immediately without waiting for re-fetch
      const updatedList = notifications.filter(n => n.id !== id);
      setNotifications(updatedList);
      setUnreadCount(updatedList.length);

    } catch (error) {
      toast.error("Failed to mark as read");
      console.error(error);
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['OWNER', 'STAFF'] },
    { path: '/pos', icon: ShoppingCart, label: 'Point of Sale', roles: ['OWNER', 'STAFF'] },
    { path: '/inventory', icon: Package, label: 'Inventory', roles: ['OWNER', 'STAFF'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['OWNER'] },
    { path: '/activity-log', icon: Activity, label: 'Activity Log', roles: ['OWNER'] },
    { path: '/user-management', icon: User, label: 'User Management', roles: ['OWNER'] },
    { path: '/forecasting', icon: TrendingUp, label: 'Forecasting', roles: ['OWNER'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));
  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen ${THEME.pageBg} transition-colors duration-200`}>

      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          className: 'dark:bg-[#1e1e1e] dark:text-white dark:border dark:border-gray-700',
        }}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#D4C4B0] dark:border-[#8FBC8F]/30 overflow-hidden shadow-2xl">
            {/* Gradient Header */}
            <div className="p-6 text-white bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Leaving So Soon?</h3>
                  <p className="text-sm text-white/90">Are you sure you want to leave?</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                You will be logged out of your account and redirected to the login page. We'll miss you! 🌸
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-[#8FBC8F] dark:border-[#8FBC8F]/50 text-[#8FBC8F] dark:text-[#A8D4A8] hover:bg-[#8FBC8F]/5 dark:hover:bg-[#8FBC8F]/10 rounded-xl font-bold transition-all duration-200"
                >
                  Stay
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-[#8FBC8F] to-[#A8D4A8] shadow-lg shadow-[#8FBC8F]/30 hover:shadow-[#8FBC8F]/50 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE TOGGLE BUTTON */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-[#FFF8F0] dark:bg-[#1e1e1e] rounded-lg shadow-md text-gray-900 dark:text-white border border-[#D4C4B0] dark:border-gray-700"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* OVERLAY FOR MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-64 bg-gradient-to-b from-[#FFF8F0] to-[#F5E6E0] dark:from-[#1e1e1e] dark:to-[#1A1A1D] border-r border-[#D4C4B0] dark:border-gray-800`}>
        {/* Logo Section */}
        <div className="p-4 border-b border-[#D4C4B0] dark:border-gray-800 bg-[#FFF8F0]/80 dark:bg-[#1e1e1e]/80">
          <div className="flex flex-col items-center">
            <img
              src="/logo.jpg"
              alt="Belle Studio Flower Shop"
              className="w-40 h-40 object-contain rounded-xl shadow-lg ring-2 ring-[#8FBC8F]/30"
            />
          </div>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-12rem)]">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                  ? 'bg-gradient-to-r from-[#8FBC8F]/20 to-[#8FBC8F]/10 text-[#6B8E6B] dark:text-[#8FBC8F] border-l-4 border-[#8FBC8F] shadow-sm'
                  : 'text-[#2F4F4F] hover:bg-[#F5E6E0]/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#8FBC8F]' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#D4C4B0] dark:border-gray-800 bg-[#FFF8F0]/80 dark:bg-[#1e1e1e]/80">
          <div className="flex items-center justify-between text-[#2F4F4F] dark:text-white">
            <Link to="/profile" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-[#8FBC8F]/20 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user?.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-[#6B8E6B] dark:text-[#8FBC8F]" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.full_name?.split(' ')[0]}</span>
                <span className="text-xs text-[#6B8E6B] dark:text-gray-400">{user?.role}</span>
              </div>
            </Link>
            <button onClick={confirmLogout} className="p-2 hover:bg-[#F5E6E0] dark:hover:bg-gray-800 rounded-full transition-colors">
              <LogOut className="w-5 h-5 text-[#6B8E6B] dark:text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="transition-all duration-300 lg:ml-64">
        <header className="bg-gradient-to-r from-[#FFF8F0] to-[#F5E6E0] dark:from-[#1A1A1D] dark:to-[#1e1e1e] border-b border-[#D4C4B0] dark:border-gray-800 h-16 flex items-center justify-between px-6 transition-colors duration-200 relative">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#2F4F4F] dark:text-white ml-10 lg:ml-0">
              {filteredMenuItems.find(item => isActive(item.path))?.label || 'Belle Studio POS'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">

            {/* NOTIFICATION BELL & DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#1e1e1e]"></span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                      <span className="text-xs text-gray-500">{unreadCount} Pending</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 flex justify-between items-start group"
                          >
                            <Link
                              to={`/inventory?search=${encodeURIComponent(alert.product_name)}`}
                              onClick={() => setShowNotifications(false)}
                              className="flex gap-2 flex-1"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.product_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Current: {alert.current_stock} / Min: {alert.reorder_level}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </Link>

                            {/* MARK AS READ BUTTON */}
                            <button
                              onClick={(e) => markAsRead(alert.id, e)}
                              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600 transition-colors"
                              title="Mark as Resolved"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-sm text-gray-500">
                          No new notifications
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-gray-200 dark:border-gray-800 text-center">
                      <Link
                        to="/inventory"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500"
                      >
                        View Inventory
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div className={`p-6 min-h-[calc(100vh-4rem)] ${THEME.pageBg}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
