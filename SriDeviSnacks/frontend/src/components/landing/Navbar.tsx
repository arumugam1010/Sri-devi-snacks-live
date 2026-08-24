import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
const Logo = '/Logo.png';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Our Story', path: '/about' },
    { name: 'Shop', path: '/our-products' },
    { name: 'Services', path: '/services' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-[#faf2e7]/90 backdrop-blur-md shadow-sm py-2' : 'bg-[#faf2e7] py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img src={Logo} alt="Sri Devi Snacks" className="h-12 w-12 object-contain transition-transform duration-500 group-hover:scale-105 mix-blend-multiply" />
            <span className="text-2xl font-bold text-[#160f0f] tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              Sri Devi Snacks
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm tracking-widest uppercase transition-colors duration-300 font-medium ${location.pathname === link.path ? 'text-[#6e3c61]' : 'text-[#766c69] hover:text-[#160f0f]'}`}
              >
                {link.name}
              </Link>
            ))}
            
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center space-x-2 bg-[#6e3c61] text-white px-6 py-2.5 rounded-full hover:bg-[#5e3352] transition-colors duration-300 shadow-sm text-sm tracking-widest uppercase font-medium"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#160f0f] focus:outline-none p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#faf2e7] border-t border-[#e6ddcb] absolute w-full shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-4 text-center text-sm tracking-widest uppercase border-b border-[#e6ddcb]/50 ${location.pathname === link.path ? 'text-[#6e3c61] font-bold' : 'text-[#766c69]'}`}
              >
                {link.name}
              </Link>
            ))}
            <button 
              onClick={() => {
                navigate('/login');
                setIsMobileMenuOpen(false);
              }}
              className="w-full mt-4 bg-[#6e3c61] text-white px-3 py-4 rounded-xl font-medium tracking-widest uppercase text-sm"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
