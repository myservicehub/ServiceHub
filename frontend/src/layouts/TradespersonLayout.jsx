import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Search,
  Heart,
  CheckCircle,
  Wallet,
  Star,
  Bell,
  User,
  HelpCircle,
  Menu,
  X,
  MessageSquare,
  Users,
} from 'lucide-react';

const TradespersonLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isTradesperson } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // If user is not a tradesperson, just render children without sidebar
  if (!isTradesperson || !isTradesperson()) {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Browse Jobs', href: '/browse-jobs', icon: Search },
    { name: 'My Interests', href: '/my-interests', icon: Heart },
    { name: 'Completed Jobs', href: '/completed-jobs', icon: CheckCircle },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Reviews', href: '/my-received-reviews', icon: Star },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Referrals', href: '/referrals', icon: Users },
  ];

  const secondaryNavigation = [
    { name: 'Profile', href: '/trades/profile', icon: User },
    { name: 'Help & Support', href: '/help', icon: HelpCircle },
  ];

  const isActive = (href) => {
    if (href === '/browse-jobs') return location.pathname === '/browse-jobs';
    return location.pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const NavItem = ({ item }) => {
    const active = isActive(item.href);
    return (
      <NavLink
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200",
          active
            ? "bg-white/15 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#34D164] rounded-r-full" />
        )}
        <item.icon
          className={cn(
            "flex-shrink-0 w-5 h-5 transition-all duration-200",
            active ? "text-[#34D164]" : "text-white/50 group-hover:text-white/80"
          )}
        />
        <span className="flex-1 truncate">{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#121E3C] transition-all duration-300 ease-out hidden lg:flex">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div onClick={() => navigate('/')} className="cursor-pointer">
            <Logo size="small" variant="sidebar" />
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#34D164] flex items-center justify-center text-white font-semibold shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Tradesperson'}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34D164]/20 text-[#34D164]">
                Tradesperson
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
          <div className="my-4 border-t border-white/10" />
          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout at bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#121E3C] shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <Logo size="small" variant="sidebar" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#34D164] flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Tradesperson'}
              </p>
              <p className="text-xs text-white/50 truncate">{user?.email || ''}</p>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#34D164]/20 text-[#34D164]">
                Tradesperson
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
          <div className="my-4 border-t border-white/10" />
          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        </nav>

        {/* Logout at bottom */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col min-h-screen lg:pl-72">
        {/* Top bar with hamburger for mobile */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 h-16 flex items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div onClick={() => navigate('/')} className="cursor-pointer lg:hidden ml-2">
            <Logo size="small" variant="light" />
          </div>
        </header>

        {/* Page content — the actual page renders here */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TradespersonLayout;
