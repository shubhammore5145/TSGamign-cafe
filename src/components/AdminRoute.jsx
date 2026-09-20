import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn } from '../pages/admin/AdminLogin';

export default function AdminRoute({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
