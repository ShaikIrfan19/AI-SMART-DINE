import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

const roleDefaultPath = {
  restaurant_admin: '/admin',
  waiter: '/waiter',
  customer: '/customer',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner fullPage />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const defaultPath = roleDefaultPath[user?.role] || '/login';
    return <Navigate to={defaultPath} replace />;
  }

  return children;
}
