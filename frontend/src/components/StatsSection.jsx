import React from 'react';
import { Users, Star, Wrench, TrendingUp } from 'lucide-react';
import { statsAPI } from '../api/services';
import { useAPI } from '../hooks/useAPI';

const StatsSection = () => {
  const { data: stats, loading, error } = useAPI(() => statsAPI.getStats());

  // Fallback stats
  const defaultStats = [
    { icon: Users, number: '0', label: 'Verified Professionals', sublabel: 'Ready to help' },
    { icon: Wrench, number: '0+', label: 'Trade Categories', sublabel: 'Every skill covered' },
    { icon: Star, number: '0', label: 'Customer Reviews', sublabel: 'Real feedback' }
  ];

  const hasValidStats = stats && (
    typeof stats.total_tradespeople !== 'undefined' ||
    typeof stats.total_categories !== 'undefined' ||
    typeof stats.total_reviews !== 'undefined'
  );

  const displayStats = hasValidStats ? [
    { icon: Users, number: Number(stats.total_tradespeople ?? 0).toLocaleString(), label: 'Verified Professionals', sublabel: 'Ready to help' },
    { icon: Wrench, number: `${Number(stats.total_categories ?? 0)}+`, label: 'Trade Categories', sublabel: 'Every skill covered' },
    { icon: Star, number: Number(stats.total_reviews ?? 0).toLocaleString(), label: 'Customer Reviews', sublabel: 'Real feedback' }
  ] : defaultStats;

  if (error) {
    console.warn('Failed to load stats, using defaults:', error);
  }

  return (
    <section className="relative py-16 lg:py-20 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src="/stock/bg15.jpg" 
          alt="" 
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Subtle gradient orb */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 pointer-events-none" style={{ background: '#34D164' }} />

      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-5xl mx-auto">
          
          {/* Stats Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <TrendingUp className="w-3.5 h-3.5 text-[#34D164]" />
              <span className="text-xs font-semibold font-lato tracking-wider uppercase text-white/70">
                Growing Every Day
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-3">
              Trusted by <span className="text-[#34D164]">thousands</span>
            </h2>
            <p className="text-sm text-white/50 font-lato max-w-md mx-auto">
              Join our growing community of homeowners and professionals
            </p>
          </div>

          {/* Compact Stats Cards */}
          <div className="grid grid-cols-3 gap-4 lg:gap-6 max-w-3xl mx-auto">
            {displayStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="group text-center p-4 lg:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300">
                  <div className="inline-flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#34D164]/10 border border-[#34D164]/20 items-center justify-center mb-3 group-hover:bg-[#34D164]/20 transition-colors">
                    <IconComponent className="w-5 h-5 lg:w-6 lg:h-6 text-[#34D164]" />
                  </div>
                  <div className={`text-2xl lg:text-3xl font-bold font-montserrat text-white mb-1 ${loading ? 'animate-pulse' : ''}`}>
                    {loading ? <span className="inline-block w-12 h-7 bg-white/10 rounded" /> : stat.number}
                  </div>
                  <div className="text-xs lg:text-sm text-white/70 font-medium font-lato">{stat.label}</div>
                  <div className="text-xs text-white/40 font-lato hidden lg:block">{stat.sublabel}</div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default StatsSection;
