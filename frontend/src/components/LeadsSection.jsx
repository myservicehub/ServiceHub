import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import AuthModal from './auth/AuthModal';

const LeadsSection = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const benefits = [
    'Get matched with local jobs instantly',
    'Set your own rates and schedule',
    'Build your reputation with reviews',
    'Secure payments guaranteed'
  ];

  return (
    <>
      <section className="relative py-20 lg:py-24 bg-white overflow-hidden">
        {/* Subtle grid background - same as testimonials */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#121E3C 1px, transparent 1px), linear-gradient(90deg, #121E3C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}
        />

        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              
              {/* Left - Content */}
              <div className="order-2 lg:order-1">
                <span className="text-[#34D164] text-sm font-semibold font-lato tracking-wider uppercase mb-4">
                  For Tradespeople
                </span>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-[#121E3C] mb-6 leading-tight">
                  Looking for leads?
                </h2>
                
                <p className="text-gray-500 font-lato text-lg mb-8 leading-relaxed">
                  Grow your business with ServiceHub. Connect with homeowners actively searching for your skills. No upfront<br /> costs , just opportunities.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#34D164] flex-shrink-0" />
                      <span className="text-gray-600 font-lato text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button 
                    onClick={() => setAuthModalOpen(true)}
                    className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-3 text-sm font-medium font-lato rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    Join as tradesperson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <span className="text-gray-400 text-sm font-lato">Free to join • No hidden fees</span>
                </div>
              </div>

              {/* Right - Large Image */}
              <div className="relative h-[400px] lg:h-auto lg:min-h-[500px] rounded-2xl overflow-hidden order-1 lg:order-2">
                <img 
                  src="/mockup/mesh.jpg" 
                  alt="ServiceHub Platform" 
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

            </div>
          </div>
        </div>
      </section>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultMode="signup" 
        defaultTab="tradesperson"
        showOnlyTradesperson={true}
      />
    </>
  );
};

export default LeadsSection;
