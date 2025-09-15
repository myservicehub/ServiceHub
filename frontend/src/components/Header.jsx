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
            {/* Hide About us from tradespeople */}
            {!isTradesperson() && (
              <a 
                onClick={() => navigate('/about')}
                className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
              >
                About us
              </a>
            )}
            {/* Hide these navigation items when homeowner or tradesperson is logged in */}
            {!isHomeowner() && !isTradesperson() && (
              <>
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
              </>
            )}
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
                      onClick={() => navigate('/post-job')}
                      className="font-lato text-white hover:opacity-90" 
                      style={{backgroundColor: '#2F8140'}}
                    >
                      Post a job
                    </Button>
                    
                    {/* Homeowner User Menu Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost"
                          className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                        >
                          <User size={16} />
                          <span>Menu</span>
                          <ChevronDown size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/my-jobs')}>
                          <Briefcase size={16} />
                          <span>My Jobs</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/my-reviews')}>
                          <Star size={16} />
                          <span>My Reviews</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/help')}>
                          <HelpCircle size={16} />
                          <span>Help</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/contact')}>
                          <MessageSquare size={16} />
                          <span>Contact</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/profile')}>
                          <User size={16} />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                          <LogOut size={16} />
                          <span>Logout</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    
                    {/* Tradesperson User Menu Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost"
                          className="text-gray-700 font-lato hover:text-[#2F8140] flex items-center space-x-1"
                        >
                          <User size={16} />
                          <span>Menu</span>
                          <ChevronDown size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/my-interests')}>
                          <Heart size={16} />
                          <span>My Interests</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/wallet')}>
                          <span className="mr-2">💰</span>
                          <span>Wallet</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/referrals')}>
                          <span className="mr-2">🎁</span>
                          <span>Referrals</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/my-reviews')}>
                          <Star size={16} />
                          <span>My Reviews</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/help')}>
                          <HelpCircle size={16} />
                          <span>Help</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => navigate('/contact')}>
                          <MessageSquare size={16} />
                          <span>Contact</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => navigate('/profile')}>
                          <User size={16} />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                          <LogOut size={16} />
                          <span>Logout</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                
                {/* Notification Indicator for all authenticated users */}
                <NotificationIndicator />
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
              {/* Hide About us from tradespeople */}
              {!isTradesperson() && (
                <a 
                  onClick={() => {
                    navigate('/about');
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-700 font-lato transition-colors hover:text-[#2F8140] cursor-pointer"
                >
                  About us
                </a>
              )}
              {/* Hide these navigation items when homeowner or tradesperson is logged in */}
              {!isHomeowner() && !isTradesperson() && (
                <>
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
                </>
              )}
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
                          onClick={() => {
                            navigate('/browse-tradespeople');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Search size={16} />
                          <span>Find Tradespeople</span>
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            navigate('/post-job');
                            setIsMenuOpen(false);
                          }}
                          className="font-lato text-white justify-start" 
                          style={{backgroundColor: '#2F8140'}}
                        >
                          Post a job
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Account</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/my-jobs');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Briefcase size={16} />
                          <span>My Jobs</span>
                        </Button>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/my-reviews');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Star size={16} />
                          <span>My Reviews</span>
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Support</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/help');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <HelpCircle size={16} />
                          <span>Help</span>
                        </Button>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/contact');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <MessageSquare size={16} />
                          <span>Contact</span>
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/profile');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <User size={16} />
                          <span>Profile</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-red-600 justify-start flex items-center space-x-1"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </Button>
                      </>
                    )}
                    
                    {isTradesperson() && (
                      <>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/browse-jobs');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Search size={16} />
                          <span>Browse Jobs</span>
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Account</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/my-interests');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Heart size={16} />
                          <span>My Interests</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/wallet');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <span>💰</span>
                          <span>Wallet</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/referrals');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <span>🎁</span>
                          <span>Referrals</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/my-reviews');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <Star size={16} />
                          <span>My Reviews</span>
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Support</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/help');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <HelpCircle size={16} />
                          <span>Help</span>
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/contact');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <MessageSquare size={16} />
                          <span>Contact</span>
                        </Button>
                        
                        <div className="px-3 py-1">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</div>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate('/profile');
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-[#2F8140] justify-start flex items-center space-x-1"
                        >
                          <User size={16} />
                          <span>Profile</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 font-lato hover:text-red-600 justify-start flex items-center space-x-1"
                        >
                          <LogOut size={16} />
                          <span>Logout</span>
                        </Button>
                      </>
                    )}
                    
                    {/* Mobile Notification Indicator for all authenticated users */}
                    <div className="px-3 py-2">
                      <NotificationIndicator />
                    </div>
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