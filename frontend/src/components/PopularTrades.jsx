import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, Sparkles, Hammer, Droplets, Zap, PaintBucket, Home, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statsAPI } from '../api/services';
import { useAPI } from '../hooks/useAPI';

const PopularTrades = () => {
  const navigate = useNavigate();
  const { data: categoriesData, loading, error } = useAPI(() => statsAPI.getCategories());

  // Helper: convert trade/category name to URL slug
  const toSlug = (str) => {
    return String(str || '')
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/\//g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  // Clean data with icons instead of images
  const defaultTrades = [
    {
      name: 'Building',
      title: 'Building & Construction',
      description: 'Expert builders for foundation to roofing. Quality workmanship guaranteed.',
      tradesperson_count: 0,
      icon: Hammer
    },
    {
      name: 'Plumbing',
      title: 'Plumbing & Water Works',
      description: 'Professional installations, repairs & emergency services available 24/7.',
      tradesperson_count: 0,
      icon: Droplets
    },
    {
      name: 'Electrical Repairs',
      title: 'Electrical Installation',
      description: 'Certified electricians for safe wiring, installations & repairs.',
      tradesperson_count: 0,
      icon: Zap
    },
    {
      name: 'Painting',
      title: 'Painting & Decorating',
      description: 'Transform your space with interior & exterior painting experts.',
      tradesperson_count: 0,
      icon: PaintBucket
    },
    {
      name: 'Plastering/POP',
      title: 'POP & Ceiling Works',
      description: 'Modern ceiling designs and professional finishing for interiors.',
      tradesperson_count: 0,
      icon: Home
    },
    {
      name: 'Generator Services',
      title: 'Generator Installation',
      description: 'Reliable power solutions for homes and businesses.',
      tradesperson_count: 0,
      icon: Power
    }
  ];

  // Normalize backend categories and merge real counts into our curated UI cards
  const normalizeCategories = (data) => {
    const raw = Array.isArray(data) ? data : (data?.categories || []);
    return Array.isArray(raw) ? raw : [];
  };

  const backendCategories = normalizeCategories(categoriesData);

  // Build a count map keyed by slug for robust matching
  const countsBySlug = new Map();
  backendCategories.forEach((cat) => {
    const count = typeof cat.tradesperson_count === 'number' ? cat.tradesperson_count : (cat.count || 0);
    const keys = [cat.name, cat.title].filter(Boolean);
    keys.forEach((k) => countsBySlug.set(toSlug(k), count));
  });

  // Always display curated UI cards; overlay real counts when available.
  // ALSO: Include any backend categories that aren't in our curated list!
  const displayTrades = [...defaultTrades];
  
  // Update counts for curated cards
  displayTrades.forEach((trade, idx) => {
    const slug = toSlug(trade.name || trade.title);
    const count = countsBySlug.get(slug);
    if (typeof count === 'number') {
      displayTrades[idx].tradesperson_count = count;
      // Mark as matched so we don't add it again
      countsBySlug.delete(slug);
    }
  });

  // Add remaining backend categories that weren't in curated list
  backendCategories.forEach((cat) => {
    const slug = toSlug(cat.name || cat.title);
    if (countsBySlug.has(slug)) {
      displayTrades.push({
        name: cat.name,
        title: cat.title || cat.name,
        description: cat.description || `Professional ${cat.name} services for your home and business.`,
        tradesperson_count: typeof cat.tradesperson_count === 'number' ? cat.tradesperson_count : (cat.count || 0),
        icon: cat.icon || '🛠️',
        color: cat.color || 'from-green-400 to-green-600'
      });
    }
  });

  if (error) {
    console.warn('Failed to load categories, using defaults:', error);
  }

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src="/mockup/bag.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
      </div>
      
      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] opacity-15"
          style={{ background: '#34D164' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
          style={{ background: '#4a90e2' }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
              <Sparkles className="w-4 h-4 text-[#34D164]" />
              <span className="text-xs font-semibold font-lato tracking-wider uppercase text-white/70">
                Expert Services
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-white mb-5">
              Popular <span className="text-[#34D164]">trades</span>
            </h2>
            <p className="text-lg text-white/50 font-lato max-w-xl mx-auto">
              Browse our most popular categories and find the right specialist for your project
            </p>
          </div>

          {/* Trade Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayTrades.slice(0, 6).map((trade, index) => {
              const IconComponent = trade.icon || Hammer;
              return (
                <div
                  key={index}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/trade-categories/${toSlug(trade.name || trade.title)}`)}
                >
                  {/* Glass Card */}
                  <div className="relative h-full p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-400">
                    {/* Top row: Icon + Arrow */}
                    <div className="flex items-start justify-between mb-5">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center group-hover:bg-[#34D164]/10 group-hover:border-[#34D164]/20 transition-all duration-300">
                        <IconComponent className="w-6 h-6 text-white/60 group-hover:text-[#34D164] transition-colors duration-300" />
                      </div>
                      
                      {/* Arrow */}
                      <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-white/60" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold font-montserrat text-white mb-2 group-hover:text-[#34D164] transition-colors duration-300">
                      {trade.title || trade.name}
                    </h3>

                    {/* Description */}
                    <p className="text-white/40 font-lato text-sm leading-relaxed mb-4">
                      {trade.description}
                    </p>

                    {/* Bottom: Count */}
                    <div className="pt-4 border-t border-white/[0.05]">
                      <span className="text-xs font-medium font-lato text-white/30">
                        {loading ? (
                          <span className="inline-block w-16 h-3 bg-white/10 rounded animate-pulse" />
                        ) : (
                          `${trade.tradesperson_count} professionals available`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center mt-14">
            <Button 
              onClick={() => navigate('/trade-categories')}
              className="group inline-flex items-center gap-3 bg-[#34D164] hover:bg-[#2ab854] text-white px-8 py-4 text-base font-medium font-lato rounded-xl shadow-lg shadow-[#34D164]/20 hover:shadow-xl hover:shadow-[#34D164]/30 transition-all duration-300"
            >
              View all categories
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularTrades;