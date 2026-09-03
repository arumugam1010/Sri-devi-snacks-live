import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
const Logo = '/Logo.png';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf2e7] flex flex-col font-sans">
      {/* Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#8B0000] text-gray-200 pt-16 pb-8 border-t-4 border-[#FFD700]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            
            {/* Column 1: Company Info */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center space-x-3 mb-4 group">
                <div className="bg-white p-2 rounded-lg shadow-lg">
                  <img src={Logo} alt="Sri Devi Snacks Logo" className="h-12 w-12 object-contain" />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight group-hover:text-[#FFD700] transition-colors">Sri Devi Snacks</span>
              </Link>
              <p className="text-gray-300 leading-relaxed text-sm pr-4 font-light">
                Established in May 2020 by A. Santhanam, Sri Devi Snacks brings the authentic, traditional taste of Vallioor straight to your home. From a small local unit, we now proudly serve over 500+ shops across Chennai, Coimbatore, Hosur, and Mumbai, combining advanced machinery with timeless recipes.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-white/20 pb-2 inline-block">Explore</h3>
              <ul className="space-y-3">
                <li><Link to="/" className="hover:text-[#FFD700] transition-colors duration-200 font-medium">Home</Link></li>
                <li><Link to="/about" className="hover:text-[#FFD700] transition-colors duration-200 font-medium">Our Story</Link></li>
                <li><Link to="/our-products" className="hover:text-[#FFD700] transition-colors duration-200 font-medium">Snacks & Sweets</Link></li>
                <li><Link to="/services" className="hover:text-[#FFD700] transition-colors duration-200 font-medium">Services</Link></li>
                <li><Link to="/contact" className="hover:text-[#FFD700] transition-colors duration-200 font-medium">Contact Us</Link></li>
              </ul>
            </div>

            {/* Column 3: Contact Details */}
            <div>
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-white/20 pb-2 inline-block">Contact Us</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 text-[#FFD700] mr-3 mt-1 flex-shrink-0" />
                  <span className="text-sm font-light">
                    128c, Santhanamari Amman Kovil Street,<br />
                    Vallioor, Tirunelveli - 627117,<br />
                    Tamil Nadu
                  </span>
                </li>
                <li className="flex items-center">
                  <Phone className="h-5 w-5 text-[#FFD700] mr-3 flex-shrink-0" />
                  <span className="text-sm font-light">+91 88078 10021<br/>+91 99432 06339</span>
                </li>
                <li className="flex items-center">
                  <Mail className="h-5 w-5 text-[#FFD700] mr-3 flex-shrink-0" />
                  <span className="text-sm font-light">info@sridevisnacks.com</span>
                </li>
                <li className="flex items-start">
                  <Clock className="h-5 w-5 text-[#FFD700] mr-3 mt-1 flex-shrink-0" />
                  <span className="text-sm font-light">
                    <strong className="font-semibold">Working Hours:</strong><br />
                    Monday - Sunday<br />
                    9:00 AM - 9:00 PM
                  </span>
                </li>
              </ul>
            </div>

          </div>
          
          <div className="border-t border-white/20 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 font-light">
            <p>&copy; {new Date().getFullYear()} Sri Devi Snacks. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#FFD700] transition-colors duration-200">Privacy Policy</a>
              <a href="#" className="hover:text-[#FFD700] transition-colors duration-200">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
