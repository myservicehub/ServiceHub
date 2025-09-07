import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { statsAPI } from '../api/services';
import { useAPI } from '../hooks/useAPI';

// Nigerian Trade Categories
const NIGERIAN_TRADE_CATEGORIES = [
  "Building",
  "Concrete Works", 
  "Tiling",
  "CCTV & Security Systems",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Renovations",
  "Relocation/Moving",
  "Painting",
  "Carpentry",
  "General Handyman Work",
  "Bathroom Fitting",
  "Generator Services",
  "Home Extensions",
  "Scaffolding",
  "Waste Disposal",
  "Flooring",
  "Plastering/POP",
  "Cleaning",
  "Electrical Repairs",
  "Solar & Inverter Installation",
  "Plumbing",
  "Welding",
  "Furniture Making",
  "Interior Design",
  "Roofing",
  "Locksmithing",
  "Recycling"
];

const PopularTrades = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: categoriesData, loading, error } = useAPI(() => statsAPI.getCategories());

  // Fallback data while loading or on error
  const defaultTrades = [
    {
      title: 'Building & Construction',
      description: 'From foundation to roofing, find experienced builders for your construction projects. Quality workmanship guaranteed.',
      tradesperson_count: '15,234',
      icon: '🏗️',
      color: 'from-orange-400 to-orange-600'
    },
    {
      title: 'Plumbing & Water Works',
      description: 'Professional plumbers for installations, repairs, and water system maintenance. Available for emergency services.',
      tradesperson_count: '8,721',
      icon: '🔧',
      color: 'from-indigo-400 to-indigo-600'
    },
    {
      title: 'Electrical Installation',
      description: 'Certified electricians for wiring, installations, and electrical repairs. Safe and reliable electrical services.',
      tradesperson_count: '12,543',
      icon: '⚡',
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      title: 'Painting & Decorating',
      description: 'Transform your space with professional painters and decorators. Interior and exterior painting services available.',
      tradesperson_count: '18,934',
      icon: '🎨',
      color: 'from-blue-400 to-blue-600'
    },
    {
      title: 'POP & Ceiling Works',
      description: 'Expert ceiling installation and POP works. Modern designs and professional finishing for your interior spaces.',
      tradesperson_count: '6,234',
      icon: '🏠',
      color: 'from-purple-400 to-purple-600'
    },
    {
      title: 'Generator Installation',
      description: 'Professional generator installation and maintenance services. Reliable power solutions for homes and businesses.',
      tradesperson_count: '4,876',
      icon: '🔌',
      color: 'from-red-400 to-red-600'
    }
  ];

  // Use real categories if available, otherwise use defaults
  const displayTrades = categoriesData?.categories || defaultTrades;

  // Filter categories for dropdown
  const filteredCategories = NIGERIAN_TRADE_CATEGORIES.filter(category =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowDropdown(false);
    setSearchTerm('');
    // Here you could add navigation or filtering logic
    console.log('Selected category:', category);
  };

  if (error) {
    console.warn('Failed to load categories, using defaults:', error);
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-montserrat" style={{color: '#121E3C'}}>
              Popular Trades
            </h2>
            <p className="text-xl text-gray-600 font-lato mb-8">
              Browse our most popular trade categories and find the right specialist for your project.
            </p>
            
            {/* Trade Categories Dropdown */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between hover:border-green-500 focus:border-green-500 focus:outline-none transition-colors"
                >
                  <span className="text-gray-700 font-lato">
                    {selectedCategory || 'Browse all trade categories (28)'}
                  </span>
                  <ChevronDown 
                    size={20} 
                    className={`text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search trade categories..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Categories List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category, index) => (
                          <button
                            key={index}
                            onClick={() => handleCategorySelect(category)}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 hover:text-green-700 transition-colors font-lato text-sm border-b border-gray-50 last:border-b-0"
                          >
                            {category}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm font-lato">
                          No categories found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                    
                    {/* Show All Categories Footer */}
                    <div className="p-3 border-t border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-600 font-lato text-center">
                        {NIGERIAN_TRADE_CATEGORIES.length} total service categories available
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selected Category Display */}
              {selectedCategory && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-lato text-sm">
                    <span className="font-semibold">Selected:</span> {selectedCategory}
                  </p>
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="mt-2 text-xs text-green-600 hover:text-green-700 font-lato underline"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTrades.slice(0, 6).map((trade, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${trade.color} flex items-center justify-center mb-4 text-2xl`}>
                    {trade.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-green-600 transition-colors font-montserrat">
                    {trade.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3 font-lato">
                    {trade.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-lato">
                      {loading ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      ) : (
                        `${typeof trade.tradesperson_count === 'number' 
                          ? trade.tradesperson_count.toLocaleString() 
                          : trade.tradesperson_count} tradespeople in Nigeria`
                      )}
                    </span>
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 p-0 font-lato">
                      View all <ArrowRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              View all trade categories
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularTrades;