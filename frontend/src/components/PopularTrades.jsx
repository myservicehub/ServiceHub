import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statsAPI } from '../api/services';
import { useAPI } from '../hooks/useAPI';
import TradeIcon from './TradeIcon';

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

  // Fallback data while loading or on error
  const defaultTrades = [
    {
      name: 'Building',
      title: 'Building & Construction',
      description: 'From foundation to roofing, find experienced builders for your construction projects. Quality workmanship guaranteed.',
      tradesperson_count: 0,
      icon: '🏗️',
      color: 'from-orange-400 to-orange-600'
    },
    {
      name: 'Plumbing',
      title: 'Plumbing & Water Works',
      description: 'Professional plumbers for installations, repairs, and water system maintenance. Available for emergency services.',
      tradesperson_count: 0,
      icon: '🔧',
      color: 'from-indigo-400 to-indigo-600'
    },
    {
      name: 'Electrical Repairs',
      title: 'Electrical Installation',
      description: 'Certified electricians for wiring, installations, and electrical repairs. Safe and reliable electrical services.',
      tradesperson_count: 0,
      icon: '⚡',
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      name: 'Painting',
      title: 'Painting & Decorating',
      description: 'Transform your space with professional painters and decorators. Interior and exterior painting services available.',
      tradesperson_count: 0,
      icon: '🎨',
      color: 'from-blue-400 to-blue-600'
    },
    {
      name: 'Plastering/POP',
      title: 'POP & Ceiling Works',
      description: 'Expert ceiling installation and POP works. Modern designs and professional finishing for your interior spaces.',
      tradesperson_count: 0,
      icon: '🏠',
      color: 'from-purple-400 to-purple-600'
    },
    {
      name: 'Generator Services',
      title: 'Generator Installation',
      description: 'Professional generator installation and maintenance services. Reliable power solutions for homes and businesses.',
      tradesperson_count: 0,
      icon: '🔌',
      color: 'from-red-400 to-red-600'
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

  // Always display curated UI cards; overlay real counts when available
  const displayTrades = defaultTrades.map((trade) => {
    const slug = toSlug(trade.name || trade.title);
    const count = countsBySlug.get(slug);
    return {
      ...trade,
      tradesperson_count: typeof count === 'number' ? count : 0,
    };
  });

  if (error) {
    console.warn('Failed to load categories, using defaults:', error);
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Popular trades
            </h2>
            <p className="text-xl text-gray-600">
              Browse our most popular trade categories and find the right specialist for your project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTrades.slice(0, 6).map((trade, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/trade-categories/${toSlug(trade.name || trade.title)}`)}
              >
                <CardContent className="p-6">
                  <div className="mb-4">
                    <TradeIcon name={trade.title || trade.name} size={100} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                    {trade.title || trade.name}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {trade.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {loading ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      ) : (
                        `${typeof trade.tradesperson_count === 'number' 
                          ? trade.tradesperson_count.toLocaleString() 
                          : trade.tradesperson_count} tradespeople in Nigeria`
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trade-categories/${toSlug(trade.name || trade.title)}`);
                      }}
                    >
                      View all <ArrowRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => navigate('/trade-categories')}
            >
              View all trade categories
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularTrades;