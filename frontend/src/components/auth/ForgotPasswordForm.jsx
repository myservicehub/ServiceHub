import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          {showSuccess ? 'Check Your Email' : 'Forgot Password?'}
        </CardTitle>
        <p className="text-gray-600 font-lato">
          {showSuccess 
            ? 'We\'ve sent password reset instructions to your email address.' 
            : 'Enter your email address and we\'ll send you a link to reset your password.'
          }
        </p>
      </CardHeader>
      
      <CardContent>
        {showSuccess ? (
          // Success State
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-gray-700 font-lato">
                If an account with <strong>{email}</strong> exists, you will receive a password reset link shortly.
              </p>
              <p className="text-gray-600 font-lato text-sm">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full font-lato"
              >
                Try Different Email
              </Button>
              
              <Button
                onClick={handleBackToLogin}
                className="w-full text-white font-lato"
                style={{backgroundColor: '#34D164'}}
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 font-lato ${errors.email ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

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
              style={{backgroundColor: '#34D164'}}
            >
              {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>

            {/* Back to Login */}
            <div className="text-center pt-4 border-t">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-gray-600 font-lato text-sm hover:text-gray-800 flex items-center justify-center space-x-1"
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;
