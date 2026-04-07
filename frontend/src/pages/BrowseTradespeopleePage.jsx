import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Search,
  MapPin, 
  Star, 
  Filter,
  Grid,
  List,
  User,
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Loader2,
  SlidersHorizontal,
  Award,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { tradespeopleAPI, statsAPI, authAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useStates } from '../hooks/useStates';

const BrowseTradespeopleePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { states: locations } = useStates();

  const getSearchState = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      trade: searchParams.get('trade') || searchParams.get('category') || location.state?.trade || location.state?.category || '',
      locationParam: searchParams.get('location') || location.state?.location || '',
      query: searchParams.get('q') || location.state?.query || ''
    };
  };

  const initialSearchState = getSearchState();

  const [tradespeople, setTradespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchState.query);
  const [selectedTrade, setSelectedTrade] = useState(initialSearchState.trade);
  const [selectedLocation, setSelectedLocation] = useState(initialSearchState.locationParam);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('rating');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTradespeople, setTotalTradespeople] = useState(0);
  const [tradeCategories, setTradeCategories] = useState([]);

  const normalizeValue = (value) => String(value || '').trim().toLowerCase();

  const tradespersonMatchesTrade = (tradesperson, trade) => {
    if (!trade) return true;

    const normalizedTrade = normalizeValue(trade);
    const categories = Array.isArray(tradesperson?.trade_categories)
      ? tradesperson.trade_categories
      : [];

    const candidates = [
      tradesperson?.main_trade,
      tradesperson?.profession,
      ...(categories || [])
    ]
      .map(normalizeValue)
      .filter(Boolean);

    return candidates.includes(normalizedTrade);
  };

  const FALLBACK_TRADES = [
    'Building', 'Concrete Works', 'Tiling', 'Door & Window Installation',
    'Air Conditioning & Refrigeration', 'Plumbing', 'Home Extensions',
    'Scaffolding', 'Flooring', 'Bathroom Fitting', 'Generator Services',
    'Welding', 'Renovations', 'Painting', 'Carpentry', 'Interior Design',
    'Solar & Inverter Installation', 'Locksmithing', 'Roofing',
    'Plastering/POP', 'Furniture Making', 'Electrical Repairs',
    'CCTV & Security Systems', 'General Handyman Work',
    'Cleaning', 'Relocation/Moving', 'Waste Disposal', 'Recycling'
  ];

  useEffect(() => {
    const fetchTradeCategories = async () => {
      try {
        setLoadingCategories(true);
        const authRes = await authAPI.getTradeCategories();
        const authCats = authRes?.categories || authRes?.trades || [];
        const authNames = Array.isArray(authCats)
          ? authCats.map((c) => (typeof c === 'string' ? c : c?.name || c?.title)).filter(Boolean)
          : [];
        if (authNames.length > 0) {
          setTradeCategories([...new Set(authNames)]);
          return;
        }
        const statsRes = await statsAPI.getCategories();
        const statsCats = statsRes?.categories || statsRes?.data || statsRes;
        if (Array.isArray(statsCats)) {
          const names = statsCats.map((c) => c.name || c.title).filter(Boolean);
          if (names.length > 0) {
            setTradeCategories([...new Set(names)]);
            return;
          }
        }
        setTradeCategories(FALLBACK_TRADES);
      } catch (error) {
        console.error('Failed to load trade categories:', error);
        setTradeCategories(FALLBACK_TRADES);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchTradeCategories();
  }, []);

  useEffect(() => {
    // Get initial search params from URL or location state
    const { trade, locationParam, query } = getSearchState();
    setSelectedTrade(trade);
    setSelectedLocation(locationParam);
    setSearchQuery(query);
  }, [location]);

  useEffect(() => {
    loadTradespeople();
  }, [currentPage, sortBy, selectedTrade, selectedLocation, minRating, searchQuery]);

  const loadTradespeople = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        sort_by: sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedTrade && { trade: selectedTrade }),
        ...(selectedLocation && { location: selectedLocation }),
        ...(minRating > 0 && { min_rating: minRating })
      };

      const response = await tradespeopleAPI.getAllTradespeople(params);
      const rows = response.tradespeople || response.data || [];
      const visibleRows = Array.isArray(rows)
        ? rows.filter((item) => item?.business_name?.trim() && tradespersonMatchesTrade(item, selectedTrade))
        : [];
      setTradespeople(visibleRows);
      setTotalPages(response.total_pages || 1);
      setTotalTradespeople(response.total || visibleRows.length);
    } catch (error) {
      console.error('Failed to load tradespeople:', error);
      toast({
        title: "Error",
        description: "Failed to load tradespeople. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadTradespeople();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTrade('');
    setSelectedLocation('');
    setMinRating(0);
    setCurrentPage(1);
  };

  const handleViewProfile = (tradesperson) => {
    const tradespersonId =
      tradesperson?.id ||
      tradesperson?.tradesperson_id ||
      tradesperson?.user_id ||
      tradesperson?._id;
    if (!tradespersonId) {
      toast({
        title: "Profile unavailable",
        description: "This tradesperson profile cannot be opened right now.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/tradesperson/${tradespersonId}`);
  };

  const handleContactTradesperson = (tradesperson) => {
    if (!isAuthenticated()) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to contact tradespeople.",
        variant: "destructive",
      });
      return;
    }

    navigate('/post-job', { 
      state: { 
        preferredTradesperson: tradesperson,
        category: tradesperson.main_trade 
      } 
    });
  };

  const getStarRating = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        className={index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  const getExperienceRaw = (tradesperson) => {
    return (
      tradesperson?.experience_level ??
      tradesperson?.experience ??
      tradesperson?.experience?.years ??
      tradesperson?.experience?.years_of_experience ??
      tradesperson?.experienceYears ??
      tradesperson?.yearsExperience ??
      tradesperson?.experience_years ??
      tradesperson?.experienceYear ??
      tradesperson?.experienceyear ??
      tradesperson?.years_experience ??
      tradesperson?.years_of_experience ??
      tradesperson?.professional_information?.experience_level ??
      tradesperson?.professional_information?.experience_years ??
      tradesperson?.professional_information?.years_experience ??
      tradesperson?.professional_information?.years_of_experience ??
      tradesperson?.professionalInformation?.experienceLevel ??
      tradesperson?.professionalInformation?.experienceYears ??
      tradesperson?.professionalInformation?.experience_years ??
      tradesperson?.professionalInformation?.yearsExperience ??
      tradesperson?.professionalInformation?.years_experience ??
      tradesperson?.professionalInformation?.years_of_experience ??
      tradesperson?.user?.experience_level ??
      tradesperson?.user?.experience_years ??
      tradesperson?.user?.years_experience ??
      tradesperson?.user?.years_of_experience ??
      tradesperson?.user?.yearsExperience ??
      tradesperson?.profile?.experience_level ??
      tradesperson?.profile?.experience_years ??
      tradesperson?.profile?.years_experience ??
      tradesperson?.profile?.years_of_experience ??
      tradesperson?.profile?.yearsExperience ??
      null
    );
  };

  const getExperienceYears = (tradesperson) => {
    const raw = getExperienceRaw(tradesperson);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const nums = raw.match(/\d+/g)?.map(Number) || [];
      if (nums.length === 0) return 0;
      if (nums.length === 1) return nums[0];
      return Math.max(...nums);
    }
    return 0;
  };

  const getDisplayName = (tradesperson) => {
    return tradesperson?.business_name?.trim() || tradesperson?.company_name?.trim() || tradesperson?.name || 'Unknown';
  };

  const getExperienceLevel = (tradesperson) => {
    const raw = getExperienceRaw(tradesperson);
    if (typeof raw === 'string' && raw.trim()) {
      const normalized = raw.trim();
      if (/0\s*-\s*1/.test(normalized) || /\bnew to the trade\b/i.test(normalized)) {
        return { label: 'New to the trade', color: 'bg-yellow-100 text-yellow-800' };
      }
      if (/1\s*-\s*3/.test(normalized) || /\bsome experience\b/i.test(normalized)) {
        return { label: 'Some experience', color: 'bg-green-100 text-green-800' };
      }
      if (/3\s*-\s*5/.test(normalized) || /\bexperienced\b/i.test(normalized)) {
        return { label: 'Experienced', color: 'bg-blue-100 text-blue-800' };
      }
      if (/5\s*-\s*10/.test(normalized) || /\bvery experienced\b/i.test(normalized)) {
        return { label: 'Very experienced', color: 'bg-indigo-100 text-indigo-800' };
      }
      if (/10\s*\+/.test(normalized) || /\bexpert level\b/i.test(normalized) || /\bexpert\b/i.test(normalized)) {
        return { label: 'Expert level', color: 'bg-purple-100 text-purple-800' };
      }
    }
    const experience = getExperienceYears(tradesperson);
    const hasExplicitExperience = raw !== null && raw !== undefined && `${raw}`.trim() !== '';
    if (hasExplicitExperience && experience <= 0) return { label: 'New to the trade', color: 'bg-yellow-100 text-yellow-800' };
    if (experience >= 10) return { label: 'Expert level', color: 'bg-purple-100 text-purple-800' };
    if (experience >= 5) return { label: 'Very experienced', color: 'bg-indigo-100 text-indigo-800' };
    if (experience >= 3) return { label: 'Experienced', color: 'bg-blue-100 text-blue-800' };
    if (experience >= 1) return { label: 'Some experience', color: 'bg-green-100 text-green-800' };
    // If the field is missing/empty, don't show "Not set"—default to the lowest level.
    return { label: 'New to the trade', color: 'bg-yellow-100 text-yellow-800' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short'
    });
  };

  const TradespersonCard = ({ tradesperson, isListView = false }) => {
    const experienceLevel = getExperienceLevel(tradesperson);
    const displayName = getDisplayName(tradesperson);
    const verificationIcon = tradesperson.is_verified ? CheckCircle : AlertCircle;
    const verificationColor = tradesperson.is_verified ? 'text-green-600' : 'text-gray-500';

    if (isListView) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex gap-5">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden">
                {tradesperson.profile_image ? (
                  <img
                    src={tradesperson.profile_image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121E3C] to-[#1a2d4f]">
                    <User size={20} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C] truncate">
                      {displayName}
                    </h3>
                    {React.createElement(verificationIcon, { 
                      size: 14, 
                      className: verificationColor 
                    })}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Briefcase size={12} />
                      <span>{tradesperson.main_trade}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
                    </div>
                    <Badge className={`${experienceLevel.color} text-xs`}>
                      {experienceLevel.label}
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
                    <span className="text-xs font-medium text-gray-700">
                      {(tradesperson.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({tradesperson.total_reviews || 0} reviews)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProfile(tradesperson);
                    }}
                    className="rounded-lg"
                  >
                    <Eye size={14} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactTradesperson(tradesperson);
                    }}
                    className="text-white rounded-lg bg-[#34D164] hover:bg-[#2ab854]"
                  >
                    <MessageCircle size={14} />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                <div className="flex items-center gap-1">
                  <TrendingUp size={11} />
                  <span>{tradesperson.completed_jobs || 0} jobs</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>{tradesperson.response_time || 2}h response</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-[#34D164]/20 transition-all duration-300 cursor-pointer">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#34D164] to-[#2ab854] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="p-6">
          {/* Profile Image */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden ring-4 ring-gray-50 group-hover:ring-[#34D164]/10 transition-all duration-300">
                {tradesperson.profile_image ? (
                  <img
                    src={tradesperson.profile_image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121E3C] to-[#1a2d4f]">
                    <User size={28} className="text-white" />
                  </div>
                )}
              </div>
              {tradesperson.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#34D164] rounded-full flex items-center justify-center ring-2 ring-white">
                  <CheckCircle size={14} className="text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold font-montserrat text-[#121E3C] mb-1">
              {displayName}
            </h3>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#121E3C]/5 rounded-full text-xs text-[#121E3C] font-medium mb-3">
              <Briefcase size={11} />
              <span>{tradesperson.main_trade}</span>
            </div>

            <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-4">
              <MapPin size={12} />
              <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
              <span className="text-sm font-semibold text-[#121E3C]">
                {(tradesperson.average_rating || 0).toFixed(1)}
              </span>
            </div>

            <div className="text-xs text-gray-400 mb-4">
              {tradesperson.total_reviews || 0} reviews • {tradesperson.completed_jobs || 0} jobs
            </div>

            <Badge className={`${experienceLevel.color} text-xs px-3 py-1`}>
              {experienceLevel.label}
            </Badge>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(tradesperson);
                }}
                className="flex-1 rounded-xl text-xs h-10 border-gray-200 hover:border-[#121E3C] hover:bg-[#121E3C] hover:text-white transition-all duration-300"
              >
                <Eye size={14} className="mr-1.5" />
                View Profile
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContactTradesperson(tradesperson);
                }}
                className="flex-1 text-white rounded-xl text-xs h-10 bg-[#34D164] hover:bg-[#2ab854] transition-all duration-300"
              >
                <MessageCircle size={14} className="mr-1.5" />
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/80 via-[#121E3C]/70 to-[#121E3C]/80" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-5 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              Verified Professionals
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-4 leading-tight">
              Find Skilled Tradespeople
            </h1>
            <p className="text-white/70 font-lato mb-8 max-w-xl mx-auto">
              Browse verified professionals and read reviews from homeowners
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by name, trade, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:border-[#34D164]"
                />
              </div>
              <Button type="submit" className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5">
                <Search size={18} />
              </Button>
            </form>
          </div>
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-8">
        {/* Filters Bar */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg"
            >
              <SlidersHorizontal size={16} />
              Filters
            </Button>

            <select
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-[#34D164]"
            >
              <option value="">All Trades</option>
              {tradeCategories.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-[#34D164]"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-[#34D164]"
            >
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="experience">Most Experienced</option>
              <option value="recent">Newest Members</option>
            </select>

            {(searchQuery || selectedTrade || selectedLocation || minRating > 0) && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm text-gray-500">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-[#34D164]"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={1}>1+ Stars</option>
                    <option value={2}>2+ Stars</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={5}>5 Stars Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <p className="text-gray-600">
              {totalTradespeople} tradespeople found
            </p>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#34D164'}} />
              <p className="text-gray-600">Loading tradespeople...</p>
            </div>
          </div>
        ) : tradespeople.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No tradespeople found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or clearing filters.
            </p>
            <Button onClick={clearFilters} style={{backgroundColor: '#34D164'}} className="text-white">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Tradespeople Grid/List */}
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
              : "space-y-4 mb-8"
            }>
              {tradespeople.map((tradesperson) => (
                <TradespersonCard 
                  key={tradesperson.id} 
                  tradesperson={tradesperson}
                  isListView={viewMode === 'list'}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-500">...</span>
                      <Button
                        variant={currentPage === totalPages ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BrowseTradespeopleePage;
