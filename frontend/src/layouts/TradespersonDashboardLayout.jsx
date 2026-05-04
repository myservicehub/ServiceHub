import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TradespersonDashboardSidebar from '../components/dashboard/TradespersonDashboardSidebar';
import TradespersonDashboardHeader from '../components/dashboard/TradespersonDashboardHeader';
import VerificationRequiredModal from '../components/dashboard/VerificationRequiredModal';
import LocationConfirmationBanner from '../components/LocationConfirmationBanner';
import { cn } from '../lib/utils';
import { getTradespersonCompletionStatus } from '../utils/tradespersonCompletion';
import {
  Briefcase,
  Search,
  Heart,
  MessageSquare,
  User,
} from 'lucide-react';

const TradespersonDashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const { user, isAuthenticated, isTradesperson, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const completion = getTradespersonCompletionStatus(user);
  const restrictedRoutes = ['/trades/interests', '/trades/completed', '/trades/messages'];

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && (!isAuthenticated() || !isTradesperson())) {
      navigate('/join-for-free', { replace: true });
    }
    // Redirect /trades to /trades/overview
    if (!loading && location.pathname === '/trades') {
      navigate('/trades/overview', { replace: true });
    }
  }, [loading, isAuthenticated, isTradesperson, navigate]);

  useEffect(() => {
    if (loading || !isAuthenticated() || !isTradesperson()) return;
    if (completion.allStepsCompleted) return;
    if (!restrictedRoutes.some((route) => location.pathname.startsWith(route))) return;
    setShowVerificationModal(true);
    navigate('/trades/overview', { replace: true });
  }, [loading, isAuthenticated, isTradesperson, completion.allStepsCompleted, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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

      {/* Sidebar */}
      <TradespersonDashboardSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowVerificationModal={() => setShowVerificationModal(true)}
      />

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        {/* Header */}
        <TradespersonDashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
            <LocationConfirmationBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav 
        allStepsCompleted={completion.allStepsCompleted} 
        onShowVerificationModal={() => setShowVerificationModal(true)} 
      />

      {/* Verification Required Modal */}
      <VerificationRequiredModal 
        isOpen={showVerificationModal} 
        onClose={() => setShowVerificationModal(false)} 
      />
    </div>
  );
};

const MobileBottomNav = ({ allStepsCompleted, onShowVerificationModal }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/trades/overview', icon: Briefcase, label: 'Home', restricted: false },
    { path: '/trades/browsejobs', icon: Search, label: 'Jobs', restricted: false },
    { path: '/trades/interests', icon: Heart, label: 'Interests', restricted: true },
    { path: '/trades/messages', icon: MessageSquare, label: 'Messages', restricted: true },
    { path: '/trades/profile', icon: User, label: 'Profile', restricted: false },
  ];

  const isActive = (path) => {
    if (path === '/trades/overview') return location.pathname === '/trades/overview' || location.pathname === '/trades';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121E3C] border-t border-white/10 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isLocked = item.restricted && !allStepsCompleted;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                if (isLocked) {
                  onShowVerificationModal();
                  return;
                }
                navigate(item.path);
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative",
                isLocked
                  ? "text-white/20"
                  : isActive(item.path)
                    ? "text-[#34D164]"
                    : "text-white/60 hover:text-white"
              )}
            >
              <IconComponent className={cn(
                "w-5 h-5 transition-transform duration-200",
                isActive(item.path) && !isLocked && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isLocked
                  ? "text-white/20"
                  : isActive(item.path) 
                    ? "text-[#34D164]" 
                    : "text-white/50"
              )}>
                {item.label}
              </span>
              {isActive(item.path) && !isLocked && (
                <span className="absolute top-0 w-8 h-0.5 bg-[#34D164] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TradespersonDashboardLayout;
