import React from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import HowItWorks from './HowItWorks';
import PopularTrades from './PopularTrades';
import ReviewsSection from './ReviewsSection';
import TradespeopleCTA from './TradespeopleCTA';
import AppSection from './AppSection';
import Footer from './Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <PopularTrades />
      <ReviewsSection />
      <TradespeopleCTA />
      <AppSection />
      <Footer />
    </div>
  );
};

export default HomePage;