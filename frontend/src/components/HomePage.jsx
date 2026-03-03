import React from 'react';
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

const HomePage = () => {
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
    </div>
  );
};

export default HomePage;