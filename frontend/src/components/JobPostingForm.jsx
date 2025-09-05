import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { ArrowLeft, ArrowRight, MapPin, Calendar, DollarSign, FileText, User, Phone, Mail, Lock, CheckCircle } from 'lucide-react';
import { jobsAPI } from '../api/services';
import { authAPI } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const JobPostingForm = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    // Step 1: Job Details
    title: '',
    description: '',
    category: '',
    
    // Step 2: Location & Timeline
    location: '',
    postcode: '',
    timeline: '',
    
    // Step 3: Budget
    budget_min: '',
    budget_max: '',
    
    // Step 4: Contact Details
    homeowner_name: '',
    homeowner_email: '',
    homeowner_phone: '',
    
    // Step 5: Account Creation
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const categories = [
    'Building & Construction',
    'Plumbing & Water Works', 
    'Electrical Installation',
    'Painting & Decorating',
    'POP & Ceiling Works',
    'Generator Installation & Repair',
    'Air Conditioning & Refrigeration',
    'Solar Installation',
    'Welding & Fabrication',
    'Tiling & Marble Works',
    'Carpentry & Woodwork',
    'Landscaping & Gardening',
    'Interior Decoration',
    'House Cleaning Services',
    'Roofing & Waterproofing'
  ];

  const timelines = [
    'ASAP',
    '1-2 weeks',
    '2-4 weeks', 
    '1-2 months',
    'Flexible'
  ];

  const nigerianCities = [
    'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt',
    'Benin City', 'Kaduna', 'Enugu', 'Jos', 'Ilorin',
    'Onitsha', 'Aba', 'Warri', 'Calabar', 'Akure',
    'Osogbo', 'Bauchi', 'Minna', 'Sokoto', 'Uyo'
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Job title is required';
        if (formData.title.length < 10) newErrors.title = 'Job title must be at least 10 characters';
        if (!formData.description.trim()) newErrors.description = 'Job description is required';
        if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
        if (!formData.category) newErrors.category = 'Please select a category';
        break;
        
      case 2:
        if (!formData.location) newErrors.location = 'Please select your location';
        if (!formData.postcode.trim()) newErrors.postcode = 'Postcode is required';
        if (!formData.timeline) newErrors.timeline = 'Please select a timeline';
        break;
        
      case 3:
        if (!formData.budget_min) newErrors.budget_min = 'Minimum budget is required';
        if (!formData.budget_max) newErrors.budget_max = 'Maximum budget is required';
        if (parseInt(formData.budget_min) >= parseInt(formData.budget_max)) {
          newErrors.budget_max = 'Maximum budget must be higher than minimum';
        }
        break;
        
      case 4:
        if (!formData.homeowner_name.trim()) newErrors.homeowner_name = 'Your name is required';
        if (!formData.homeowner_email.trim()) newErrors.homeowner_email = 'Email is required';
        if (!/\S+@\S+\.\S+/.test(formData.homeowner_email)) newErrors.homeowner_email = 'Valid email is required';
        if (!formData.homeowner_phone.trim()) newErrors.homeowner_phone = 'Phone number is required';
        if (!/^\+234\d{10}$/.test(formData.homeowner_phone)) {
          newErrors.homeowner_phone = 'Please enter valid Nigerian phone number (+234xxxxxxxxxx)';
        }
        break;
        
      case 5:
        if (!formData.password.trim()) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        // Show account creation message before moving to step 5
        setShowAccountCreation(true);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 5));
      }
    }
  };

  const proceedToAccountCreation = () => {
    setShowAccountCreation(false);
    setCurrentStep(5);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    
    try {
      // Step 1: Create homeowner account
      const signupData = {
        name: formData.homeowner_name,
        email: formData.homeowner_email,
        phone: formData.homeowner_phone,
        password: formData.password,
        role: 'homeowner'
      };

      const authResult = await authAPI.signup(signupData);
      
      // Step 2: Login the user
      await login(authResult.access_token, authResult.user);
      
      // Step 3: Create the job (now authenticated)
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        postcode: formData.postcode,
        budget_min: parseInt(formData.budget_min),
        budget_max: parseInt(formData.budget_max),
        timeline: formData.timeline,
        homeowner_name: formData.homeowner_name,
        homeowner_email: formData.homeowner_email,
        homeowner_phone: formData.homeowner_phone
      };

      const result = await jobsAPI.createJob(jobData);
      
      toast({
        title: "Account created and job posted!",
        description: "Welcome to ServiceHub! Your job has been posted and tradespeople will start responding soon.",
      });

      if (onComplete) {
        onComplete(result);
      }
      
    } catch (error) {
      console.error('Account creation or job posting error:', error);
      
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already registered')) {
        toast({
          title: "Email already exists",
          description: "An account with this email already exists. Please use the login option instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to create account or post job",
          description: error.response?.data?.detail || "There was an error. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Job Title *
              </label>
              <Input
                placeholder="e.g., Kitchen renovation needed"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                className={`font-lato ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Category *
              </label>
              <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                <SelectTrigger className={`font-lato ${errors.category ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="font-lato">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Job Description *
              </label>
              <Textarea
                placeholder="Describe your job in detail. Include specifics about what you need done, materials required, and any special requirements..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={6}
                className={`font-lato ${errors.description ? 'border-red-500' : ''}`}
              />
              <div className="flex justify-between mt-1">
                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                <p className="text-gray-500 text-sm">
                  {formData.description.length}/2000 characters
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Location *
              </label>
              <Select value={formData.location} onValueChange={(value) => updateFormData('location', value)}>
                <SelectTrigger className={`font-lato ${errors.location ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianCities.map((city) => (
                    <SelectItem key={city} value={city} className="font-lato">
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Postcode *
              </label>
              <Input
                placeholder="e.g., 100001"
                value={formData.postcode}
                onChange={(e) => updateFormData('postcode', e.target.value)}
                className={`font-lato ${errors.postcode ? 'border-red-500' : ''}`}
              />
              {errors.postcode && <p className="text-red-500 text-sm mt-1">{errors.postcode}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                When do you need this done? *
              </label>
              <Select value={formData.timeline} onValueChange={(value) => updateFormData('timeline', value)}>
                <SelectTrigger className={`font-lato ${errors.timeline ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  {timelines.map((timeline) => (
                    <SelectItem key={timeline} value={timeline} className="font-lato">
                      {timeline}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timeline && <p className="text-red-500 text-sm mt-1">{errors.timeline}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Budget Range (Nigerian Naira) *
              </label>
              <p className="text-sm text-gray-600 font-lato mb-4">
                This helps tradespeople understand if the job fits their pricing range.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2 text-gray-700">
                  Minimum Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <Input
                    type="number"
                    placeholder="50,000"
                    value={formData.budget_min}
                    onChange={(e) => updateFormData('budget_min', e.target.value)}
                    className={`pl-8 font-lato ${errors.budget_min ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.budget_min && <p className="text-red-500 text-sm mt-1">{errors.budget_min}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2 text-gray-700">
                  Maximum Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <Input
                    type="number"
                    placeholder="200,000"
                    value={formData.budget_max}
                    onChange={(e) => updateFormData('budget_max', e.target.value)}
                    className={`pl-8 font-lato ${errors.budget_max ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.budget_max && <p className="text-red-500 text-sm mt-1">{errors.budget_max}</p>}
              </div>
            </div>

            {formData.budget_min && formData.budget_max && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium font-lato" style={{color: '#121E3C'}}>
                  Budget Range: {formatCurrency(formData.budget_min)} - {formatCurrency(formData.budget_max)}
                </p>
                <p className="text-sm text-gray-600 font-lato mt-1">
                  This range will be shown to tradespeople when they view your job.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Your Contact Details
              </h3>
              <p className="text-gray-600 font-lato">
                Tradespeople will use these details to contact you about your job.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Full Name *
              </label>
              <Input
                placeholder="Your full name"
                value={formData.homeowner_name}
                onChange={(e) => updateFormData('homeowner_name', e.target.value)}
                className={`font-lato ${errors.homeowner_name ? 'border-red-500' : ''}`}
              />
              {errors.homeowner_name && <p className="text-red-500 text-sm mt-1">{errors.homeowner_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.homeowner_email}
                onChange={(e) => updateFormData('homeowner_email', e.target.value)}
                className={`font-lato ${errors.homeowner_email ? 'border-red-500' : ''}`}
              />
              {errors.homeowner_email && <p className="text-red-500 text-sm mt-1">{errors.homeowner_email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Phone Number *
              </label>
              <Input
                placeholder="+234XXXXXXXXXX"
                value={formData.homeowner_phone}
                onChange={(e) => updateFormData('homeowner_phone', e.target.value)}
                className={`font-lato ${errors.homeowner_phone ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-gray-500 font-lato mt-1">
                Please include country code (+234 for Nigeria)
              </p>
              {errors.homeowner_phone && <p className="text-red-500 text-sm mt-1">{errors.homeowner_phone}</p>}
            </div>

            {/* Job Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Job Summary
              </h4>
              <div className="space-y-2 text-sm font-lato">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Category:</strong> {formData.category}</p>
                <p><strong>Location:</strong> {formData.location}, {formData.postcode}</p>
                <p><strong>Timeline:</strong> {formData.timeline}</p>
                <p><strong>Budget:</strong> {formData.budget_min && formData.budget_max ? 
                  `${formatCurrency(formData.budget_min)} - ${formatCurrency(formData.budget_max)}` : 'Not specified'}</p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Create Your Account
              </h3>
              <p className="text-gray-600 font-lato">
                Create an account to track your job, leads and interested tradespeople
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Password *
              </label>
              <Input
                type="password"
                placeholder="Enter a secure password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className={`font-lato ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Confirm Password *
              </label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                className={`font-lato ${errors.confirmPassword ? 'border-red-500' : ''}`}
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Account Benefits */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h4 className="font-semibold font-montserrat mb-3 text-green-800">
                With your account, you'll be able to:
              </h4>
              <ul className="space-y-2 text-sm font-lato text-green-700">
                <li className="flex items-center">
                  <CheckCircle size={16} className="mr-2 text-green-600" />
                  Track your job status and interested tradespeople
                </li>
                <li className="flex items-center">
                  <CheckCircle size={16} className="mr-2 text-green-600" />
                  Review and rate tradespeople after job completion
                </li>
                <li className="flex items-center">
                  <CheckCircle size={16} className="mr-2 text-green-600" />
                  Receive notifications about job updates
                </li>
                <li className="flex items-center">
                  <CheckCircle size={16} className="mr-2 text-green-600" />
                  Post additional jobs in the future
                </li>
              </ul>
            </div>

            {/* User Details Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="font-semibold font-montserrat mb-3" style={{color: '#121E3C'}}>
                Account Details
              </h4>
              <div className="space-y-1 text-sm font-lato">
                <p><strong>Name:</strong> {formData.homeowner_name}</p>
                <p><strong>Email:</strong> {formData.homeowner_email}</p>
                <p><strong>Phone:</strong> {formData.homeowner_phone}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepIcon = (step) => {
    switch (step) {
      case 1: return <FileText size={20} />;
      case 2: return <MapPin size={20} />;
      case 3: return <DollarSign size={20} />;
      case 4: return <User size={20} />;
      case 5: return <Lock size={20} />;
      default: return null;
    }
  };

  const steps = [
    { number: 1, title: 'Job Details', description: 'What do you need done?' },
    { number: 2, title: 'Location & Timeline', description: 'Where and when?' },
    { number: 3, title: 'Budget', description: 'What\'s your budget?' },
    { number: 4, title: 'Contact Details', description: 'How can tradespeople reach you?' },
    { number: 5, title: 'Create Account', description: 'Track your job and leads' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.number 
                  ? 'text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`} style={{
                backgroundColor: currentStep >= step.number ? '#2F8140' : undefined
              }}>
                {getStepIcon(step.number)}
              </div>
              {step.number < 5 && (
                <div 
                  className={`w-full h-1 mx-4 ${
                    currentStep > step.number ? 'bg-[#2F8140]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <Progress value={(currentStep / 5) * 100} className="mb-2" />
        <div className="text-center">
          <h2 className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-gray-600 font-lato">
            {steps[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <Card>
        <CardContent className="p-8">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="font-lato"
        >
          <ArrowLeft size={16} className="mr-2" />
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={nextStep}
            className="text-white font-lato"
            style={{backgroundColor: '#2F8140'}}
          >
            Next
            <ArrowRight size={16} className="ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-white font-lato"
            style={{backgroundColor: '#121E3C'}}
          >
            {isSubmitting ? 'Posting Job...' : 'Post Job'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default JobPostingForm;