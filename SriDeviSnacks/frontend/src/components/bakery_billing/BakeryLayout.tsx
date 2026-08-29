import React, { useState } from 'react';
import { Package, Receipt, FileText, LayoutDashboard, ArrowLeft, Menu, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import BakeryProducts from './BakeryProducts';
import BakeryBilling from './BakeryBilling';
import BakeryBillsList from './BakeryBillsList';
import BakeryDashboard from './BakeryDashboard';
const Logo = '/Logo.png';

interface BakeryLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function BakeryLayout({ user, onLogout }: BakeryLayoutProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'billing' | 'products' | 'bills'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', name: 'Bakery Products', icon: Package },
    { id: 'bills', name: 'Bakery Bills', icon: FileText },
    { id: 'billing', name: 'Bakery Billing', icon: Receipt },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'billing': return <BakeryBilling />;
      case 'products': return <BakeryProducts />;
      case 'bills': return <BakeryBillsList />;
      case 'dashboard': return <BakeryDashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white border-r border-gray-200 z-50">
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-5">
                <img src={Logo} alt="Logo" className="h-8 w-8 mr-2" />
                <span className="text-xl font-bold text-gray-900">Bakery Admin</span>
              </div>
              <nav className="px-2 space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`${activeTab === item.id ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                ))}
                
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
                  >
                    <ArrowLeft className="mr-3 h-5 w-5" />
                    Back to snacks
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col min-h-0 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <img src={Logo} alt="Logo" className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold text-gray-900">Bakery Admin</span>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${activeTab === item.id ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </button>
            ))}
            
            <div className="pt-4 mt-4 border-t border-gray-200">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
              >
                <ArrowLeft className="mr-3 h-5 w-5" />
                Back to snacks
              </Link>
            </div>
          </nav>
        </div>
      </div>

      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200">
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4 sm:gap-0">
              <div className="flex items-center">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navigation.find(item => item.id === activeTab)?.name || 'Dashboard'}
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
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
