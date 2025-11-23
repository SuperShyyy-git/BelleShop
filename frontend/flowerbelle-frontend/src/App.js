import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/common/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import ForecastingPage from './pages/ForecastingPage';
import UserManagementPage from './pages/UserManagementPage';
import ProfilePage from './pages/ProfilePage.jsx'; 

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, 
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <ThemeProvider>
                        <Toaster 
                            position="top-right"
                            toastOptions={{
                                duration: 3000,
                                style: {
                                    background: '#363636',
                                    color: '#fff',
                                },
                            }}
                        />
                        
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <DashboardPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/pos"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <POSPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/inventory"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <InventoryPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/reports"
                                element={
                                    <ProtectedRoute requireOwner={true}>
                                        <Layout>
                                            <ReportsPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/forecasting"
                                element={
                                    <ProtectedRoute requireOwner={true}>
                                        <Layout>
                                            <ForecastingPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/user-management"
                                element={
                                    <ProtectedRoute requireOwner={true}>
                                        <Layout>
                                            <UserManagementPage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute> 
                                        <Layout>
                                            <ProfilePage />
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </ThemeProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;