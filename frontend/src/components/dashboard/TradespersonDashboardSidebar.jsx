import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import Logo from '../Logo';
import {
  Search,
  Heart,
  CheckCircle,
  MessageSquare,
  Wallet,
  Star,
  Bell,
  Users,
  User,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Briefcase,
  FileText,
  BookOpen,
  Scale,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TradespersonDashboardSidebar = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Overview',
      href: '/trades/overview',
      icon: Briefcase,
      end: true,
    },
    {
      name: 'Browse Jobs',
      href: '/trades/browsejobs',
      icon: Search,
    },
    {
      name: 'My Interests',
      href: '/trades/interests',
      icon: Heart,
    },
    {
      name: 'Completed Jobs',
      href: '/trades/completed',
      icon: CheckCircle,
    },
    {
      name: 'Messages',
      href: '/trades/messages',
      icon: MessageSquare,
    },
    {
      name: 'Wallet',
      href: '/trades/wallet',
      icon: Wallet,
    },
    {
      name: 'Reviews',
      href: '/trades/reviews',
      icon: Star,
    },
    {
      name: 'Notifications',
      href: '/trades/notifications',
      icon: Bell,
    },
    {
      name: 'Referrals',
      href: '/trades/referrals',
      icon: Users,
    },
  ];

  const secondaryNavigation = [
    {
      name: 'Profile',
      href: '/trades/profile',
      icon: User,
    },
    {
      name: 'Help & Support',
      href: '/help',
      icon: HelpCircle,
      external: true,
    },
    {
      name: 'How It Works',
      href: '/how-it-works',
      icon: BookOpen,
      external: true,
    },
    {
      name: 'Reviews Policy',
      href: '/reviews-policy',
      icon: Scale,
      external: true,
    },
    {
      name: 'Blog',
      href: '/blog',
      icon: FileText,
      external: true,
    },
  ];

  const NavItem = ({ item, collapsed }) => {
    const isActive = item.end
      ? location.pathname === item.href
      : location.pathname.startsWith(item.href);

    return (
      <NavLink
        to={item.href}
        onClick={onClose}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-white/15 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#34D164] rounded-r-full" />
        )}

        <item.icon
          className={cn(
            "flex-shrink-0 transition-all duration-200",
            collapsed ? "w-6 h-6" : "w-5 h-5",
            isActive ? "text-[#34D164]" : "text-white/50 group-hover:text-white/80"
          )}
        />

        {!collapsed && (
          <span className="flex-1 truncate">{item.name}</span>
        )}

        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
            {item.name}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#121E3C] transition-all duration-300 ease-out hidden lg:flex",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-white/10",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/Logo-Icon-Green.png" alt="ServiceHub" className="w-8 h-8 object-contain" />
            </div>
          ) : (
            <Logo size="small" variant="sidebar" />
          )}
          
          <button
            onClick={onToggleCollapse}
            className={cn(
              "p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors",
              isCollapsed && "absolute -right-3 top-6 bg-[#121E3C] border border-white/20 shadow-lg"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User info */}
        {!isCollapsed && (
          <div className="px-4 py-4 border-b border-white/10">
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
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} collapsed={isCollapsed} />
            ))}
          </div>

          <div className="my-4 border-t border-white/10" />

          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} collapsed={isCollapsed} />
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#121E3C] shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <Logo size="small" variant="sidebar" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#34D164] flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {user?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || 'Tradesperson'}
              </p>
              <p className="text-xs text-white/50 truncate">
                {user?.email || ''}
              </p>
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
              <NavItem key={item.name} item={item} collapsed={false} />
            ))}
          </div>

          <div className="my-4 border-t border-white/10" />

          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} collapsed={false} />
            ))}
          </div>
        </nav>

        {/* Logout - extra bottom padding for mobile footer nav clearance */}
        <div className="p-3 pb-20 border-t border-white/10">
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default TradespersonDashboardSidebar;
