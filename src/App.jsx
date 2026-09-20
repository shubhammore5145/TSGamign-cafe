import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

// Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';

// Public Pages (display only)
import Home from './pages/Home';
import Setups from './pages/Setups';
import Games from './pages/Games';
import Tournaments from './pages/Tournaments';
import Membership from './pages/Membership';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSessions from './pages/admin/AdminSessions';
import AdminTimer from './pages/admin/AdminTimer';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSetups from './pages/admin/AdminSetups';
import AdminTournaments from './pages/admin/AdminTournaments';
import AdminUsers from './pages/admin/AdminUsers';

// CSS
import './pages/admin/AdminSetups.css';

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </Router>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Public navbar — only on non-admin pages */}
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* ── Public display pages ── */}
        <Route path="/" element={<Home />} />
        <Route path="/setups" element={<Setups />} />
        <Route path="/games" element={<Games />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />

        {/* ── Admin routes ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="timer" element={<AdminTimer />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="setups" element={<AdminSetups />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Footer only on public pages */}
      {!isAdminRoute && <Footer />}
    </>
  );
}

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--space-xl)',
    }}>
      <div style={{ fontSize: '6rem', marginBottom: 'var(--space-lg)', animation: 'float 3s ease-in-out infinite' }}>🎮</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
        404 — Game Over
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
        This page doesn't exist. Head back to the arena.
      </p>
      <a href="/" className="btn btn-primary btn-lg">🏠 Return to Home</a>
    </div>
  );
}
