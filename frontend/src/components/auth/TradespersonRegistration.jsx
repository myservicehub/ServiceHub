import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import useStates from '../../hooks/useStates';
import { useNavigate } from 'react-router-dom';
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

const TradespersonRegistration = ({ onClose, onComplete }) => {
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
    
    // Step 3: ID Check
    idType: '',
    idDocument: null,
    
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

  const { registerTradesperson, user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { states: nigerianStates, loading: statesLoading } = useStates();

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
    setFormData(prev => ({ ...prev, [field]: value }));
    
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

  const handleFileUpload = async (file) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ idDocument: 'Please upload a valid image (JPEG, PNG, WebP) or PDF file' });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors({ idDocument: 'File size must be less than 5MB' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress (in real app, this would be actual upload progress)
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
      
      // In a real application, you would upload to your server here
      // For now, we'll just store the file info
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      };

      setTimeout(() => {
        setUploadProgress(100);
        updateFormData('idDocument', fileInfo);
        setIsUploading(false);
        toast({
          title: "Document uploaded successfully!",
          description: `${file.name} has been uploaded for verification.`,
        });
      }, 1000);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrors({ idDocument: 'Upload failed. Please try again.' });
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeUploadedFile = () => {
    if (formData.idDocument?.url) {
      URL.revokeObjectURL(formData.idDocument.url);
    }
    updateFormData('idDocument', null);
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

  const handleFinalSubmit = async (walletSetupOverride) => {
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

      // Ensure description meets minimum length requirement
      const description = formData.profileDescription && formData.profileDescription.length >= 50 
        ? formData.profileDescription 
        : `Professional ${formData.selectedTrades[0]} services. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services.`;

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
        postcode: '000000', // Placeholder postcode
        trade_categories: formData.selectedTrades,
        experience_years: experienceMapping[formData.experienceYears] || 1,
        company_name: formData.tradingName,
        description: description,
        certifications: formData.certifications || []
      };

      console.log('📤 Sending registration data:', registrationData);
      const result = await registerTradesperson(registrationData);

      if (result.success) {
        const walletSetupChoice = walletSetupOverride ?? formData.walletSetup;
        const fullName = `${formData.firstName} ${formData.lastName}`;
        
        console.log('✅ Registration successful, result:', result);
        console.log('🔐 Current auth state:', { 
          isAuthenticated: isAuthenticated(), 
          user: user,
          resultUser: result.user 
        });

        toast({
          title: "Registration Successful! 🎉",
          description: `Welcome to ServiceHub, ${fullName}! Your account has been created successfully.`,
          duration: 3000,
        });

        // Close the modal first
        if (onComplete) {
          onComplete(result);
        }

        // Wait for authentication context to update, then redirect
        const redirectToTradespersonDashboard = () => {
          console.log('🚀 Redirecting to tradesperson dashboard (/browse-jobs)');
          console.log('🔐 Final auth state before redirect:', {
            isAuthenticated: isAuthenticated(),
            isTradesperson: isTradesperson(),
            user: user
          });
          
          navigate('/browse-jobs', { 
            state: { 
              welcomeMessage: `Welcome to ServiceHub, ${fullName}! Your registration is complete.`,
              walletFunded: false,
              walletSetupLater: walletSetupChoice === 'later',
              showWalletReminder: walletSetupChoice === 'later',
              newRegistration: true
            },
            replace: true
          });
          
          console.log('✅ Redirect to tradesperson dashboard completed');
        };

        // Give more time for authentication context to update
        setTimeout(redirectToTradespersonDashboard, 1500);
      } else {
        // Ensure error is a string, not an object
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || result.error?.msg || 'Registration failed. Please check your information and try again.';
        setErrors({ submit: errorMessage });
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
    switch (currentStep) {
      case 1: return 'Create your account';
      case 2: return 'Work details';
      case 3: return 'ID Check';
      case 4: return 'Safety & Quality';
      case 5: return 'Profile Setup';
      case 6: return 'Fund your wallet';
      default: return 'Registration';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Sign up to be a trade member on ServiceHub';
      case 2: return 'Tell us about your work and business';
      case 3: return 'Verify your identity';
      case 4: return 'Take a skills test to prove your expertise';
      case 5: return 'Set up your professional profile';
      case 6: return 'Set up your wallet for job access fees';
      default: return '';
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of 6
        </span>
        <span className="text-sm font-medium text-gray-600">
          {Math.round((currentStep / 6) * 100)}% Complete
        </span>
      </div>
      <Progress value={(currentStep / 6) * 100} className="h-2" />
      
      {/* Step indicators */}
      <div className="flex justify-between mt-4">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step < currentStep
                  ? 'bg-green-600 text-white'
                  : step === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step < currentStep ? <CheckCircle size={16} /> : step}
            </div>
            <span className="text-xs mt-1 text-gray-600">
              {step === 1 && 'Account'}
              {step === 2 && 'Work'}
              {step === 3 && 'ID'}
              {step === 4 && 'Skills'}
              {step === 5 && 'Profile'}
              {step === 6 && 'Wallet'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First name *
          </label>
          <Input
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last name *
          </label>
          <Input
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email address *
        </label>
        <Input
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone number *
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
            +234
          </span>
          <Input
            placeholder="8140120508 or 08140120508"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            className={`rounded-l-none ${errors.phone ? 'border-red-500' : ''}`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter your number with or without the leading 0 (e.g., 8140120508 or 08140120508)
        </p>
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password *
        </label>
        <Input
          type="password"
          placeholder="Create your password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          className={errors.password ? 'border-red-500' : ''}
        />
        
        {/* Password strength indicator */}
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-700">Password requirements:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center space-x-2 ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.length ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center space-x-2 ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.uppercase ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span>One uppercase letter</span>
            </div>
            <div className={`flex items-center space-x-2 ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.lowercase ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span>One lowercase letter</span>
            </div>
            <div className={`flex items-center space-x-2 ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.number ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span>One number</span>
            </div>
            <div className={`flex items-center space-x-2 ${passwordStrength.special ? 'text-green-600' : 'text-gray-400'}`}>
              {passwordStrength.special ? <CheckCircle size={14} /> : <XCircle size={14} />}
              <span>One special character</span>
            </div>
          </div>
          
          {/* Password strength bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                passwordStrength.score === 5 ? 'bg-green-500' :
                passwordStrength.score >= 3 ? 'bg-yellow-500' :
                passwordStrength.score >= 1 ? 'bg-red-500' : 'bg-gray-300'
              }`}
              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            Password strength: {
              passwordStrength.score === 5 ? 'Strong' :
              passwordStrength.score >= 3 ? 'Medium' :
              passwordStrength.score >= 1 ? 'Weak' : 'Very Weak'
            }
          </div>
        </div>
        
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          id="marketing"
          checked={formData.marketingConsent}
          onChange={(e) => updateFormData('marketingConsent', e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="marketing" className="text-sm text-gray-600">
          I would like to receive marketing communications about ServiceHub services and offers by email, SMS and/or phone and understand that I can unsubscribe at any time
        </label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Welcome, {formData.firstName}! Let's get started.
        </h3>
        <p className="text-gray-600">
          We want to know our tradespeople better so we can send you the right local leads, matched to your skills.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select up to 5 professions *
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Tell us what you do so we can send you the most relevant jobs.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-4">
          {tradeCategories.map((trade) => (
            <label key={trade} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
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
                className="rounded"
              />
              <span className="text-sm">{trade}</span>
            </label>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Selected: {formData.selectedTrades.length}/5
        </p>
        {errors.selectedTrades && <p className="text-red-500 text-sm mt-1">{errors.selectedTrades}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How far can you travel for work?
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Set the maximum distance you are willing to travel from {formData.state || 'your location'}.
        </p>
        <div className="space-y-3">
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={parseInt(formData.travelDistance || 10)}
            onChange={(e) => updateFormData('travelDistance', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>5 km</span>
            <span className="font-medium">{formData.travelDistance} km</span>
            <span>200 km</span>
          </div>
          <div className="text-xs text-gray-600">
            Selected: {formData.travelDistance} km (≈ {kmToMiles(formData.travelDistance)} mi)
          </div>

          {/* State-based suggestion helper */}
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
            {(() => {
              const s = getStateDistanceSuggestion(formData.state);
              return (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Suggestion{formData.state ? ` for ${formData.state}` : ''}: {s.min}–{s.max} km (≈ {kmToMiles(s.min)}–{kmToMiles(s.max)} mi)
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFormData('travelDistance', s.value)}
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    Apply {s.value} km
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Years of experience *
        </label>
        <select
          value={formData.experienceYears}
          onChange={(e) => updateFormData('experienceYears', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors.experienceYears ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select your experience level</option>
          <option value="0-1">0-1 years (New to the trade)</option>
          <option value="1-3">1-3 years (Some experience)</option>
          <option value="3-5">3-5 years (Experienced)</option>
          <option value="5-10">5-10 years (Very experienced)</option>
          <option value="10+">10+ years (Expert level)</option>
        </select>
        {errors.experienceYears && <p className="text-red-500 text-sm mt-1">{errors.experienceYears}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What type of business do you have? *
        </label>
        <div className="space-y-2">
          {businessTypes.map((type) => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="businessType"
                value={type}
                checked={formData.businessType === type}
                onChange={(e) => updateFormData('businessType', e.target.value)}
                className="text-green-600"
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
        {errors.businessType && <p className="text-red-500 text-sm mt-1">{errors.businessType}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trading name *
          </label>
          <Input
            placeholder="Enter your trading name"
            value={formData.tradingName}
            onChange={(e) => updateFormData('tradingName', e.target.value)}
            className={errors.tradingName ? 'border-red-500' : ''}
          />
          {errors.tradingName && <p className="text-red-500 text-sm mt-1">{errors.tradingName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State *
          </label>
          <select
            value={formData.state}
            onChange={(e) => updateFormData('state', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              errors.state ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select your state</option>
            {nigerianStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Work address
        </label>
        <textarea
          placeholder="Street and house number, Town, LGA"
          value={formData.businessAddress}
          onChange={(e) => updateFormData('businessAddress', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows="3"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Verify your identity
        </h3>
        <p className="text-gray-600">
          This helps us check that you're really you and helps keep ServiceHub secure. We will handle your personal data securely and in accordance with our privacy policy.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select your ID type
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Use a valid ID that is not expired
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 'passport', label: 'Passport', icon: '📘' },
            { value: 'nin', label: 'NIN', icon: '🆔' },
            { value: 'drivers_licence', label: "Driver's licence", icon: '🚗' }
          ].map((idOption) => (
            <label
              key={idOption.value}
              className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.idType === idOption.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="idType"
                value={idOption.value}
                checked={formData.idType === idOption.value}
                onChange={(e) => updateFormData('idType', e.target.value)}
                className="sr-only"
              />
              <div className="text-4xl mb-2">{idOption.icon}</div>
              <span className="text-sm font-medium">{idOption.label}</span>
            </label>
          ))}
        </div>
        {errors.idType && <p className="text-red-500 text-sm mt-1">{errors.idType}</p>}
      </div>

      {/* File Upload Section */}
      {formData.idType && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Upload your {formData.idType === 'nin' ? 'NIN' : formData.idType === 'drivers_licence' ? "Driver's License" : 'Passport'} document
          </label>
          <p className="text-sm text-gray-600">
            Upload a clear photo or scan of your ID document. Accepted formats: JPEG, PNG, WebP, PDF (max 5MB)
          </p>

          {!formData.idDocument ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-green-400'
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
                  <Upload className={`mx-auto h-12 w-12 ${dragActive ? 'text-green-500' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {dragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, WebP or PDF up to 5MB
                    </p>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {formData.idDocument.type.startsWith('image/') ? (
                    <img
                      src={formData.idDocument.url}
                      alt="ID Document"
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-8 w-8 text-red-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {formData.idDocument.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(formData.idDocument.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">Uploaded successfully</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeUploadedFile}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {errors.idDocument && <p className="text-red-500 text-sm">{errors.idDocument}</p>}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Security & Privacy</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Your documents are encrypted and stored securely</li>
              <li>• Only authorized personnel can access your ID for verification</li>
              <li>• Documents are automatically deleted after verification</li>
              <li>• We comply with Nigerian data protection regulations</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Next: Skills Assessment</h4>
            <p className="text-sm text-yellow-700 mt-1">
              After uploading your ID, you'll take a skills test to demonstrate your expertise in your selected trades. This helps us ensure quality for our customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render PaymentPage if it's active
  if (showPaymentPage) {
    return (
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
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-800">
          {getStepTitle()}
        </CardTitle>
        <p className="text-gray-600 mt-2">
          {getStepDescription()}
        </p>
      </CardHeader>

      <CardContent>
        {renderProgressBar()}
        
        <div className="min-h-[500px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && (
            <SkillsTestComponent 
              formData={formData} 
              updateFormData={updateFormData}
              onTestComplete={(results) => {
                if (results.passed) {
                  toast({
                    title: "Skills Test Passed!",
                    description: `Congratulations! You scored ${results.overallScore}%. You can now continue with your registration.`,
                  });
                } else {
                  toast({
                    title: "Skills Test Failed",
                    description: `You scored ${results.overallScore}%. You need 80% or higher to continue.`,
                    variant: "destructive"
                  });
                }
              }}
            />
          )}
          {currentStep === 5 && <ProfileSetup formData={formData} updateFormData={updateFormData} />}
          {currentStep === 6 && (
            <div className="bg-gradient-to-br from-green-600 to-blue-600 rounded-lg p-8 text-white">
              <div className="text-center mb-6">
                <Wallet className="h-16 w-16 mx-auto mb-4 text-white" />
                <h3 className="text-2xl font-bold mb-2">Fund your wallet to get set up for success</h3>
                <p className="text-green-100">
                  Your wallet allows you to access homeowner contact details when you're interested in jobs
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                  <li>1 coin = ₦100</li>
                  <li>Each job contact costs coins (typically 1-3 coins)</li>
                  <li>Fund once, access multiple job contacts</li>
                  <li>Unused coins remain in your wallet</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('🔵 FUND NOW BUTTON CLICKED (DIRECT)');
                    updateFormData('walletSetup', 'fund_now');
                    setShowPaymentPage(true);
                  }}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50"
                  type="button"
                >
                  {isLoading ? 'Processing...' : 'Fund Now & Complete Registration'}
                </button>
                
                <button
                  onClick={() => {
                    console.log('🔘 SET UP WALLET LATER BUTTON CLICKED (DIRECT)');
                    updateFormData('walletSetup', 'later');
                    // Pass explicit override to avoid async state race
                    handleFinalSubmit('later');
                  }}
                  disabled={isLoading}
                  className="w-full border-2 border-gray-400 text-gray-600 hover:bg-gray-50 py-3 px-6 rounded-lg font-medium disabled:opacity-50"
                  type="button"
                >
                  {isLoading ? 'Completing Registration...' : 'Set Up Wallet Later & Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-6 border-t mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </Button>

          {currentStep < 6 && (
            <>
              <Button
                type="button"
                onClick={nextStep}
                disabled={isLoading || (currentStep === 4 && !formData.skillsTestPassed)}
                aria-disabled={isLoading || (currentStep === 4 && !formData.skillsTestPassed)}
                title={currentStep === 4 && !formData.skillsTestPassed ? 'Complete the skills test to continue' : undefined}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </Button>
              {currentStep === 4 && !formData.skillsTestPassed && (
                <p className="mt-2 text-sm text-gray-600">Complete the skills test to continue.</p>
              )}
            </>
          )}
          {currentStep === 6 && (
            <div className="text-sm text-gray-600">
              Choose your wallet setup option below
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Skills Test Component (Step 4) - Now using separate component
// Profile Setup Component (Step 5)
const ProfileSetup = ({ formData, updateFormData }) => (
  <div className="space-y-6">
    <div className="text-center mb-6">
      <User className="mx-auto h-16 w-16 text-blue-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Get set up for success
      </h3>
      <p className="text-gray-600">
        You're almost there! In this step, we'll set up your public profile. Customers look at your profile to decide if they want to start a conversation, so make it count.
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Introduce yourself to future customers
      </label>
      <p className="text-sm text-gray-600 mb-3">
        This is your chance to make a great first impression. A quality description can increase your chances of getting hired.
      </p>
      <textarea
        placeholder="Tell us about yourself in a few sentences..."
        value={formData.profileDescription}
        onChange={(e) => updateFormData('profileDescription', e.target.value)}
        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        rows="6"
        maxLength="1250"
      />
      <p className="text-sm text-gray-500 mt-1">
        {1250 - formData.profileDescription.length} characters remaining
      </p>
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