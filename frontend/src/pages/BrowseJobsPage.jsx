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
  Crosshair,
  Wrench
} from 'lucide-react';
import { jobsAPI, interestsAPI } from '../api/services';
import { walletAPI, tradeCategoryQuestionsAPI } from '../api/wallet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import JobsMap from '../components/maps/JobsMap';
import LocationSettingsModal from '../components/LocationSettingsModal';
import { authAPI } from '../api/services';
import { resolveCoordinatesFromLocationText, DEFAULT_TRAVEL_DISTANCE_KM, nearestStateFromCoordinates, computeDistanceKm } from '../utils/locationCoordinates';

import AuthenticatedImage from '../components/AuthenticatedImage';

const NIGERIAN_TRADE_CATEGORIES = [
  // Column 1
  "Building",
  "Concrete Works",
  "Tiling",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Plumbing",
  "Cleaning",
  
  // Column 2
  "Home Extensions",
  "Scaffolding",
  "Flooring",
  "Bathroom Fitting",
  "Generator Services",
  "Welding",
  "Relocation/Moving",
  
  // Column 3
  "Renovations",
  "Painting",
  "Carpentry",
  "Interior Design",
  "Solar & Inverter Installation",
  "Locksmithing",
  "Waste Disposal",
  
  // Column 4
  "Roofing",
  "Plastering/POP",
  "Furniture Making",
  "Electrical Repairs",
  "CCTV & Security Systems",
  "General Handyman Work",
  "Recycling"
];

const BrowseJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showingInterest, setShowingInterest] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [selectedJobAnswers, setSelectedJobAnswers] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    showInterest: {}
  });
  const [userInterests, setUserInterests] = useState(null);
  const [userInterestsLoading, setUserInterestsLoading] = useState(false);

  const { user, isAuthenticated, isTradesperson } = useAuth();
  const location = useLocation();
  
  // Load user interests for tradespeople
  const loadUserInterests = async () => {
    if (!isAuthenticated() || !isTradesperson()) return;
    
    try {
      setUserInterestsLoading(true);
      const interests = await interestsAPI.getMyInterests();
      // Extract job IDs from interests
      const jobIds = interests.map(interest => interest.job_id);
      setUserInterests(jobIds);
    } catch (error) {
      console.error('Failed to load user interests:', error);
      setUserInterests([]);
    } finally {
      setUserInterestsLoading(false);
    }
  };
  
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
    loadUserInterests(); // Load user's existing interests
  }, [isAuthenticated, isTradesperson]); // Add authentication dependencies

  useEffect(() => {
    if (isAuthenticated() && isTradesperson()) {
      loadJobsBasedOnFilters();
    }
  }, [filters, userLocation, isAuthenticated, isTradesperson]); // Add authentication dependencies

  // Show welcome message for new registrations
  useEffect(() => {
    if (location.state?.welcomeMessage) {
      toast({
        title: "Registration Successful! 🎉",
        description: location.state.welcomeMessage,
        duration: 5000,
      });

      // Show additional wallet funding info if applicable
      if (location.state?.walletFunded && location.state?.fundingAmount) {
        setTimeout(() => {
          toast({
            title: "Wallet Funding Submitted",
            description: `Your payment of ₦${location.state.fundingAmount} has been submitted for verification. You'll be notified once approved.`,
            duration: 5000,
          });
        }, 1000);
      } else if (location.state?.walletError) {
        setTimeout(() => {
          toast({
            title: "Note",
            description: "You can fund your wallet anytime from the Wallet page to start applying for jobs.",
            variant: "info",
          });
        }, 1000);
      } else if (location.state?.showWalletReminder) {
        // Show reminder for users who chose "Set Up Wallet Later"
        setTimeout(() => {
          toast({
            title: "Complete Your Setup 💳",
            description: "Ready to start applying for jobs? Visit the Wallet page to fund your account and access homeowner contact details.",
            duration: 6000,
          });
        }, 2000);
      }

      // Clear the state to prevent showing message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, toast, navigate]);

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
    } else if (user?.location) {
      const coords = resolveCoordinatesFromLocationText(user.location);
      if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        // Convert util output { latitude, longitude } to map-friendly { lat, lng }
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        setFilters(prev => ({
          ...prev,
          maxDistance: user?.travel_distance_km || DEFAULT_TRAVEL_DISTANCE_KM,
          useLocation: true
        }));
      }
    }
  };

  const loadJobsBasedOnFilters = async (page = 1) => {
    try {
      setLoading(true);
      let response;

      if (
        filters.useLocation &&
        userLocation &&
        typeof userLocation.lat === 'number' &&
        typeof userLocation.lng === 'number'
      ) {
        // When a search or category filter is applied, use the search endpoint with location params.
        // Otherwise, use the tradesperson endpoint which blends nearby and unlocated jobs
        // based on the user's saved location and travel distance.
        if (filters.search || filters.category) {
          const params = new URLSearchParams({
            latitude: userLocation.lat.toString(),
            longitude: userLocation.lng.toString(),
            max_distance_km: filters.maxDistance.toString(),
            limit: '50',
            skip: ((page - 1) * 50).toString()
          });
          if (filters.search) params.append('q', filters.search);
          if (filters.category) params.append('category', filters.category);
          response = await jobsAPI.apiClient.get(`/jobs/search?${params.toString()}`);
        } else {
          const skip = (page - 1) * 50;
          response = await jobsAPI.apiClient.get(`/jobs/for-tradesperson?limit=50&skip=${skip}`);
        }
      } else {
        // Use regular job fetching for tradespeople
        const skip = (page - 1) * 50;
        response = await jobsAPI.apiClient.get(`/jobs/for-tradesperson?limit=50&skip=${skip}`);
      }

      let jobsData = response.data.jobs || [];
      if (filters.useLocation && userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        // Compute fallback distances for jobs without distance_km using text location or coords
        jobsData = jobsData.map((job) => {
          let d = job?.distance_km;
          if (d === undefined || d === null) {
            // Try job coordinates first
            if (typeof job?.latitude === 'number' && typeof job?.longitude === 'number') {
              d = computeDistanceKm(userLocation.lat, userLocation.lng, job.latitude, job.longitude);
            } else if (job?.location) {
              const jc = resolveCoordinatesFromLocationText(job.location);
              if (jc && typeof jc.latitude === 'number' && typeof jc.longitude === 'number') {
                d = computeDistanceKm(userLocation.lat, userLocation.lng, jc.latitude, jc.longitude);
              }
            }
          }
          if (typeof d === 'number' && !Number.isNaN(d)) {
            return { ...job, distance_km: Number(d.toFixed(2)) };
          }
          return job;
        });

        // Prioritize nearby jobs first
        jobsData = [...jobsData].sort((a, b) => {
          const da = (a && a.distance_km !== undefined && a.distance_km !== null) ? Number(a.distance_km) : Number.POSITIVE_INFINITY;
          const db = (b && b.distance_km !== undefined && b.distance_km !== null) ? Number(b.distance_km) : Number.POSITIVE_INFINITY;
          return da - db;
        });
      }
      setJobs(jobsData);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      // Suppress noisy error toast to avoid disruptive red notifications.
      // The page already provides gating/inline guidance (e.g., verification required).
      // Intentionally not showing a toast here.
    } finally {
      setLoading(false);
    }
  };

  // If a job_id is present in the URL, open its details modal directly
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const jobIdParam = params.get('job_id') || params.get('jobId');
      if (jobIdParam) {
        (async () => {
          try {
            const job = await jobsAPI.getJob(jobIdParam);
            if (job && (job.id || job._id)) {
              const normalizedJob = {
                ...job,
                id: job.id || job._id
              };
              await handleViewJobDetails(normalizedJob);
            }
          } catch (err) {
            console.error('Failed to load job by ID from URL:', err);
          }
        })();
      }
    } catch (e) {
      // no-op
    }
  }, [location.search]);

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
        
        // Persist GPS location immediately so backend uses correct coordinates
        updateLocationSettings(location.lat, location.lng, filters.maxDistance)
          .finally(() => setLocationLoading(false));
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
      
      const stateName = nearestStateFromCoordinates(latitude, longitude);
      const miles = Math.round(Number(travelDistance) * 0.621371);
      toast({
        title: "Location settings saved",
        description: stateName
          ? `Saved: ${stateName} • ${travelDistance}km (≈ ${miles}mi) radius`
          : "Your location and travel preferences have been updated"
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

  // Persist slider changes to travel_distance_km using current/saved coordinates
  const commitTravelDistanceChange = async (distanceKm) => {
    try {
      if (!filters.useLocation) return; // only persist when location filter is enabled

      let lat = userLocation?.lat;
      let lng = userLocation?.lng;

      // Fallback to saved coordinates on user profile
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        if (typeof user?.latitude === 'number' && typeof user?.longitude === 'number') {
          lat = user.latitude;
          lng = user.longitude;
        } else if (user?.location) {
          const coords = resolveCoordinatesFromLocationText(user.location);
          if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
            lat = coords.latitude;
            lng = coords.longitude;
          }
        }
      }

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        // If we still don't have coordinates, guide the user
        toast({
          title: "Set a location to save distance",
          description: "Use GPS or Settings to set your home base.",
          variant: "info"
        });
        return;
      }

      await updateLocationSettings(lat, lng, distanceKm);
    } catch (err) {
      console.error('Failed to persist travel distance:', err);
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

    // Client-side validation: Check if job is still active
    if (job.status && job.status !== "active") {
      toast({
        title: "Job no longer available",
        description: "This job is no longer accepting new interest.",
        variant: "destructive",
      });
      return;
    }

    // Client-side validation: Check if already interested
    if (userInterests && userInterests.includes(job.id)) {
      toast({
        title: "Already interested",
        description: "You have already shown interest in this job.",
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
      
      // Update local state to reflect the new interest
      if (userInterests) {
        setUserInterests([...userInterests, job.id]);
      } else {
        setUserInterests([job.id]);
      }
      
      toast({
        title: "Interest registered!",
        description: "The homeowner will review your profile and may share their contact details.",
      });

    } catch (error) {
      console.error('Failed to show interest:', error);
      
      // Handle different error response formats with more specific messages
      let errorMessage = "There was an error showing interest. Please try again.";

      // Provide clearer guidance when verification gating blocks the action
      if (error.response?.status === 403) {
        errorMessage = "Business verification required. Please complete verification to accept jobs.";
      }
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Handle specific backend validation errors
        if (typeof detail === 'string') {
          if (detail.includes('already shown interest')) {
            errorMessage = "You have already shown interest in this job.";
            // Update local state to prevent future attempts
            if (userInterests) {
              setUserInterests([...userInterests, job.id]);
            } else {
              setUserInterests([job.id]);
            }
          } else if (detail.includes('no longer active')) {
            errorMessage = "This job is no longer available.";
          } else if (detail.includes('not found')) {
            errorMessage = "This job could not be found.";
          } else {
            errorMessage = detail;
          }
        } else if (Array.isArray(detail)) {
          // Handle FastAPI validation errors which return an array
          errorMessage = detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'object') {
          // Handle object error details
          errorMessage = detail.msg || detail.message || JSON.stringify(detail);
        }
      }
      
      toast({
        title: "Failed to show interest",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Re-throw the error so modal can catch it and stay open
      throw error;
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

  // VAT settings (defaults to Nigeria's 7.5% if not provided)
  const VAT_RATE = Number(process.env.REACT_APP_VAT_RATE ?? 0.075);
  const computeVatInclusive = (amountNaira) => {
    const base = Math.max(Number(amountNaira || 0), 0);
    const vat = Math.round(base * VAT_RATE);
    const total = base + vat;
    const totalCoins = Math.ceil(total / 100); // 1 coin = ₦100
    return { vat, total, totalCoins };
  };

  const handleViewJobDetails = async (job) => {
    setSelectedJobDetails(job);
    setSelectedJobAnswers(null); // Reset previous answers
    setShowJobModal(true);
    
    // Fetch job question answers
    try {
      const answers = await tradeCategoryQuestionsAPI.getJobQuestionAnswers(job.id);
      if (answers && answers.answers && answers.answers.length > 0) {
        setSelectedJobAnswers(answers);
      }
    } catch (error) {
      console.error('Failed to fetch job question answers:', error);
      // Don't show error to user, just continue without answers
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  };

  const getTimeAgo = (dateString) => formatDate(dateString);



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
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }))}
              className="text-white font-lato"
              style={{backgroundColor: '#34D164'}}
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

            {/* Verification Notice: browsing allowed, interest requires verification */}
            {!user?.verified_tradesperson && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-yellow-900 font-montserrat">Verification Pending</p>
                    <p className="text-yellow-800 text-sm font-lato">
                      You can browse jobs, but you must verify your business to show interest.
                    </p>
                  </div>
                  <Button onClick={() => navigate('/verify-account')} className="text-white font-lato" style={{ backgroundColor: '#34D164' }}>
                    Go to Verification
                  </Button>
                </div>
              </div>
            )}
            
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
                  {NIGERIAN_TRADE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location and View Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Location Controls */}
                <div className="flex items-center flex-wrap gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useLocation"
                      checked={filters.useLocation}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFilters(prev => ({ ...prev, useLocation: checked }));
                        // Use saved profile location instead of auto-triggering GPS
                        if (checked) {
                      if (user?.latitude && user?.longitude) {
                        setUserLocation({ lat: user.latitude, lng: user.longitude });
                        setFilters(prev => ({
                          ...prev,
                          maxDistance: user?.travel_distance_km || prev.maxDistance,
                        }));
                        const stateName = nearestStateFromCoordinates(user.latitude, user.longitude);
                        toast({
                          title: "Location filter enabled",
                          description: stateName ? `Using your saved location: ${stateName}.` : "Using your saved profile location.",
                        });
                      } else if (user?.location) {
                        const coords = resolveCoordinatesFromLocationText(user.location);
                        if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
                          // Convert util output { latitude, longitude } to map-friendly { lat, lng }
                          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
                          setFilters(prev => ({
                            ...prev,
                            maxDistance: user?.travel_distance_km || prev.maxDistance,
                          }));
                          const stateName = nearestStateFromCoordinates(coords.latitude, coords.longitude);
                          toast({
                            title: "Location filter enabled",
                            description: stateName ? `Using your profile location: ${stateName}.` : `Using your profile location: ${user.location}.`,
                          });
                        } else {
                              toast({
                                title: "No saved coordinates",
                                description: "Set your location in Settings or use GPS.",
                                variant: "info",
                              });
                            }
                          } else {
                            toast({
                              title: "No saved location",
                              description: "Set your location in Settings or use GPS.",
                              variant: "info",
                            });
                          }
                        }
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useLocation" className="text-sm font-medium text-gray-700 font-lato">
                      Filter by location
                    </label>
                  </div>

                  {filters.useLocation && (
                    <>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm text-gray-600 font-lato">Within</span>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={filters.maxDistance}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                          onMouseUp={(e) => commitTravelDistanceChange(parseInt(e.currentTarget.value))}
                          onTouchEnd={(e) => commitTravelDistanceChange(parseInt(e.currentTarget.value))}
                          onKeyUp={(e) => {
                            if (['Enter', ' ', 'Spacebar'].includes(e.key)) {
                              commitTravelDistanceChange(parseInt(e.currentTarget.value));
                            }
                          }}
                          className="w-20"
                        />
                        <span className="text-sm font-medium text-gray-700 font-lato">
                          {filters.maxDistance}km (≈ {Math.round(filters.maxDistance * 0.621371)}mi)
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
                      Showing jobs within {filters.maxDistance}km (≈ {Math.round(filters.maxDistance * 0.621371)}mi) of your location
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Balance & User Skills */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              {/* Wallet Balance */}
              {/* Wallet Balance - Only visible to tradespeople */}
              {isTradesperson() && walletBalance && (
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
                        style={{backgroundColor: '#34D164'}}
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

            {/* Jobs Filtering Info */}
            {isTradesperson() && user?.trade_categories && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Smart Job Filtering Active</span>
                </div>
                <div className="text-sm text-blue-700">
                  <p className="mb-1">
                    <strong>Skills Match:</strong> Showing jobs that match your skills: {user.trade_categories.join(', ')}
                  </p>
                  {filters.useLocation && userLocation && (
                    <p>
                      <strong>Location Filter:</strong> Within {filters.maxDistance}km of your location
                    </p>
                  )}
                  {!filters.useLocation && (
                    <p className="text-orange-600">
                      💡 <strong>Tip:</strong> Enable location filtering to see jobs near you first
                    </p>
                  )}
                </div>
              </div>
            )}

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
                        style={{backgroundColor: '#34D164'}}
                      >
                        Refresh Jobs
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <Card 
                        key={job.id} 
                        className="hover:shadow-md transition-shadow duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-600"
                        onClick={() => handleViewJobDetails(job)}
                      >
                        <CardContent className="p-4">
                          <h3 className="text-xl font-semibold leading-tight mb-2" style={{color: '#121E3C'}}>
                            {job.title}
                          </h3>

                          {/* Meta information stacked */}
                          <div className="space-y-1 text-sm text-gray-700">
                            <div className="flex items-center">
                              <Wrench size={16} className="mr-2 text-gray-500" />
                              <span>{job.category}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin size={16} className="mr-2 text-gray-500" />
                              <span>
                                {job.location}
                                {job.distance_km !== undefined && job.distance_km !== null && (
                                  <span className="ml-1 text-gray-600">
                                    ({Number(job.distance_km).toFixed(1)} km)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Clock size={16} className="mr-2 text-gray-500" />
                              <span>{formatDate(job.created_at)}</span>
                            </div>
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
                            style={page === pagination.page ? {backgroundColor: '#34D164', color: 'white'} : {}}
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

      {/* Job Details Modal */}
      {showJobModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                    {selectedJobDetails.title}
                  </h2>
                  <Badge className="bg-blue-100 text-blue-800 mt-2">
                    {selectedJobDetails.category}
                  </Badge>
                </div>
                <button
                  onClick={() => setShowJobModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Job Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3 font-montserrat">Job Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                      <MapPin size={16} className="mr-2 text-gray-500" />
                      <span><strong>Location:</strong> {selectedJobDetails.location}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      <span><strong>Posted:</strong> {formatDate(selectedJobDetails.created_at)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-500" />
                      <span><strong>Timeline:</strong> {selectedJobDetails.timeline || 'Flexible'}</span>
                    </div>
                    <div className="flex items-center">
                      <Heart size={16} className="mr-2 text-gray-500" />
                      <span><strong>Interest:</strong> {selectedJobDetails.interests_count || 0} tradespeople interested</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 font-montserrat">Budget & Payment</h3>
                  <div className="space-y-3">
                    {selectedJobDetails.budget_min && selectedJobDetails.budget_max ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-2xl font-bold font-montserrat" style={{color: '#34D164'}}>
                          {formatCurrency(selectedJobDetails.budget_min)} - {formatCurrency(selectedJobDetails.budget_max)}
                        </div>
                        <div className="text-sm text-gray-600">Budget Range</div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-lg font-medium text-gray-700">Budget Negotiable</div>
                        <div className="text-sm text-gray-600">Discuss pricing with homeowner</div>
                      </div>
                    )}

                    {/* Access Fee - Only visible to tradespeople */}
                    {isTradesperson() && (
                      (() => {
                        const { vat, total, totalCoins } = computeVatInclusive(selectedJobDetails.access_fee_naira || 1000);
                        return (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="font-semibold text-yellow-800">
                              VAT + Access Fee: {totalCoins} coins
                            </div>
                            <div className="text-sm text-yellow-700">
                              ₦{total.toLocaleString()} total for contact details
                              <div className="text-xs text-yellow-600">includes ₦{vat.toLocaleString()} VAT</div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>

              {/* Job Requirements & Details from Trade Category Questions */}
              {selectedJobAnswers && selectedJobAnswers.answers && selectedJobAnswers.answers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 font-montserrat">Job Requirements & Details</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                    {(() => {
                      // Filter answers: show ONLY non-empty text answers
                      const visibleAnswers = selectedJobAnswers.answers.filter(ans => {
                        if ((ans.question_type || '').startsWith('file_upload')) return false;
                        const val = ans.answer_text || (Array.isArray(ans.answer_value) ? ans.answer_value.join(', ') : (ans.answer_value ?? ''));
                        if (!val || String(val).trim() === '' || val === '—') return false;
                        return true;
                      });

                      // Find file uploads (images) to show separately
                      const fileAnswers = selectedJobAnswers.answers.filter(ans => {
                        if (!(ans.question_type || '').startsWith('file_upload')) return false;
                        const val = ans.answer_value;
                        // Must have actual file URLs
                        if (Array.isArray(val) && val.length > 0) return true;
                        if (typeof val === 'string' && val.trim().length > 0) return true;
                        return false;
                      });

                      return (
                        <>
                          {visibleAnswers.map((answer, index) => (
                            <div key={index} className="border-b border-green-200 last:border-b-0 pb-3 last:pb-0">
                              <div className="font-medium text-gray-800 font-lato mb-1">
                                {answer.question_text}
                              </div>
                              <div className="text-gray-700 font-lato pl-3">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                {answer.answer_text || answer.answer_value}
                              </div>
                            </div>
                          ))}

                          {/* Attachments Section */}
                          {fileAnswers.length > 0 && (
                            <div className="pt-4 border-t border-green-200">
                              <h4 className="font-medium text-gray-800 font-lato mb-3">Attachments</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {fileAnswers.map((ans, idx) => {
                                  const files = Array.isArray(ans.answer_value) ? ans.answer_value : [ans.answer_value];
                                  return files.map((url, fIdx) => {
                                    // Handle cases where the URL is a data URI or a remote URL
                                    // Also check if it's a file path that ends with an image extension, regardless of case
                                    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
                                                  url.startsWith('data:image/') ||
                                                  // Fallback: assume it's an image if it's in the trade-questions path (common for uploads)
                                                  // This helps with signed URLs or paths that might not match the regex perfectly
                                                  url.includes('/api/jobs/trade-questions/file/');
                                    
                                    return (
                                      <div key={`${idx}-${fIdx}`} className="relative group border rounded-lg overflow-hidden h-32 bg-gray-100">
                                        {isImage ? (
                                          <div className="w-full h-full">
                                            {/* Directly render img tag for immediate feedback if AuthenticatedImage has issues */}
                                            <img 
                                              src={url} 
                                              alt={`Attachment ${fIdx + 1}`} 
                                              className="w-full h-full object-contain"
                                              onError={(e) => {
                                                // Fallback if image fails to load
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                              }}
                                            />
                                            <div className="hidden w-full h-full flex-col items-center justify-center text-gray-500">
                                              <span className="text-xs">Image not available</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                                          >
                                            <span className="text-xs font-medium px-2 text-center">Download File</span>
                                          </a>
                                        )}
                                      </div>
                                    );
                                  });
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-lato">
                    Specific requirements provided by the homeowner
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <div className="text-sm text-gray-500 font-lato">
                  Posted {getTimeAgo(selectedJobDetails.created_at)}
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowJobModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await handleShowInterest(selectedJobDetails); // Wait for API call to complete
                        setShowJobModal(false); // Only close modal on success
                      } catch (error) {
                        // Keep modal open on error so user can retry
                        console.error('Show interest failed, keeping modal open:', error);
                      }
                    }}
                    disabled={!user?.verified_tradesperson ||
                             loadingStates.showInterest[selectedJobDetails.id] || 
                             (userInterests && userInterests.includes(selectedJobDetails.id))}
                    className="text-white font-lato"
                    style={{backgroundColor: '#34D164'}}
                  >
                    {!user?.verified_tradesperson ? (
                      <>
                        <Heart size={16} className="mr-2" />
                        Verify to Show Interest
                      </>
                    ) : loadingStates.showInterest[selectedJobDetails.id] ? (
                      <>
                        <Clock size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : userInterests && userInterests.includes(selectedJobDetails.id) ? (
                      <>
                        <HandHeart size={16} className="mr-2" />
                        Already Interested
                      </>
                    ) : (
                      <>
                        <Heart size={16} className="mr-2" />
                        Show Interest
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
