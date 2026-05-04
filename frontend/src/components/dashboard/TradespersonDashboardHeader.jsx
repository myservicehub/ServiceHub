import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import NotificationIndicator from '../NotificationIndicator';
import {
  Menu,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  X,
  Briefcase,
} from 'lucide-react';

const TradespersonDashboardHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/trades/browsejobs?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-30 bg-[#121E3C] border-b border-white/10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-white hover:bg-white/10 transition-all duration-200 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#34D164]" />
            <h1 className="text-lg font-semibold text-white">
              Tradesperson Dashboard
            </h1>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="fixed sm:absolute inset-x-4 sm:inset-x-auto sm:right-0 top-3 sm:top-1/2 sm:-translate-y-1/2 z-50">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-right-2 duration-200">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs..."
                    className="flex-1 min-w-0 sm:w-64 px-4 py-2 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Notifications */}
          <NotificationIndicator lightMode={true} />

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200",
                profileOpen
                  ? "bg-white/10"
                  : "hover:bg-white/10"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-[#34D164] flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'T'}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-white/50 transition-transform duration-200 hidden sm:block",
                profileOpen && "rotate-180"
              )} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.name || 'Tradesperson'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || 'pro@example.com'}
                  </p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34D164]/20 text-[#34D164]">
                    Tradesperson
                  </span>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/trades/profile');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/trades/settings');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/help');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <span>Help & Support</span>
                  </button>
                </div>

                <div className="py-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TradespersonDashboardHeader;
