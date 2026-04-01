import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, CheckCircle, Upload, Image as ImageIcon, BookOpen, CreditCard, Car, Edit3, Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import useStates from '../../hooks/useStates';
import { jobsAPI } from '../../api/jobs';
import { resolveCoordinatesFromStructuredLocation, resolveCoordinatesFromLocationText, DEFAULT_TRAVEL_DISTANCE_KM } from '../../utils/locationCoordinates';

// Fallback trade categories (alphabetically sorted)
const FALLBACK_TRADE_CATEGORIES = [
  "Air Conditioning & Refrigeration", "Bathroom Fitting", "Building",
  "Carpentry", "CCTV & Security Systems", "Cleaning", "Concrete Works",
  "Door & Window Installation", "Electrical Repairs", "Flooring",
  "Furniture Making", "General Handyman Work", "Generator Services",
  "Home Extensions", "Interior Design", "Locksmithing", "Painting",
  "Plastering/POP", "Plumbing", "Recycling", "Relocation/Moving",
  "Renovations", "Roofing", "Scaffolding", "Solar & Inverter Installation",
  "Tiling", "Waste Disposal", "Welding"
];

const businessTypes = [
  'Sole Trader / Self-employed',
  'Limited Company',
  'Partnership'
];

const mapExperienceYearsToRange = (years) => {
  const value = Number(years || 0);
  if (value <= 1) return '';
  if (value <= 2) return '1-3';
  if (value <= 4) return '3-5';
  if (value <= 10) return '5-10';
  return '10+';
};

