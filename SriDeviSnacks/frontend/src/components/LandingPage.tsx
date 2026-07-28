import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CreditCard, BarChart3 } from 'lucide-react';
import Logo from '../assets/Logo.png';
import SnacksBg from '../assets/snacks.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <img src={SnacksBg} alt="Landing Background" className="absolute inset-0 w-full h-full object-cover z-0 " />
      {/* Animated Snacks Background */}
   

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <div className="max-w-4xl w-full text-center">
            <div className="mb-8">
            <div className="relative inline-block">
              <img
                src={Logo}
                alt="Sri Devi Snacks Logo"
                className="h-60 w-60 mx-auto mb-6 drop-shadow-lg"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 drop-shadow-md">
              Sri Devi Snacks
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-6 drop-shadow-sm">
              Delicious Snacks for Every Craving
            </p>
            <p className="text-lg text-gray-600 mb-8 drop-shadow-sm">
              Manage your snack shop effortlessly with our comprehensive management system.
              Track inventory, handle billing, and delight your customers with fresh, tasty treats.
            </p>
          </div>

          <div className="space-y-4 mb-12">
            <button
              onClick={handleGetStarted}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Login
            </button>

        
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 bg-orange-50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 bg-white animate-fade-in-up" style={{ animationDelay: '0s' }}>
              <div className="mx-auto mb-4">
                <Package className="h-12 w-12 text-orange-600 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Inventory Management</h3>
              <p className="text-gray-600">Keep track of your stock levels and never run out of popular snacks.</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 bg-white animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="mx-auto mb-4">
                <CreditCard className="h-12 w-12 text-orange-600 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Billing</h3>
              <p className="text-gray-600">Streamline your checkout process with our intuitive billing system.</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 bg-white animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="mx-auto mb-4">
                <BarChart3 className="h-12 w-12 text-orange-600 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Reports</h3>
              <p className="text-gray-600">Gain insights into your business with comprehensive sales and performance reports.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white text-center relative z-10">
        <p>&copy; 2025 Sri Devi Snacks. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
 
