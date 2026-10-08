import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

// Public Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Games from './pages/Games';
import Setups from './pages/Setups';
import Tournaments from './pages/Tournaments';
import Membership from './pages/Membership';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';

// Admin Protection & Layout
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSessions from './pages/admin/AdminSessions';
import AdminTimer from './pages/admin/AdminTimer';
import AdminSetups from './pages/admin/AdminSetups';
import AdminDashboard from './pages/admin/AdminDashboard';

// CSS
import './pages/admin/AdminSetups.css';

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <>
      {!isAdmin && <Navbar />}

      <Routes>
        {/* ── Public Website Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/setups" element={<Setups />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />

        {/* ── Admin Login ── */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ── Admin Portal (Protected) ── */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminBookings />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="timer" element={<AdminTimer />} />
          <Route path="setups" element={<AdminSetups />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}
