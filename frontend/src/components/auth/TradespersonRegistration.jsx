import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Building, 
  FileText, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Wallet,
  Star,
  Clock,
  Trophy,
  BookOpen,
  Upload,
  X,
  Image as ImageIcon,
  Car,
  CreditCard,
  Crosshair
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import useStates from '../../hooks/useStates';
import { jobsAPI } from '../../api/services';
import { DEFAULT_TRAVEL_DISTANCE_KM } from '../../utils/locationCoordinates';
import SkillsTestComponent from './SkillsTestComponent';
import { adminAPI } from '../../api/wallet';
import PaymentPage from './PaymentPage';

// Fallback trade categories (used while loading or if API fails)
const FALLBACK_TRADE_CATEGORIES = [
  // Column 1
  "Building", "Concrete Works", "Tiling", "Door & Window Installation",
  "Air Conditioning & Refrigeration", "Plumbing",
  // Column 2
  "Home Extensions", "Scaffolding", "Flooring", "Bathroom Fitting",
  "Generator Services", "Welding",
  // Column 3
  "Renovations", "Painting", "Carpentry", "Interior Design",
  "Solar & Inverter Installation", "Locksmithing",
  // Column 4
  "Roofing", "Plastering/POP", "Furniture Making", "Electrical Repairs",
  "CCTV & Security Systems", "General Handyman Work",
  // Additional services to maintain strict 28
  "Cleaning", "Relocation/Moving", "Waste Disposal", "Recycling"
];

// If needed, we can also create a separate hook for trade categories
// For now, keeping them as constants since they're less frequently changed

