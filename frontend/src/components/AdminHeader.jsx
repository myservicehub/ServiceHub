import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Home } from 'lucide-react';
import Logo from './Logo';
import { adminAPI } from '../api/wallet';

const AdminHeader = ({ onLogout, isLoggedIn = true }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await adminAPI.logout();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1b3d] border-b border-white/10">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Admin Badge */}
          <div className="flex items-center gap-4">
            <div onClick={() => navigate('/admin')} className="cursor-pointer flex items-center">
              <Logo size="medium" variant="sidebar" />
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full">
              <Shield size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Admin Panel</span>
            </div>
          </div>

          {/* Admin Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-white/60 text-sm font-lato transition-colors hover:text-white"
            >
              <Home size={14} />
              <span>View Site</span>
            </button>
          </nav>

          {/* Logout Button - Only show when logged in */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="md:hidden flex items-center gap-1.5 text-white/60 text-sm font-lato transition-colors hover:text-white"
            >
              <Home size={14} />
            </button>
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
