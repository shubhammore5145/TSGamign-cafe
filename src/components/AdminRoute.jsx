import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn, isAuthenticated } from '../utils/adminAuth';

export default function AdminRoute({ children, adminOnly = false }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && !isAdminLoggedIn()) {
    return <Navigate to="/admin/bookings" replace />;
  }
  return children;
}
