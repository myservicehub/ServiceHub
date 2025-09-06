import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Search,
  Filter,
  Briefcase,
  HandHeart,
  Heart,
  Map,
  List,
  Navigation,
  Settings,
  Crosshair
} from 'lucide-react';
import { jobsAPI, interestsAPI } from '../api/services';
import { walletAPI } from '../api/wallet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import JobsMap from '../components/maps/JobsMap';
import LocationSettingsModal from '../components/LocationSettingsModal';
import { authAPI } from '../api/services';

const BrowseJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showingInterest, setShowingInterest] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const { user, isAuthenticated, isTradesperson } = useAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    useLocation: false,
    maxDistance: user?.travel_distance_km || 25
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated() || !isTradesperson()) {
      return;
    }
    loadWalletBalance();
    loadUserLocationData();
  }, []);

  useEffect(() => {
    if (isAuthenticated() && isTradesperson()) {
      loadJobsBasedOnFilters();
    }
  }, [filters, userLocation]);

  const loadWalletBalance = async () => {
    try {
      const data = await walletAPI.getBalance();
      setWalletBalance(data);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
    }
  };

  const loadUserLocationData = () => {
    // Check if user has saved location
    if (user?.latitude && user?.longitude) {
      setUserLocation({ lat: user.latitude, lng: user.longitude });
      setFilters(prev => ({ 
        ...prev, 
        maxDistance: user.travel_distance_km || 25,
        useLocation: true 
      }));
    }
  };

  const loadJobsBasedOnFilters = async (page = 1) => {
    try {
      setLoading(true);
      let response;

      if (filters.useLocation && userLocation) {
        // Use location-based job fetching
        const params = new URLSearchParams({
          latitude: userLocation.lat.toString(),
          longitude: userLocation.lng.toString(),
          max_distance_km: filters.maxDistance.toString(),
          limit: '50',
          page: page.toString()
        });

        if (filters.search) params.append('q', filters.search);
        if (filters.category) params.append('category', filters.category);

        const url = filters.search || filters.category 
          ? `/jobs/search?${params.toString()}`
          : `/jobs/nearby?${params.toString()}`;

        response = await jobsAPI.apiClient.get(url);
      } else {
        // Use regular job fetching for tradespeople
        response = await jobsAPI.apiClient.get(`/jobs/for-tradesperson?limit=50&page=${page}`);
      }

      setJobs(response.data.jobs || []);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast({
        title: "Failed to load jobs",
        description: "There was an error loading available jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive"
      });
      return;
    }

    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setUserLocation(location);
        setFilters(prev => ({ ...prev, useLocation: true }));
        setLocationLoading(false);
        
        toast({
          title: "Location updated",
          description: "Now showing jobs near your current location"
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationLoading(false);
        toast({
          title: "Location error",
          description: "Unable to get your current location",
          variant: "destructive"
        });
      }
    );
  };

  const updateLocationSettings = async (latitude, longitude, travelDistance) => {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        travel_distance_km: travelDistance.toString()
      });

      await jobsAPI.apiClient.put(`/auth/profile/location?${params.toString()}`);
      
      setUserLocation({ lat: latitude, lng: longitude });
      setFilters(prev => ({ 
        ...prev, 
        maxDistance: travelDistance,
        useLocation: true 
      }));
      
      toast({
        title: "Location settings saved",
        description: "Your location and travel preferences have been updated"
      });
      
      setShowLocationSettings(false);
    } catch (error) {
      console.error('Failed to update location settings:', error);
      toast({
        title: "Error",
        description: "Failed to update location settings",
        variant: "destructive"
      });
    }
  };

  const handleShowInterest = async (job) => {
    if (!isAuthenticated()) {
      toast({
        title: "Sign in required",
        description: "Please sign in to show interest in jobs.",
        variant: "destructive",
      });
      return;
    }

    if (!isTradesperson()) {
      toast({
        title: "Tradesperson account required",
        description: "Only tradespeople can show interest in jobs.",
        variant: "destructive",
      });
      return;
    }

    // Check wallet balance for potential access fee
    const accessFeeCoins = job.access_fee_coins || 15;
    if (walletBalance && walletBalance.balance_coins < accessFeeCoins) {
      toast({
        title: "Insufficient wallet balance",
        description: `You need at least ${accessFeeCoins} coins (₦${(accessFeeCoins * 100).toLocaleString()}) to pay for contact details. Please fund your wallet.`,
        variant: "destructive",
      });
      navigate('/wallet');
      return;
    }

    try {
      setShowingInterest(job.id);
      await interestsAPI.showInterest(job.id);
      
      toast({
        title: "Interest registered!",
        description: "The homeowner will review your profile and may share their contact details.",
      });

    } catch (error) {
      console.error('Failed to show interest:', error);
      toast({
        title: "Failed to show interest",
        description: error.response?.data?.detail || "There was an error showing interest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowingInterest(null);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };



  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Sign In Required
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              Please sign in to browse available jobs and submit quotes.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="text-white font-lato"
              style={{backgroundColor: '#2F8140'}}
            >
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isTradesperson()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Tradesperson Access Only
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              This page is only available to registered tradespeople.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Available Jobs
            </h1>
            <p className="text-lg text-gray-600 font-lato">
              Browse jobs that match your skills and show your interest to homeowners.
            </p>
            
            {/* Search and Filters */}
            <div className="mt-6 space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs by title, description, or location..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato"
                  />
                </div>
                
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato"
                >
                  <option value="">All Categories</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Painting">Painting</option>
                  <option value="Tiling">Tiling</option>
                  <option value="Roofing">Roofing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Landscaping">Landscaping</option>
                </select>
              </div>

              {/* Location and View Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Location Controls */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useLocation"
                      checked={filters.useLocation}
                      onChange={(e) => setFilters(prev => ({ ...prev, useLocation: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useLocation" className="text-sm font-medium text-gray-700 font-lato">
                      Filter by location
                    </label>
                  </div>

                  {filters.useLocation && (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 font-lato">Within</span>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={filters.maxDistance}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                          className="w-20"
                        />
                        <span className="text-sm font-medium text-gray-700 font-lato w-8">
                          {filters.maxDistance}km
                        </span>
                      </div>

                      <button
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-lato"
                      >
                        <Crosshair size={14} />
                        <span>{locationLoading ? 'Getting...' : 'Use GPS'}</span>
                      </button>

                      <button
                        onClick={() => setShowLocationSettings(true)}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-lato"
                      >
                        <Settings size={14} />
                        <span>Settings</span>
                      </button>
                    </>
                  )}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-lato transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List size={16} />
                    <span>List</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-lato transition-colors ${
                      viewMode === 'map'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Map size={16} />
                    <span>Map</span>
                  </button>
                </div>
              </div>

              {/* Location Status */}
              {userLocation && filters.useLocation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Navigation size={16} className="text-green-600" />
                    <span className="text-sm text-green-800 font-lato">
                      Showing jobs within {filters.maxDistance}km of your location
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Balance & User Skills */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              {/* Wallet Balance */}
              {walletBalance && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700 font-lato">Wallet Balance</p>
                      <p className="text-2xl font-bold text-green-600 font-montserrat">
                        {walletBalance.balance_coins} coins
                      </p>
                      <p className="text-sm text-gray-600 font-lato">
                        ₦{walletBalance.balance_naira.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Button
                        onClick={() => navigate('/wallet')}
                        className="text-white font-lato text-sm px-3 py-1"
                        style={{backgroundColor: '#2F8140'}}
                      >
                        Manage Wallet
                      </Button>
                      {walletBalance.balance_coins < 15 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          ⚠️ Low balance
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* User skills display */}
              {user?.trade_categories && (
                <div>
                  <p className="text-sm font-medium text-gray-700 font-lato mb-2">Your Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.trade_categories.map((category, index) => (
                      <Badge key={index} className="bg-green-100 text-green-800">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Display */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                Available Jobs
              </h2>
              {jobs.length > 0 && (
                <p className="text-gray-600 font-lato">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
                  {viewMode === 'map' && ` • ${viewMode} view`}
                </p>
              )}
            </div>

            {/* Map View */}
            {viewMode === 'map' && (
              <div className="mb-6">
                <JobsMap
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onJobSelect={(job) => setSelectedJobId(job.id)}
                  userLocation={userLocation}
                  showUserLocation={!!userLocation}
                  height="500px"
                />
              </div>
            )}
            {/* Jobs List View */}
            {viewMode === 'list' && (
              <>
                {loading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-6 bg-gray-200 rounded mb-4"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-16">
                      <Briefcase size={64} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold font-montserrat text-gray-900 mb-2">
                        No available jobs right now
                      </h3>
                      <p className="text-gray-600 font-lato mb-6">
                        {user?.trade_categories?.length 
                          ? "There are no jobs matching your skills at the moment. Check back later!"
                          : "Complete your profile with your trade categories to see relevant jobs."
                        }
                      </p>
                      <Button 
                        onClick={() => loadJobsBasedOnFilters()}
                        className="text-white font-lato"
                        style={{backgroundColor: '#2F8140'}}
                      >
                        Refresh Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {jobs.map((job) => (
                      <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                              {job.title}
                            </CardTitle>
                            <Badge className="bg-blue-100 text-blue-800">
                              {job.category}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato">
                            <span className="flex items-center">
                              <MapPin size={14} className="mr-1" />
                              {job.location}
                            </span>
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              Posted {formatDate(job.created_at)}
                            </span>
                            <span className="flex items-center">
                              <Heart size={14} className="mr-1" />
                              {job.interests_count || 0} interested
                            </span>
                          </div>
                        </div>

                        {/* Budget & Access Fee Display */}
                        <div className="text-right space-y-2">
                          {job.budget_min && job.budget_max ? (
                            <div>
                              <div className="text-lg font-bold font-montserrat" style={{color: '#2F8140'}}>
                                {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                              </div>
                              <div className="text-sm text-gray-500 font-lato">Budget Range</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 font-lato">Budget not specified</div>
                          )}
                          
                          {/* Access Fee */}
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                            <div className="text-sm font-semibold text-yellow-800">
                              Access Fee: {job.access_fee_coins || 15} coins
                            </div>
                            <div className="text-xs text-yellow-600">
                              ₦{(job.access_fee_naira || 1500).toLocaleString()} for contact details
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Job Description */}
                      <div className="mb-4">
                        <p className="text-gray-700 font-lato line-clamp-3">
                          {job.description}
                        </p>
                      </div>

                      {/* Job Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Clock size={14} className="mr-2" />
                          <span className="font-lato">Timeline: {job.timeline || 'Flexible'}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <User size={14} className="mr-2" />
                          <span className="font-lato">By: {job.homeowner?.name}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar size={14} className="mr-2" />
                          <span className="font-lato">
                            Expires: {formatDate(job.expires_at)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Heart size={14} className="mr-2" />
                          <span className="font-lato">{job.interests_count || 0} interested</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-gray-500 font-lato">
                          Match: {user?.trade_categories?.includes(job.category) ? '✅ Your skill' : '⚠️ Different category'}
                        </div>
                        
                        <Button
                          onClick={() => handleShowInterest(job)}
                          disabled={showingInterest === job.id}
                          className="text-white font-lato"
                          style={{backgroundColor: '#2F8140'}}
                        >
                          <HandHeart size={16} className="mr-2" />
                          {showingInterest === job.id ? 'Showing Interest...' : 'Show Interest'}
                        </Button>
                      </div>
                    </CardContent>
                      </Card>
                    ))}

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                      <div className="flex justify-center space-x-2 mt-8">
                        {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={page === pagination.page ? "default" : "outline"}
                            onClick={() => loadJobsBasedOnFilters(page)}
                            className="font-lato"
                            style={page === pagination.page ? {backgroundColor: '#2F8140', color: 'white'} : {}}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
      
      {/* Location Settings Modal */}
      <LocationSettingsModal
        isOpen={showLocationSettings}
        onClose={() => setShowLocationSettings(false)}
        onSave={updateLocationSettings}
        currentLocation={userLocation}
        currentTravelDistance={filters.maxDistance}
      />
    </div>
  );
};

export default BrowseJobsPage;