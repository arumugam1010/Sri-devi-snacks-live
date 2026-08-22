import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Package,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  X,
  Warehouse,
  MapPin,
  Users,
  Printer,
  Fuel
} from 'lucide-react';
import Logo from '../assets/Logo.png';
import { useAppContext } from '../context/AppContext';
import { fuelExpensesAPI } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { userRole } = useAppContext();

  // Fuel modal states
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelType, setFuelType] = useState('CNG+PETROL');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelSubmitting, setFuelSubmitting] = useState(false);
  const [fuelError, setFuelError] = useState('');
  const [fuelSuccess, setFuelSuccess] = useState(false);

  const allNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Shops', href: '/shops', icon: Store },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Stock', href: '/stock', icon: Warehouse },
    { name: 'Billing', href: '/billing', icon: Receipt },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Petrol/CNG', onClick: () => setIsFuelModalOpen(true), icon: Fuel },
    { name: 'VTS GPS', href: '/gps-tracking', icon: MapPin },
  ];

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => {
    if (item.name === 'VTS GPS' || item.name === 'Employees' || item.name === 'Label Printer') {
      return userRole === 'SUPER_ADMIN';
    }
    if (userRole === 'STAFF') {
      return item.name !== 'Reports';
    }
    return true;
  });

  const isActive = (href?: string) => href ? location.pathname === href : false;

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelAmount || parseFloat(fuelAmount) <= 0) {
      setFuelError('Please enter a valid amount');
      return;
    }
    setFuelSubmitting(true);
    setFuelError('');
    setFuelSuccess(false);
    try {
      await fuelExpensesAPI.logFuelExpense({
        amount: parseFloat(fuelAmount),
        type: fuelType,
        date: fuelDate
      });
      setFuelSuccess(true);
      setFuelAmount('');
      setTimeout(() => {
        setIsFuelModalOpen(false);
        setFuelSuccess(false);
        // Reload dashboard stats if we are on the dashboard
        if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
          window.location.reload();
        }
      }, 1000);
    } catch (err: any) {
      setFuelError(err.message || 'Failed to save expense');
    } finally {
      setFuelSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <img src={Logo} alt="Sri Devi Snacks Logo" className="h-8 w-8 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Sri Devi Snacks</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const isBilling = item.name === 'Billing';
                const linkClass = `${isActive(item.href)
                    ? (isBilling ? 'bg-blue-200 text-blue-950' : 'bg-blue-100 text-blue-900')
                    : (isBilling ? 'text-gray-900 hover:bg-gray-100 hover:text-gray-955' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                  } group flex items-center px-2 py-2 rounded-md w-full text-left ${isBilling ? 'text-2xl font-bold' : 'text-base font-medium'
                  }`;

                if (item.onClick) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        item.onClick();
                        setSidebarOpen(false);
                      }}
                      className={linkClass}
                    >
                      <item.icon className="mr-4 h-6 w-6 text-gray-600 group-hover:text-gray-900" />
                      {item.name}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href || '#'}
                    className={linkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={`mr-4 ${isBilling ? 'h-8 w-8' : 'h-6 w-6'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <img src={Logo} alt="Sri Devi Snacks Logo" className="h-8 w-8 mr-2" />
              <span className="text-2xl font-bold text-gray-900">Sri Devi Snacks</span>
            </div>

            <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
              {navigation.map((item) => {
                const isBilling = item.name === 'Billing';
                const linkClass = `${isActive(item.href)
                    ? (isBilling ? 'bg-blue-200 text-blue-955' : 'bg-blue-100 text-blue-900')
                    : (isBilling ? 'text-gray-900 hover:bg-gray-100 hover:text-gray-955' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                  } group flex items-center px-2 py-2 rounded-md w-full text-left ${isBilling ? 'text-2xl font-bold' : 'text-sm font-medium'
                  }`;

                if (item.onClick) {
                  return (
                    <button
                      key={item.name}
                      onClick={item.onClick}
                      className={linkClass}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-gray-600 group-hover:text-gray-900" />
                      {item.name}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href || '#'}
                    className={linkClass}
                  >
                    <item.icon className={`mr-3 ${isBilling ? 'h-8 w-8' : 'h-5 w-5'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-8 w-8" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Fuel Expenses Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Fuel className="h-5 w-5" /> Petrol / CNG Entry
              </h3>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-white hover:text-blue-200">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFuelSubmit} className="p-6 space-y-4">
              {fuelError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm font-medium">
                  {fuelError}
                </div>
              )}
              {fuelSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm font-medium">
                  Saved successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 flex-wrap">
                  {[
                    { value: 'CNG', label: 'CNG Only' },
                    { value: 'PETROL', label: 'Petrol Only' },
                    { value: 'CNG+PETROL', label: 'CNG + Petrol' },
                    { value: 'MAKROON', label: 'Makroon' }
                  ].map((option) => (
                    <label key={option.value} className="inline-flex items-center cursor-pointer bg-gray-50 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
                      <input
                        type="radio"
                        name="fuelType"
                        value={option.value}
                        checked={fuelType === option.value}
                        onChange={(e) => setFuelType(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter amount (e.g. 500)"
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fuelSubmitting}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {fuelSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;