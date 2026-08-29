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
import { AppProvider } from './context/AppContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import DayScheduleDetails from './components/DayScheduleDetails';
import VtsGps from './components/VtsGps';
import Employees from './components/Employees';
import BarcodeGenerator from './components/BarcodeGenerator';
import BakeryLayout from './components/bakery_billing/BakeryLayout';



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

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      } else {
        setIsAuthenticated(false);
      }
    }

    checkAuthStatus();
  }, []);


  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, []);






  interface UserData {
    id: number;
    name: string;
    email: string;
    role: string;
  }

  const handleLogin = (userData: UserData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    clearTimeout(logoutTimer.current as ReturnType<typeof setTimeout>);
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // Redirect to login page on logout
    window.location.href = getBasename() + '/';
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
            <Route path="/" element={<Navigate to="/dashboard" />} />
          )}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
          />
          <Route element={isAuthenticated ? <Outlet /> : <Navigate to="/" />}>
            <Route
              path="/dashboard"
              element={
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
