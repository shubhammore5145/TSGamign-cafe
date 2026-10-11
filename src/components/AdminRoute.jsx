import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/adminAuth';

export default function AdminRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

