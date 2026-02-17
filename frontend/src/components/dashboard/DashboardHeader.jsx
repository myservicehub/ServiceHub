import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  X,
} from 'lucide-react';

const DashboardHeader = ({ onMenuClick, sidebarCollapsed }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Mock notifications - in production, fetch from API
  useEffect(() => {
    setNotifications([
      {
        id: 1,
        title: 'New interest in your job',
        message: 'A tradesperson is interested in "Kitchen Renovation"',
        time: '5 min ago',
        read: false,
        type: 'interest',
      },
      {
        id: 2,
        title: 'Job approved',
        message: 'Your job "Bathroom Fix" has been approved',
        time: '1 hour ago',
        read: false,
        type: 'approval',
      },
      {
        id: 3,
        title: 'New message',
        message: 'You have a new message from John Plumber',
        time: '2 hours ago',
        read: true,
        type: 'message',
      },
    ]);
    setUnreadCount(2);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard/jobs?search=${encodeURIComponent(searchQuery)}`);
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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200/60">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-[#121E3C] hover:bg-gray-100 transition-all duration-200 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page context - shows on desktop */}
          <h1 className="hidden sm:block text-lg font-semibold text-[#121E3C]">
            Dashboard
          </h1>
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
                className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={cn(
                "relative p-2.5 rounded-xl transition-all duration-200",
                notificationsOpen
                  ? "bg-[#34D164]/10 text-[#34D164]"
                  : "text-[#121E3C]/60 hover:text-[#121E3C] hover:bg-gray-100"
              )}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full animate-in zoom-in duration-200">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="text-xs font-medium text-[#34D164] hover:text-[#34D164]/80 transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer",
                          !notification.read && "bg-[#34D164]/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex-shrink-0 w-2 h-2 mt-2 rounded-full",
                            notification.read ? "bg-gray-300" : "bg-[#34D164]"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => {
                      navigate('/dashboard/notifications');
                      setNotificationsOpen(false);
                    }}
                    className="w-full text-center text-sm font-medium text-[#34D164] hover:text-[#34D164]/80 transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn(
                "flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200",
                profileOpen
                  ? "bg-gray-100"
                  : "hover:bg-gray-100"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-[#121E3C] flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200 hidden sm:block",
                profileOpen && "rotate-180"
              )} />
            </button>

            {/* Profile dropdown menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || 'homeowner@example.com'}
                  </p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/dashboard/settings');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/dashboard/settings');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Account Settings</span>
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

export default DashboardHeader;
