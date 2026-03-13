import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import apiClient from '../../api/client';

const ForgotPasswordForm = ({ onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { toast } = useToast();

  const validateEmail = (email) => {
    if (!email.trim()) {
      return 'Please enter an email address';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear all errors when starting submission

    try {
      // Call the backend password reset endpoint
      const response = await apiClient.post('/auth/password-reset-request', {
        email: email.trim()
      });

      if (response.status === 200) {
        setIsSuccess(true);
        setShowSuccess(true);
        
        toast({
          title: "Password Reset Requested",
          description: "If an account with this email exists, you will receive a password reset link.",
        });
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
      
      // Handle different error scenarios
      if (error.response?.status === 422) {
        setErrors({ email: 'Please enter a valid email address' });
      } else {
        // For any other error (including network errors), just show generic success message
        // This is intentional for security - don't reveal if email exists or not
        setIsSuccess(true);
        setShowSuccess(true);
        
        toast({
          title: "Password Reset Requested",
          description: "If an account with this email exists, you will receive a password reset link.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleBackToLogin = () => {
    setEmail('');
    setErrors({});
    setIsSuccess(false);
    setShowSuccess(false);
    onBackToLogin();
  };

  const handleTryAgain = () => {
    setEmail('');
    setErrors({});
    setIsSuccess(false);
    setShowSuccess(false);
  };

  return (
    <div className="flex min-h-[500px]">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-10 lg:px-12">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${showSuccess ? 'bg-green-100' : 'bg-gray-100'}`}>
            {showSuccess ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <KeyRound className="w-8 h-8 text-gray-400" />
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-2">
            {showSuccess ? 'Check Your Email' : 'Forgot Password?'}
          </h2>
          <p className="text-gray-500 font-lato text-sm">
            {showSuccess 
              ? 'We\'ve sent password reset instructions to your email address.' 
              : 'Enter your email address and we\'ll send you a link to reset your password.'
            }
          </p>
        </div>

        {showSuccess ? (
          // Success State
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-gray-700 font-lato text-sm">
                If an account with <strong className="text-[#121E3C]">{email}</strong> exists, you will receive a password reset link shortly.
              </p>
              <p className="text-gray-500 font-lato text-sm">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full h-12 font-lato font-semibold text-sm rounded-xl border-gray-200 hover:bg-gray-50"
              >
                Try Different Email
              </Button>
              
              <Button
                onClick={handleBackToLogin}
                className="w-full h-12 text-white font-lato font-semibold text-sm rounded-xl hover:opacity-90 transition-all"
                style={{ backgroundColor: '#34D164' }}
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-11 h-12 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20 ${errors.email ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center font-lato">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm flex items-center font-lato">
                  <AlertCircle size={16} className="mr-2" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-white font-lato font-semibold text-sm rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ backgroundColor: '#34D164' }}
            >
              {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>

            {/* Back to Login */}
            <p className="text-center text-gray-500 font-lato text-sm pt-2">
              Remember your password?{' '}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-[#34D164] font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>

      {/* Right side - Image with motivational overlay (hidden on medium and smaller screens) */}
      <div className="hidden lg:block w-[45%] relative">
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
            Reset your password
          </p>
          <p className="text-sm text-white/80 font-lato">
            We'll help you get back into your account
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