const CompleteProfileModal = ({ isOpen, onClose, onComplete }) => {
  const uploadSectionRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeCategories, setTradeCategories] = useState(FALLBACK_TRADE_CATEGORIES);
  const [dragActive, setDragActive] = useState(false);
  const [showTradeSelector, setShowTradeSelector] = useState(false);
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

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    setErrors({});
    setShowTradeSelector(false);
    setDragActive(false);
    setFormData({
      selectedTrades: user?.trade_categories || [],
      experienceYears: mapExperienceYearsToRange(user?.experience_years),
      travelDistance: user?.travel_distance_km || 25,
      businessType: user?.business_type || '',
      tradingName: user?.company_name || '',
      state: user?.location || '',
      lga: '',
      businessAddress: '',
      postcode: user?.postcode || '',
      idType: '',
      idDocument: null,
      idDocumentFile: null,
      selfieDocument: null,
      selfieDocumentFile: null,
      profileDescription: user?.description || '',
    });
  }, [isOpen, user]);

  // Load trade categories from API
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await jobsAPI.getTradeCategories();
        if (response?.trades?.length > 0) {
          setTradeCategories([...response.trades].sort((a, b) => a.localeCompare(b)));
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
          newErrors.selectedTrades = 'Please select your primary expertise';
        }
        if (!formData.experienceYears) newErrors.experienceYears = 'Experience level is required';
        break;
      case 2:
        if (!formData.tradingName?.trim()) newErrors.tradingName = 'Company name is required';
        if (!formData.lga) newErrors.lga = 'LGA is required';
        if (!formData.businessAddress?.trim()) newErrors.businessAddress = 'Address is required';
        break;
      case 3:
        // ID verification is optional but if started, all required uploads must be provided
        if (formData.idType && !formData.idDocument) {
          newErrors.idDocument = 'Please upload your ID document';
        }
        if (formData.idType && !formData.selfieDocument) {
          newErrors.selfieDocument = 'Please upload your selfie';
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
        business_type: formData.businessType || null,
        company_name: formData.tradingName || null,
        location: formData.state || user?.location || null,
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
      case 2: return 'Your Location';
      case 3: return 'ID Verification';
      case 4: return 'About You';
      default: return 'Complete Profile';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Form Container */}
        <div className="flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 md:p-8 border-b border-gray-100">
            <div>
              <p className="text-xs text-[#121E3C] font-medium font-lato mb-1">
                Step {currentStep} of 4
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-[#121E3C] font-montserrat">
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
          <div className="px-4 sm:px-6 md:px-8 pt-3 sm:pt-4">
            <div className="flex gap-1.5 sm:gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    step <= currentStep ? 'bg-[#121E3C]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 md:p-8 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between gap-3">
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
                  className="bg-[#121E3C] hover:bg-[#0d1629] text-white px-5 sm:px-6"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-[#121E3C] hover:bg-[#0d1629] text-white px-6 sm:px-8"
                >
                  {isLoading ? 'Saving...' : 'Complete Profile'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderStep1() {
    const currentTrade = formData.selectedTrades[0] || user?.trade_categories?.[0];
    
    return (
      <div className="space-y-6">
        {/* Current Trade Display */}
        <div>
          <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
            Primary Expertise
          </label>
          
          {!showTradeSelector ? (
            <div className="flex items-center justify-between p-4 bg-[#121E3C]/5 border-2 border-[#121E3C]/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#121E3C]/10 rounded-lg">
                  <Briefcase className="w-5 h-5 text-[#121E3C]" />
                </div>
                <span className="font-medium text-[#121E3C] font-lato">
                  {currentTrade || 'No trade selected'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTradeSelector(true)}
                className="flex items-center gap-1.5 text-sm text-[#121E3C] hover:text-[#0d1629] font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-lato">
                  Select your primary trade
                </p>
                <button
                  type="button"
                  onClick={() => setShowTradeSelector(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/30 space-y-1.5">
                {tradeCategories.map((trade) => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => {
                      updateFormData('selectedTrades', [trade]);
                      setShowTradeSelector(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all text-sm font-lato ${
                      formData.selectedTrades.includes(trade)
                        ? 'bg-[#121E3C]/10 border border-[#121E3C]/30 text-[#121E3C] font-medium'
                        : 'text-gray-700 hover:bg-white border border-transparent hover:border-gray-200'
                    }`}
                  >
                    {trade}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#121E3C] focus:ring-[#121E3C]/20 transition-all ${
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium font-lato text-[#121E3C]">
              How far can you travel for work?
            </label>
            <button
              type="button"
              onClick={() => updateFormData('travelDistance', 15)}
              className="text-xs text-[#121E3C] hover:text-[#0d1629] font-medium"
            >
              Apply 15km (recommended)
            </button>
          </div>
          <div className="space-y-3 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={formData.travelDistance}
              onChange={(e) => updateFormData('travelDistance', parseInt(e.target.value))}
              className="w-full accent-[#121E3C]"
            />
            <div className="flex justify-between text-xs text-gray-400 font-lato">
              <span>5 km</span>
              <span className="font-medium text-[#121E3C]">{formData.travelDistance} km</span>
              <span>200 km</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
            Company name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Enter company or trading name"
            value={formData.tradingName}
            onChange={(e) => updateFormData('tradingName', e.target.value)}
            className={`h-12 font-lato text-sm rounded-xl bg-gray-50/50 focus:bg-white focus:border-[#121E3C] focus:ring-[#121E3C]/20 transition-all ${
              errors.tradingName ? 'border-red-400' : 'border-gray-200'
            }`}
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
            className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#121E3C] focus:ring-[#121E3C]/20 transition-all disabled:opacity-50 ${
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
            Work address <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Street and house number, Town"
            value={formData.businessAddress}
            onChange={(e) => updateFormData('businessAddress', e.target.value)}
            className={`w-full px-4 py-3 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#121E3C] focus:ring-[#121E3C]/20 transition-all ${
              errors.businessAddress ? 'border-red-400' : 'border-gray-200'
            }`}
            rows="2"
          />
          {errors.businessAddress && <p className="text-red-500 text-xs mt-1 font-lato">{errors.businessAddress}</p>}
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
            className="h-12 font-lato text-sm rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#121E3C] focus:ring-[#121E3C]/20 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1 font-lato">Nigerian zip codes are 6 digits.</p>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="relative rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500" />
          <div className="relative p-4 sm:p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium font-montserrat text-sm sm:text-base">Get Verified & Build Trust</p>
                <p className="text-xs sm:text-sm text-white/80 font-lato mt-1">
                  Upload your ID to get a verified badge. Verified profiles receive 40% more job inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ID Type Selection */}
        <div>
          <label className="block text-sm font-medium font-lato mb-3 text-[#121E3C]">
            Select ID Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'passport', label: 'Passport', Icon: BookOpen, desc: 'International passport' },
              { value: 'nin', label: 'NIN', Icon: CreditCard, desc: 'National ID Number' },
              { value: 'drivers_licence', label: "Driver's Licence", Icon: Car, desc: 'Valid driving licence' }
            ].map((idOption) => (
              <label
                key={idOption.value}
                className={`flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.idType === idOption.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center sm:mb-2 ${
                  formData.idType === idOption.value ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  <idOption.Icon className={`h-6 w-6 ${
                    formData.idType === idOption.value ? 'text-orange-500' : 'text-gray-500'
                  }`} />
                </div>
                <div className="sm:text-center">
                  <span className="text-sm font-medium font-lato text-[#121E3C] block">{idOption.label}</span>
                  <span className="text-xs text-gray-400 font-lato hidden sm:block">{idOption.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        {formData.idType && (
          <div ref={uploadSectionRef} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
                Upload ID Document
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, 'idDocument')}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                  dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-300 bg-gray-50'
                }`}
              >
                {formData.idDocument ? (
                  <div className="relative inline-block">
                    <img src={formData.idDocument} alt="ID" className="max-h-32 sm:max-h-40 mx-auto rounded-lg shadow-md" />
                    <button
                      onClick={() => {
                        updateFormData('idDocument', null);
                        updateFormData('idDocumentFile', null);
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-orange-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 font-lato mb-1">
                      Drag & drop your ID here
                    </p>
                    <p className="text-xs text-gray-400 font-lato">
                      or <span className="text-orange-500 font-medium">click to browse</span>
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
                Upload Selfie <span className="text-red-500 font-normal">*</span>
              </label>
              <div className="border-2 border-dashed rounded-xl p-6 text-center border-gray-300 hover:border-orange-300 bg-gray-50 transition-all">
                {formData.selfieDocument ? (
                  <div className="relative inline-block">
                    <img src={formData.selfieDocument} alt="Selfie" className="max-h-32 sm:max-h-40 mx-auto rounded-lg shadow-md" />
                    <button
                      onClick={() => {
                        updateFormData('selfieDocument', null);
                        updateFormData('selfieDocumentFile', null);
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 font-lato mb-1">
                      Take a selfie holding your ID
                    </p>
                    <p className="text-xs text-gray-400 font-lato">
                      or <span className="text-orange-500 font-medium">upload a photo</span>
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
              {errors.selfieDocument && <p className="text-red-500 text-xs mt-1 font-lato">{errors.selfieDocument}</p>}
            </div>
          </div>
        )}

        {!formData.idType && (
          <div className="text-center py-6 sm:py-8 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-lato">Select an ID type above to continue</p>
            <p className="text-xs text-gray-400 font-lato mt-1">You can skip this step if you prefer</p>
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
