import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; 
import {
  LayoutDashboard, ShoppingCart, Package, FileText,
  TrendingUp, Menu, X, User, Flower, LogOut, Sun, Moon
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth(); 
  const { isDarkMode, toggleDarkMode } = useTheme(); // ✅ FIXED: Changed from toggleTheme to toggleDarkMode
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['OWNER', 'STAFF'] },
    { path: '/reports', icon: FileText, label: 'Reports', roles: ['OWNER'] },
    { path: '/pos', icon: ShoppingCart, label: 'Point of Sale', roles: ['OWNER', 'STAFF'] },
    { path: '/inventory', icon: Package, label: 'Inventory', roles: ['OWNER', 'STAFF'] },
    { path: '/user-management', icon: User, label: 'User Management', roles: ['OWNER'] }, 
    { path: '/forecasting', icon: TrendingUp, label: 'Forecasting', roles: ['OWNER'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111] transition-colors duration-200">
      
      {/* MOBILE TOGGLE BUTTON */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md text-gray-900 dark:text-white"
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
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-64 bg-white dark:bg-[#1e1e1e] border-r border-gray-200 dark:border-gray-800`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Flower className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Flowerbelle</span>
          </div>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e]">
          <div className="flex items-center justify-between text-gray-900 dark:text-white">
            <Link to="/profile" className="flex items-center space-x-3 group">
               <div className="w-8 h-8 bg-primary-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                 <User className="w-4 h-4 text-primary-700 dark:text-primary-400" />
               </div>
               <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.full_name?.split(' ')[0]}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</span>
               </div>
            </Link>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="transition-all duration-300 lg:ml-64">
        <header className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-6 transition-colors duration-200">
          <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white ml-10 lg:ml-0">
                {filteredMenuItems.find(item => isActive(item.path))?.label || 'Flowerbelle POS'}
              </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}  // ✅ FIXED: Changed from toggleTheme to toggleDarkMode
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

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;