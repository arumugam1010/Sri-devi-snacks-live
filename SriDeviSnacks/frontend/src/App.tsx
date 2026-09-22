import React, { useState, useEffect, useRef } from 'react'; // Import necessary modules
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/Login';
import PublicLayout from './components/landing/PublicLayout';
import HeroSection from './components/landing/HeroSection';
import AboutSection from './components/landing/AboutSection';
import ProductsSection from './components/landing/ProductsSection';
import ProductDetail from './components/landing/ProductDetail';
import ServicesSection from './components/landing/ServicesSection';
import ContactSection from './components/landing/ContactSection';
import Dashboard from './components/Dashboard';
import Shops from './components/Shops';
import Products from './components/Products';
import Suppliers from './components/Suppliers';
import PurchaseBills from './components/PurchaseBills';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Layout from './components/Layout';
import Stock from './components/Stock';
import PendingBalances from './components/PendingBalances';
import GstBills from './components/GstBills';
import { AppProvider } from './context/AppContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import DayScheduleDetails from './components/DayScheduleDetails';
import VtsGps from './components/VtsGps';
import Employees from './components/Employees';
import EmployeeDetail from './components/EmployeeDetail';
import BarcodeGenerator from './components/BarcodeGenerator';
import BakeryLayout from './components/bakery_billing/BakeryLayout';
import AdminLandingSettings from './components/AdminLandingSettings';
import Expenses from './components/Expenses';
import { authAPI } from './services/api';

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  username?: string;
}

const getBasename = () => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    // Check if we are running locally in XAMPP deep folder
    if (path.includes('/godaddy_upload')) {
      return path.substring(0, path.indexOf('/godaddy_upload') + '/godaddy_upload'.length);
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/sridevisnacks';
    }
  }
  return '/';
};

function App() {
  const SESSION_TIMEOUT = 3600 * 1000; // 1 hour (in milliseconds)
  const END_OF_DAY_HOUR = 23; // 11 PM

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserData | null>(null);

  const isStaff2 = user?.username?.toLowerCase() === 'staff2' || user?.username?.toLowerCase() === 'stafff2';

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = () => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
    }
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // Redirect to login page on logout
    window.location.href = getBasename() + '/';
  };

  // Listen to remote revocation event from api.ts (401 response)
  useEffect(() => {
    const handleAuthRevoked = () => {
      console.warn('Session has been revoked or expired. Logging out.');
      handleLogout();
    };

    window.addEventListener('auth:revoked', handleAuthRevoked);
    return () => {
      window.removeEventListener('auth:revoked', handleAuthRevoked);
    };
  }, []);

  // Heartbeat check specifically for staff2: poll every 30s to detect Super Admin remote revoke
  useEffect(() => {
    if (!isAuthenticated || !isStaff2) return;

    const checkSessionActive = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          handleLogout();
          return;
        }
        const res = await authAPI.verify();
        if (!res || !res.success) {
          handleLogout();
        }
      } catch (err) {
        // If 401 or revoked, auth:revoked event or here triggers logout
        console.warn('Session verification failed:', err);
      }
    };

    const heartbeatInterval = setInterval(checkSessionActive, 30000); // 30 seconds
    return () => clearInterval(heartbeatInterval);
  }, [isAuthenticated, isStaff2]);

  // Idle timeout & 11 PM timer: ONLY run if NOT staff2!
  useEffect(() => {
    // Staff2 must NEVER be logged out due to inactivity or end of day!
    if (isStaff2) {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
      return;
    }

    const resetTimer = () => {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
      logoutTimer.current = setTimeout(handleLogout, SESSION_TIMEOUT);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    const checkEndOfDay = () => {
      const now = new Date();
      if (now.getHours() >= END_OF_DAY_HOUR) {
        handleLogout();
      }
    };

    const endOfDayInterval = setInterval(checkEndOfDay, 60 * 60 * 1000); // Check every hour

    if (isAuthenticated) {
      resetTimer();
    }

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(endOfDayInterval);
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
    };
  }, [isAuthenticated, isStaff2]);

  const handleLogin = (userData: UserData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  if (isAuthenticated === null) {
    return (
      <Router basename={getBasename()}>
        <div>Loading...</div>
      </Router>
    ); // Or a loading spinner
  }

  return (
    <Router basename={getBasename()}>
      <AppProvider user={user}>
        <Routes>
          {/* Public Routes */}
          {!isAuthenticated ? (
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HeroSection />} />
              <Route path="/about" element={<AboutSection />} />
              <Route path="/our-products" element={<ProductsSection />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/services" element={<ServicesSection />} />
              <Route path="/contact" element={<ContactSection />} />
            </Route>
          ) : (
            <Route path="/" element={<Navigate to={(user?.username?.toLowerCase() === 'staff2' || user?.username?.toLowerCase() === 'stafff2') ? "/bakery-billing" : "/dashboard"} />} />
          )}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to={(user?.username?.toLowerCase() === 'staff2' || user?.username?.toLowerCase() === 'stafff2') ? "/bakery-billing" : "/dashboard"} />}
          />
          <Route element={isAuthenticated ? <Outlet /> : <Navigate to="/" />}>
            <Route
              path="/dashboard"
              element={
                (user?.username?.toLowerCase() === 'staff2' || user?.username?.toLowerCase() === 'stafff2') ? 
                <Navigate to="/bakery-billing" /> :
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/shops"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Shops />
                </Layout>
              }
            />
            <Route
              path="/products"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Products />
                </Layout>
              }
            />
            <Route
              path="/suppliers"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Suppliers />
                </Layout>
              }
            />
            <Route
              path="/purchase-bills"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <PurchaseBills />
                </Layout>
              }
            />
            <Route
              path="/billing"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Billing />
                </Layout>
              }
            />
            <Route
              path="/bakery-billing"
              element={
                <BakeryLayout user={user} onLogout={handleLogout} />
              }
            />
            <Route
              path="/stock"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Stock />
                </Layout>
              }
            />
            <Route
              path="/reports"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Reports />
                </Layout>
              }
            />
            <Route
              path="/pending-balances"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <PendingBalances />
                </Layout>
              }
            />
            <Route
              path="/gst-bills"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <GstBills />
                </Layout>
              }
            />
            <Route
              path="/gps-tracking"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <VtsGps />
                </Layout>
              }
            />
            <Route
              path="/employees"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Employees />
                </Layout>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <EmployeeDetail />
                </Layout>
              }
            />
            <Route
              path="/expenses"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <Expenses />
                </Layout>
              }
            />
            <Route
              path="/label-printer"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <BarcodeGenerator />
                </Layout>
              }
            />
            <Route
              path="/day-schedule/:day"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <DayScheduleDetails />
                </Layout>
              }
            />
            <Route
              path="/admin/landing-settings"
              element={
                <Layout user={user} onLogout={handleLogout}>
                  <AdminLandingSettings />
                </Layout>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />} />
        </Routes>
        <Analytics />
        <SpeedInsights />
      </AppProvider>
    </Router>
  );
}

export default App;
