import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import LoadingAnimation from './components/LoadingAnimation';

// Public Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const Games = lazy(() => import('./pages/Games'));
const Setups = lazy(() => import('./pages/Setups'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Contact = lazy(() => import('./pages/Contact'));
const Booking = lazy(() => import('./pages/Booking'));

// Admin Protection & Layout
import AdminRoute from './components/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';

// Admin Pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminSessions = lazy(() => import('./pages/admin/AdminSessions'));
const AdminTimer = lazy(() => import('./pages/admin/AdminTimer'));
const AdminSetups = lazy(() => import('./pages/admin/AdminSetups'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminFood = lazy(() => import('./pages/admin/AdminFood'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

// CSS
import './pages/admin/AdminSetups.css';

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <>
      {!isAdmin && <Navbar />}

      <Suspense fallback={<LoadingAnimation />}>
        <Routes>
          {/* ── Public Website Routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/games" element={<Games />} />
          <Route path="/setups" element={<Setups />} />
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
            <Route index element={<AdminRoute adminOnly><AdminDashboard /></AdminRoute>} />
            <Route path="dashboard" element={<AdminRoute adminOnly><AdminDashboard /></AdminRoute>} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="sessions" element={<AdminSessions />} />
            <Route path="timer" element={<AdminTimer />} />
            <Route path="food" element={<AdminFood />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="setups" element={<AdminSetups />} />
            <Route path="staff" element={<AdminStaff />} />
          </Route>

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
