import React, { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X, User, LogOut, Briefcase, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AuthModal from './auth/AuthModal';
import NotificationIndicator from './NotificationIndicator';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();
  const { user, isAuthenticated, isHomeowner, isTradesperson, logout } = useAuth();

  const handleAuthClick = (mode) => {
    console.log('handleAuthClick called with mode:', mode);
    console.log('Current authModalOpen state:', authModalOpen);
    setAuthMode(mode);
    setAuthModalOpen(true);
    console.log('Setting authModalOpen to true');
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
            <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
              Join as tradesperson
            </a>
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
                <button 
                  onClick={() => {
                    console.log('Sign in button clicked!');
                    handleAuthClick('login');
                  }}
                  className="text-gray-700 font-lato hover:text-[#2F8140] px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50"
                >
                  Sign in
                </button>
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
              <a href="#" className="text-gray-700 font-lato transition-colors hover:text-[#2F8140]">
                Join as tradesperson
              </a>
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
      
      {/* Debug: Simple modal instead of AuthModal */}
      {authModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setAuthModalOpen(false)}
        >
          <div 
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sign In</h2>
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full p-3 border rounded"
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full p-3 border rounded"
              />
              <button className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700">
                Sign In
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Debug: Mode is {authMode}
            </p>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;