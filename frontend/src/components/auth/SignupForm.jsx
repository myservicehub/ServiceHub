import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, AlertCircle, Home, Wrench, Hash, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import useStates from '../../hooks/useStates';
import apiClient from '../../api/client';
import TradespersonRegistration from './TradespersonRegistration';
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, tradespersonSignupSchema, formatPhoneE164 } from '../../utils/validation'

const SignupForm = ({ onClose, onSwitchToLogin, defaultTab = 'tradesperson', showOnlyTradesperson = true, useMultiStepRegistration = true }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showMultiStep, setShowMultiStep] = useState(useMultiStepRegistration);
  // Initialize react-hook-form instances for homeowner and tradesperson
  const homeownerForm = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      location: '',
      postcode: '',
      referral_code: new URLSearchParams(window.location.search).get('ref') || ''
    }
  });
  const tradespersonForm = useForm({
    resolver: zodResolver(tradespersonSignupSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      location: '',
      postcode: '',
      referral_code: new URLSearchParams(window.location.search).get('ref') || '',
      trade_categories: [],
      experience_years: '',
      company_name: '',
      description: '',
      certifications: []
    }
  });
  const currentTab = showOnlyTradesperson ? 'tradesperson' : activeTab;
  const form = currentTab === 'tradesperson' ? tradespersonForm : homeownerForm;
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors: rhfErrors, isValid, isSubmitting }, reset, setError, watch } = form;
  const selectedTrades = currentTab === 'tradesperson' ? (watch('trade_categories') || []) : [];
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { registerHomeowner, registerTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { states: nigerianStates, loading: statesLoading } = useStates();
  const [tradeCategories, setTradeCategories] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(true);

  // Fetch trade categories from API
  useEffect(() => {
    const fetchTradeCategories = async () => {
      try {
        setLoadingTrades(true);
        const response = await apiClient.get('/auth/trade-categories');
        if (response.data && Array.isArray(response.data.categories)) {
          setTradeCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch trade categories:', err);
        // Fallback categories if API fails
        setTradeCategories([
          "Building", "Concrete Works", "Tiling", "Door & Window Installation",
          "Air Conditioning & Refrigeration", "Plumbing", "Home Extensions",
          "Scaffolding", "Flooring", "Bathroom Fitting", "Generator Services",
          "Welding", "Renovations", "Painting", "Carpentry", "Interior Design",
          "Solar & Inverter Installation", "Locksmithing", "Roofing",
          "Plastering/POP", "Furniture Making", "Electrical Repairs",
          "CCTV & Security Systems", "General Handyman Work",
          "Cleaning", "Relocation/Moving", "Waste Disposal", "Recycling"
        ]);
      } finally {
        setLoadingTrades(false);
      }
    };
    fetchTradeCategories();
  }, []);

  const onSubmit = async (values) => {
    try {
      const currentTab = showOnlyTradesperson ? 'tradesperson' : activeTab;
      const normalizedPhone = formatPhoneE164(values.phone);

      let result;
      if (currentTab === 'homeowner') {
        result = await registerHomeowner({
          name: values.name,
          email: values.email,
          password: values.password,
          phone: normalizedPhone,
          location: values.location,
          postcode: values.postcode,
          referral_code: values.referral_code || undefined,
        });
      } else {
        // Ensure backend-required description (min 50 chars). Use a sensible fallback if too short.
        const desc = (values.description && values.description.trim().length >= 50)
          ? values.description.trim()
          : `Professional ${Array.isArray(values.trade_categories) && values.trade_categories.length > 0 ? values.trade_categories[0] : 'Trades'} services. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services.`;

        result = await registerTradesperson({
          name: values.name,
          email: values.email,
          password: values.password,
          phone: normalizedPhone,
          location: values.location,
          postcode: values.postcode,
          trade_categories: values.trade_categories,
          experience_years: parseInt(values.experience_years, 10),
          company_name: values.company_name,
          description: desc,
          certifications: values.certifications || [],
          referral_code: values.referral_code || undefined,
        });
      }

      if (result?.success) {
        toast({
          title: "Account created successfully!",
          description: `Welcome to serviceHub, ${result.user?.name || 'valued customer'}! ${
            currentTab === 'tradesperson'
              ? 'Your account is pending verification.'
              : 'You can now start posting jobs.'
          }`,
        });

        if (onClose) onClose();

        if (currentTab === 'tradesperson') {
          navigate('/trades/overview');
        } else {
          navigate('/dashboard');
        }
      } else {
        const errorMessage = typeof result?.error === 'string'
          ? result.error
          : result?.error?.message || result?.error?.msg || 'Registration failed. Please check your information and try again.';
        setError('root', { type: 'server', message: errorMessage });
      }
    } catch (error) {
      setError('root', { type: 'server', message: 'An unexpected error occurred. Please try again.' });
    }
  };

  // Use multi-step registration for tradespeople if enabled
  if (showMultiStep && (activeTab === 'tradesperson' || showOnlyTradesperson)) {
    return (
      <TradespersonRegistration 
        onClose={onClose}
        onSwitchToLogin={onSwitchToLogin}
        // Post-registration verification and redirect are handled internally
      />
    );
  }

  return (
    <div className="flex min-h-[550px]">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-10 overflow-y-auto max-h-[85vh]">
        {/* User avatar icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <UserPlus className="w-7 h-7 text-gray-400" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-1">
            Create your account
          </h2>
          <p className="text-gray-500 font-lato text-sm">
            Join serviceHub and start connecting
          </p>
        </div>

        {/* Tabs for user type */}
        {!showOnlyTradesperson && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-5">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-gray-100 p-1">
              <TabsTrigger 
                value="homeowner" 
                className="flex items-center justify-center gap-2 rounded-lg text-sm font-lato data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Home size={15} />
                <span>Homeowner</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tradesperson" 
                className="flex items-center justify-center gap-2 rounded-lg text-sm font-lato data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Wrench size={15} />
                <span>Tradesperson</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {showOnlyTradesperson && (
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
              <Wrench size={16} className="text-[#34D164]" />
              <span className="text-sm font-medium text-green-800 font-lato">Tradesperson Registration</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
          {/* Name and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Your full name"
                  {...register('name')}
                  className={`pl-10 h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.name ? 'border-red-400' : ''}`}
                />
              </div>
              {rhfErrors.name && <p className="text-red-500 text-xs mt-1">{rhfErrors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="email"
                  placeholder="hello@example.com"
                  {...register('email')}
                  className={`pl-10 h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.email ? 'border-red-400' : ''}`}
                />
              </div>
              {rhfErrors.email && <p className="text-red-500 text-xs mt-1">{rhfErrors.email.message}</p>}
            </div>
          </div>

          {/* Password and Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`pl-10 pr-10 h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.password ? 'border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {rhfErrors.password && <p className="text-red-500 text-xs mt-1">{rhfErrors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="+234..."
                  {...register('phone')}
                  className={`pl-10 h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.phone ? 'border-red-400' : ''}`}
                />
              </div>
              {rhfErrors.phone && <p className="text-red-500 text-xs mt-1">{rhfErrors.phone.message}</p>}
            </div>
          </div>

          {/* Location and Zipcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">State</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                <select
                  {...register('location')}
                  className={`w-full pl-10 pr-4 h-11 border rounded-xl focus:ring-2 focus:ring-[#34D164]/20 focus:border-[#34D164] font-lato text-sm appearance-none bg-white ${
                    rhfErrors.location ? 'border-red-400' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select state</option>
                  {nigerianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              {rhfErrors.location && <p className="text-red-500 text-xs mt-1">{rhfErrors.location.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Zipcode</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Enter zipcode"
                  {...register('postcode')}
                  className={`pl-10 h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.postcode ? 'border-red-400' : ''}`}
                />
              </div>
              {rhfErrors.postcode && <p className="text-red-500 text-xs mt-1">{rhfErrors.postcode.message}</p>}
            </div>
          </div>

          {/* Tradesperson Specific Fields */}
          {(activeTab === 'tradesperson' || showOnlyTradesperson) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Experience (years)</label>
                  <Input
                    type="number"
                    placeholder="Years"
                    {...register('experience_years')}
                    className={`h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${rhfErrors.experience_years ? 'border-red-400' : ''}`}
                  />
                  {rhfErrors.experience_years && <p className="text-red-500 text-xs mt-1">{rhfErrors.experience_years.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Company (optional)</label>
                  <Input
                    placeholder="Company name"
                    {...register('company_name')}
                    className="h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Trade Categories ({selectedTrades.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {tradeCategories.map((category) => (
                    <label key={category} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        value={category}
                        {...register('trade_categories')}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#34D164] focus:ring-[#34D164]/20"
                      />
                      <span className="text-xs font-lato text-gray-700 truncate">{category}</span>
                    </label>
                  ))}
                </div>
                {rhfErrors.trade_categories && <p className="text-red-500 text-xs mt-1">{rhfErrors.trade_categories.message}</p>}
              </div>
            </>
          )}

          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">Referral Code (optional)</label>
            <Input
              placeholder="Enter code if you have one"
              {...register('referral_code')}
              className="h-11 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20"
            />
            {(watch('referral_code') || '').length > 0 && (
              <p className="text-green-600 text-xs mt-1">You'll both earn rewards on verification!</p>
            )}
          </div>

          {/* Submit Error */}
          {rhfErrors.root?.message && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm flex items-center font-lato">
                <AlertCircle size={14} className="mr-2 flex-shrink-0" />
                {rhfErrors.root.message}
              </p>
            </div>
          )}

          {/* Terms text */}
          <p className="text-xs text-gray-500 font-lato text-center">
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-[#34D164] hover:underline">Terms</a> and{' '}
            <a href="/privacy" className="text-[#34D164] hover:underline">Privacy Policy</a>.
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full h-11 text-white font-lato font-semibold text-sm rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ backgroundColor: '#34D164' }}
          >
            {isSubmitting ? 'Creating...' : 'Create account'}
          </Button>

          {/* Switch to Login */}
          <p className="text-center text-gray-500 font-lato text-sm">
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={onSwitchToLogin} 
              className="text-[#34D164] font-semibold hover:underline"
            >
              Login
            </button>
          </p>
        </form>
      </div>

      {/* Right side - Image (hidden on medium and smaller screens) */}
      <div className="hidden lg:block w-[42%] relative">
        <img
          src="/stock/bg2.jpeg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </div>
  );
};

export default SignupForm;