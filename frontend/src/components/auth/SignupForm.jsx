import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, EyeOff, User, Mail, Lock, Phone, MapPin, AlertCircle, Home, Wrench, Hash } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const SignupForm = ({ onClose, onSwitchToLogin, defaultTab = 'homeowner', showOnlyTradesperson = false }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    postcode: '',
    referral_code: new URLSearchParams(window.location.search).get('ref') || '', // Auto-fill from URL
    // Tradesperson specific
    trade_categories: [],
    experience_years: '',
    company_name: '',
    description: '',
    certifications: []
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { registerHomeowner, registerTradesperson } = useAuth();
  const { toast } = useToast();

  // Nigerian States - Updated service coverage areas
  const nigerianStates = [
    'Abuja',
    'Lagos', 
    'Delta',
    'Rivers State',
    'Benin',
    'Bayelsa',
    'Enugu',
    'Cross Rivers'
  ];

  // Nigerian Trade Categories - Updated comprehensive list
  const tradeCategories = [
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

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'State/Location is required';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required';
    }

    // Tradesperson specific validation
    if (activeTab === 'tradesperson') {
      if (formData.trade_categories.length === 0) {
        newErrors.trade_categories = 'Please select at least one trade category';
      }

      if (!formData.experience_years) {
        newErrors.experience_years = 'Experience years is required';
      } else if (parseInt(formData.experience_years) < 0 || parseInt(formData.experience_years) > 50) {
        newErrors.experience_years = 'Experience years must be between 0 and 50';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let result;
      
      if (activeTab === 'homeowner') {
        result = await registerHomeowner({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          location: formData.location,
          postcode: formData.postcode,
          referral_code: formData.referral_code || undefined
        });
      } else {
        result = await registerTradesperson({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          location: formData.location,
          postcode: formData.postcode,
          trade_categories: formData.trade_categories,
          experience_years: parseInt(formData.experience_years),
          company_name: formData.company_name,
          description: formData.description,
          certifications: formData.certifications,
          referral_code: formData.referral_code || undefined
        });
      }

      if (result.success) {
        toast({
          title: "Account created successfully!",
          description: `Welcome to serviceHub, ${result.user.name}! ${
            activeTab === 'tradesperson' 
              ? 'Your account is pending verification.' 
              : 'You can now start posting jobs.'
          }`,
        });
        
        if (onClose) onClose();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradeToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      trade_categories: prev.trade_categories.includes(category)
        ? prev.trade_categories.filter(c => c !== category)
        : [...prev.trade_categories, category]
    }));
  };

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

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className={`pl-9 font-lato ${errors.name ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className={`pl-9 font-lato ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
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
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className={`pl-9 pr-9 font-lato ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="+234XXXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className={`pl-9 font-lato ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
                    value={formData.location}
                    onChange={(e) => updateFormData('location', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.location ? 'border-red-500' : 'border-gray-300'
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
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Postcode *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Enter your postcode"
                    value={formData.postcode}
                    onChange={(e) => updateFormData('postcode', e.target.value)}
                    className={`pl-9 font-lato ${errors.postcode ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.postcode && <p className="text-red-500 text-sm mt-1">{errors.postcode}</p>}
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
                  value={formData.referral_code}
                  onChange={(e) => updateFormData('referral_code', e.target.value.toUpperCase())}
                  className="font-lato"
                />
              </div>
              {formData.referral_code && (
                <p className="text-green-600 text-sm mt-1">
                  🎉 Great! You and your referrer will earn rewards when you verify your account
                </p>
              )}
            </div>

            {/* Tradesperson Specific Fields */}
            <TabsContent value="tradesperson" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Experience Years *
                  </label>
                  <Input
                    type="number"
                    placeholder="Years of experience"
                    value={formData.experience_years}
                    onChange={(e) => updateFormData('experience_years', e.target.value)}
                    className={`font-lato ${errors.experience_years ? 'border-red-500' : ''}`}
                  />
                  {errors.experience_years && <p className="text-red-500 text-sm mt-1">{errors.experience_years}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Company Name
                  </label>
                  <Input
                    placeholder="Your company name (optional)"
                    value={formData.company_name}
                    onChange={(e) => updateFormData('company_name', e.target.value)}
                    className="font-lato"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Trade Categories * ({formData.trade_categories.length} selected)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {tradeCategories.map((category) => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.trade_categories.includes(category)}
                        onChange={() => handleTradeToggle(category)}
                        className="rounded"
                        style={{accentColor: '#2F8140'}}
                      />
                      <span className="text-sm font-lato">{category}</span>
                    </label>
                  ))}
                </div>
                {errors.trade_categories && <p className="text-red-500 text-sm mt-1">{errors.trade_categories}</p>}
              </div>
            </TabsContent>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-lato py-3 disabled:opacity-50"
              style={{backgroundColor: '#2F8140'}}
            >
              {isLoading ? 'Creating Account...' : `Create ${activeTab === 'homeowner' ? 'Homeowner' : 'Tradesperson'} Account`}
            </Button>

            {/* Switch to Login */}
            <div className="text-center pt-4 border-t">
              <p className="text-gray-600 font-lato text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-semibold hover:underline"
                  style={{color: '#2F8140'}}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SignupForm;