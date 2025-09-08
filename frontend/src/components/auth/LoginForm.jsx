import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const LoginForm = ({ onClose, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        toast({
          title: "Welcome back!",
          description: `Successfully logged in as ${result.user.name}`,
        });
        
        if (onClose) onClose();
      } else {
        // Ensure error is a string, not an object
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || result.error?.msg || 'Login failed. Please check your credentials and try again.';
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          Welcome Back
        </CardTitle>
        <p className="text-gray-600 font-lato">
          Sign in to your serviceHub account
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className={`pl-10 font-lato ${errors.email ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className={`pl-10 pr-10 font-lato ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {errors.password}
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
            style={{backgroundColor: '#2F8140'}}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              className="text-sm font-lato hover:underline"
              style={{color: '#2F8140'}}
            >
              Forgot your password?
            </button>
          </div>

          {/* Switch to Signup */}
          <div className="text-center pt-4 border-t">
            <p className="text-gray-600 font-lato text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-semibold hover:underline"
                style={{color: '#2F8140'}}
              >
                Sign up here
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;