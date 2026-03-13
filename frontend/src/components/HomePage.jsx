import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import HowItWorks from './HowItWorks';
import PopularTrades from './PopularTrades';
import ReviewsSection from './ReviewsSection';
import LeadsSection from './LeadsSection';
import TradespeopleCTA from './TradespeopleCTA';
import AppSection from './AppSection';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import TradespersonPromoModal from './TradespersonPromoModal';

const HomePage = () => {
  const [showPromoModal, setShowPromoModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for promo parameter (from footer link)
    const params = new URLSearchParams(location.search);
    const showPromo = params.get('promo') === 'tradesperson';
    
    if (showPromo) {
      setShowPromoModal(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
      return;
    }

    // Check if user has already seen the promo (don't show again in same session)
    const hasSeenPromo = sessionStorage.getItem('hasSeenTradespersonPromo');
    
    if (!hasSeenPromo) {
      // Auto-show promo modal after 5 seconds
      const timer = setTimeout(() => {
        setShowPromoModal(true);
        sessionStorage.setItem('hasSeenTradespersonPromo', 'true');
      }, 5000); // 5 second delay
      
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <HeroSection />
      <HowItWorks />
      <PopularTrades />
      <ReviewsSection />
      
      <LeadsSection />
      <TradespeopleCTA />
      <AppSection />
      <FinalCTA />
      <Footer />

      {/* Tradesperson Promo Modal */}
      <TradespersonPromoModal 
        isOpen={showPromoModal} 
        onClose={() => setShowPromoModal(false)} 
      />
    </div>
  );
};

export default HomePage;