const TradespersonRegistration = ({ onClose, onComplete, referralCode, onSwitchToLogin }) => {
  const uploadSectionRef = useRef(null);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeCategories, setTradeCategories] = useState(FALLBACK_TRADE_CATEGORIES);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [formData, setFormData] = useState({
    // Step 1: Account Creation
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    referralCode: referralCode || '',
    password: '',
    phone: '',
    marketingConsent: false,
    
    // Step 2: Work Details
    selectedTrades: [],
    experienceYears: '',
    travelDistance: 10,
    businessType: '',
    tradingName: '',
    businessAddress: '',
    state: '',
    lga: '',
    town: '',
    postcode: '',
    
    // Step 3: ID Check
    idType: '',
    idDocument: null,
    idDocumentFile: null,
    selfieDocument: null,
    selfieDocumentFile: null,
    
    // Step 4: Skills Test Results
    skillsTestPassed: false,
    testScores: {},
    
    // Step 5: Profile Setup
    profileDescription: '',
    experience: '',
    certifications: [],
    
    // Step 6: Wallet Setup
    walletSetup: false
  });

  const [errors, setErrors] = useState({});
  const [showReferralField, setShowReferralField] = useState(!!referralCode);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    score: 0
  });
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [testAnswers, setTestAnswers] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const { registerTradesperson, user, isAuthenticated } = useAuth();
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState(() =>
    (user?.latitude && user?.longitude) ? { lat: user.latitude, lng: user.longitude } : null
  );
  const { toast } = useToast();
  const { states: nigerianStates, lgas: stateLGAs, loading: statesLoading, loadLGAs } = useStates();

  // Removed: scroll effect no longer needed for single-page form

  // Helpers for distance display and simple state-based suggestions
  const kmToMiles = (km) => Math.round(km * 0.621371);
  const getStateDistanceSuggestion = (state) => {
    if (!state) {
      return { label: 'Typical', min: 15, max: 30, value: 20 };
    }
    const urban = ['Lagos', 'Abuja', 'Abuja-FCT', 'Rivers', 'Port Harcourt'];
    const suburban = ['Oyo', 'Kaduna', 'Ogun', 'Anambra', 'Kano'];
    if (urban.includes(state)) return { label: 'Urban', min: 8, max: 15, value: 12 };
    if (suburban.includes(state)) return { label: 'Suburban', min: 15, max: 30, value: 20 };
    return { label: 'Rural/Mixed', min: 25, max: 50, value: 30 };
  };

  // Fetch trade categories from API
  useEffect(() => {
    const fetchTradeCategories = async () => {
      try {
        setLoadingTrades(true);
        const response = await adminAPI.getAllTrades();
        
        if (response && response.trades && Array.isArray(response.trades)) {
          setTradeCategories(response.trades);
          console.log('✅ Tradesperson Registration: Loaded trade categories from API:', response.trades.length, 'categories');
        } else {
          console.log('⚠️ Tradesperson Registration: Invalid API response, using fallback');
          setTradeCategories(FALLBACK_TRADE_CATEGORIES);
        }
      } catch (error) {
        console.error('❌ Tradesperson Registration: Error fetching trade categories:', error);
        setTradeCategories(FALLBACK_TRADE_CATEGORIES);
      } finally {
        setLoadingTrades(false);
      }
    };

    fetchTradeCategories();
  }, []);

  const businessTypes = [
    'Self employed / sole trader',
    'Limited company (LTD)',
    'Ordinary partnership',
    'Limited liability partnership (LLP)'
  ];

  // Load LGAs whenever state changes
  useEffect(() => {
    if (formData.state) {
      try {
        loadLGAs(formData.state);
      } catch (e) {
        console.warn('Failed to load LGAs for state:', formData.state, e);
      }
    }
  }, [formData.state, loadLGAs]);

  // Phone number validation and formatting functions
  const validateNigerianPhone = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check for valid Nigerian phone number patterns
    // Pattern 1: Starting with 234 (country code) - should be 13 digits total
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      return true;
    }
    
    // Pattern 2: Starting with 0 - should be 11 digits total (08140120508)
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      return true;
    }
    
    // Pattern 3: Starting with 7, 8, or 9 (without 0 prefix) - should be 10 digits total (8140120508)
    if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) && cleanPhone.length === 10) {
      return true;
    }
    
    return false;
  };

  const formatNigerianPhone = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If already in +234 format, return as is
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      return `+${cleanPhone}`;
    }
    
    // If starts with 0, remove it and add +234
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      return `+234${cleanPhone.substring(1)}`;
    }
    
    // If starts with 7, 8, or 9 (10 digits), add +234
    if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) && cleanPhone.length === 10) {
      return `+234${cleanPhone}`;
    }
    
    // Return original if no valid pattern
    return phone;
  };

  // Password strength validation
  const validatePasswordStrength = (password) => {
    const strength = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      score: 0
    };
    
    // Calculate score
    strength.score = Object.values(strength).filter(Boolean).length - 1; // -1 to exclude score itself
    
    return strength;
  };

  const updateFormData = (field, value) => {
    if (field === 'state') {
      // Reset dependent fields when state changes
      setFormData(prev => ({ ...prev, state: value, lga: '', town: '' }));
      if (value) {
        try {
          loadLGAs(value);
        } catch (e) {
          console.warn('Error loading LGAs:', e);
        }
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Real-time password validation
    if (field === 'password') {
      const strength = validatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear errors for the field being updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, locationCoords: 'Your browser does not support location services' }));
      return;
    }

    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocationCoords(coords);
        setErrors(prev => {
          const next = { ...prev };
          delete next.locationCoords;
          return next;
        });
        toast({
          title: 'Location captured',
          description: 'We saved your precise coordinates for accurate nearby job matching.'
        });
        setCapturingLocation(false);
      },
      () => {
        setErrors(prev => ({ ...prev, locationCoords: 'Please allow location access to continue' }));
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  };

  const handleFileUpload = async (file, type = 'id') => {
    const docField = type === 'selfie' ? 'selfieDocument' : 'idDocument';
    const fileField = type === 'selfie' ? 'selfieDocumentFile' : 'idDocumentFile';

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [docField]: 'Please upload a valid image (JPEG, PNG, WebP) or PDF file' }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, [docField]: 'File size must be less than 5MB' }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Create a preview URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      };

      setTimeout(() => {
        setUploadProgress(100);
        updateFormData(docField, fileInfo);
        updateFormData(fileField, file);
        setIsUploading(false);
        // Clear errors
        setErrors(prev => {
            const newErr = { ...prev };
            delete newErr[docField];
            return newErr;
        });
        
        toast({
          title: "Document uploaded successfully!",
          description: `${file.name} has been uploaded.`,
        });
      }, 1000);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrors(prev => ({ ...prev, [docField]: 'Upload failed. Please try again.' }));
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeUploadedFile = (type = 'id') => {
    const docField = type === 'selfie' ? 'selfieDocument' : 'idDocument';
    const fileField = type === 'selfie' ? 'selfieDocumentFile' : 'idDocumentFile';
    
    if (formData[docField]?.url) {
      URL.revokeObjectURL(formData[docField].url);
    }
    updateFormData(docField, null);
    updateFormData(fileField, null);
    setUploadProgress(0);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      const newStep = Math.min(currentStep + 1, 6);
      setCurrentStep(newStep);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async () => {
    console.log('🚀 handleFinalSubmit called, current step:', currentStep);
    console.log('🔍 Form data:', formData);
    
    if (!validateCurrentStep()) {
      console.log('❌ Validation failed, errors:', errors);
      return;
    }
    
    console.log('✅ Validation passed, proceeding with registration');
    setIsLoading(true);
    
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      // Ensure description meets backend minimum length (>= 50 chars)
      const rawDescription = (formData.profileDescription || '').trim();
      const description = rawDescription.length >= 50
        ? rawDescription
        : `Professional ${formData.selectedTrades?.[0] || 'Trades'} services. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services across ${formData.state || 'your area'}.`;

      // Map experience years from string to number
      const experienceMapping = {
        '0-1': 1,
        '1-3': 2,
        '3-5': 4,
        '5-10': 7,
        '10+': 15
      };

      // Use robust Nigerian phone formatter to avoid invalid formats
      const formattedPhone = formatNigerianPhone(formData.phone);

      const registrationData = {
        name: fullName,
        email: formData.email, // Use the actual email from the form
        password: formData.password,
        phone: formattedPhone,
        location: formData.state,
        postcode: formData.postcode || '000000',
        trade_categories: formData.selectedTrades,
        experience_years: experienceMapping[formData.experienceYears] || 1,
        company_name: formData.tradingName,
        description: description,
        certifications: formData.certifications || [],
        business_type: formData.businessType,
        referral_code: (formData.referralCode || '').trim(),
      };

      console.log('📤 Sending registration data:', registrationData);
      const result = await registerTradesperson(registrationData);

      if (result.success) {
        try {
          if (formData.idDocumentFile && formData.idType) {
            const typeMap = {
              passport: 'passport',
              nin: 'national_id',
              drivers_licence: 'drivers_license',
            };
            const docType = typeMap[formData.idType] || 'passport';
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            const { referralsAPI } = await import('../../api/referrals');
            await referralsAPI.submitVerificationDocuments(
                docType, 
                fullName, 
                '', 
                formData.idDocumentFile,
                formData.selfieDocumentFile
            );
          }
        } catch (e) {
        }
        console.log('✅ Registration successful, result:', result);
        console.log('🔐 Current auth state:', { 
          isAuthenticated: isAuthenticated(), 
          user: user,
          resultUser: result.user 
        });

        toast({
          title: "Congratulations! 🎉",
          description: "Your account has been created. Continue to complete your profile.",
          duration: 5000,
        });

        // Close the modal first
        if (onComplete) {
          onComplete(result);
        }

        // Update profile location and travel distance post-registration (GPS-only)
        try {
          if (locationCoords?.lat && locationCoords?.lng) {
            await jobsAPI.apiClient.put('/auth/profile/location', null, {
              params: {
                latitude: locationCoords.lat,
                longitude: locationCoords.lng,
                travel_distance_km: formData.travelDistance || DEFAULT_TRAVEL_DISTANCE_KM,
              },
            });
            console.log('📍 Profile location updated:', {
              latitude: locationCoords.lat,
              longitude: locationCoords.lng,
              travel_distance_km: formData.travelDistance || DEFAULT_TRAVEL_DISTANCE_KM,
            });
          } else {
            console.warn('⚠️ No precise coordinates captured for new tradesperson');
          }
        } catch (locErr) {
          console.warn('⚠️ Failed to update profile location:', locErr?.response?.data || locErr?.message || locErr);
        }

        if (typeof onClose === 'function') onClose();
        navigate('/trades/overview');
      } else {
        // Ensure error is a string, not an object
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || result.error?.msg || 'Registration failed. Please check your information and try again.';
        // Surface the error clearly and guide the user
        setErrors(prev => ({ ...prev, submit: errorMessage }));
        // Also show a toast so the error is immediately visible
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        // If the message suggests duplicate email/phone, send user to Step 1 to correct
        const msg = (errorMessage || '').toLowerCase();
        if (msg.includes('email') || msg.includes('phone')) {
          setCurrentStep(1);
          setErrors(prev => ({
            ...prev,
            email: msg.includes('email') ? 'Email already in use' : prev.email,
            phone: msg.includes('phone') ? 'Phone number already in use' : prev.phone,
          }));
        }
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Registration failed. Please try again.';
      setErrors({ submit: errorMessage });
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          newErrors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        // Enhanced phone validation
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validateNigerianPhone(formData.phone)) {
          newErrors.phone = 'Please enter a valid Nigerian phone number (e.g., 08140120508 or 8140120508)';
        }
        
        // State validation
        if (!formData.state) {
          newErrors.state = 'Please select your state';
        }
        
        // Primary expertise validation
        if (formData.selectedTrades.length === 0) {
          newErrors.selectedTrades = 'Please select your primary expertise';
        }
        
        // Enhanced password validation
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else {
          const strength = validatePasswordStrength(formData.password);
          if (!strength.length || !strength.uppercase || !strength.lowercase || !strength.number || !strength.special) {
            newErrors.password = 'Password must meet all requirements below';
          }
        }
        break;
      case 2:
        if (formData.selectedTrades.length === 0) {
          newErrors.selectedTrades = 'Please select at least one profession';
        }
        if (formData.selectedTrades.length > 5) {
          newErrors.selectedTrades = 'Please select maximum 5 professions';
        }
        if (!formData.experienceYears) newErrors.experienceYears = 'Experience level is required';
        if (!formData.businessType) newErrors.businessType = 'Business type is required';
        if (!formData.tradingName.trim()) newErrors.tradingName = 'Trading name is required';
        if (!formData.state) newErrors.state = 'State is required';
        if (!formData.lga) newErrors.lga = 'LGA is required';
        if (!formData.postcode) {
          newErrors.postcode = 'Zipcode is required';
        } else if (!/^\d{6}$/.test(formData.postcode)) {
          newErrors.postcode = 'Zipcode must be 6 digits';
        }
        if (!locationCoords?.lat || !locationCoords?.lng) {
          newErrors.locationCoords = 'Tap "Use current location" to capture your precise coordinates';
        }
        break;
      case 3:
        if (!formData.idType) newErrors.idType = 'Please select an ID type';
        // Allow skipping file upload in demo/testing environments
        const isDemoEnvironment = window.location.pathname.includes('demo') || 
                                 window.location.pathname.includes('test') ||
                                 process.env.NODE_ENV === 'development';
        if (!isDemoEnvironment && !formData.idDocument) {
          newErrors.idDocument = 'Please upload your ID document';
        }
        if (!isDemoEnvironment && !formData.selfieDocument) {
          newErrors.selfieDocument = 'Please upload a selfie for verification';
        }
        break;
      case 4:
        // Enforce skills test completion unless questions are not available (handled by SkillsTestComponent setting skillsTestPassed)
        if (!formData.skillsTestPassed) {
          newErrors.skillsTest = 'You must pass the skills test to continue';
        }
        break;
      case 5:
        if (!formData.profileDescription.trim()) {
          newErrors.profileDescription = 'Profile description is required';
        }
        break;
      case 6:
        // No validation needed for wallet setup step - it's optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getStepTitle = () => {
    return 'Create Your Professional Profile';
  };

  const getStepDescription = () => {
    return null;
  };

  const renderProgressBar = () => (
    <div className="mb-8 flex justify-center">
      {/* Minimal dot progress - no numbers, no percentages */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div
            key={step}
            className={`transition-all duration-300 rounded-full ${
              step < currentStep
                ? 'w-2.5 h-2.5 bg-[#34D164]'
                : step === currentStep
                ? 'w-3 h-3 bg-[#121E3C]'
                : 'w-2 h-2 bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-8 px-2">
      {/* Section 1: Your Basic Details */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
              First name
            </label>
            <Input
              placeholder="First name"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.firstName ? 'border-red-400' : ''}`}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1 font-lato">{errors.firstName}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
              Last name
            </label>
            <Input
              placeholder="Last name"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.lastName ? 'border-red-400' : ''}`}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1 font-lato">{errors.lastName}</p>}
          </div>
        </div>
      </div>

      {/* Section 2: Contact Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Email address
          </label>
          <Input
            type="email"
            placeholder="hello@example.com"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.email ? 'border-red-400' : ''}`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1 font-lato">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Phone number
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-lato">
              +234
            </span>
            <Input
              type="tel"
              autoComplete="tel"
              placeholder=""
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              className={`h-12 font-lato text-sm rounded-l-none rounded-r-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.phone ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1 font-lato">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            State
          </label>
          <select
            value={formData.state}
            onChange={(e) => updateFormData('state', e.target.value)}
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
              errors.state ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">Select your state</option>
            {nigerianStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && <p className="text-red-500 text-xs mt-1 font-lato">{errors.state}</p>}
        </div>
      </div>

      {/* Section 3: Referral */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Referral code <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Input
            placeholder="Enter a referral code if you have one"
            value={formData.referralCode}
            onChange={(e) => updateFormData('referralCode', e.target.value)}
            className="h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all"
          />
        </div>
      </div>

      {/* Section 4: Primary Expertise - Single Selection */}
      <div className="space-y-4">
        <div>
          <p className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Primary expertise
          </p>
          <p className="text-xs text-gray-400 mb-3 font-lato">
            Select your main trade. You can add more later in your dashboard.
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/30 space-y-2">
            {tradeCategories.map((trade) => (
              <div 
                key={trade} 
                role="button"
                tabIndex={0}
                className={`flex items-center justify-between cursor-pointer px-4 py-3 rounded-xl transition-all ${
                  formData.selectedTrades.includes(trade) 
                    ? 'bg-[#34D164]/10 border-2 border-[#34D164] shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm border-2 border-gray-100 bg-white'
                }`}
                onClick={() => {
                  setFormData(prev => ({ ...prev, selectedTrades: [trade] }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFormData(prev => ({ ...prev, selectedTrades: [trade] }));
                  }
                }}
              >
                <span className="font-lato text-gray-700 text-sm">{trade}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  formData.selectedTrades.includes(trade)
                    ? 'bg-[#34D164] border-[#34D164]'
                    : 'border-gray-300 bg-white'
                }`}>
                  {formData.selectedTrades.includes(trade) && (
                    <CheckCircle className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.selectedTrades && <p className="text-red-500 text-xs mt-1 font-lato">{errors.selectedTrades}</p>}
        </div>
      </div>

      {/* Section 5: Security - Password */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Create password
          </label>
          <Input
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.password ? 'border-red-400' : ''}`}
          />
          
          {/* Minimal password strength indicator */}
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= passwordStrength.score
                    ? passwordStrength.score >= 4 ? 'bg-green-500' : passwordStrength.score >= 2 ? 'bg-yellow-500' : 'bg-red-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
            <span className="text-xs text-gray-400 font-lato ml-2">
              {passwordStrength.score >= 4 ? 'Strong' : passwordStrength.score >= 2 ? 'Medium' : passwordStrength.score >= 1 ? 'Weak' : ''}
            </span>
          </div>
          {errors.password && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-red-600 text-xs font-medium font-lato mb-1.5">Password must meet all requirements:</p>
              <ul className="text-xs text-red-500 font-lato space-y-0.5">
                <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>• At least 8 characters</li>
                <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>• One uppercase letter</li>
                <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : ''}>• One lowercase letter</li>
                <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>• One number</li>
                <li className={/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : ''}>• One special character</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Marketing consent - smaller, less prominent */}
      <div className="flex items-start gap-3 pt-2">
        <input
          type="checkbox"
          id="marketing"
          checked={formData.marketingConsent}
          onChange={(e) => updateFormData('marketingConsent', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#34D164] focus:ring-[#34D164]/20"
        />
        <label htmlFor="marketing" className="text-xs text-gray-400 font-lato leading-relaxed">
          I'd like to receive updates about ServiceHub services and offers
        </label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 px-2">
      {/* Section 1: Your Expertise */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Your Expertise</h3>
        
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Select up to 5 professions
          </label>
          <p className="text-xs text-gray-400 mb-3 font-lato">
            Tell us what you do so we can send you the most relevant jobs.
          </p>
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/30 space-y-2">
            {tradeCategories.map((trade) => (
              <label 
                key={trade} 
                className={`flex items-center justify-between cursor-pointer px-4 py-3.5 rounded-xl transition-all ${
                  formData.selectedTrades.includes(trade) 
                    ? 'bg-[#34D164]/10 border-2 border-[#34D164] shadow-sm' 
                    : 'hover:bg-white hover:shadow-sm border-2 border-gray-100 bg-white'
                } ${!formData.selectedTrades.includes(trade) && formData.selectedTrades.length >= 5 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className="font-lato text-gray-700 text-sm">{trade}</span>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  formData.selectedTrades.includes(trade)
                    ? 'bg-[#34D164] border-[#34D164]'
                    : 'border-gray-300 bg-white'
                }`}>
                  {formData.selectedTrades.includes(trade) && (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={formData.selectedTrades.includes(trade)}
                  onChange={() => {
                    const trades = formData.selectedTrades.includes(trade)
                      ? formData.selectedTrades.filter(t => t !== trade)
                      : [...formData.selectedTrades, trade];
                    updateFormData('selectedTrades', trades);
                  }}
                  disabled={!formData.selectedTrades.includes(trade) && formData.selectedTrades.length >= 5}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 font-lato">
            Selected: <span className="font-medium text-[#34D164]">{formData.selectedTrades.length}</span>/5
          </p>
          {errors.selectedTrades && <p className="text-red-500 text-xs mt-1 font-lato">{errors.selectedTrades}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Years of experience
          </label>
          <select
            value={formData.experienceYears}
            onChange={(e) => updateFormData('experienceYears', e.target.value)}
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
              errors.experienceYears ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">Select your experience level</option>
            <option value="0-1">0-1 years (New to the trade)</option>
            <option value="1-3">1-3 years (Some experience)</option>
            <option value="3-5">3-5 years (Experienced)</option>
            <option value="5-10">5-10 years (Very experienced)</option>
            <option value="10+">10+ years (Expert level)</option>
          </select>
          {errors.experienceYears && <p className="text-red-500 text-xs mt-1 font-lato">{errors.experienceYears}</p>}
        </div>
      </div>

      {/* Section 2: Travel & Availability */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Travel & Availability</h3>
        
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            How far can you travel for work?
          </label>
          <div className="space-y-3 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={parseInt(formData.travelDistance || 10)}
              onChange={(e) => updateFormData('travelDistance', parseInt(e.target.value))}
              className="w-full accent-[#34D164]"
            />
            <div className="flex justify-between text-xs text-gray-400 font-lato">
              <span>5 km</span>
              <span className="font-medium text-[#121E3C]">{formData.travelDistance} km</span>
              <span>200 km</span>
            </div>

            {/* State-based suggestion helper */}
            <div className="mt-2 flex items-center justify-between">
              {(() => {
                const s = getStateDistanceSuggestion(formData.state);
                return (
                  <>
                    <span className="text-xs text-gray-400 font-lato">
                      Suggestion: {s.min}–{s.max} km
                    </span>
                    <button
                      type="button"
                      onClick={() => updateFormData('travelDistance', s.value)}
                      className="px-3 py-1.5 text-xs bg-[#34D164] hover:bg-[#2ab854] text-white rounded-lg font-lato transition-colors"
                    >
                      Apply {s.value} km
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Precise location <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-3 font-lato">
            We use your phone location for accurate distance matching. No map needed.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={captureCurrentLocation}
              disabled={capturingLocation}
              className="bg-[#121E3C] hover:bg-[#0d1629] text-white"
            >
              <Crosshair className="w-4 h-4 mr-2" />
              {capturingLocation ? 'Capturing...' : 'Use Current Location'}
            </Button>
            <span className={`text-xs font-lato ${locationCoords ? 'text-green-600' : 'text-gray-500'}`}>
              {locationCoords ? 'Precise location captured' : 'Not captured yet'}
            </span>
          </div>
          {errors.locationCoords && <p className="text-red-500 text-xs mt-1 font-lato">{errors.locationCoords}</p>}
        </div>
      </div>

      {/* Section 3: Business Information */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Business Information</h3>
        
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            What type of business do you have?
          </label>
          <div className="space-y-2">
            {businessTypes.map((type) => (
              <label key={type} className={`flex items-center gap-3 cursor-pointer p-4 border rounded-xl transition-all ${
                formData.businessType === type 
                  ? 'border-[#34D164] bg-[#34D164]/5' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="businessType"
                  value={type}
                  checked={formData.businessType === type}
                  onChange={(e) => updateFormData('businessType', e.target.value)}
                  className="text-[#34D164] focus:ring-[#34D164]/20"
                />
                <span className="text-sm font-lato text-gray-700">{type}</span>
              </label>
            ))}
          </div>
          {errors.businessType && <p className="text-red-500 text-xs mt-1 font-lato">{errors.businessType}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
              Trading name
            </label>
            <Input
              placeholder="Enter your trading name"
              value={formData.tradingName}
              onChange={(e) => updateFormData('tradingName', e.target.value)}
              className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.tradingName ? 'border-red-400' : ''}`}
            />
            {errors.tradingName && <p className="text-red-500 text-xs mt-1 font-lato">{errors.tradingName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
              State
            </label>
            <select
              value={formData.state}
              onChange={(e) => updateFormData('state', e.target.value)}
              className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                errors.state ? 'border-red-400' : 'border-gray-200'
              }`}
            >
              <option value="">Select your state</option>
              {nigerianStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && <p className="text-red-500 text-xs mt-1 font-lato">{errors.state}</p>}
          </div>
        </div>
      </div>

      {/* Section 4: Location Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Location Details</h3>
        
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Local Government Area (LGA)
          </label>
          <select
            value={formData.lga}
            onChange={(e) => updateFormData('lga', e.target.value)}
            disabled={!formData.state}
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all disabled:opacity-50 ${
              errors.lga ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">{formData.state ? 'Select your LGA' : 'Select state first'}</option>
            {(stateLGAs || []).map((lga) => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
          {errors.lga && <p className="text-red-500 text-xs mt-1 font-lato">{errors.lga}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Work address
          </label>
          <textarea
            placeholder="Street and house number, Town, LGA"
            value={formData.businessAddress}
            onChange={(e) => updateFormData('businessAddress', e.target.value)}
            className="w-full px-4 py-3 font-lato text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all"
            rows="3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Zipcode
          </label>
          <Input
            placeholder="e.g., 101001"
            value={formData.postcode}
            onChange={(e) => updateFormData('postcode', e.target.value)}
            className={`h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${errors.postcode ? 'border-red-400' : ''}`}
          />
          {errors.postcode && <p className="text-red-500 text-xs mt-1 font-lato">{errors.postcode}</p>}
          <p className="text-xs text-gray-400 mt-1 font-lato">Nigerian zip codes are 6 digits.</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 px-2">
      {/* Section 1: ID Type Selection */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Select ID Type</h3>
        <p className="text-xs text-gray-400 font-lato">
          Use a valid ID that is not expired
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { value: 'passport', label: 'Passport', Icon: BookOpen },
            { value: 'nin', label: 'NIN', Icon: CreditCard },
            { value: 'drivers_licence', label: "Driver's licence", Icon: Car }
          ].map((idOption) => (
            <label
              key={idOption.value}
              className={`flex flex-col items-center p-5 border rounded-xl cursor-pointer transition-all ${
                formData.idType === idOption.value
                  ? 'border-[#34D164] bg-[#34D164]/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="idType"
                value={idOption.value}
                checked={formData.idType === idOption.value}
                onChange={(e) => {
                  updateFormData('idType', e.target.value);
                  setTimeout(() => {
                    if (uploadSectionRef.current) {
                      uploadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 0);
                }}
                className="sr-only"
              />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                formData.idType === idOption.value 
                  ? 'bg-[#34D164]/10' 
                  : 'bg-gray-100'
              }`}>
                <idOption.Icon className={`h-6 w-6 ${
                  formData.idType === idOption.value 
                    ? 'text-[#34D164]' 
                    : 'text-gray-500'
                }`} />
              </div>
              <span className="text-sm font-medium font-lato text-[#121E3C]">{idOption.label}</span>
            </label>
          ))}
        </div>
        {errors.idType && <p className="text-red-500 text-xs mt-1 font-lato">{errors.idType}</p>}
      </div>

      {/* Section 2: Document Upload */}
      {formData.idType && (
        <div className="space-y-4" ref={uploadSectionRef}>
          <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Upload Document</h3>
          <p className="text-xs text-gray-400 font-lato">
            Upload a clear photo or scan of your {formData.idType === 'nin' ? 'NIN' : formData.idType === 'drivers_licence' ? "Driver's License" : 'Passport'}
          </p>

          {!formData.idDocument ? (
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive 
                  ? 'border-[#34D164] bg-[#34D164]/5' 
                  : 'border-gray-200 hover:border-[#34D164]/50'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="id-document-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="id-document-upload"
                className="cursor-pointer"
              >
                <div className="space-y-3">
                  <Upload className={`mx-auto h-10 w-10 ${dragActive ? 'text-[#34D164]' : 'text-gray-300'}`} />
                  <div>
                    <p className="text-sm font-medium font-lato text-[#121E3C]">
                      {dragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400 font-lato mt-1">
                      JPEG, PNG, WebP or PDF up to 5MB
                    </p>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {formData.idDocument.type.startsWith('image/') ? (
                    <img
                      src={formData.idDocument.url}
                      alt="ID Document"
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-red-50 rounded-lg flex items-center justify-center">
                      <FileText className="h-7 w-7 text-red-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-lato text-[#121E3C] truncate">
                    {formData.idDocument.name}
                  </p>
                  <p className="text-xs text-gray-400 font-lato">
                    {(formData.idDocument.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle className="h-3.5 w-3.5 text-[#34D164]" />
                    <span className="text-xs text-[#34D164] font-lato">Uploaded</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeUploadedFile}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-lato">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-gray-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-[#34D164] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {errors.idDocument && <p className="text-red-500 text-xs font-lato">{errors.idDocument}</p>}
        </div>
      )}

      {/* Section 3: Selfie Upload */}
      {formData.idType && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold font-lato text-gray-400 uppercase tracking-wider">Selfie Verification</h3>
          <p className="text-xs text-gray-400 font-lato">
            Upload a clear photo of yourself to verify against your ID
          </p>

          {!formData.selfieDocument ? (
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all border-gray-200 hover:border-[#34D164]/50 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileUpload(file, 'selfie');
                  }
                }}
                className="hidden"
                id="selfie-document-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="selfie-document-upload"
                className="cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="mx-auto h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium font-lato text-[#121E3C]">
                      Click to upload selfie
                    </p>
                    <p className="text-xs text-gray-400 font-lato mt-1">
                      JPEG, PNG, or WebP up to 5MB
                    </p>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                    <img
                      src={formData.selfieDocument.url}
                      alt="Selfie"
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                    />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-lato text-[#121E3C] truncate">
                    {formData.selfieDocument.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle className="h-3.5 w-3.5 text-[#34D164]" />
                    <span className="text-xs text-[#34D164] font-lato">Uploaded</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeUploadedFile('selfie')}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {errors.selfieDocument && <p className="text-red-500 text-xs font-lato">{errors.selfieDocument}</p>}
        </div>
      )}

      {/* Info Cards */}
      <div className="space-y-3">
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium font-lato text-blue-800 text-sm">Security & Privacy</h4>
              <ul className="text-xs text-blue-600 mt-1.5 space-y-0.5 font-lato">
                <li>• Documents are encrypted and stored securely</li>
                <li>• Only authorized personnel can access for verification</li>
                <li>• We comply with Nigerian data protection regulations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium font-lato text-amber-800 text-sm">Next: Skills Assessment</h4>
              <p className="text-xs text-amber-600 mt-1 font-lato">
                You'll take a quick skills test to demonstrate your expertise in your selected trades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render PaymentPage if it's active
  if (showPaymentPage) {
    return (
      <div className="h-[85vh] max-h-[750px] overflow-y-auto">
        <PaymentPage
          formData={formData}
          onBack={() => setShowPaymentPage(false)}
          onRegistrationComplete={(result) => {
            console.log('Payment & Registration completed:', result);
            // Handle successful registration with payment
            if (result.success && onComplete) {
              onComplete(result);
            }
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[85vh] max-h-[750px]">
        {/* Left side - Form */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <Card className="w-full border-0 shadow-none">
            <CardHeader className="text-center pt-6 pb-2 px-6 lg:px-10">
              {/* Profile avatar icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold font-montserrat text-[#121E3C]">
                {getStepTitle()}
              </CardTitle>
              {/* Already have an account link */}
              <p className="text-gray-500 font-lato text-sm mt-3">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={onSwitchToLogin || onClose}
                  className="text-[#34D164] font-semibold hover:underline"
                >
                  Login
                </button>
              </p>
            </CardHeader>

            <CardContent className="px-6 lg:px-10 pb-8">
        {errors.submit && (
          <div className="mb-4 flex items-start rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>{errors.submit}</span>
          </div>
        )}
        
        <div className="min-h-[400px]">
          {renderStep1()}
        </div>

        {/* Create Account Button */}
        <div className="pt-6 border-t border-gray-100 mt-8">
          <Button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isLoading}
            className="w-full bg-[#34D164] hover:bg-[#2ab854] text-white py-3 rounded-xl font-medium font-lato shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
          
          {/* Terms */}
          <p className="text-center text-xs text-gray-400 font-lato mt-4">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-[#34D164] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#34D164] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </CardContent>
          </Card>
        </div>

        {/* Right side - Image with motivational overlay (hidden on medium and smaller screens) */}
        <div className="hidden lg:block w-[40%] relative">
          <img
            src="/stock/bg2.jpeg"
            alt="Professional tradesperson"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Motivational overlay text */}
          <div className="absolute bottom-8 left-6 right-6 text-white">
            <p className="text-lg font-semibold font-montserrat mb-2">
              Join skilled professionals growing their business
            </p>
            <p className="text-sm text-white/80 font-lato">
              Trusted by tradespeople building their reputation
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

// Skills Test Component (Step 4) - Now using separate component
// Profile Setup Component (Step 5)
const ProfileSetup = ({ formData, updateFormData }) => (
  <div className="space-y-6 px-2">
    {/* Simplified Profile Description */}
    <div>
      <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
        About You
      </label>
      <textarea
        placeholder="Share your experience, skills, and what makes you the right choice for the job..."
        value={formData.profileDescription}
        onChange={(e) => updateFormData('profileDescription', e.target.value)}
        className="w-full px-4 py-3 font-lato text-sm rounded-xl border border-gray-200 bg-white focus:border-[#34D164] focus:ring-2 focus:ring-[#34D164]/20 transition-all resize-none"
        rows="5"
        maxLength="1250"
      />
      <p className="text-xs text-gray-400 mt-1.5 text-right font-lato">
        {1250 - formData.profileDescription.length} characters left
      </p>
    </div>

    {/* Compact Tips */}
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs font-medium text-gray-600 font-lato mb-2">Quick tips:</p>
      <div className="flex flex-wrap gap-2">
        {['Experience', 'Certifications', 'Specializations'].map((tip) => (
          <span key={tip} className="text-xs bg-white px-2.5 py-1 rounded-full text-gray-500 border border-gray-200 font-lato">
            {tip}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// Wallet Setup Component (Step 6)
const WalletSetup = ({ formData, updateFormData, handleFinalSubmit, isLoading, showPaymentPage, setShowPaymentPage }) => {
  console.log('🔧 WalletSetup component rendered with props:', { 
    formData: !!formData, 
    updateFormData: !!updateFormData, 
    handleFinalSubmit: !!handleFinalSubmit, 
    isLoading 
  });
  if (showPaymentPage) {
    return (
      <PaymentPage
        formData={formData}
        onBack={() => setShowPaymentPage(false)}
        onRegistrationComplete={(result) => {
          console.log('Payment & Registration completed:', result);
          // Handle successful registration with payment
          if (result.success) {
            // Close the registration modal/form
            if (onComplete) {
              onComplete(result);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Wallet className="mx-auto h-16 w-16 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Fund your wallet
        </h3>
        <p className="text-gray-600">
          Set up your wallet to access job leads. You'll need coins to show interest in jobs and get homeowner contact details.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each job has an access fee (typically 5-20 coins)</li>
          <li>• You pay the fee to get homeowner contact details</li>
          <li>• 1 coin = ₦100</li>
          <li>• Minimum funding: ₦100 (1 coin)</li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 FUND NOW BUTTON CLICKED');
            updateFormData('walletSetup', 'fund_now');
            setShowPaymentPage(true);
          }}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50"
          type="button"
        >
          {isLoading ? 'Completing Registration...' : 'Fund Now & Complete Registration'}
        </button>
      </div>
    </div>
  );
};

export default TradespersonRegistration;
