import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonLayout from '../layouts/TradespersonLayout';
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
  Wrench,
  Eye
} from 'lucide-react';
import { jobsAPI, interestsAPI } from '../api/services';
import { walletAPI, tradeCategoryQuestionsAPI } from '../api/wallet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import JobsMap from '../components/maps/JobsMap';
import LocationSettingsModal from '../components/LocationSettingsModal';
import { authAPI } from '../api/services';
import { notificationsAPI } from '../api/notifications';
import {
  resolveCoordinatesFromLocationText,
  DEFAULT_TRAVEL_DISTANCE_KM,
  nearestStateFromCoordinates,
  computeDistanceKm,
  STATE_CAPITAL_COORDS,
  inferStateFromCoordinates,
  distanceToStateFromCoordinates,
  normalizeStateKey
} from '../utils/locationCoordinates';
import { getTradespersonCompletionStatus } from '../utils/tradespersonCompletion';

import AuthenticatedImage from '../components/common/AuthenticatedImage';

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
  const { user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { allStepsCompleted } = getTradespersonCompletionStatus(user);

  const [jobs, setJobs] = useState([]);
  const jobAnswersCache = useRef({});
  const [loading, setLoading] = useState(true);
  const [showingInterest, setShowingInterest] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [selectedJobAnswers, setSelectedJobAnswers] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  // Initialize filters with user location if available to prevent double-fetch
  const [filters, setFilters] = useState(() => ({
    search: '',
    category: '',
    // Only enable distance filtering when we have real coordinates
    useLocation: !!(user?.latitude && user?.longitude),
    maxDistance: user?.travel_distance_km || DEFAULT_TRAVEL_DISTANCE_KM
  }));

  // Initialize userLocation immediately if available
  const [userLocation, setUserLocation] = useState(() => {
    if (user?.latitude && user?.longitude) {
      return { lat: user.latitude, lng: user.longitude };
    }
    return null;
  });

  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    showInterest: {}
  });
  const [userInterests, setUserInterests] = useState(null);
  const [userInterestsLoading, setUserInterestsLoading] = useState(false);
  const [loadErrorCount, setLoadErrorCount] = useState(0);
  const stateMismatchWarnedRef = useRef(false);

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

  useEffect(() => {
    if (!isAuthenticated() || !isTradesperson()) {
      return;
    }
    loadWalletBalance();
    // Only load location data if we don't have it yet to avoid re-triggering filters
    if (!userLocation) {
      loadUserLocationData();
    }
    loadUserInterests(); // Load user's existing interests
  }, [isAuthenticated, isTradesperson]); // Add authentication dependencies

  useEffect(() => {
    // Refresh jobs whenever filters, user location, or skills update.
    if (isAuthenticated() && isTradesperson()) {
      loadJobsBasedOnFilters();
    }
  }, [
    filters,
    // Only trigger if coordinates strictly change, not just object reference
    userLocation?.lat,
    userLocation?.lng,
    isAuthenticated,
    isTradesperson,
    // Removing user?.trade_categories from dependencies to prevent re-fetch on profile sync
    // user?.trade_categories, 
  ]);

  // Sync profile location changes to local state
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      // Only update if actually different to prevent loop
      if (user.latitude !== userLocation?.lat || user.longitude !== userLocation?.lng) {
        loadUserLocationData();
      }
    }
  }, [user?.latitude, user?.longitude]);

  // One-time warning when profile state and saved coordinates appear to be in different states.
  useEffect(() => {
    if (stateMismatchWarnedRef.current) return;
    const profileState = String(user?.state || user?.location || '').trim();
    if (!profileState) return;
    if (!userLocation || typeof userLocation.lat !== 'number' || typeof userLocation.lng !== 'number') return;
    const inferred = inferStateFromCoordinates(userLocation.lat, userLocation.lng);
    if (!inferred) return;

    const normalizedProfile = normalizeStateKey(profileState);
    if (!normalizedProfile) return;

    const profileDistanceKm = distanceToStateFromCoordinates(
      userLocation.lat,
      userLocation.lng,
      normalizedProfile
    );
    const mismatchGapKm =
      typeof profileDistanceKm === 'number'
        ? profileDistanceKm - inferred.distanceKm
        : Number.POSITIVE_INFINITY;

    // Warn only on confident mismatch. This avoids false positives around border states.
    if (inferred.stateKey !== normalizedProfile && !inferred.isAmbiguous && mismatchGapKm > 35) {
      stateMismatchWarnedRef.current = true;
      toast({
        title: "Check your saved location",
        description: `Your profile state is ${profileState}, but your saved coordinates are near ${inferred.stateName}. Update Location Settings for accurate distance.`,
        duration: 9000,
      });
    }
  }, [user?.state, user?.location, userLocation?.lat, userLocation?.lng, toast]);

  // If the user received a recent job notification (e.g. NEW_MATCHING_JOB / JOB_POSTED)
  // check the referenced job. If the job exists but is pending approval, surface
  // that information to the user. If the job is active but somehow missing from
  // the current list, trigger a refresh.
  useEffect(() => {
    if (!isAuthenticated() || !isTradesperson()) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await notificationsAPI.getHistory({ limit: 10, offset: 0 });
        const list = res?.notifications || res?.items || res || [];

        for (const n of list) {
          if (cancelled) return;
          const type = (n.type || n.notification_type || n.type_name || '').toString().toLowerCase();
          if (!type) continue;

          // Only care about job-related notifications
          if (['new_matching_job', 'job_posted', 'job_approved', 'job_rejected'].includes(type)) {
            const jobId = n?.metadata?.job_id || n?.template_data?.job_id || n?.job_id || n?.data?.job_id;
            if (!jobId) continue;

            try {
              const job = await jobsAPI.getJob(jobId);
              if (!job) continue;

              // If job exists but not active, inform the user it's pending approval
              if (job.status && job.status !== 'active') {
                toast({
                  title: 'Job not yet visible',
                  description: `${job.title || 'A job'} is ${job.status.replace('_', ' ')} and will appear in Browse once approved.`,
                  duration: 8000
                });
                return; // we already informed the user
              }

              // If job is active but not in our current jobs list, refresh
              const present = jobs.find(j => j.id === job.id || j._id === job.id || j.id === job._id);
              if (!present) {
                loadJobsBasedOnFilters();
                return;
              }
            } catch (err) {
              // ignore failures for now
              console.error('Error checking job from notification:', err);
            }
          }
        }
      } catch (err) {
        // noisy errors are non-fatal
        console.error('Failed to fetch notifications for job check:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, isTradesperson, user?.id]);

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
    } else {
      // Without exact coordinates, keep location filtering off to avoid inaccurate distances
      setUserLocation(null);
      setFilters(prev => ({
        ...prev,
        maxDistance: user?.travel_distance_km || DEFAULT_TRAVEL_DISTANCE_KM,
        useLocation: false
      }));
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
          const params = new URLSearchParams({
            latitude: userLocation.lat.toString(),
            longitude: userLocation.lng.toString(),
            max_distance_km: filters.maxDistance.toString(),
            limit: '50',
            skip: ((page - 1) * 50).toString()
          });
          response = await jobsAPI.apiClient.get(`/jobs/for-tradesperson?${params.toString()}`);
        }
      } else {
        // Use regular job fetching for tradespeople
        const skip = (page - 1) * 50;
        response = await jobsAPI.apiClient.get(`/jobs/for-tradesperson?limit=50&skip=${skip}`);
      }

      // Success: reset error counter
      setLoadErrorCount(0);

      let rawJobs = response.data.jobs || [];
      
      // Filter out any null/undefined jobs and normalize job IDs
      let jobsData = rawJobs
        .filter(job => job !== null && job !== undefined)
        .map(job => ({
          ...job,
          id: job.id || job._id || (job._id ? job._id.toString() : null)
        }));
      
      if (!Array.isArray(jobsData)) jobsData = [];

      if (filters.useLocation && userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        const userStateKey = normalizeStateKey(user?.state || user?.location);
        const almostEqual = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;

        // Compute fallback distances for jobs where backend distance is missing or likely coarse (state centroid only)
        jobsData = jobsData.map((job) => {
          let d = job?.distance_km;
          const jobLat = Number(job?.latitude);
          const jobLng = Number(job?.longitude);
          const hasCoords = Number.isFinite(jobLat) && Number.isFinite(jobLng);
          const jobStateKey = normalizeStateKey(job?.state || job?.location);
          const stateCenter = STATE_CAPITAL_COORDS[jobStateKey];
          const hasStateCentroidCoords = !!(hasCoords && stateCenter && almostEqual(jobLat, stateCenter.lat) && almostEqual(jobLng, stateCenter.lng));
          const trustedBackendDistance = typeof d === 'number' && !Number.isNaN(d) && !hasStateCentroidCoords;

          if (!trustedBackendDistance) d = null;

          if ((d === undefined || d === null) && hasCoords && !hasStateCentroidCoords) {
            d = computeDistanceKm(userLocation.lat, userLocation.lng, jobLat, jobLng);
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
        // When location filtering is enabled, exclude jobs outside the user's max distance
        if (filters.useLocation && typeof filters.maxDistance === 'number') {
          jobsData = jobsData.filter(job => {
            if (job.distance_km === undefined || job.distance_km === null) {
              const jobStateKey = normalizeStateKey(job?.state || job?.location);
              return !!(userStateKey && jobStateKey && userStateKey === jobStateKey);
            }
            return Number(job.distance_km) <= Number(filters.maxDistance);
          });
        }
      }
      setJobs(jobsData);
      setPagination(response.data.pagination || null);
      // Prefetch question answers for all visible jobs to improve modal open latency
      try {
        if (tradeCategoryQuestionsAPI && typeof tradeCategoryQuestionsAPI.getJobQuestionAnswers === 'function') {
          const toPrefetch = jobsData.map(j => j.id || j._id || j.job_id).filter(Boolean);
          if (toPrefetch.length > 0) {
            const uniqueIds = Array.from(new Set(toPrefetch.flatMap((id) => {
              const s = String(id);
              const trimmed = s.replace(/^0+/, '') || s;
              return [s, trimmed];
            })));
            Promise.allSettled(
              uniqueIds.map(id => tradeCategoryQuestionsAPI.getJobQuestionAnswers(id).catch(() => null).then(res => ({ id, res })))
            ).then(results => {
              results.forEach(r => {
                if (r.status === 'fulfilled' && r.value && r.value.res) {
                  const doc = r.value.res;
                  const keys = [];
                  if (r.value.id) keys.push(String(r.value.id));
                  if (doc && doc.id) keys.push(String(doc.id));
                  if (doc && doc._id) keys.push(String(doc._id));
                  if (doc && doc.job_id) keys.push(String(doc.job_id));
                  if (r.value.id) {
                    const sanitizedId = String(r.value.id).replace(/^0+/, '') || String(r.value.id);
                    keys.push(sanitizedId);
                  }
                  keys.forEach(k => { if (k && jobAnswersCache.current) jobAnswersCache.current[k] = doc; });
                }
              });
            }).catch(() => {});
          }
        }
      } catch (e) {
        // ignore prefetch errors
        console.warn('Prefetch error:', e);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setLoadErrorCount(prev => prev + 1);
      
      // Prevent infinite reload loops: stop auto-reloading after 3 failures
      if (loadErrorCount >= 2) {
        console.warn('Jobs API repeatedly failing; stopping auto-reload to prevent infinite loop');
        // Show one-time error toast only on repeated failures
        toast({
          title: "Unable to load jobs",
          description: "The jobs service is temporarily unavailable. Please refresh the page or try again later.",
          variant: "destructive",
          duration: 10000
        });
      }
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
        updateLocationSettings(location.lat, location.lng, filters.maxDistance, 'gps')
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

  const updateLocationSettings = async (latitude, longitude, travelDistance, source = 'map') => {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        travel_distance_km: travelDistance.toString(),
        source
      });

      await jobsAPI.apiClient.put(`/auth/profile/location?${params.toString()}`);
      
      setUserLocation({ lat: latitude, lng: longitude });
      setFilters(prev => ({ 
        ...prev, 
        maxDistance: travelDistance,
        useLocation: true 
      }));
      
      const profileState = String(user?.state || user?.location || '').trim();
      const stateName = profileState
        ? profileState.replace(/\b\w/g, (c) => c.toUpperCase())
        : nearestStateFromCoordinates(latitude, longitude);
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

      await updateLocationSettings(lat, lng, distanceKm, 'map');
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
    if (!allStepsCompleted) {
      toast({
        title: "Complete Profile First",
        description: "Finish all 4 profile completion steps to show interest in jobs.",
        variant: "destructive",
      });
      navigate('/trades/overview');
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
    const accessFeeCoins = resolveAccessFeeCoins(job);
    if (walletBalance && walletBalance.balance_coins < accessFeeCoins) {
      toast({
        title: "Insufficient wallet balance",
        description: `You need at least ${accessFeeCoins} coins (₦${(accessFeeCoins * 100).toLocaleString()}) to pay for contact details. Please fund your wallet.`,
        variant: "destructive",
      });
      navigate('/trades/wallet');
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
  const resolveAccessFeeNaira = (job) => {
    const directNaira = Number(job?.access_fee_naira);
    if (Number.isFinite(directNaira) && directNaira > 0) return directNaira;
    const directCoins = Number(job?.access_fee_coins);
    if (Number.isFinite(directCoins) && directCoins > 0) return directCoins * 100;
    const nestedNaira = Number(job?.access_fees?.naira);
    if (Number.isFinite(nestedNaira) && nestedNaira > 0) return nestedNaira;
    const nestedCoins = Number(job?.access_fees?.coins);
    if (Number.isFinite(nestedCoins) && nestedCoins > 0) return nestedCoins * 100;
    return 1000;
  };
  const resolveAccessFeeCoins = (job) => {
    const { totalCoins } = computeVatInclusive(resolveAccessFeeNaira(job));
    return totalCoins;
  };

  const TIMELINE_PLACEHOLDERS = new Set(['', 'flexible', 'not specified', 'n/a', 'na', 'none']);
  const timelineKeywords = [
    'urgent',
    'timeline',
    'when do you need',
    'how soon',
    'when do you want',
    'when should',
    'job done',
    'start date'
  ];

  const deriveTimelineFromAnswers = (answersDoc) => {
    const answers = Array.isArray(answersDoc?.answers) ? answersDoc.answers : [];
    for (const ans of answers) {
      const questionText = String(ans?.question_text || ans?.question || '').toLowerCase();
      if (!timelineKeywords.some((key) => questionText.includes(key))) continue;
      const rawValue = ans?.answer_text ?? ans?.answer_value;
      if (Array.isArray(rawValue)) {
        const joined = rawValue.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
        if (joined) return joined;
        continue;
      }
      const value = String(rawValue || '').trim();
      if (value) return value;
    }
    return '';
  };

  const getCachedAnswersForJob = (job) => {
    const ids = [job?.id, job?._id, job?.job_id]
      .filter(Boolean)
      .map((id) => String(id));
    for (const id of ids) {
      if (jobAnswersCache.current[id]) return jobAnswersCache.current[id];
      const trimmed = id.replace(/^0+/, '') || id;
      if (jobAnswersCache.current[trimmed]) return jobAnswersCache.current[trimmed];
    }
    return null;
  };

  const resolveJobTimeline = (job, answersDoc = null) => {
    const raw = String(job?.timeline || '').trim();
    if (raw && !TIMELINE_PLACEHOLDERS.has(raw.toLowerCase())) {
      return raw;
    }
    const derived = deriveTimelineFromAnswers(answersDoc || getCachedAnswersForJob(job));
    if (derived) return derived;
    return raw || 'Flexible';
  };

  const handleViewJobDetails = async (job) => {
    let freshJob = job;
    try {
      const res = await jobsAPI.getJob(job.id || job._id);
      if (res && (res.id || res._id)) {
        freshJob = { ...res, id: res.id || res._id };
        setJobs(prev => Array.isArray(prev) ? prev.map(j => (j.id === freshJob.id ? { ...j, ...freshJob } : j)) : prev);
      }
    } catch (_) {}
    setSelectedJobDetails(freshJob);
    
    // First, check for embedded answers in the job object 
    let answers = null;
    const embedded = freshJob.question_answers || 
                     (freshJob.job_details && freshJob.job_details.question_answers) ||
                     (freshJob.answers && Array.isArray(freshJob.answers) ? { answers: freshJob.answers } : null);
    
    if (embedded && Array.isArray(embedded.answers) && embedded.answers.length > 0) {
      answers = embedded;
      setSelectedJobAnswers(answers);
      jobAnswersCache.current[String(freshJob.id || freshJob._id || freshJob.job_id)] = answers;
    } else {
      // Check cache
      const cached = jobAnswersCache.current[String(freshJob.id)] 
                  || jobAnswersCache.current[String(freshJob._id)] 
                  || jobAnswersCache.current[String(freshJob.job_id)];
      if (cached && cached.answers && cached.answers.length > 0) {
        answers = cached;
        setSelectedJobAnswers(answers);
      } else {
        setSelectedJobAnswers(null);
      }
    }
    
    setShowJobModal(true);
    
    // Only fetch from API if we don't have answers yet (avoid timeout if answers are already embedded)
    if (!answers || !answers.answers || answers.answers.length === 0) {
      // Fetch job question answers from API (with timeout protection)
      try {
        const tryIds = [];
        const pushIf = (v) => { if (v !== undefined && v !== null) tryIds.push(String(v)); };
        pushIf(freshJob.id);
        pushIf(freshJob._id);
        pushIf(freshJob.job_id);
        // Add zero-trimmed variants
        const base = String(freshJob.id || freshJob.job_id || freshJob._id || '');
        if (base) {
          const trimmed = base.replace(/^0+/, '') || base;
          if (!tryIds.includes(trimmed)) tryIds.push(trimmed);
        }

        // Try fetching with a timeout promise
        const fetchWithTimeout = (jid) => {
          return Promise.race([
            tradeCategoryQuestionsAPI.getJobQuestionAnswers(jid),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
            )
          ]);
        };

        let apiAnswers = null;
        for (const jid of tryIds) {
          try {
            const resAns = await fetchWithTimeout(jid);
            if (resAns && Array.isArray(resAns.answers) && resAns.answers.length > 0) {
              apiAnswers = resAns;
              break;
            }
          } catch (err) {
            // Continue to next ID or fallback
            console.warn(`Failed to fetch answers for job ID ${jid}:`, err.message);
          }
        }

        if (apiAnswers && apiAnswers.answers && apiAnswers.answers.length > 0) {
          console.log('✅ Fetched job question answers from API:', apiAnswers);
          setSelectedJobAnswers(apiAnswers);
          jobAnswersCache.current[String(freshJob.id || freshJob._id || freshJob.job_id)] = apiAnswers;
        } else {
          console.log('⚠️ No answers found from API for job:', freshJob.id || freshJob._id || freshJob.job_id);
        }
      } catch (err) {
        console.error('Error fetching job question answers:', err);
        // Don't set error state, just use what we have (embedded or cached)
      }
    } else {
      console.log('✅ Using embedded/cached answers:', answers);
    }
  };

  const parseApiDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'number') return new Date(dateValue);
    let raw = String(dateValue).trim();
    // Backend often emits UTC-naive timestamps (no timezone). Treat them as UTC.
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !/(Z|[+\-]\d{2}:\d{2})$/i.test(raw)) {
      raw = `${raw}Z`;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatDate = (dateString) => {
    const date = parseApiDate(dateString);
    if (!date) return 'just now';
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




  // Check if we're inside the dashboard route
  const isInDashboard = location.pathname.startsWith('/trades');

  const pageContent = (
    <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
      
      {/* Page Header - Simplified for Dashboard */}
      <section className={isInDashboard ? "mb-6" : "py-8 bg-white border-b"}>
        <div className={isInDashboard ? "" : "container mx-auto px-4"}>
          <div className={isInDashboard ? "" : "max-w-4xl mx-auto"}>
            {/* Header with count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-[#121E3C]">
                  Browse Jobs
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} matching your skills
                </p>
              </div>
              
              {/* Wallet quick info */}
              {isTradesperson() && walletBalance && (
                <div className="flex items-center gap-3 px-4 py-2 bg-[#121E3C]/5 rounded-xl">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-sm font-semibold text-[#121E3C]">{walletBalance.balance_coins} coins</p>
                  </div>
                  <Button
                    onClick={() => navigate('/trades/wallet')}
                    size="sm"
                    className="bg-[#34D164] hover:bg-[#2ab854] text-white text-xs px-3 py-1.5 h-auto rounded-lg"
                  >
                    Top Up
                  </Button>
                </div>
              )}
            </div>

            {/* Verification Notice - Compact */}
            {!user?.verified_tradesperson && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <User size={16} className="text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Verify your account</span> to show interest in jobs
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/verify-account')} 
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 h-auto rounded-lg shrink-0"
                >
                  Verify Now
                </Button>
              </div>
            )}
            
            {/* Search and Filters - Compact */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] transition-all"
                  />
                </div>
                
                {/* Category Select */}
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] bg-white min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {NIGERIAN_TRADE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                {/* Location Toggle */}
                <button
                  onClick={() => {
                    const newValue = !filters.useLocation;
                    setFilters(prev => ({ ...prev, useLocation: newValue }));
                    if (newValue && user?.latitude && user?.longitude) {
                      setUserLocation({ lat: user.latitude, lng: user.longitude });
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border transition-all ${
                    filters.useLocation 
                      ? 'bg-[#34D164]/10 border-[#34D164] text-[#34D164]' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <MapPin size={16} />
                  <span className="hidden sm:inline">{filters.useLocation ? `${filters.maxDistance}km` : 'Near me'}</span>
                </button>

                {/* View Toggle */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2.5 text-sm transition-all ${
                      viewMode === 'list' ? 'bg-[#121E3C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-2.5 text-sm transition-all ${
                      viewMode === 'map' ? 'bg-[#121E3C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Map size={16} />
                  </button>
                </div>
              </div>
              
              {/* Distance Slider - Only when location filter is active */}
              {filters.useLocation && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
                  <span className="text-xs text-gray-500">Distance:</span>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    value={filters.maxDistance}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                    onMouseUp={(e) => commitTravelDistanceChange(parseInt(e.currentTarget.value))}
                    onTouchEnd={(e) => commitTravelDistanceChange(parseInt(e.currentTarget.value))}
                    className="flex-1 h-1.5 accent-[#34D164]"
                  />
                  <span className="text-xs font-medium text-[#121E3C] min-w-[60px]">{filters.maxDistance} km</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Display */}
      <section className={isInDashboard ? "" : "py-8"}>
        <div className={isInDashboard ? "" : "container mx-auto px-4"}>
          <div className={isInDashboard ? "" : "max-w-4xl mx-auto"}>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {jobs.map((job) => (
                      <div 
                        key={job.id || job._id || `job-${Math.random()}`} 
                        className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-[#34D164]/30 transition-all duration-300 cursor-pointer group"
                        onClick={() => handleViewJobDetails(job)}
                      >
                        {/* Top accent bar */}
                        <div className="h-1 bg-gradient-to-r from-[#34D164] to-[#2ab854] group-hover:h-1.5 transition-all" />
                        
                        <div className="p-4">
                          {/* Category & Posted */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-[#34D164] bg-[#34D164]/10 px-2 py-0.5 rounded">
                              {job.category || 'General'}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(job.created_at)}</span>
                          </div>
                          
                          {/* Job Title */}
                          <h3 className="text-[#121E3C] font-semibold text-base leading-tight mb-3 line-clamp-2 group-hover:text-[#34D164] transition-colors">
                            {job.title || 'Untitled Job'}
                          </h3>
                          
                          {/* Location & Distance */}
                          <div className="flex items-center gap-1.5 text-gray-500 mb-3">
                            <MapPin size={13} className="shrink-0" />
                            <span className="text-sm truncate">{job.location || 'Location TBD'}</span>
                            {job.distance_km !== undefined && job.distance_km !== null && (
                              <span className="text-xs text-[#34D164] font-medium ml-auto whitespace-nowrap">
                                {(() => {
                                  const d = Number(job.distance_km);
                                  if (Number.isNaN(d)) return '';
                                  if (d < 1) return '<1km';
                                  return `${d.toFixed(1)}km`;
                                })()}
                              </span>
                            )}
                          </div>
                          
                          {/* Bottom row: Budget & Interest count */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            {(job.budget_min || job.budget_max) ? (
                              <span className="text-sm font-semibold text-[#121E3C]">
                                {job.budget_min && job.budget_max 
                                  ? `₦${(job.budget_min/1000).toFixed(0)}k - ₦${(job.budget_max/1000).toFixed(0)}k`
                                  : job.budget_max ? `Up to ₦${(job.budget_max/1000).toFixed(0)}k` : 'Flexible'
                                }
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Flexible budget</span>
                            )}
                            {job.interests_count > 0 && (
                              <div className="flex items-center gap-1 text-pink-500">
                                <Heart size={12} className="fill-pink-500" />
                                <span className="text-xs font-medium">{job.interests_count}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-4xl w-full h-[100svh] max-h-[100svh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100 p-4 sm:p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      {selectedJobDetails.category}
                    </span>
                    {selectedJobDetails.interests_count > 0 && (
                      <span className="flex items-center gap-1 text-pink-500 text-xs">
                        <Heart size={12} className="fill-pink-500" />
                        {selectedJobDetails.interests_count} interested
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[#121E3C] leading-tight">
                    {selectedJobDetails.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowJobModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 min-h-0">
              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-3">
                  <MapPin size={16} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-[#121E3C] truncate">{selectedJobDetails.location}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <Calendar size={16} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Posted</p>
                  <p className="text-sm font-medium text-[#121E3C]">{formatDate(selectedJobDetails.created_at)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <Clock size={16} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Timeline</p>
                  <p className="text-sm font-medium text-[#121E3C]">{resolveJobTimeline(selectedJobDetails, selectedJobAnswers)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <Briefcase size={16} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Job ID</p>
                  <p className="text-sm font-medium text-[#121E3C] truncate">{(selectedJobDetails.id || selectedJobDetails._id || selectedJobDetails.job_id)?.toString().slice(-8)}</p>
                </div>
              </div>

              {/* Budget Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#121E3C] mb-3">Budget</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedJobDetails.budget_min && selectedJobDetails.budget_max ? (
                    <div className="flex-1 min-w-[200px] bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#34D164]">
                        {formatCurrency(selectedJobDetails.budget_min)} - {formatCurrency(selectedJobDetails.budget_max)}
                      </div>
                      <div className="text-xs text-green-700">Budget Range</div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="text-lg font-semibold text-gray-700">Negotiable</div>
                      <div className="text-xs text-gray-500">Discuss pricing with homeowner</div>
                    </div>
                  )}

                  {/* Access Fee - Only visible to tradespeople */}
                  {isTradesperson() && (
                    (() => {
                      const { vat, total, totalCoins } = computeVatInclusive(resolveAccessFeeNaira(selectedJobDetails));
                      return (
                        <div className="flex-1 min-w-[200px] bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="text-lg font-bold text-amber-700">
                            {totalCoins} coins
                          </div>
                          <div className="text-xs text-amber-600">
                            Access fee (₦{total.toLocaleString()} incl. VAT)
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Hide concatenated description when we have structured question answers */}
              {(() => {
                // Only show description if we DON'T have structured question answers
                const hasStructuredAnswers = selectedJobAnswers && 
                                           selectedJobAnswers.answers && 
                                           Array.isArray(selectedJobAnswers.answers) && 
                                           selectedJobAnswers.answers.length > 0;
                
                // Also check for auto-generated descriptions (they contain " job details: ")
                const isAutoGenerated = selectedJobDetails.description && 
                                       selectedJobDetails.description.includes(' job details: ');
                
                // Hide description if we have structured answers OR if it's auto-generated
                if (hasStructuredAnswers || isAutoGenerated) {
                  return null;
                }
                
                // Only show manual description if it exists and is meaningful
                if (selectedJobDetails.description && selectedJobDetails.description.trim()) {
                  return (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3 font-montserrat">Job Description</h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 font-lato">
                        {selectedJobDetails.description}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Hide standalone Photos section if we have structured answers (they are shown in attachments) */}
              {(() => {
                // If we have structured answers with file uploads, they are already shown in "Job Attachments" below
                const answers = (selectedJobAnswers && selectedJobAnswers.answers) ? selectedJobAnswers.answers : [];
                const hasFileAnswers = answers.some(ans => {
                  const val = ans.answer_value || ans.answer_text;
                  const isUpload = (ans.question_type || '').startsWith('file_upload');
                  
                  if (isUpload) {
                    if (Array.isArray(val) && val.length > 0) return true;
                    if (typeof val === 'string' && val.trim().length > 0 && val !== 'undefined') return true;
                  }
                  
                  // Also check for string URLs
                  if (typeof val === 'string' && val !== 'undefined') {
                    if (val.includes('/api/jobs/trade-questions/file/') || 
                        val.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ||
                        val.startsWith('data:image/')) {
                      return true;
                    }
                  }
                  return false;
                });

                // If we have structured file answers, don't show this separate Photos section
                if (hasFileAnswers) return null;

                // Otherwise, keep the logic to show photos if they exist separately (legacy support)
                const isFileUrl = (str) => {
                  if (typeof str !== 'string') return false;
                  return str.includes('/api/jobs/trade-questions/file/') ||
                         str.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ||
                         str.startsWith('data:image/');
                };
                const fileAnswers = answers.filter(ans => {
                  const val = ans.answer_value || ans.answer_text;
                  const isUpload = (ans.question_type || '').startsWith('file_upload');
                  if (isUpload) {
                    if (Array.isArray(val) && val.length > 0) return true;
                    if (typeof val === 'string' && val.trim().length > 0 && val !== 'undefined') return true;
                  }
                  if (typeof val === 'string' && val !== 'undefined') {
                    if (isFileUrl(val) || val.split(',').some(part => isFileUrl(part.trim()))) {
                      return true;
                    }
                  }
                  return false;
                });
                if (fileAnswers.length > 0) {
                  return (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3 font-montserrat">Photos</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {fileAnswers.map((ans, idx) => {
                          let files = [];
                          const rawValue = ans.answer_value || ans.answer_text;
                          if (Array.isArray(rawValue)) {
                            files = rawValue;
                          } else if (typeof rawValue === 'string') {
                            files = rawValue.includes(',') ? rawValue.split(',').map(s => s.trim()) : [rawValue];
                          }
                          return files.map((url, fIdx) => {
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith('data:image/') || url.includes('/api/jobs/trade-questions/file/');
                            return (
                              <div key={`${idx}-${fIdx}`} className="relative group border rounded-lg overflow-hidden h-32 bg-gray-100">
                                {isImage ? (
                                  <div className="w-full h-full">
                                    <AuthenticatedImage 
                                      src={url} 
                                      alt={`Photo ${fIdx + 1}`} 
                                      className="w-full h-full object-contain"
                                    />
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
                  );
                }
                return null;
              })()}

              {/* Job Requirements & Details from Trade Category Questions */}
              {(() => {
                // Get answers from multiple possible sources
                const answersData = selectedJobAnswers || 
                                  (selectedJobDetails?.question_answers) ||
                                  (selectedJobDetails?.job_details?.question_answers) ||
                                  (selectedJobDetails?.answers ? { answers: selectedJobDetails.answers } : null);
                
                const answers = answersData?.answers || [];
                
                // Debug logging
                if (selectedJobDetails) {
                  console.log('🔍 Checking for job requirements:', {
                    selectedJobAnswers: !!selectedJobAnswers,
                    answersCount: answers.length,
                    jobId: selectedJobDetails.id || selectedJobDetails._id || selectedJobDetails.job_id,
                    hasEmbedded: !!(selectedJobDetails?.question_answers || selectedJobDetails?.job_details?.question_answers)
                  });
                }
                
                if (!answers || answers.length === 0) {
                  console.log('⚠️ No answers to display for job requirements');
                  return null;
                }
                
                // Helper to detect file URLs
                const isFileUrl = (str) => {
                  if (typeof str !== 'string') return false;
                  return str.includes('/api/jobs/trade-questions/file/') || 
                         str.match(/\.(jpg|jpeg|png|gif|webp|pdf)(\?.*)?$/i) ||
                         str.startsWith('data:image/') ||
                         str.startsWith('data:application/');
                };

                // Filter answers: show ONLY non-empty text answers that are NOT files
                const visibleAnswers = answers.filter(ans => {
                  if ((ans.question_type || '').startsWith('file_upload')) return false;
                  
                  const val = ans.answer_text || (Array.isArray(ans.answer_value) ? ans.answer_value.join(', ') : (ans.answer_value ?? ''));
                  
                  // Check if the value itself looks like a file URL (or list of them)
                  if (isFileUrl(val) || (typeof val === 'string' && val.split(',').some(part => isFileUrl(part.trim())))) {
                    return false;
                  }

                  // Be more permissive with what we show (allow 0, false, etc.)
                  if (val === undefined || val === null || String(val).trim() === '' || val === '—' || val === 'undefined') return false;
                  return true;
                });

                // Find file uploads (images) to show separately
                const fileAnswers = answers.filter(ans => {
                  const val = ans.answer_value || ans.answer_text;
                  const isFileUploadType = (ans.question_type || '').startsWith('file_upload');

                  // If explicitly a file upload type
                  if (isFileUploadType) {
                    if (Array.isArray(val) && val.length > 0) return true;
                    if (typeof val === 'string' && val.trim().length > 0 && val !== 'undefined') return true;
                  }

                  // Also check if the content looks like file URLs (even if type isn't file_upload)
                  if (typeof val === 'string' && val !== 'undefined') {
                     if (isFileUrl(val) || val.split(',').some(part => isFileUrl(part.trim()))) {
                       return true;
                     }
                  }
                  
                  return false;
                });

                // Only show section if there are visible answers or file attachments
                if (visibleAnswers.length === 0 && fileAnswers.length === 0) return null;

                // Count total files for display
                const totalFiles = fileAnswers.reduce((acc, ans) => {
                  const val = ans.answer_value || ans.answer_text;
                  if (Array.isArray(val)) return acc + val.length;
                  if (typeof val === 'string' && val.includes(',')) return acc + val.split(',').length;
                  return acc + (val ? 1 : 0);
                }, 0);

                return (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3 font-montserrat">Job Requirements & Details</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                      {visibleAnswers.map((answer, index) => (
                        <div key={index} className="border-b border-green-200 last:border-b-0 pb-3 last:pb-0">
                          <div className="font-medium text-gray-800 font-lato mb-1">
                            {answer.question_text || answer.question}
                          </div>
                          <div className="text-gray-700 font-lato pl-3 flex items-start gap-2">
                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0"></span>
                            <span>{answer.answer_text || (Array.isArray(answer.answer_value) ? answer.answer_value.join(', ') : answer.answer_value) || ''}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Show attachments inside the green box, matching admin page format */}
                      {fileAnswers.length > 0 && (
                        <div className="pt-4 border-t border-green-200">
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Job Attachments ({totalFiles})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {fileAnswers.map((ans, idx) => {
                              let files = [];
                              const rawValue = ans.answer_value || ans.answer_text;
                              
                              if (Array.isArray(rawValue)) {
                                files = rawValue;
                              } else if (typeof rawValue === 'string') {
                                files = rawValue.includes(',') 
                                  ? rawValue.split(',').map(s => s.trim()) 
                                  : [rawValue];
                              }

                              return files.map((url, fIdx) => {
                                if (!url || url === 'undefined') return null;
                                
                                // Ensure the URL is absolute or properly prefixed
                                let finalUrl = url;
                                const jobIdForFiles = selectedJobDetails?.id || selectedJobDetails?._id || selectedJobDetails?.job_id || '';
                                if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/')) {
                                  // If it's just a filename from a job, prefix it with the correct job id
                                  finalUrl = `/api/jobs/trade-questions/file/${jobIdForFiles}/${url}`;
                                }

                                const isImage = typeof finalUrl === 'string' && (
                                  finalUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || 
                                  finalUrl.startsWith('data:image/') ||
                                  finalUrl.includes('/api/jobs/trade-questions/file/')
                                );
                                
                                return (
                                  <div key={`${idx}-${fIdx}`} className="relative group border border-green-200 rounded-lg overflow-hidden h-32 bg-white shadow-sm hover:shadow-md transition-shadow">
                                    {isImage ? (
                                      <div className="w-full h-full cursor-pointer" onClick={() => window.open(finalUrl, '_blank')}>
                                        <AuthenticatedImage 
                                          src={finalUrl} 
                                          alt={`Attachment ${fIdx + 1}`} 
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">View Full</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <a  
                                        href={finalUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-green-600 bg-gray-50 hover:bg-green-50 transition-colors"
                                      >
                                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
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
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 font-lato">
                      Specific requirements provided by the homeowner
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex-shrink-0 sticky bottom-0 z-10 border-t border-gray-100 bg-white p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500 font-lato hidden sm:block">
                  Posted {getTimeAgo(selectedJobDetails.created_at)}
                </div>
                
                <div className="flex space-x-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowJobModal(false)}
                    className="flex-1 sm:flex-none"
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
                    disabled={!allStepsCompleted ||
                             loadingStates.showInterest[selectedJobDetails.id] || 
                             (userInterests && userInterests.includes(selectedJobDetails.id))}
                    className="text-white font-lato flex-1 sm:flex-none"
                    style={{backgroundColor: '#34D164'}}
                  >
                    {!allStepsCompleted ? (
                      <>
                        <Heart size={16} className="mr-2" />
                        Complete 4 Steps First
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

  // If inside dashboard, return content directly without TradespersonLayout wrapper
  if (isInDashboard) {
    return pageContent;
  }

  // Otherwise wrap in TradespersonLayout for standalone page
  return (
    <TradespersonLayout>
      {pageContent}
    </TradespersonLayout>
  );
};

export default BrowseJobsPage;
