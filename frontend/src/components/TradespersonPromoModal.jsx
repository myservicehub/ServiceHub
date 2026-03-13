import React, { useState, useEffect } from 'react';
import { X, CheckCircle, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { statsAPI } from '../api/services';

const TradespersonPromoModal = ({ isOpen, onClose, onGetStarted }) => {
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchStats = async () => {
        try {
          const stats = await statsAPI.getStats();
          setPlatformStats(stats);
        } catch (e) {
          console.error('Failed to fetch stats:', e);
        }
      };
      fetchStats();
    }
  }, [isOpen]);

  const handleGetStarted = () => {
    onClose();
    if (onGetStarted) {
      onGetStarted();
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }));
    }
  };

  const socialLinks = [
    { name: 'Twitter', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ), href: 'https://twitter.com/servicehubng' },
    { name: 'Facebook', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ), href: 'https://facebook.com/servicehubng' },
    { name: 'Instagram', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
    ), href: 'https://instagram.com/servicehubng' },
    { name: 'YouTube', icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    ), href: 'https://youtube.com/@servicehubng' },
  ];

  const benefits = [
    { icon: TrendingUp, text: '72% increase in bookings' },
    { icon: Users, text: '100+ homeowners daily' },
    { icon: Zap, text: 'Instant job notifications' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-5xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-300">
        <div className="flex flex-col lg:flex-row lg:min-h-[560px]">
          
          {/* Image Section with Social Links */}
          <div className="relative lg:w-[46%] h-32 sm:h-48 lg:h-auto overflow-hidden flex-shrink-0">
            <img 
              src="/stock/bg8.jpg" 
              alt="Professional tradesperson" 
              className="w-full h-full object-cover object-center"
            />
            
            {/* Social Links - Overlaid on image */}
            <div className="hidden lg:flex flex-col items-center justify-center absolute left-0 top-0 bottom-0 w-14 bg-black/20 backdrop-blur-sm py-6">
              <div className="flex flex-col gap-5">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/70 hover:text-[#34D164] transition-colors"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="flex-1 p-5 sm:p-6 lg:p-10 flex flex-col justify-center relative bg-white">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#34D164]/10 rounded-full mb-5 w-fit">
              <span className="w-2 h-2 bg-[#34D164] rounded-full animate-pulse" />
              <span className="text-[#34D164] text-xs font-semibold uppercase tracking-wide font-montserrat">Free Registration</span>
            </div>

            {/* Heading */}
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold font-montserrat text-[#121E3C] mb-3 sm:mb-4 leading-tight">
              Join Nigeria's #1 Platform for Tradespeople
            </h2>
            
            <p className="text-gray-500 font-lato mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base leading-relaxed max-w-lg">
              Connect with homeowners across Nigeria and grow your business. 
              Registration is <span className="text-[#34D164] font-semibold">completely free</span> and takes just 10 minutes.
            </p>

            {/* Benefits */}
            <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                    <benefit.icon size={16} className="text-[#34D164] sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <span className="text-gray-700 font-lato text-xs sm:text-sm lg:text-base">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-[#34D164] hover:bg-[#2ab854] text-white py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#34D164]/25 flex items-center justify-center gap-2 font-montserrat"
            >
              Start Free Registration
              <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Button>

            {/* Trust Indicators */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-[10px] sm:text-xs text-gray-400 font-lato">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-[#34D164]" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-[#34D164]" />
                  <span>No subscription fees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-[#34D164]" />
                  <span>Instant setup</span>
                </div>
              </div>
            </div>

            {/* Mobile Social Links */}
            <div className="flex lg:hidden items-center justify-center gap-4 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100">
              <span className="text-gray-400 text-xs font-lato">Follow us:</span>
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[#34D164] transition-colors"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradespersonPromoModal;
