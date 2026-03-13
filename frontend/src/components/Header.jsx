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
    if (isTradesperson()) return '/trades/overview';
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div onClick={() => navigate('/')} className="cursor-pointer flex items-center">
            <Logo size="medium" variant="sidebar" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              onClick={() => navigate('/about')}
              className="text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
            >
              About us
            </a>
            <a 
              onClick={() => navigate('/how-it-works')}
              className="text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
            >
              How it works
            </a>
            <a 
              onClick={() => navigate("/trade-categories")} 
              className="text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
            >
              Find trades
            </a>
            <a 
              onClick={() => navigate('/post-job')}
              className="text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
            >
              Post a job
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated() ? (
              <Button 
                onClick={() => navigate(getDashboardPath())}
                className="font-lato text-sm text-white hover:opacity-90 h-9 px-4" 
                style={{backgroundColor: '#34D164'}}
              >
                <LayoutDashboard size={14} className="mr-1.5" />
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => handleAuthClick('login')}
                  className="text-white/80 text-sm font-lato hover:text-white hover:bg-white/10 h-9"
                >
                  Sign in
                </Button>
                <Button 
                  onClick={() => handleAuthClick('userTypeSelection')}
                  className="font-lato text-sm text-white hover:opacity-90 h-9 px-4" 
                  style={{backgroundColor: '#34D164'}}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white/80 hover:text-white transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/30 backdrop-blur-md py-4 -mx-6 px-6">
            <nav className="flex flex-col space-y-1">
              <a 
                onClick={() => { navigate('/about'); setIsMenuOpen(false); }}
                className="py-2.5 text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
              >
                About us
              </a>
              <a 
                onClick={() => { navigate('/how-it-works'); setIsMenuOpen(false); }}
                className="py-2.5 text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
              >
                How it works
              </a>
              <a 
                onClick={() => { navigate('/trade-categories'); setIsMenuOpen(false); }}
                className="py-2.5 text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
              >
                Find trades
              </a>
              <a 
                onClick={() => { navigate('/post-job'); setIsMenuOpen(false); }}
                className="py-2.5 text-white/80 text-sm font-lato transition-colors hover:text-white cursor-pointer"
              >
                Post a job
              </a>

              <div className="border-t border-white/10 my-3"></div>

              {isAuthenticated() ? (
                <Button 
                  onClick={() => { navigate(getDashboardPath()); setIsMenuOpen(false); }}
                  className="w-full font-lato text-sm text-white justify-center h-10" 
                  style={{backgroundColor: '#34D164'}}
                >
                  <LayoutDashboard size={14} className="mr-2" />
                  My Dashboard
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => { handleAuthClick('login'); setIsMenuOpen(false); }}
                    className="text-white/80 text-sm font-lato hover:text-white hover:bg-white/10 justify-center h-10"
                  >
                    Sign in
                  </Button>
                  <Button 
                    onClick={() => { handleAuthClick('userTypeSelection'); setIsMenuOpen(false); }}
                    className="font-lato text-sm text-white justify-center h-10" 
                    style={{backgroundColor: '#34D164'}}
                  >
                    Get Started
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




