import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import AuthModal from './auth/AuthModal';

const FinalCTA = ({ 
  badge = "Get started",
  title = "Ready to bring your vision to life?",
  subtitle,
  buttonText = "Get started today",
  buttonLink,
  showAuthModal = true
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (showAuthModal) {
      setAuthModalOpen(true);
    } else if (buttonLink) {
      navigate(buttonLink);
    }
  };

  return (
    <>
      <section className="relative py-24 lg:py-32 overflow-hidden bg-[#121E3C]">
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(#34D164 1px, transparent 1px), linear-gradient(90deg, #34D164 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        {/* Gradient overlay for blur effect at edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C] via-transparent to-[#0d1628]" />
        
        {/* Content */}
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/90 backdrop-blur-sm border border-white/50 shadow-lg">
              <Sparkles className="w-4 h-4 text-[#34D164]" />
              <span className="text-sm font-medium font-lato text-[#121E3C]">
                {badge}
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold font-montserrat text-white mb-4 leading-tight">
              {title}
            </h2>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-white/60 font-lato text-sm md:text-base mb-8 max-w-lg mx-auto">
                {subtitle}
              </p>
            )}

            {/* CTA Button */}
            <Button 
              onClick={handleButtonClick}
              className="bg-[#34D164] hover:bg-[#2ab854] text-white pl-6 pr-5 py-3 text-sm font-semibold font-lato rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 inline-flex items-center gap-2 mt-4"
            >
              {buttonText}
              <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </span>
            </Button>
          </div>
        </div>
      </section>

      {showAuthModal && (
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          defaultMode="signup"
        />
      )}
    </>
  );
};

export default FinalCTA;
