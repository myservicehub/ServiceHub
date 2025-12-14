import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tradespeopleAPI } from '../api/services';
import apiClient from '../api/client';
import { useToast } from '../hooks/use-toast';
import useStates from '../hooks/useStates';

// Fallback trade categories (used while loading or if API fails)
const FALLBACK_TRADE_CATEGORIES = [
  // Column 1
  "Building",
  "Concrete Works",
  "Tiling",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Plumbing",

  // Column 2
  "Home Extensions",
  "Scaffolding",
  "Flooring",
  "Bathroom Fitting",
  "Generator Services",
  "Welding",

  // Column 3
  "Renovations",
  "Painting",
  "Carpentry",
  "Interior Design",
  "Solar & Inverter Installation",
  "Locksmithing",

  // Column 4
  "Roofing",
  "Plastering/POP",
  "Furniture Making",
  "Electrical Repairs",
  "CCTV & Security Systems",
  "General Handyman Work",
  // Additional services to maintain strict 28
  "Cleaning",
  "Relocation/Moving",
  "Waste Disposal",
  "Recycling"
];

// Hero image source: supports remote URL via VITE_HERO_IMAGE_URL
// and falls back to the local public asset at /hero.jpg
const HERO_IMAGE_SRC =
  (import.meta?.env?.VITE_HERO_IMAGE_URL) || '/hero.jpg';

const HeroSection = () => {
  const [job, setJob] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
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
    <section className="pt-8 md:pt-10 lg:pt-12 pb-16 lg:pb-24" style={{ background: '#121E3C' }}>
      <div className="container mx-auto px-4">
        <div className="md:grid md:grid-cols-2 md:items-start md:gap-8 lg:gap-12">
          <div className="max-w-4xl mx-auto md:mx-0 text-center md:text-left">
          <h1 className="text-4xl lg:text-6xl font-bold font-montserrat mb-6 text-white">
            The reliable way to hire a{' '}
            <span style={{color: '#34D164'}}>tradeperson</span>
          </h1>
          {/* Image under headline: mobile uses contained width, desktop goes full-bleed */}
          {/* Mobile (kept as-is) */}
          <div className="w-full flex justify-center mb-8 md:hidden">
            <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
              <img
                src={HERO_IMAGE_SRC}
                alt="Skilled tradesperson at work"
                loading="lazy"
                className="w-full h-64 sm:h-80 object-cover object-center"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121E3C]/30 via-transparent to-transparent" aria-hidden="true"></div>
            </div>
          </div>

          
          <p className="text-xl text-gray-200 font-lato mb-8 max-w-2xl mx-auto">
            Post your job for free and connect with vetted, local tradespeople across Nigeria. 
            Read genuine reviews from homeowners like you.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
              {/* Job Category Dropdown */}
              <div className="flex-1 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <button
                    type="button"
                    onClick={toggleJobDropdown}
                    className="w-full h-12 pl-10 pr-10 text-left text-lg font-lato border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white hover:border-gray-400 transition-colors truncate whitespace-nowrap"
                  >
                    <span className={job ? 'text-gray-900' : 'text-gray-500'}>
                      {job || 'What job do you need doing?'}
                    </span>
                  </button>
                  <ChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${showJobDropdown ? 'rotate-180' : ''}`} 
                    size={20} 
                  />
                  
                  {/* Job Categories Dropdown */}
                  {showJobDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {/* Search input inside dropdown */}
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={jobSearch}
                          onChange={handleJobInputChange}
                          placeholder="Search job categories..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                          autoFocus
                        />
                      </div>
                      
                      {/* Loading state */}
                      {loadingTrades && (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          Loading trade categories...
                        </div>
                      )}
                      
                      {/* Filtered categories */}
                      {!loadingTrades && filteredTradeCategories.length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          No categories found matching "{jobSearch}"
                        </div>
                      )}
                      
                      {!loadingTrades && filteredTradeCategories.map((category, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleJobSelect(category)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 hover:text-green-700 transition-colors font-lato border-b border-gray-100 last:border-b-0"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Dropdown */}
              <div className="flex-1 relative">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <button
                    type="button"
                    onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                    className="w-full h-12 pl-10 pr-10 text-left text-lg font-lato border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white hover:border-gray-400 transition-colors truncate whitespace-nowrap"
                  >
                    <span className={location ? 'text-gray-900' : 'text-gray-500'}>
                      {location || 'Where are you based?'}
                    </span>
                  </button>
                  <ChevronDown 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} 
                    size={20} 
                  />
                  
                  {/* Location States Dropdown */}
                  {showLocationDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      {nigerianStates.map((state, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleLocationSelect(state)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 hover:text-green-700 transition-colors font-lato border-b border-gray-100 last:border-b-0"
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSearching}
                className="text-white h-12 px-8 text-lg font-semibold font-lato disabled:opacity-50 hover:opacity-90"
                style={{backgroundColor: '#121E3C'}}
              >
                {isSearching ? 'Searching...' : 'Find tradespeople'}
              </Button>
            </div>
          </form>

          <p className="text-gray-300 text-sm font-lato mb-6">
            Posting is free and only takes a couple of minutes
          </p>

          {/* Alternative CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center">
            <Button 
              onClick={() => navigate('/post-job')}
              className="text-white px-8 py-3 text-lg font-lato font-semibold hover:opacity-90"
              style={{backgroundColor: '#34D164'}}
            >
              <Plus size={20} className="mr-2" />
              Post a Job Now
            </Button>
            <span className="text-gray-300 font-lato">or use the search above to find local tradespeople</span>
          </div>
        </div>

        {/* Desktop + larger screens: right column image */}
        <div className="hidden md:flex justify-end md:col-span-1">
          <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
            <img
              src={HERO_IMAGE_SRC}
              alt="Skilled tradesperson at work"
              loading="lazy"
              className="w-full h-[28rem] lg:h-[36rem] object-cover object-center"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121E3C]/30 via-transparent to-transparent" aria-hidden="true"></div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default HeroSection;


