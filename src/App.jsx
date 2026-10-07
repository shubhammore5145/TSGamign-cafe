import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

// Admin Protection & Layout
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';

// Admin Core Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSessions from './pages/admin/AdminSessions';
import AdminTimer from './pages/admin/AdminTimer';
import AdminSetups from './pages/admin/AdminSetups';
import AdminDashboard from './pages/admin/AdminDashboard';

// CSS
import './pages/admin/AdminSetups.css';

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          {/* ── Admin Login ── */}
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* ── Admin Management Portal (Protected) ── */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            {/* Primary Landing: Bookings Management & Add Booking */}
            <Route index element={<AdminBookings />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="sessions" element={<AdminSessions />} />
            <Route path="timer" element={<AdminTimer />} />
            <Route path="setups" element={<AdminSetups />} />
            <Route path="dashboard" element={<AdminDashboard />} />

            {/* Backwards-compatible /admin alias routes */}
            <Route path="admin" element={<Navigate to="/" replace />} />
            <Route path="admin/bookings" element={<Navigate to="/bookings" replace />} />
            <Route path="admin/sessions" element={<Navigate to="/sessions" replace />} />
            <Route path="admin/timer" element={<Navigate to="/timer" replace />} />
            <Route path="admin/setups" element={<Navigate to="/setups" replace />} />
            <Route path="admin/dashboard" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Catch-all: Redirect to Admin Portal */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </Router>
  );
}
