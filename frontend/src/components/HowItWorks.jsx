import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Edit3, Users, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const HowItWorks = () => {
  const navigate = useNavigate();

  const handleSeeHowItWorks = () => {
    navigate('/how-it-works');
  };

  const steps = [
    {
      number: '01',
      icon: Edit3,
      title: 'Post your job',
      description: 'Describe what you need done and we\'ll connect you with qualified professionals in your area.',
      gradient: 'from-[#34D164] to-[#2ab854]',
      glow: '#34D164'
    },
    {
      number: '02',
      icon: Users,
      title: 'Get responses',
      description: 'Receive quotes from interested tradespeople. Review their profiles, ratings, and past work.',
      gradient: 'from-[#121E3C] to-[#1a3a5c]',
      glow: '#121E3C'
    },
    {
      number: '03',
      icon: CheckCircle,
      title: 'Hire with confidence',
      description: 'Compare options, read reviews, and choose the perfect professional for your project.',
      gradient: 'from-[#34D164] to-[#2ab854]',
      glow: '#34D164'
    }
  ];

  return (
    <section className="relative py-24 lg:py-32 bg-white overflow-hidden">
      {/* Light background with subtle patterns */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #121E3C 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Floating gradient orbs */}
        <div 
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[150px] opacity-[0.08]"
          style={{ background: '#34D164' }}
        />
        <div 
          className="absolute -bottom-40 -right-40 w-[450px] h-[450px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: '#121E3C' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.04]"
          style={{ background: '#34D164' }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#34D164]/10 border border-[#34D164]/20">
              <Sparkles className="w-4 h-4 text-[#34D164]" />
              <span className="text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164]">
                Simple Process
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat mb-5 text-[#121E3C] leading-tight">
              How it <span className="text-[#34D164]">works</span>
            </h2>
            <p className="text-lg text-gray-500 font-lato max-w-xl mx-auto leading-relaxed">
              Three simple steps to find the perfect tradesperson for your project
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              
              return (
                <div 
                  key={index} 
                  className="group relative"
                >
                  {/* Light glass card */}
                  <div className="relative h-full p-8 rounded-3xl bg-gradient-to-b from-white to-gray-50/80 border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-500 overflow-hidden">
                    {/* Hover glow effect */}
                    <div 
                      className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                      style={{ background: step.glow }}
                    />
                    
                    {/* Step number - large watermark */}
                    <div className="absolute -top-4 -right-2 text-8xl font-bold font-montserrat text-gray-100 select-none group-hover:text-gray-200/80 transition-colors duration-300">
                      {step.number}
                    </div>

                    {/* Icon container */}
                    <div className="relative mb-6">
                      <div 
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
                        style={{ boxShadow: `0 10px 40px -10px ${step.glow}50` }}
                      >
                        <IconComponent size={28} className="text-white" />
                      </div>
                      
                      {/* Step indicator */}
                      <div className="absolute -top-2 -left-2 w-7 h-7 rounded-lg bg-white shadow-md border border-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold font-montserrat text-[#121E3C]">{step.number}</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold font-montserrat mb-3 text-[#121E3C] group-hover:text-[#34D164] transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-gray-500 font-lato text-sm leading-relaxed group-hover:text-gray-600 transition-colors duration-300">
                      {step.description}
                    </p>

                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  </div>

                  {/* Connector arrow (hidden on mobile and last item) */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-4 lg:-right-5 transform -translate-y-1/2 z-20">
                      <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button 
              onClick={handleSeeHowItWorks}
              className="group relative inline-flex items-center gap-3 text-white px-8 py-4 text-base font-medium font-lato rounded-2xl overflow-hidden shadow-lg shadow-[#34D164]/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#34D164]/30" 
              style={{backgroundColor: '#34D164'}}
            >
              {/* Button glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">See how it works</span>
              <ArrowRight className="relative w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
