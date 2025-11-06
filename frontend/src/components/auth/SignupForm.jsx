import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, AlertCircle, Home, Wrench, Hash } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import useStates from '../../hooks/useStates';
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

  // Nigerian Trade Categories - Canonical 28 approved list
  const tradeCategories = [
    // Column 1
    "Building",
    "Concrete Works",
    "Tiling",
    "Door & Window Installation",
    "Air Conditioning & Refrigeration",
    "Plumbing",
    
    // Column 2
    "Home Extensions",
    "Scaffolding",
    "Flooring",
    "Bathroom Fitting",
    "Generator Services",
    "Welding",
    
    // Column 3
    "Renovations",
    "Painting",
    "Carpentry",
    "Interior Design",
    "Solar & Inverter Installation",
    "Locksmithing",
    
    // Column 4
    "Roofing",
    "Plastering/POP",
    "Furniture Making",
    "Electrical Repairs",
    "CCTV & Security Systems",
    "General Handyman Work",
    // Additional services to maintain strict 28
    "Cleaning",
    "Relocation/Moving",
    "Waste Disposal",
    "Recycling"
  ];

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
          description: values.description,
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
          navigate('/browse-jobs');
        } else {
          navigate('/');
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
        onComplete={(result) => {
          toast({
            title: "Registration Complete!",
            description: "Welcome to ServiceHub! Your application is being reviewed.",
          });
          // Close the modal first
          if (onClose) onClose();
          // Redirect new tradespeople to Browse Jobs page
          navigate('/browse-jobs');
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          Join serviceHub
        </CardTitle>
        <p className="text-gray-600 font-lato">
          Create your account and start connecting with professionals
        </p>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          {!showOnlyTradesperson ? (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="homeowner" className="flex items-center space-x-2">
                <Home size={16} />
                <span>Homeowner</span>
              </TabsTrigger>
              <TabsTrigger value="tradesperson" className="flex items-center space-x-2">
                <Wrench size={16} />
                <span>Tradesperson</span>
              </TabsTrigger>
            </TabsList>
          ) : (
            <div className="text-center mb-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <Wrench size={20} style={{color: '#2F8140'}} />
                <span className="font-semibold text-green-800 font-montserrat">Tradesperson Registration</span>
              </div>
            </div>
          )}

          <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Your full name"
                    {...register('name')}
                    className={`pl-9 font-lato ${rhfErrors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {rhfErrors.name && <p className="text-red-500 text-sm mt-1">{rhfErrors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    {...register('email')}
                    className={`pl-9 font-lato ${rhfErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {rhfErrors.email && <p className="text-red-500 text-sm mt-1">{rhfErrors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    {...register('password')}
                    className={`pl-9 pr-9 font-lato ${rhfErrors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {rhfErrors.password && <p className="text-red-500 text-sm mt-1">{rhfErrors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="+234XXXXXXXXXX"
                    {...register('phone')}
                    className={`pl-9 font-lato ${rhfErrors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {rhfErrors.phone && <p className="text-red-500 text-sm mt-1">{rhfErrors.phone.message}</p>}
              </div>
            </div>

            {/* Location and Postcode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  State/Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    {...register('location')}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      rhfErrors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select your state</option>
                    {nigerianStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                {rhfErrors.location && <p className="text-red-500 text-sm mt-1">{rhfErrors.location.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Postcode *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Enter your postcode"
                    {...register('postcode')}
                    className={`pl-9 font-lato ${rhfErrors.postcode ? 'border-red-500' : ''}`}
                  />
                </div>
                {rhfErrors.postcode && <p className="text-red-500 text-sm mt-1">{rhfErrors.postcode.message}</p>}
              </div>
            </div>

            {/* Referral Code Field */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Referral Code (Optional)
              </label>
              <div className="relative">
                <Input
                  placeholder="Enter referral code if you have one"
                  {...register('referral_code')}
                  className="font-lato"
                />
              </div>
              {(watch('referral_code') || '').length > 0 && (
                <p className="text-green-600 text-sm mt-1">
                  🎉 Great! You and your referrer will earn rewards when you verify your account
                </p>
              )}
            </div>

            {/* Tradesperson Specific Fields */}
            {(activeTab === 'tradesperson' || showOnlyTradesperson) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                      Experience Years *
                    </label>
                    <Input
                      type="number"
                      placeholder="Years of experience"
                      {...register('experience_years')}
                      className={`font-lato ${rhfErrors.experience_years ? 'border-red-500' : ''}`}
                    />
                    {rhfErrors.experience_years && <p className="text-red-500 text-sm mt-1">{rhfErrors.experience_years.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                      Company Name
                    </label>
                    <Input
                      placeholder="Your company name (optional)"
                      {...register('company_name')}
                      className="font-lato"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Trade Categories * ({selectedTrades.length} selected)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {tradeCategories.map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={category}
                          {...register('trade_categories')}
                          className="rounded"
                          style={{accentColor: '#2F8140'}}
                        />
                        <span className="text-sm font-lato">{category}</span>
                      </label>
                    ))}
                  </div>
                  {rhfErrors.trade_categories && <p className="text-red-500 text-sm mt-1">{rhfErrors.trade_categories.message}</p>}
                </div>
              </div>
            )}

            {/* Submit Error */}
            {rhfErrors.root?.message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {rhfErrors.root.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full text-white font-lato py-3 disabled:opacity-50"
              style={{backgroundColor: '#2F8140'}}
            >
              {isSubmitting ? 'Creating Account...' : `Create ${showOnlyTradesperson ? 'Tradesperson' : (activeTab === 'homeowner' ? 'Homeowner' : 'Tradesperson')} Account`}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SignupForm;
// Legacy handlers removed after RHF migration
// updateFormData, validateForm, legacy handleSubmit(e), and handleTradeToggle are no longer used.