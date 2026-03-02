import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Wrench, Home, ArrowRight, Sparkles } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

// User Type Selection Component
const UserTypeSelection = ({ onSelectTradesperson, onSelectHomeowner, onSignIn }) => (
  <div className="p-8 md:p-10">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-2">
        How would you like to use ServiceHub?
      </h2>
      <p className="text-gray-500 font-lato text-sm">
        Choose how you'd like to get started
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Tradesperson Option */}
      <button
        onClick={onSelectTradesperson}
        className="group relative p-6 border-2 border-gray-200 rounded-2xl hover:border-[#34D164] hover:bg-[#34D164]/5 transition-all duration-200 text-left"
      >
        <div className="w-14 h-14 rounded-xl bg-[#34D164]/10 flex items-center justify-center mb-4 group-hover:bg-[#34D164]/20 transition-colors">
          <Wrench className="h-7 w-7 text-[#34D164]" />
        </div>
        <h3 className="text-lg font-semibold font-montserrat text-[#121E3C] mb-2">
          I'm a Tradesperson
        </h3>
        <p className="text-sm text-gray-500 font-lato mb-4">
          Join our network of skilled professionals and connect with customers looking for your services.
        </p>
        <div className="flex items-center text-[#34D164] text-sm font-medium font-lato group-hover:gap-2 transition-all">
          <span>Create your profile</span>
          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Homeowner Option */}
      <button
        onClick={onSelectHomeowner}
        className="group relative p-6 border-2 border-gray-200 rounded-2xl hover:border-[#121E3C] hover:bg-[#121E3C]/5 transition-all duration-200 text-left"
      >
        <div className="w-14 h-14 rounded-xl bg-[#121E3C]/10 flex items-center justify-center mb-4 group-hover:bg-[#121E3C]/20 transition-colors">
          <Home className="h-7 w-7 text-[#121E3C]" />
        </div>
        <h3 className="text-lg font-semibold font-montserrat text-[#121E3C] mb-2">
          I need a Service
        </h3>
        <p className="text-sm text-gray-500 font-lato mb-4">
          Find trusted tradespeople in your area to help with your home projects.
        </p>
        <div className="flex items-center text-[#121E3C] text-sm font-medium font-lato group-hover:gap-2 transition-all">
          <span>Find a tradesperson</span>
          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>
    </div>

    <p className="text-center text-xs text-gray-400 font-lato mt-6">
      Already have an account? <button onClick={onSignIn} className="text-[#34D164] font-medium hover:underline">Sign in</button>
    </p>
  </div>
);

// Homeowner Guidance Component
const HomeownerGuidance = ({ onPostJob, onBack }) => (
  <div className="flex min-h-[400px]">
    {/* Left side - Content */}
    <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
      <button 
        onClick={onBack}
        className="text-gray-400 hover:text-gray-600 text-sm font-lato mb-6 flex items-center gap-1 self-start"
      >
        ← Back
      </button>
      
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D164] to-[#2ab854] flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-3">
        Let's find you the perfect tradesperson
      </h2>
      <p className="text-gray-500 font-lato text-sm mb-6 leading-relaxed">
        Getting started is simple! Tell us what you need done, and we'll connect you with qualified professionals in your area. Your account will be created automatically when you post your first job.
      </p>

      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#34D164]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#34D164] text-xs font-bold">1</span>
          </div>
          <p className="text-sm text-gray-600 font-lato">Describe your project and what you need help with</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#34D164]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#34D164] text-xs font-bold">2</span>
          </div>
          <p className="text-sm text-gray-600 font-lato">Receive quotes from interested tradespeople</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#34D164]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[#34D164] text-xs font-bold">3</span>
          </div>
          <p className="text-sm text-gray-600 font-lato">Compare, chat, and hire the right professional for you</p>
        </div>
      </div>

      <button
        onClick={onPostJob}
        className="w-full bg-[#34D164] hover:bg-[#2ab854] text-white py-3.5 px-6 rounded-xl font-medium font-lato transition-all shadow-lg shadow-[#34D164]/20 flex items-center justify-center gap-2"
      >
        Post Your First Job
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>

    {/* Right side - Image (hidden on mobile) */}
    <div className="hidden md:block w-[40%] relative">
      <img
        src="/stock/bg13.jpg"
        alt="Professional tradesperson"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      <div className="absolute bottom-8 left-6 right-6 text-white">
        <p className="text-lg font-semibold font-montserrat mb-2">
          Thousands of verified professionals
        </p>
        <p className="text-sm text-white/80 font-lato">
          Ready to help with your next project
        </p>
      </div>
    </div>
  </div>
);

const AuthModal = ({ isOpen, onClose, defaultMode = 'login', defaultTab = 'tradesperson', showOnlyTradesperson = true }) => {
  const [mode, setMode] = useState(defaultMode);
  const navigate = useNavigate();

  // Update mode when defaultMode prop changes
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const handleClose = () => {
    onClose();
    // Reset to default mode when closing
    setTimeout(() => setMode(defaultMode), 300);
  };

  const switchToLogin = () => setMode('login');
  const switchToSignup = () => setMode('signup');
  const switchToUserTypeSelection = () => setMode('userTypeSelection');
  const switchToHomeownerGuidance = () => setMode('homeownerGuidance');
  const switchToForgotPassword = () => setMode('forgotPassword');

  const handlePostJob = () => {
    handleClose();
    navigate('/post-job');
  };

  // Determine the modal size based on mode
  const getModalSize = () => {
    if (mode === 'userTypeSelection') return 'sm:max-w-xl';
    if (mode === 'homeownerGuidance') return 'sm:max-w-2xl';
    return 'sm:max-w-md md:max-w-lg lg:max-w-4xl';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`${getModalSize()} max-h-[90vh] overflow-hidden p-0 rounded-2xl`}
        onPointerDownOutside={(e) => { e.preventDefault(); }}
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Login' : mode === 'forgotPassword' ? 'Forgot Password' : mode === 'userTypeSelection' ? 'Choose Account Type' : mode === 'homeownerGuidance' ? 'Get Started as Homeowner' : 'Sign Up'}
        </DialogTitle>
        
        {mode === 'userTypeSelection' ? (
          <UserTypeSelection 
            onSelectTradesperson={switchToSignup}
            onSelectHomeowner={switchToHomeownerGuidance}
            onSignIn={switchToLogin}
          />
        ) : mode === 'homeownerGuidance' ? (
          <HomeownerGuidance 
            onPostJob={handlePostJob}
            onBack={switchToUserTypeSelection}
          />
        ) : mode === 'login' ? (
          <LoginForm 
            onClose={handleClose} 
            onSwitchToSignup={switchToUserTypeSelection}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        ) : mode === 'forgotPassword' ? (
          <ForgotPasswordForm 
            onClose={handleClose} 
            onBackToLogin={switchToLogin}
          />
        ) : (
          <SignupForm 
            onClose={handleClose} 
            onSwitchToLogin={switchToLogin} 
            defaultTab={defaultTab}
            showOnlyTradesperson={showOnlyTradesperson}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;