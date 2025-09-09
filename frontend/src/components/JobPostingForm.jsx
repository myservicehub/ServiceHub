import React, { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  DollarSign, 
  User, 
  Mail, 
  Phone,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  Coins,
  Users,
  Bell,
  Star
} from 'lucide-react';
import { jobsAPI, authAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import LocationPicker from './maps/LocationPicker';

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

// Nigerian States - Service Coverage Areas
const NIGERIAN_STATES = [
  "Abuja",
  "Lagos", 
  "Delta",
  "Rivers State",
  "Benin",
  "Bayelsa",
  "Enugu",
  "Cross Rivers"
];

const JobPostingForm = ({ onClose, onJobPosted }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Job Details
    title: '',
    description: '',
    category: '',
    
    // Step 2: Location & Timeline
    state: '',
    lga: '',
    town: '',
    zip_code: '',
    home_address: '',
    timeline: '',
    jobLocation: null, // For coordinates
    
    // Step 3: Budget  
    budgetType: 'range', // 'range' or 'discussion'
    budget_min: '',
    budget_max: '',
    
    // Step 4: Contact Details
    homeowner_name: '',
    homeowner_email: '',
    homeowner_phone: '',
    
    // Step 5: Create Account
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [availableLGAs, setAvailableLGAs] = useState([]);
  const [loadingLGAs, setLoadingLGAs] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { loginWithToken, isAuthenticated, currentUser, loading } = useAuth();
  const { toast } = useToast();
  
  // Enhanced authentication check - use multiple indicators to be more robust
  const isUserAuthenticated = () => {
    return isAuthenticated() || (currentUser && currentUser.id);
  };

  // Auto-populate user details for authenticated users
  useEffect(() => {
    if (isUserAuthenticated() && currentUser) {
      setFormData(prev => ({
        ...prev,
        homeowner_name: currentUser.name || '',
        homeowner_email: currentUser.email || '',
        homeowner_phone: currentUser.phone || ''
      }));
    }
  }, [currentUser, isAuthenticated]);

  // Dynamic total steps based on authentication status  
  const totalSteps = isUserAuthenticated() ? 4 : 5;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // When state changes, fetch LGAs and reset LGA selection
    if (field === 'state' && value) {
      fetchLGAsForState(value);
      setFormData(prev => ({ ...prev, lga: '' })); // Reset LGA when state changes
    }
  };

  // Fetch LGAs for selected state
  const fetchLGAsForState = async (state) => {
    if (!state) {
      setAvailableLGAs([]);
      return;
    }
    
    setLoadingLGAs(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/lgas/${encodeURIComponent(state)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableLGAs(data.lgas || []);
      } else {
        console.error('Failed to fetch LGAs:', response.statusText);
        setAvailableLGAs([]);
      }
    } catch (error) {
      console.error('Error fetching LGAs:', error);
      setAvailableLGAs([]);
    } finally {
      setLoadingLGAs(false);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Job Details
        if (!formData.title.trim()) newErrors.title = 'Job title is required';
        else if (formData.title.length < 10) newErrors.title = 'Job title must be at least 10 characters';
        
        if (!formData.description.trim()) newErrors.description = 'Job description is required';
        else if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
        
        if (!formData.category) newErrors.category = 'Please select a category';
        break;

      case 2: // Location & Timeline
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.lga.trim()) newErrors.lga = 'Local Government Area (LGA) is required';
        if (!formData.town.trim()) newErrors.town = 'Town/Area is required';
        if (!formData.zip_code.trim()) {
          newErrors.zip_code = 'Zip code is required';
        } else if (!/^\d{6}$/.test(formData.zip_code.trim())) {
          newErrors.zip_code = 'Zip code must be 6 digits';
        }
        if (!formData.home_address.trim()) {
          newErrors.home_address = 'Home address is required';
        } else if (formData.home_address.trim().length < 10) {
          newErrors.home_address = 'Home address must be at least 10 characters';
        }
        if (!formData.timeline.trim()) newErrors.timeline = 'Timeline is required';
        break;

      case 3: // Budget
        if (formData.budgetType === 'range') {
          if (!formData.budget_min || formData.budget_min < 1000) {
            newErrors.budget_min = 'Minimum budget must be at least ₦1,000';
          }
          if (!formData.budget_max || formData.budget_max < 1000) {
            newErrors.budget_max = 'Maximum budget must be at least ₦1,000';
          }
          if (formData.budget_min && formData.budget_max && 
              parseInt(formData.budget_min) >= parseInt(formData.budget_max)) {
            newErrors.budget_max = 'Maximum budget must be higher than minimum';
          }
        }
        break;

      case 4: // Contact Details (skip validation for authenticated users)
        if (isAuthenticated()) {
          // For authenticated users, no validation needed as we use their existing data
          break;
        }
        // For non-authenticated users, validate contact details
        if (!formData.homeowner_name.trim()) newErrors.homeowner_name = 'Your name is required';
        if (!formData.homeowner_email.trim()) newErrors.homeowner_email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.homeowner_email)) {
          newErrors.homeowner_email = 'Please enter a valid email address';
        }
        if (!formData.homeowner_phone.trim()) newErrors.homeowner_phone = 'Phone number is required';
        break;

      case 5: // Create Account
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (currentStep === 4) {
      // If user is already authenticated, skip account creation and submit job
      if (isUserAuthenticated()) {
        handleJobSubmissionForAuthenticatedUser();
        return;
      }
      // For non-authenticated users, show account/login choice modal
      setShowAccountModal(true);
      return;
    }
    
    if (validateStep(currentStep)) {
      const nextStepNumber = Math.min(currentStep + 1, totalSteps);
      // Safety check: prevent authenticated users from reaching step 5
      if (isUserAuthenticated() && nextStepNumber === 5) {
        console.warn('Authenticated user tried to reach step 5 - calling handleSubmit instead');
        handleJobSubmissionForAuthenticatedUser();
        return;
      }
      setCurrentStep(nextStepNumber);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const continueToAccountCreation = () => {
    setShowAccountModal(false);
    setCurrentStep(5);
  };

  const continueToLogin = () => {
    setShowAccountModal(false);
    setShowLoginModal(true);
  };

  const handleJobSubmissionForAuthenticatedUser = async () => {
    // Check authentication with improved loading state handling
    if (!isUserAuthenticated()) {
      toast({
        title: "Error",
        description: "You must be logged in to post a job.",
        variant: "destructive",
      });
      return;
    }

    // Wait for user data to load if we're still in loading state
    if (!currentUser) {
      toast({
        title: "Loading...",
        description: "Please wait while we load your account information.",
        variant: "default",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create the job using authenticated user's data
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code,
        home_address: formData.home_address,
        budget_min: formData.budgetType === 'range' ? parseInt(formData.budget_min) : null,
        budget_max: formData.budgetType === 'range' ? parseInt(formData.budget_max) : null,
        timeline: formData.timeline,
        homeowner_name: currentUser.name || 'Homeowner',
        homeowner_email: currentUser.email || '',
        homeowner_phone: currentUser.phone || ''
      };

      // Add coordinates if location was selected
      if (formData.jobLocation) {
        jobData.latitude = formData.jobLocation.lat;
        jobData.longitude = formData.jobLocation.lng;
      }

      const jobResponse = await jobsAPI.createJob(jobData);

      toast({
        title: "Success!",
        description: "Your job has been posted successfully! Tradespeople will start showing interest soon.",
      });

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to homepage instead of success page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Job posting failed:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to post job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // If user is authenticated, use the authenticated flow
    if (isUserAuthenticated()) {
      await handleJobSubmissionForAuthenticatedUser();
      return;
    }
    
    // For non-authenticated users, validate step 5 (account creation)
    if (!validateStep(5)) return;

    setSubmitting(true);

    try {
      // Step 1: Create homeowner account
      const registrationData = {
        name: formData.homeowner_name,
        email: formData.homeowner_email,
        password: formData.password,
        phone: formData.homeowner_phone,
        location: formData.state,  // Use state for location
        postcode: formData.zip_code  // Use zip_code for postcode
      };

      const registrationResponse = await authAPI.registerHomeowner(registrationData);
      
      if (!registrationResponse.access_token) {
        throw new Error('Registration failed - no access token received');
      }

      // Step 2: Login with the returned token
      loginWithToken(registrationResponse.access_token, registrationResponse.user);

      // Step 3: Create the job
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code,
        home_address: formData.home_address,
        budget_min: formData.budgetType === 'range' ? parseInt(formData.budget_min) : null,
        budget_max: formData.budgetType === 'range' ? parseInt(formData.budget_max) : null,
        timeline: formData.timeline,
        homeowner_name: formData.homeowner_name,
        homeowner_email: formData.homeowner_email,
        homeowner_phone: formData.homeowner_phone
      };

      // Add coordinates if location was selected
      if (formData.jobLocation) {
        jobData.latitude = formData.jobLocation.lat;
        jobData.longitude = formData.jobLocation.lng;
      }

      const jobResponse = await jobsAPI.createJob(jobData);

      toast({
        title: "Success!",
        description: "Your account has been created and job posted successfully! Welcome to ServiceHub!",
      });

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to homepage instead of success page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Job posting failed:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create account and post job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600 font-lato">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-600 font-lato">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
            backgroundColor: '#2F8140'
          }}
        />
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Tell us about your job
              </h2>
              <p className="text-gray-600 font-lato">
                Provide details about the work you need done
              </p>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Job Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Fix leaky bathroom faucet"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {NIGERIAN_TRADE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Job Description *
              </label>
              <textarea
                rows={6}
                placeholder="Describe the work you need done, including any specific requirements, materials needed, or preferences you have..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description ? (
                  <p className="text-red-500 text-sm">{errors.description}</p>
                ) : (
                  <p className="text-gray-500 text-sm">Minimum 50 characters</p>
                )}
                <p className="text-gray-500 text-sm">{formData.description.length}/2000</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Location & Timeline
              </h2>
              <p className="text-gray-600 font-lato">
                Where is the job located and when do you need it done?
              </p>
            </div>

            {/* State and LGA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  State *
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                    errors.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select your state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Local Government Area (LGA) *
                </label>
                <select
                  value={formData.lga}
                  onChange={(e) => updateFormData('lga', e.target.value)}
                  disabled={!formData.state || loadingLGAs}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                    errors.lga ? 'border-red-500' : 'border-gray-300'
                  } ${(!formData.state || loadingLGAs) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {loadingLGAs ? 'Loading LGAs...' : 'Select LGA'}
                  </option>
                  {availableLGAs.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
                {errors.lga && <p className="text-red-500 text-sm mt-1">{errors.lga}</p>}
                {!formData.state && (
                  <p className="text-gray-500 text-sm mt-1">Please select a state first</p>
                )}
              </div>
            </div>

            {/* Town and Zip Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Town/Area *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Victoria Island, Ikeja, Warri"
                  value={formData.town}
                  onChange={(e) => updateFormData('town', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                    errors.town ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.town && <p className="text-red-500 text-sm mt-1">{errors.town}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Zip Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g., 100001"
                  value={formData.zip_code}
                  onChange={(e) => updateFormData('zip_code', e.target.value)}
                  maxLength={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                    errors.zip_code ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.zip_code && <p className="text-red-500 text-sm mt-1">{errors.zip_code}</p>}
                <p className="text-gray-500 text-sm mt-1">Nigerian postal code (6 digits)</p>
              </div>
            </div>

            {/* Home Address */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Home Address *
              </label>
              <textarea
                rows={3}
                placeholder="Enter your full home address (street, building number, landmarks, etc.)"
                value={formData.home_address}
                onChange={(e) => updateFormData('home_address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
                  errors.home_address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.home_address && <p className="text-red-500 text-sm mt-1">{errors.home_address}</p>}
              <div className="flex justify-between items-center mt-1">
                <p className="text-gray-500 text-sm">Minimum 10 characters</p>
                <p className="text-gray-500 text-sm">{formData.home_address.length}/500</p>
              </div>
            </div>

            {/* Map Location Picker */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Precise Location (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Pin the exact location on the map to help tradespeople find you easily
              </p>
              <LocationPicker
                height="300px"
                placeholder="Search for your exact address..."
                onLocationSelect={(location) => updateFormData('jobLocation', location)}
                initialLocation={formData.jobLocation}
                showCurrentLocation={true}
                showSearch={true}
              />
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                When do you need this done? *
              </label>
              <select
                value={formData.timeline}
                onChange={(e) => updateFormData('timeline', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.timeline ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select timeline</option>
                <option value="ASAP">As soon as possible</option>
                <option value="This week">Within this week</option>
                <option value="This month">Within this month</option>
                <option value="Next month">Within next month</option>
                <option value="Flexible">I'm flexible</option>
              </select>
              {errors.timeline && <p className="text-red-500 text-sm mt-1">{errors.timeline}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                What's your budget?
              </h2>
              <p className="text-gray-600 font-lato">
                This helps tradespeople understand your project scope
              </p>
            </div>

            {/* Budget Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => updateFormData('budgetType', 'range')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.budgetType === 'range'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <DollarSign size={20} className="mr-2" style={{color: '#2F8140'}} />
                  <h3 className="font-semibold font-montserrat">Set Budget Range</h3>
                </div>
                <p className="text-sm text-gray-600 font-lato">
                  Specify your minimum and maximum budget
                </p>
              </div>

              <div
                onClick={() => updateFormData('budgetType', 'discussion')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.budgetType === 'discussion'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <User size={20} className="mr-2" style={{color: '#2F8140'}} />
                  <h3 className="font-semibold font-montserrat">Discuss with Pros</h3>
                </div>
                <p className="text-sm text-gray-600 font-lato">
                  Get quotes and discuss pricing
                </p>
              </div>
            </div>

            {/* Budget Range Inputs */}
            {formData.budgetType === 'range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Minimum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    placeholder="5,000"
                    value={formData.budget_min}
                    onChange={(e) => updateFormData('budget_min', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.budget_min ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.budget_min && <p className="text-red-500 text-sm mt-1">{errors.budget_min}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Maximum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    placeholder="15,000"
                    value={formData.budget_max}
                    onChange={(e) => updateFormData('budget_max', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.budget_max ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.budget_max && <p className="text-red-500 text-sm mt-1">{errors.budget_max}</p>}
                </div>
              </div>
            )}

            {/* Budget Preview */}
            {formData.budgetType === 'range' && formData.budget_min && formData.budget_max && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold font-montserrat text-green-800 mb-2">Budget Summary</h4>
                <p className="text-green-700 font-lato">
                  You're willing to pay between {formatCurrency(formData.budget_min)} and {formatCurrency(formData.budget_max)} for this job.
                </p>
              </div>
            )}

            {formData.budgetType === 'discussion' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold font-montserrat text-blue-800 mb-2">Budget Discussion</h4>
                <p className="text-blue-700 font-lato">
                  Tradespeople will provide quotes based on your job requirements. You can then compare and choose the best option.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                {isAuthenticated() ? 'Review & Post Your Job' : 'Your Contact Information'}
              </h2>
              <p className="text-gray-600 font-lato">
                {isAuthenticated() 
                  ? 'Review your job details and post it to connect with tradespeople'
                  : 'How should tradespeople contact you about this job?'
                }
              </p>
            </div>

            {isAuthenticated() ? (
              // For authenticated users - show review summary
              <div className="space-y-4">
                {/* Contact Information */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Your Contact Information
                    </h3>
                    {isUserAuthenticated() && currentUser && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle size={16} className="mr-1" />
                        Auto-filled from your account
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 font-lato mb-6">
                    {isUserAuthenticated() 
                      ? "We've automatically filled in your details from your account. You can edit them if needed."
                      : "Tradespeople will use this information to contact you about your job."
                    }
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold font-montserrat text-green-800 mb-4">
                    Ready to Post Your Job
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Your Name:</span> {currentUser?.name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {currentUser?.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {currentUser?.phone}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {formData.town}, {formData.lga}, {formData.state}
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold font-montserrat text-blue-800 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-700 space-y-1 font-lato">
                    <li>• Your job will be visible to qualified tradespeople in your area</li>
                    <li>• Interested tradespeople will show interest in your job</li>
                    <li>• You'll receive notifications when someone shows interest</li>
                    <li>• You can review their profiles and choose who to contact</li>
                  </ul>
                </div>
              </div>
            ) : (
              // For non-authenticated users - show contact form
              <>
                {/* Contact Information */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Your Contact Information
                    </h3>
                    {isUserAuthenticated() && currentUser && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle size={16} className="mr-1" />
                        Auto-filled from your account
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 font-lato mb-6">
                    {isUserAuthenticated() 
                      ? "We've automatically filled in your details from your account. You can edit them if needed."
                      : "Tradespeople will use this information to contact you about your job."
                    }
                  </p>
                </div>
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.homeowner_name}
                      onChange={(e) => updateFormData('homeowner_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_name && <p className="text-red-500 text-sm mt-1">{errors.homeowner_name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.homeowner_email}
                      onChange={(e) => updateFormData('homeowner_email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_email && <p className="text-red-500 text-sm mt-1">{errors.homeowner_email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      placeholder="08012345678"
                      value={formData.homeowner_phone}
                      onChange={(e) => updateFormData('homeowner_phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_phone && <p className="text-red-500 text-sm mt-1">{errors.homeowner_phone}</p>}
                </div>

                {/* Privacy Notice */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold font-montserrat text-gray-800 mb-2">Privacy & Communication</h4>
                  <ul className="text-sm text-gray-600 space-y-1 font-lato">
                    <li>• Your contact details will only be shared with tradespeople you choose</li>
                    <li>• You'll receive updates about your job via email and SMS</li>
                    <li>• You can manage your communication preferences anytime</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        );

      case 5:
        // Account creation step should only be shown for unauthenticated users
        if (isUserAuthenticated()) {
          return null; // Don't render account creation step for authenticated users
        }
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Create Your Account
              </h2>
              <p className="text-gray-600 font-lato">
                Almost done! Create your account to post the job and manage your projects.
              </p>
            </div>

            {/* Account Benefits */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold font-montserrat text-green-800 mb-4 flex items-center">
                <Check className="mr-2" size={20} />
                Your ServiceHub Account Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Users className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Track Interested Tradespeople</h4>
                    <p className="text-xs text-green-700">See who's interested in your job</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Bell className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Get Notifications</h4>
                    <p className="text-xs text-green-700">Email & SMS updates on your jobs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Rate & Review</h4>
                    <p className="text-xs text-green-700">Share feedback on completed work</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Coins className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Manage Jobs</h4>
                    <p className="text-xs text-green-700">Full dashboard for all your projects</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Create Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a secure password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-gray-600 font-lato text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Account/Login Choice Modal
  const AccountCreationModal = () => (
    showAccountModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <User size={32} style={{color: '#2F8140'}} />
            </div>
            <h3 className="text-xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Almost ready to post your job!
            </h3>
            <p className="text-gray-600 font-lato text-sm">
              Choose how you'd like to proceed to track interested tradespeople and get notifications.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#2F8140'}} />
              </div>
              <span className="text-sm font-lato">Track interested tradespeople</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#2F8140'}} />
              </div>
              <span className="text-sm font-lato">Get email and SMS notifications</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#2F8140'}} />
              </div>
              <span className="text-sm font-lato">Rate and review tradespeople</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={continueToAccountCreation}
              className="w-full text-white font-lato"
              style={{backgroundColor: '#2F8140'}}
            >
              I'm new - Create Account
            </Button>
            <Button
              onClick={continueToLogin}
              variant="outline"
              className="w-full font-lato"
            >
              I have an account - Sign In
            </Button>
            <Button
              onClick={() => setShowAccountModal(false)}
              variant="ghost"
              className="w-full text-gray-500 font-lato text-sm"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    )
  );

  // Login Modal for returning users
  const LoginModal = () => {
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [loginErrors, setLoginErrors] = useState({});
    const [loggingIn, setLoggingIn] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      setLoggingIn(true);
      
      try {
        const response = await authAPI.login(loginData.email, loginData.password);
        if (response.access_token) {
          loginWithToken(response.access_token, response.user);
          setShowLoginModal(false);
          
          toast({
            title: "Welcome back!",
            description: "You're now logged in. Let's post your job!",
          });
          
          // Automatically submit the job after login
          setTimeout(() => {
            handleJobSubmissionForAuthenticatedUser();
          }, 1000);
        }
      } catch (error) {
        console.error('Login failed:', error);
        setLoginErrors({ 
          general: error.response?.data?.detail || "Login failed. Please check your credentials." 
        });
      } finally {
        setLoggingIn(false);
      }
    };

    return showLoginModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <User size={32} style={{color: '#121E3C'}} />
            </div>
            <h3 className="text-xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Welcome back!
            </h3>
            <p className="text-gray-600 font-lato text-sm">
              Sign in to your account to post your job and track interested tradespeople.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{loginErrors.general}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium font-lato mb-2">Email</label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-lato"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium font-lato mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-lato"
                required
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowLoginModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loggingIn}
                className="flex-1 text-white"
                style={{backgroundColor: '#121E3C'}}
              >
                {loggingIn ? 'Signing In...' : 'Sign In & Post Job'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                Post a Job
              </CardTitle>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {renderProgressBar()}
            
            <form onSubmit={handleSubmit}>
              {renderStep()}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between pt-8 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center font-lato"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Previous
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={submitting}
                    className="flex items-center text-white font-lato"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    {currentStep === 4 && isUserAuthenticated() ? (
                      submitting ? 'Posting Job...' : 'Post Job'
                    ) : currentStep === 4 ? (
                      'Continue'
                    ) : (
                      'Continue'
                    )}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center text-white font-lato"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    {submitting 
                      ? (isUserAuthenticated() ? 'Posting Job...' : 'Creating Account & Posting Job...') 
                      : (isUserAuthenticated() ? 'Post Job' : 'Create Account & Post Job')
                    }
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <AccountCreationModal />
      <LoginModal />
    </>
  );
};

export default JobPostingForm;