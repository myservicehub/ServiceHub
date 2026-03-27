import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, CheckCircle, Upload, Image as ImageIcon, BookOpen, CreditCard, Car } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import useStates from '../../hooks/useStates';
import { jobsAPI } from '../../api/jobs';
import { resolveCoordinatesFromStructuredLocation, resolveCoordinatesFromLocationText, DEFAULT_TRAVEL_DISTANCE_KM } from '../../utils/locationCoordinates';

// Fallback trade categories
const FALLBACK_TRADE_CATEGORIES = [
  "Building", "Concrete Works", "Tiling", "Door & Window Installation",
  "Air Conditioning & Refrigeration", "Plumbing",
  "Home Extensions", "Scaffolding", "Flooring", "Bathroom Fitting",
  "Generator Services", "Welding",
  "Renovations", "Painting", "Carpentry", "Interior Design",
  "Solar & Inverter Installation", "Locksmithing",
  "Roofing", "Plastering/POP", "Furniture Making", "Electrical Repairs",
  "CCTV & Security Systems", "General Handyman Work",
  "Cleaning", "Relocation/Moving", "Waste Disposal", "Recycling"
];

const businessTypes = [
  'Sole Trader / Self-employed',
  'Limited Company',
  'Partnership'
];

const CompleteProfileModal = ({ isOpen, onClose, onComplete }) => {
  const uploadSectionRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeCategories, setTradeCategories] = useState(FALLBACK_TRADE_CATEGORIES);
  const [dragActive, setDragActive] = useState(false);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { states: nigerianStates, lgas: stateLGAs, loading: statesLoading, loadLGAs } = useStates();

  const [formData, setFormData] = useState({
    // Step 1: Expertise & Experience
    selectedTrades: user?.trade_categories || [],
    experienceYears: '',
    travelDistance: user?.travel_distance_km || 25,
    
    // Step 2: Business Information
    businessType: user?.business_type || '',
    tradingName: user?.company_name || '',
    state: user?.location || '',
    lga: '',
    businessAddress: '',
    postcode: user?.postcode || '',
    
    // Step 3: ID Verification
    idType: '',
    idDocument: null,
    idDocumentFile: null,
    selfieDocument: null,
    selfieDocumentFile: null,
    
    // Step 4: Profile Description
    profileDescription: user?.description || '',
  });

  const [errors, setErrors] = useState({});

  // Load trade categories from API
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await jobsAPI.getTradeCategories();
        if (response?.trades?.length > 0) {
          setTradeCategories(response.trades);
        }
      } catch (error) {
        console.warn('Using fallback trade categories');
      }
    };
    fetchTrades();
  }, []);

  // Load LGAs when state changes
  useEffect(() => {
    if (formData.state) {
      loadLGAs(formData.state);
    }
  }, [formData.state, loadLGAs]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const getStateDistanceSuggestion = (state) => {
    if (!state) return { label: 'Typical', min: 15, max: 30, value: 20 };
    const urban = ['Lagos', 'Abuja', 'Abuja-FCT', 'Rivers', 'Port Harcourt'];
    const suburban = ['Oyo', 'Kaduna', 'Ogun', 'Anambra', 'Kano'];
    if (urban.includes(state)) return { label: 'Urban', min: 8, max: 15, value: 12 };
    if (suburban.includes(state)) return { label: 'Suburban', min: 12, max: 25, value: 18 };
    return { label: 'Typical', min: 15, max: 30, value: 20 };
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (formData.selectedTrades.length === 0) {
          newErrors.selectedTrades = 'Please select at least one profession';
        }
        if (formData.selectedTrades.length > 5) {
          newErrors.selectedTrades = 'Please select maximum 5 professions';
        }
        if (!formData.experienceYears) newErrors.experienceYears = 'Experience level is required';
        break;
      case 2:
        if (!formData.businessType) newErrors.businessType = 'Business type is required';
        if (!formData.tradingName.trim()) newErrors.tradingName = 'Trading name is required';
        if (!formData.lga) newErrors.lga = 'LGA is required';
        break;
      case 3:
        // ID verification is optional but if started, must complete
        if (formData.idType && !formData.idDocument) {
          newErrors.idDocument = 'Please upload your ID document';
        }
        break;
      case 4:
        if (formData.profileDescription.trim().length < 50) {
          newErrors.profileDescription = 'Please write at least 50 characters about yourself';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFileUpload = (field, file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFormData(field, reader.result);
        updateFormData(`${field}File`, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(field, e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      // Map experience years
      const experienceMapping = {
        '0-1': 1, '1-3': 2, '3-5': 4, '5-10': 7, '10+': 15
      };

      // Build profile update data
      const profileData = {
        trade_categories: formData.selectedTrades,
        experience_years: experienceMapping[formData.experienceYears] || 1,
        business_type: formData.businessType,
        company_name: formData.tradingName,
        description: formData.profileDescription,
        postcode: formData.postcode || '000000',
        travel_distance_km: formData.travelDistance,
      };

      // Update profile via API
      await jobsAPI.apiClient.put('/auth/profile', profileData);

      // Update location coordinates if we have address info
      try {
        const locationText = formData.businessAddress?.trim()
          ? formData.businessAddress
          : `${formData.lga ? formData.lga + ', ' : ''}${formData.state}`;

        const coords = resolveCoordinatesFromStructuredLocation({
          state: formData.state,
          lga: formData.lga,
          addressText: locationText,
        }) || resolveCoordinatesFromLocationText(locationText);

        if (coords?.latitude && coords?.longitude) {
          await jobsAPI.apiClient.put('/auth/profile/location', null, {
            params: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              travel_distance_km: formData.travelDistance || DEFAULT_TRAVEL_DISTANCE_KM,
            },
          });
        }
      } catch (locErr) {
        console.warn('Failed to update location:', locErr);
      }

      // Upload ID documents if provided
      if (formData.idDocumentFile && formData.idType) {
        try {
          const { referralsAPI } = await import('../../api/referrals');
          await referralsAPI.submitVerificationDocuments(
            formData.idType === 'nin' ? 'national_id' : formData.idType === 'drivers_licence' ? 'drivers_license' : 'passport',
            user?.name || '',
            '',
            formData.idDocumentFile,
            formData.selfieDocumentFile
          );
        } catch (docErr) {
          console.warn('Failed to upload documents:', docErr);
        }
      }

      // Refresh user data
      if (refreshUser) await refreshUser();

      toast({
        title: "Profile Updated! 🎉",
        description: "Your profile has been completed successfully.",
        duration: 5000,
      });

      if (onComplete) onComplete();
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Your Expertise';
      case 2: return 'Business Details';
      case 3: return 'ID Verification';
      case 4: return 'About You';
      default: return 'Complete Profile';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 flex bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Left side - Form */}
        <div className="flex-1 flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <p className="text-xs text-[#34D164] font-medium font-lato mb-1">
                Step {currentStep} of 4
              </p>
              <h2 className="text-xl font-bold text-[#121E3C] font-montserrat">
                {getStepTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 pt-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    step <= currentStep ? 'bg-[#34D164]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              {currentStep > 1 ? (
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  className="text-gray-600 hover:text-[#121E3C]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={nextStep}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-8"
                >
                  {isLoading ? 'Saving...' : 'Complete Profile'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Image (hidden on small screens) */}
        <div className="hidden lg:block w-[40%] relative">
          <img
            src="/stock/bg5.jpg"
            alt="Professional at work"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-8 left-6 right-6 text-white">
            <p className="text-lg font-semibold font-montserrat mb-2">
              Complete your profile to get more jobs
            </p>
            <p className="text-sm text-white/80 font-lato">
              Profiles with full details get 3x more job inquiries
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  function renderStep1() {
    return (
      <div className="space-y-6">
        {/* Expertise Selection */}
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Select up to 5 professions
          </label>
          <p className="text-xs text-gray-400 mb-3 font-lato">
            Tell us what you do so we can send you the most relevant jobs.
          </p>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50/30 space-y-2">
            {tradeCategories.map((trade) => (
              <label 
                key={trade} 
                className={`flex items-center justify-between cursor-pointer px-4 py-3 rounded-xl transition-all ${
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

        {/* Experience Level */}
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

        {/* Travel Distance */}
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
              value={formData.travelDistance}
              onChange={(e) => updateFormData('travelDistance', parseInt(e.target.value))}
              className="w-full accent-[#34D164]"
            />
            <div className="flex justify-between text-xs text-gray-400 font-lato">
              <span>5 km</span>
              <span className="font-medium text-[#121E3C]">{formData.travelDistance} km</span>
              <span>200 km</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              {(() => {
                const s = getStateDistanceSuggestion(formData.state || user?.location);
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
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        {/* Business Type */}
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

        {/* Trading Name */}
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

        {/* LGA */}
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Local Government Area (LGA)
          </label>
          <select
            value={formData.lga}
            onChange={(e) => updateFormData('lga', e.target.value)}
            disabled={!formData.state && !user?.location}
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all disabled:opacity-50 ${
              errors.lga ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <option value="">{(formData.state || user?.location) ? 'Select your LGA' : 'Select state first'}</option>
            {(stateLGAs || []).map((lga) => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
          {errors.lga && <p className="text-red-500 text-xs mt-1 font-lato">{errors.lga}</p>}
        </div>

        {/* Work Address */}
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Work address <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Street and house number, Town, LGA"
            value={formData.businessAddress}
            onChange={(e) => updateFormData('businessAddress', e.target.value)}
            className="w-full px-4 py-3 font-lato text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all"
            rows="3"
          />
        </div>

        {/* Postcode */}
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Zipcode <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Input
            placeholder="e.g., 101001"
            value={formData.postcode}
            onChange={(e) => updateFormData('postcode', e.target.value)}
            className="h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1 font-lato">Nigerian zip codes are 6 digits.</p>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 font-lato">
            <strong>Optional:</strong> Upload your ID to get a verified badge and build trust with customers.
          </p>
        </div>

        {/* ID Type Selection */}
        <div>
          <label className="block text-sm font-medium font-lato mb-3 text-[#121E3C]">
            Select ID Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'passport', label: 'Passport', Icon: BookOpen },
              { value: 'nin', label: 'NIN', Icon: CreditCard },
              { value: 'drivers_licence', label: "Driver's licence", Icon: Car }
            ].map((idOption) => (
              <label
                key={idOption.value}
                className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer transition-all ${
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
                  onChange={(e) => updateFormData('idType', e.target.value)}
                  className="sr-only"
                />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                  formData.idType === idOption.value ? 'bg-[#34D164]/10' : 'bg-gray-100'
                }`}>
                  <idOption.Icon className={`h-5 w-5 ${
                    formData.idType === idOption.value ? 'text-[#34D164]' : 'text-gray-500'
                  }`} />
                </div>
                <span className="text-xs font-medium font-lato text-[#121E3C]">{idOption.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        {formData.idType && (
          <div ref={uploadSectionRef} className="space-y-4">
            <div>
              <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
                Upload ID Document
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, 'idDocument')}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive ? 'border-[#34D164] bg-[#34D164]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {formData.idDocument ? (
                  <div className="relative">
                    <img src={formData.idDocument} alt="ID" className="max-h-40 mx-auto rounded-lg" />
                    <button
                      onClick={() => {
                        updateFormData('idDocument', null);
                        updateFormData('idDocumentFile', null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-lato">
                      Drag & drop or <span className="text-[#34D164]">browse</span>
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('idDocument', e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {errors.idDocument && <p className="text-red-500 text-xs mt-1 font-lato">{errors.idDocument}</p>}
            </div>

            {/* Selfie Upload */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
                Upload Selfie <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center border-gray-200 hover:border-gray-300 transition-all"
              >
                {formData.selfieDocument ? (
                  <div className="relative">
                    <img src={formData.selfieDocument} alt="Selfie" className="max-h-40 mx-auto rounded-lg" />
                    <button
                      onClick={() => {
                        updateFormData('selfieDocument', null);
                        updateFormData('selfieDocumentFile', null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-lato">
                      Take a selfie or <span className="text-[#34D164]">upload</span>
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => handleFileUpload('selfieDocument', e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {!formData.idType && (
          <div className="text-center py-8 text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-lato">Select an ID type above to upload</p>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6">
        {/* Profile Description */}
        <div>
          <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
            About You
          </label>
          <p className="text-xs text-gray-400 mb-3 font-lato">
            Share your experience, skills, and what makes you the right choice for the job.
          </p>
          <textarea
            placeholder="Share your experience, skills, and what makes you the right choice for the job..."
            value={formData.profileDescription}
            onChange={(e) => updateFormData('profileDescription', e.target.value)}
            className={`w-full px-4 py-3 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all resize-none ${
              errors.profileDescription ? 'border-red-400' : 'border-gray-200'
            }`}
            rows="6"
            maxLength="1250"
          />
          <div className="flex justify-between mt-2">
            <p className={`text-xs font-lato ${formData.profileDescription.length < 50 ? 'text-red-500' : 'text-gray-400'}`}>
              {formData.profileDescription.length < 50 
                ? `${50 - formData.profileDescription.length} more characters needed` 
                : 'Looking good!'}
            </p>
            <p className="text-xs text-gray-400 font-lato">
              {1250 - formData.profileDescription.length} characters left
            </p>
          </div>
          {errors.profileDescription && <p className="text-red-500 text-xs mt-1 font-lato">{errors.profileDescription}</p>}
        </div>

        {/* Tips */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-600 font-lato mb-2">Quick tips for a great profile:</p>
          <ul className="text-xs text-gray-500 font-lato space-y-1">
            <li>• Mention your years of experience</li>
            <li>• List any certifications or qualifications</li>
            <li>• Describe your specializations</li>
            <li>• Highlight what makes you different</li>
          </ul>
        </div>

        {/* Summary */}
        <div className="bg-[#34D164]/5 border border-[#34D164]/20 rounded-xl p-4">
          <p className="text-sm font-medium text-[#121E3C] font-lato mb-2">Profile Summary</p>
          <div className="text-xs text-gray-600 font-lato space-y-1">
            <p><strong>Trades:</strong> {formData.selectedTrades.join(', ') || 'None selected'}</p>
            <p><strong>Experience:</strong> {formData.experienceYears || 'Not specified'}</p>
            <p><strong>Business:</strong> {formData.tradingName || 'Not specified'}</p>
            <p><strong>Travel distance:</strong> {formData.travelDistance} km</p>
          </div>
        </div>
      </div>
    );
  }
};

export default CompleteProfileModal;
