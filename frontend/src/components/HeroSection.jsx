import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Button } from './ui/button';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../hooks/use-toast';
import useStates from '../hooks/useStates';
import gsap from 'gsap';
import { BackgroundImage } from './ui/optimized-image';

// Fallback trade categories (used while loading or if API fails)
const FALLBACK_TRADE_CATEGORIES = [
  "Building",
  "Concrete Works",
  "Tiling",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Plumbing",
  "Home Extensions",
  "Scaffolding",
  "Flooring",
  "Bathroom Fitting",
  "Generator Services",
  "Welding",
  "Renovations",
  "Painting",
  "Carpentry",
  "Interior Design",
  "Solar & Inverter Installation",
  "Locksmithing",
  "Roofing",
  "Plastering/POP",
  "Furniture Making",
  "Electrical Repairs",
  "CCTV & Security Systems",
  "General Handyman Work",
  "Cleaning",
  "Relocation/Moving",
  "Waste Disposal",
  "Recycling"
];

// Hero background image
const HERO_BG_IMAGE = '/stock/bg6.jpg';

const HeroSection = () => {
  const [job, setJob] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // GSAP animation refs
  const bgImageRef = useRef(null);
  const headlineRef = useRef(null);
  const subtextRef = useRef(null);
  const searchFormRef = useRef(null);
  const helperTextRef = useRef(null);
  const statsRef = useRef(null);
  const [tradeCategories, setTradeCategories] = useState(FALLBACK_TRADE_CATEGORIES);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { states: nigerianStates, loading: statesLoading } = useStates();

  // Fetch trade categories from API
  useEffect(() => {
    const fetchTradeCategories = async () => {
      try {
        setLoadingTrades(true);
        const { data } = await apiClient.get('/auth/trade-categories');

        if (data && Array.isArray(data.categories)) {
          setTradeCategories(data.categories);
          console.log('âœ… Loaded trade categories from API:', data.categories.length, 'categories');
          console.log('ðŸ“‹ Categories:', data.categories.slice(0, 5), '...');
        } else {
          console.log('âš ï¸ Invalid API response format:', data);
          setTradeCategories(FALLBACK_TRADE_CATEGORIES);
        }
      } catch (error) {
        console.error('âŒ Error fetching trade categories:', error);
        setTradeCategories(FALLBACK_TRADE_CATEGORIES);
      } finally {
        setLoadingTrades(false);
      }
    };

    fetchTradeCategories();
  }, []);

  // GSAP animations on mount
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Background image zoom out animation
      if (bgImageRef.current) {
        gsap.fromTo(bgImageRef.current,
          { scale: 1.15 },
          { scale: 1, duration: 2.5, ease: 'power2.out' }
        );
      }

      // Staggered content animations
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Headline slides up and fades in first
      if (headlineRef.current) {
        tl.fromTo(headlineRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          0.3
        );
      }

      // Subtext follows
      if (subtextRef.current) {
        tl.fromTo(subtextRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.5
        );
      }

      // Search form
      if (searchFormRef.current) {
        tl.fromTo(searchFormRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.7
        );
      }

      // Helper text
      if (helperTextRef.current) {
        tl.fromTo(helperTextRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          0.9
        );
      }

      // Stats on the right
      if (statsRef.current) {
        tl.fromTo(statsRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          0.6
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Filter trade categories based on search input
  const filteredTradeCategories = tradeCategories.filter(category =>
    category.toLowerCase().includes(jobSearch.toLowerCase())
  );

  const handleJobSelect = (selectedJob) => {
    setJob(selectedJob);
    setShowJobDropdown(false);
    setJobSearch('');
  };

  const handleJobInputChange = (e) => {
    setJobSearch(e.target.value);
    if (!showJobDropdown) {
      setShowJobDropdown(true);
    }
  };

  const toggleJobDropdown = () => {
    const next = !showJobDropdown;
    setShowJobDropdown(next);
    if (next) {
      // Reset filter when opening to show full list
      setJobSearch('');
    }
  };

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowLocationDropdown(false);
  };

    const handleSearch = async (e) => {
    e.preventDefault();

    if (!job.trim()) {
      toast({
        title: "Trade required",
        description: "Please select what job you need doing.",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: "Location required",
        description: "Please select your location.",
        variant: "destructive",
      });
      return;
    }

    // Redirect to Post Job and prefill the category with the selected trade
    navigate('/post-job', {
      state: {
        initialCategory: job,
        initialState: location,
      },
    });
  };

  return (
    <section className="relative min-h-[100vh] flex flex-col pt-14">
      {/* Full-screen background image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          ref={bgImageRef}
          src={HERO_BG_IMAGE}
          alt=""
          className="w-full h-full object-cover object-top"
          loading="eager"
        />
        {/* Gradient overlays for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      </div>

      {/* Content positioned at bottom */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-12 md:pb-16 lg:pb-20">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-12">
            {/* Left side - Text and Search */}
            <div className="max-w-xl">
              {/* Main headline - smaller, with green impact word */}
              <h1 ref={headlineRef} className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-white mb-4 leading-[1.15] tracking-tight opacity-0">
                Hire <span className="text-[#34D164]">Tradespeople</span> with Confidence
              </h1>

              {/* Subtext */}
              <p ref={subtextRef} className="text-base sm:text-lg text-white/70 font-lato mb-8 leading-relaxed opacity-0">
                Verified professionals. Transparent reviews. Structured hiring — all in one place.
              </p>

              {/* Minimal Search Form - Glass morphism style */}
              <form ref={searchFormRef} onSubmit={handleSearch} className="mb-6 opacity-0">
                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  {/* Job Category Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={toggleJobDropdown}
                      className="w-full h-12 px-4 text-left font-lato bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                      <Search className="text-gray-400 flex-shrink-0" size={18} />
                      <span className={`flex-1 truncate text-sm ${job ? 'text-gray-900' : 'text-gray-500'}`}>
                        {job || 'What do you need?'}
                      </span>
                      <ChevronDown 
                        className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${showJobDropdown ? 'rotate-180' : ''}`} 
                        size={16} 
                      />
                    </button>
                    
                    {/* Job Categories Dropdown */}
                    {showJobDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-72 overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={jobSearch}
                            onChange={handleJobInputChange}
                            placeholder="Search services..."
                            className="w-full px-3 py-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34D164]/50 font-lato text-base"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {loadingTrades && (
                            <div className="px-4 py-3 text-gray-500 text-center text-sm">Loading...</div>
                          )}
                          {!loadingTrades && filteredTradeCategories.length === 0 && (
                            <div className="px-4 py-3 text-gray-500 text-center text-sm">No results found</div>
                          )}
                          {!loadingTrades && filteredTradeCategories.map((category, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleJobSelect(category)}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors font-lato text-gray-700 text-sm"
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                      className="w-full h-12 px-4 text-left font-lato bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                      <MapPin className="text-gray-400 flex-shrink-0" size={18} />
                      <span className={`flex-1 truncate text-sm ${location ? 'text-gray-900' : 'text-gray-500'}`}>
                        {location || 'Location'}
                      </span>
                      <ChevronDown 
                        className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${showLocationDropdown ? 'rotate-180' : ''}`} 
                        size={16} 
                      />
                    </button>
                    
                    {/* Location Dropdown */}
                    {showLocationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-72 overflow-y-auto">
                        {nigerianStates.map((state, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(state)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors font-lato text-gray-700 text-sm"
                          >
                            {state}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="h-12 px-6 text-sm font-semibold font-lato rounded-lg disabled:opacity-50 hover:opacity-90 transition-all duration-200 flex-shrink-0"
                    style={{ backgroundColor: '#34D164', color: 'white' }}
                  >
                    {isSearching ? '...' : 'Find Pros'}
                  </Button>
                </div>
              </form>

              {/* Subtle helper text */}
              <p ref={helperTextRef} className="text-white/40 text-xs font-lato opacity-0">
                Free to post • Verified tradespeople • Trusted by thousands
              </p>
            </div>

            {/* Right side - Stats */}
            <div ref={statsRef} className="flex items-center gap-8 lg:gap-10 opacity-0 relative z-[-1] lg:z-0">
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold font-montserrat text-white">40+</p>
                <p className="text-xs sm:text-sm text-white/50 font-lato">Completed Jobs</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold font-montserrat text-white">100+</p>
                <p className="text-xs sm:text-sm text-white/50 font-lato">Happy Customers</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-bold font-montserrat text-white">4.8★</p>
                <p className="text-xs sm:text-sm text-white/50 font-lato">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


