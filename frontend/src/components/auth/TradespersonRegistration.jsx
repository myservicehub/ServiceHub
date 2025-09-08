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
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import SkillsTestComponent from './SkillsTestComponent';

const TradespersonRegistration = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [testAnswers, setTestAnswers] = useState({});

  const { registerTradesperson } = useAuth();
  const { toast } = useToast();

  // Nigerian states and trade categories
  const nigerianStates = [
    'Abuja', 'Lagos', 'Delta', 'Rivers State', 'Benin', 'Bayelsa', 'Enugu', 'Cross Rivers'
  ];

  const tradeCategories = [
    "Building", "Concrete Works", "Tiling", "CCTV & Security Systems",
    "Door & Window Installation", "Air Conditioning & Refrigeration", 
    "Renovations", "Relocation/Moving", "Painting", "Carpentry",
    "General Handyman Work", "Bathroom Fitting", "Generator Services",
    "Home Extensions", "Scaffolding", "Waste Disposal", "Flooring",
    "Plastering/POP", "Cleaning", "Electrical Repairs", 
    "Solar & Inverter Installation", "Plumbing", "Welding",
    "Furniture Making", "Interior Design", "Roofing", "Locksmithing", "Recycling"
  ];

  const businessTypes = [
    'Self employed / sole trader',
    'Limited company (LTD)',
    'Ordinary partnership',
    'Limited liability partnership (LLP)'
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1:
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.password || formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        break;
      case 2:
        if (formData.selectedTrades.length === 0) {
          newErrors.selectedTrades = 'Please select at least one profession';
        }
        if (formData.selectedTrades.length > 5) {
          newErrors.selectedTrades = 'Please select maximum 5 professions';
        }
        if (!formData.businessType) newErrors.businessType = 'Business type is required';
        if (!formData.tradingName.trim()) newErrors.tradingName = 'Trading name is required';
        if (!formData.state) newErrors.state = 'State is required';
        break;
      case 3:
        if (!formData.idType) newErrors.idType = 'Please select an ID type';
        break;
      case 4:
        if (!formData.skillsTestPassed) {
          newErrors.skillsTest = 'You must pass the skills test to continue';
        }
        break;
      case 5:
        if (!formData.profileDescription.trim()) {
          newErrors.profileDescription = 'Profile description is required';
        }
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
          +234 Phone number *
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
            +234
          </span>
          <Input
            placeholder="Phone number"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            className={`rounded-l-none ${errors.phone ? 'border-red-500' : ''}`}
          />
        </div>
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password (6 characters minimum) *
        </label>
        <Input
          type="password"
          placeholder="Create your password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          className={errors.password ? 'border-red-500' : ''}
        />
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
            max="100"
            value={formData.travelDistance}
            onChange={(e) => updateFormData('travelDistance', e.target.value)}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>5 miles</span>
            <span className="font-medium">{formData.travelDistance} miles</span>
            <span>100 miles</span>
          </div>
        </div>
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Next: Skills Assessment</h4>
            <p className="text-sm text-blue-700 mt-1">
              After verifying your identity, you'll take a skills test to demonstrate your expertise in your selected trades. This helps us ensure quality for our customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

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
          {currentStep === 6 && <WalletSetup formData={formData} updateFormData={updateFormData} />}
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

          <Button
            type="button"
            onClick={currentStep === 6 ? handleFinalSubmit : nextStep}
            disabled={isLoading || (currentStep === 4 && !formData.skillsTestPassed)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <span>
              {currentStep === 6 ? 'Complete Registration' : 'Continue'}
            </span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Skills Test Component (Step 4)
const SkillsTest = ({ formData, updateFormData }) => {
  const [currentTrade, setCurrentTrade] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

  // Sample questions for different trades (in a real app, these would come from a database)
  const tradeQuestions = {
    'Plumbing': [
      {
        question: "What is the minimum pipe diameter for a main water supply line in residential buildings?",
        options: ["15mm", "20mm", "25mm", "32mm"],
        correct: 2,
        category: "Technical Knowledge"
      },
      {
        question: "Which material is NOT suitable for hot water pipes in Nigerian climate?",
        options: ["Copper", "PVC", "PPR", "Stainless Steel"],
        correct: 1,
        category: "Materials"
      },
      // ... more questions
    ],
    'Electrical Repairs': [
      {
        question: "What is the standard voltage for residential electrical supply in Nigeria?",
        options: ["110V", "220V", "240V", "415V"],
        correct: 2,
        category: "Technical Knowledge"
      },
      {
        question: "According to Nigerian electrical codes, what is the minimum wire gauge for a 20A circuit?",
        options: ["2.5mm²", "4mm²", "6mm²", "10mm²"],
        correct: 1,
        category: "Safety Standards"
      },
      // ... more questions
    ]
    // Add more trades and questions...
  };

  if (!isTestStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <BookOpen className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Verify your skills
          </h3>
          <p className="text-gray-600">
            ServiceHub supports quality tradespeople. Take our skills assessment to demonstrate your expertise in your selected trades.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Test Requirements</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• You need to score 80% or higher to pass</li>
                <li>• 20 questions per trade category</li>
                <li>• 30 minutes time limit</li>
                <li>• Questions cover technical knowledge, safety, and Nigerian standards</li>
                <li>• Immediate results provided</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">You will be tested on:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.selectedTrades.map((trade, index) => (
              <div key={trade} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Trophy className="h-5 w-5 text-green-600" />
                <span className="font-medium">{trade}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => setIsTestStarted(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        >
          Start Skills Test
        </Button>
      </div>
    );
  }

  // Test interface would go here
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Skills Test in Progress</h3>
        <p className="text-gray-600">Testing implementation in progress...</p>
      </div>
    </div>
  );
};

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
const WalletSetup = ({ formData, updateFormData }) => (
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

    <Button
      onClick={() => updateFormData('walletSetup', true)}
      className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
    >
      Set Up Wallet Later
    </Button>
  </div>
);

export default TradespersonRegistration;