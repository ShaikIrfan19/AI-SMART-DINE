import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import WaiterView from './pages/waiter/WaiterView';
import CustomerView from './pages/customer/CustomerView';
import Profile from './pages/Profile';

function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const roleRoutes = {
    restaurant_admin: '/admin',
    waiter: '/waiter',
    customer: '/customer',
  };
  return <Navigate to={roleRoutes[user?.role] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['restaurant_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/waiter/*"
        element={
          <ProtectedRoute allowedRoles={['waiter']}>
            <WaiterView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/*"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
