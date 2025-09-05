import React, { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './auth/AuthModal';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

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
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              How it works
            </a>
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              Find tradespeople
            </a>
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              Join as tradesperson
            </a>
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              Help
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated() ? (
              <>
                <div className="flex items-center space-x-2">
                  <User size={20} style={{color: '#2F8140'}} />
                  <span className="font-lato text-gray-700">
                    Welcome, {user?.name?.split(' ')[0]}
                  </span>
                </div>
                <Button 
                  onClick={() => navigate('/post-job')}
                  className="font-lato text-white hover:opacity-90" 
                  style={{backgroundColor: '#2F8140'}}
                >
                  Post a job
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-gray-700 font-lato hover:text-red-600 flex items-center space-x-1"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => handleAuthClick('login')}
                  className="text-gray-700 font-lato hover:text-[#2F8140]"
                >
                  Sign in
                </Button>
                <Button 
                  onClick={() => handleAuthClick('signup')}
                  className="font-lato text-white hover:opacity-90" 
                  style={{backgroundColor: '#2F8140'}}
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
            <nav className="flex flex-col space-y-4">
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                How it works
              </a>
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Find tradespeople
              </a>
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Join as tradesperson
              </a>
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Help
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="ghost" className="text-gray-700 font-lato hover:text-[#2F8140] justify-start">
                  Sign in
                </Button>
                <Button 
                  onClick={() => navigate('/post-job')}
                  className="font-lato text-white justify-start" 
                  style={{backgroundColor: '#2F8140'}}
                >
                  Post a job
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;