import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Flower, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

// --- THEME CONSTANTS ---
const THEME = {
    primary: "#FF69B4",
    gradientBg: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9]",
    gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
    pageBg: "bg-gradient-to-br from-white via-[#FFE4E1]/20 to-[#FF69B4]/10 dark:from-[#1A1A1D] dark:via-[#1A1A1D] dark:to-[#2C1A21]",
    cardBase: "bg-white/80 dark:bg-[#1e1e1e]/90 backdrop-blur-xl border-2 border-[#E5E5E5] dark:border-[#FF69B4]/20 shadow-2xl",
    inputBase: "bg-white dark:bg-[#1A1A1D] border-2 border-[#E5E5E5] dark:border-[#FF69B4]/30 focus:border-[#FF69B4] dark:focus:border-[#FF77A9] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200"
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      console.error('Login failed:', result.error); 
    }
    
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${THEME.pageBg} transition-colors duration-300`}>
      
      {/* Decorative background blobs (using theme colors) */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#FF69B4]/20 dark:bg-[#FF69B4]/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#FF77A9]/20 dark:bg-[#FF77A9]/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-200/30 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="max-w-md w-full relative z-10">
        
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 ${THEME.gradientBg} rounded-3xl mb-4 shadow-2xl shadow-[#FF69B4]/30 transform hover:scale-105 transition-transform duration-300`}>
            <Flower className="w-14 h-14 text-white" strokeWidth={1.5} />
          </div>
          <h1 className={`text-4xl font-extrabold mb-2 ${THEME.gradientText}`}>
            Flowerbelle POS
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Welcome back! Please login to your account.
          </p>
        </div>

        {/* Login Card */}
        <div className={`rounded-3xl p-8 ${THEME.cardBase}`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF69B4] transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl outline-none transition-all duration-200 focus:ring-4 focus:ring-[#FF69B4]/10 ${THEME.inputBase}`}
                  placeholder="Enter your username"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF69B4] transition-colors duration-200" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl outline-none transition-all duration-200 focus:ring-4 focus:ring-[#FF69B4]/10 ${THEME.inputBase}`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#FF69B4] transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 ${THEME.buttonPrimary}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[#FF69B4] dark:text-[#FF77A9] font-medium opacity-80">
          <p>© 2025 Flowerbelle Flower Shop. All rights reserved.</p>
        </div>
      </div>
      
      {/* Animation Styles */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;