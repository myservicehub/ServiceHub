import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './auth/AuthModal';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isHomeowner, isTradesperson, logout } = useAuth();

  const authDefaultTab = 'tradesperson';
  const authShowOnlyTradesperson = true;

  const getDashboardPath = () => {
    if (isHomeowner()) return '/dashboard';
    if (isTradesperson()) return '/browse-jobs';
    return '/';
  };

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };
  // Allow other components/pages to trigger the auth modal via a global event
  useEffect(() => {
    const handler = (e) => {
      const mode = e?.detail?.mode || 'login';
      setAuthMode(mode);
      setAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handler);
    return () => window.removeEventListener('open-auth-modal', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div onClick={() => navigate('/')} className="cursor-pointer">
            <Logo size="medium" variant="light" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              onClick={() => navigate('/about')}
              className="text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer"
            >
              About us
            </a>
            <a 
              onClick={() => navigate('/how-it-works')}
              className="text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer"
            >
              How it works
            </a>
            <a onClick={() => navigate("/trade-categories")} className="text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer">Find trades</a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated() ? (
              <Button 
                onClick={() => navigate(getDashboardPath())}
                className="font-lato text-white hover:opacity-90" 
                style={{backgroundColor: '#34D164'}}
              >
                <LayoutDashboard size={16} className="mr-1.5" />
                My Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => handleAuthClick('login')}
                  className="text-gray-700 font-lato hover:text-[#34D164]"
                >
                  Sign in
                </Button>
                <Button 
                  onClick={() => handleAuthClick('signup')}
                  className="font-lato text-white hover:opacity-90" 
                  style={{backgroundColor: '#34D164'}}
                >
                  Join serviceHub
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{color: '#121E3C'}}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <nav className="flex flex-col space-y-2">
              <a 
                onClick={() => { navigate('/about'); setIsMenuOpen(false); }}
                className="px-4 py-2 text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer"
              >
                About us
              </a>
              <a 
                onClick={() => { navigate('/how-it-works'); setIsMenuOpen(false); }}
                className="px-4 py-2 text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer"
              >
                How it works
              </a>
              <a 
                onClick={() => { navigate('/trade-categories'); setIsMenuOpen(false); }}
                className="px-4 py-2 text-gray-700 font-lato transition-colors hover:text-[#34D164] cursor-pointer"
              >
                Find trades
              </a>

              <div className="border-t my-2"></div>

              {isAuthenticated() ? (
                <div className="px-4">
                  <Button 
                    onClick={() => { navigate(getDashboardPath()); setIsMenuOpen(false); }}
                    className="w-full font-lato text-white justify-start" 
                    style={{backgroundColor: '#34D164'}}
                  >
                    <LayoutDashboard size={16} className="mr-2" />
                    My Dashboard
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 px-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => { handleAuthClick('login'); setIsMenuOpen(false); }}
                    className="text-gray-700 font-lato hover:text-[#34D164] justify-start"
                  >
                    Sign in
                  </Button>
                  <Button 
                    onClick={() => { handleAuthClick('signup'); setIsMenuOpen(false); }}
                    className="font-lato text-white justify-start" 
                    style={{backgroundColor: '#34D164'}}
                  >
                    Join serviceHub
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
        defaultTab={authDefaultTab}
        showOnlyTradesperson={authShowOnlyTradesperson}
      />
    </header>
  );
};

export default Header;




