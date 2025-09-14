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
import { tradespeopleAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const BrowseTradespeopleePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [tradespeople, setTradespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('rating');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTradespeople, setTotalTradespeople] = useState(0);
  const [tradeCategories, setTradeCategories] = useState([]);

  const locations = [
    'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 
    'Benin City', 'Kaduna', 'Warri', 'Jos', 'Calabar'
  ];

  useEffect(() => {
    // Initialize trade categories with fallback
    setTradeCategories([
      'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Roofing', 
      'HVAC', 'Landscaping', 'Cleaning', 'Handyman', 'Masonry',
      'Welding', 'Tiling', 'Security', 'Interior Design', 'Moving'
    ]);
    
    // Get initial search params from URL or location state
    const searchParams = new URLSearchParams(location.search);
    const trade = searchParams.get('trade') || location.state?.trade || '';
    const locationParam = searchParams.get('location') || location.state?.location || '';
    const query = searchParams.get('q') || location.state?.query || '';

    setSelectedTrade(trade);
    setSelectedLocation(locationParam);
    setSearchQuery(query);

    loadTradespeople();
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
      setTradespeople(response.tradespeople || response.data || []);
      setTotalPages(response.total_pages || 1);
      setTotalTradespeople(response.total || 0);
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

  const handleViewProfile = (tradespersonId) => {
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

  const getExperienceLevel = (experience) => {
    if (experience >= 10) return { label: 'Expert', color: 'bg-purple-100 text-purple-800' };
    if (experience >= 5) return { label: 'Professional', color: 'bg-blue-100 text-blue-800' };
    if (experience >= 2) return { label: 'Experienced', color: 'bg-green-100 text-green-800' };
    return { label: 'Beginner', color: 'bg-yellow-100 text-yellow-800' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short'
    });
  };

  const TradespersonCard = ({ tradesperson, isListView = false }) => {
    const experienceLevel = getExperienceLevel(tradesperson.years_experience || 0);
    const verificationIcon = tradesperson.is_verified ? CheckCircle : AlertCircle;
    const verificationColor = tradesperson.is_verified ? 'text-green-600' : 'text-gray-500';

    if (isListView) {
      return (
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                  {tradesperson.profile_image ? (
                    <img
                      src={tradesperson.profile_image}
                      alt={tradesperson.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                      <User size={32} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold font-montserrat">
                        {tradesperson.name}
                      </h3>
                      {React.createElement(verificationIcon, { 
                        size: 16, 
                        className: verificationColor 
                      })}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Briefcase size={14} />
                        <span>{tradesperson.main_trade}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
                      </div>
                      <Badge className={`${experienceLevel.color} text-xs`}>
                        {experienceLevel.label}
                      </Badge>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
                      <span className="text-sm font-medium">
                        {(tradesperson.average_rating || 0).toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({tradesperson.total_reviews || 0} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProfile(tradesperson.id);
                      }}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactTradesperson(tradesperson);
                      }}
                      className="text-white"
                      style={{backgroundColor: '#2F8140'}}
                    >
                      <MessageCircle size={16} />
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                {tradesperson.bio && (
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                    {tradesperson.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    <span>{tradesperson.completed_jobs || 0} jobs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{tradesperson.response_time || 2}h response</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>Member since {formatDate(tradesperson.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          {/* Profile Image */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
              {tradesperson.profile_image ? (
                <img
                  src={tradesperson.profile_image}
                  alt={tradesperson.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                  <User size={32} className="text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-semibold font-montserrat">
                {tradesperson.name}
              </h3>
              {React.createElement(verificationIcon, { 
                size: 16, 
                className: verificationColor 
              })}
            </div>
            
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-2">
              <Briefcase size={14} />
              <span>{tradesperson.main_trade}</span>
            </div>

            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-3">
              <MapPin size={14} />
              <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
              <span className="text-sm font-medium">
                {(tradesperson.average_rating || 0).toFixed(1)}
              </span>
            </div>

            <div className="text-xs text-gray-600 mb-4">
              {tradesperson.total_reviews || 0} reviews • {tradesperson.completed_jobs || 0} jobs
            </div>

            <Badge className={`${experienceLevel.color} mb-4`}>
              {experienceLevel.label} ({tradesperson.years_experience || 0} years)
            </Badge>

            {/* Bio */}
            {tradesperson.bio && (
              <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                {tradesperson.bio}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(tradesperson.id);
                }}
                className="flex-1"
              >
                <Eye size={16} className="mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContactTradesperson(tradesperson);
                }}
                className="flex-1 text-white"
                style={{backgroundColor: '#2F8140'}}
              >
                <MessageCircle size={16} className="mr-1" />
                Contact
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Find Skilled Tradespeople
              </h1>
              <p className="text-gray-600 font-lato">
                Browse verified professionals and read reviews from homeowners
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Back
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name, trade, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" style={{backgroundColor: '#2F8140'}} className="text-white">
              <Search size={18} className="mr-2" />
              Search
            </Button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal size={18} />
              Filters
            </Button>

            <select
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Trades</option>
              {tradeCategories.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="experience">Most Experienced</option>
              <option value="recent">Newest Members</option>
            </select>

            {(searchQuery || selectedTrade || selectedLocation || minRating > 0) && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Rating</label>
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm"
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
              </CardContent>
            </Card>
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
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#2F8140'}} />
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
            <Button onClick={clearFilters} style={{backgroundColor: '#2F8140'}} className="text-white">
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