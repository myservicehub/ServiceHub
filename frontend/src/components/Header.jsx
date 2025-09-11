import React, { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X, User, LogOut, Briefcase, Search, Star, Heart, ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './auth/AuthModal';
import NotificationIndicator from './NotificationIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();
  const { user, isAuthenticated, isHomeowner, isTradesperson, logout } = useAuth();

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
            <a 
              onClick={() => navigate('/about')}
              className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
            >
              About us
            </a>
            <a 
              onClick={() => navigate('/how-it-works')}
              className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
            >
              How it works
            </a>
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              Find tradespeople
            </a>
            {/* Only show "Join as tradesperson" if user is not already a tradesperson */}
            {!isAuthenticated() || !isTradesperson() ? (
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handleAuthClick('signup');
                }}
                className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]"
              >
                Join as tradesperson
              </a>
            ) : null}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                navigate('/help');
              }}
              className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]"
            >
              Help
            </a>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                navigate('/contact');
              }}
              className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]"
            >
              Contact
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
                
                {/* Navigation based on user type */}
                {isHomeowner() && (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/browse-tradespeople')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <Search size={16} />
                      <span>Find Tradespeople</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/my-jobs')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <Briefcase size={16} />
                      <span>My Jobs</span>
                    </Button>
                    <Button 
                      onClick={() => navigate('/post-job')}
                      className="font-lato text-white hover:opacity-90" 
                      style={{backgroundColor: '#2F8140'}}
                    >
                      Post a job
                    </Button>
                  </>
                )}
                
                {isTradesperson() && (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/browse-jobs')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <Search size={16} />
                      <span>Browse Jobs</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/my-interests')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <Heart size={16} />
                      <span>My Interests</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/wallet')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <span>💰</span>
                      <span>Wallet</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/referrals')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                    >
                      <span>🎁</span>
                      <span>Referrals</span>
                    </Button>
                  </>
                )}
                
                {/* Notification Indicator for all authenticated users */}
                <NotificationIndicator />
                
                {/* Link to Reviews */}
                <button
                  onClick={() => navigate('/reviews')}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-lato"
                >
                  <Star size={16} />
                  <span>My Reviews</span>
                </button>
                
                {/* Profile Link for all authenticated users */}
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/profile')}
                  className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                >
                  <User size={16} />
                  <span>Profile</span>
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
              <a 
                onClick={() => {
                  navigate('/about');
                  setIsMenuOpen(false);
                }}
                className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
              >
                About us
              </a>
              <a 
                onClick={() => {
                  navigate('/how-it-works');
                  setIsMenuOpen(false);
                }}
                className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
              >
                How it works
              </a>
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Find tradespeople
              </a>
              {/* Only show "Join as tradesperson" if user is not already a tradesperson */}
              {!isAuthenticated() || !isTradesperson() ? (
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleAuthClick('signup');
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]"
                >
                  Join as tradesperson
                </a>
              ) : null}
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Help
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {isAuthenticated() ? (
                  <>
                    <div className="flex items-center space-x-2 px-4 py-2">
                      <User size={20} style={{color: '#2F8140'}} />
                      <span className="font-lato text-gray-700">
                        Welcome, {user?.name?.split(' ')[0]}
                      </span>
                    </div>
                    
                    {/* Mobile Navigation based on user type */}
                    {isHomeowner() && (
                      <>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/browse-tradespeople')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Search size={16} />
                          <span>Find Tradespeople</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/my-jobs')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Briefcase size={16} />
                          <span>My Jobs</span>
                        </Button>
                        <Button 
                          onClick={() => navigate('/post-job')}
                          className="font-lato text-white justify-start" 
                          style={{backgroundColor: '#2F8140'}}
                        >
                          Post a job
                        </Button>
                      </>
                    )}
                    
                    {isTradesperson() && (
                      <>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/browse-jobs')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Search size={16} />
                          <span>Browse Jobs</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/my-interests')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Heart size={16} />
                          <span>My Interests</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/wallet')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <span>💰</span>
                          <span>Wallet</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/referrals')}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <span>🎁</span>
                          <span>Referrals</span>
                        </Button>
                      </>
                    )}
                    
                    {/* Mobile Notification Indicator */}
                    <div className="px-3 py-2">
                      <NotificationIndicator />
                    </div>
                    
                    {/* Link to Reviews */}
                    <button
                      onClick={() => navigate('/reviews')}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-lato justify-start px-3 py-2"
                    >
                      <Star size={16} />
                      <span>My Reviews</span>
                    </button>
                    
                    {/* Profile Link for all authenticated users */}
                    <Button 
                      variant="ghost"
                      onClick={() => navigate('/profile')}
                      className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="text-gray-700 font-lato hover:text-red-600 justify-start flex items-center space-x-1"
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
                      className="text-gray-700 font-lato hover:text-[#2F8140] justify-start"
                    >
                      Sign in
                    </Button>
                    <Button 
                      onClick={() => handleAuthClick('signup')}
                      className="font-lato text-white justify-start" 
                      style={{backgroundColor: '#2F8140'}}
                    >
                      Join serviceHub
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
        defaultTab="homeowner"
        showOnlyTradesperson={false}
      />
    </header>
  );
};

export default Header;