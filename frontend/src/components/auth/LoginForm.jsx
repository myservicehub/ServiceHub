import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Eye, EyeOff, Mail, Lock, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { loginSchema } from '../../utils/validation';

const LoginForm = ({ onClose, onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });
  const { handleSubmit, control, formState, setError, getValues } = form;

  const onSubmit = async () => {
    const { email, password } = getValues();
    try {
      const result = await login(email, password);
      if (result.success) {
        toast({ title: 'Welcome back!', description: `Successfully logged in as ${result.user.name}` });
        if (onClose) onClose();
        if (result.user.role === 'tradesperson') {
          navigate('/trades/overview');
        } else if (result.user.role === 'homeowner') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } else {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || result.error?.msg || 'Login failed. Please check your credentials and try again.';
        setError('root', { type: 'server', message: errorMessage });
      }
    } catch (error) {
      setError('root', { type: 'server', message: 'An unexpected error occurred. Please try again.' });
    }
  };

  return (
    <div className="flex min-h-[500px]">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-10 lg:px-12">
        {/* User avatar icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-2">
            Login to your account
          </h2>
          <p className="text-gray-500 font-lato text-sm">
            Enter your details to login.
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Email Address
                  </FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="hello@example.com" 
                        className="pl-11 h-12 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20" 
                        {...field} 
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Password
                  </FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <FormControl>
                      <Input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        className="pl-11 pr-11 h-12 font-lato text-sm rounded-xl border-gray-200 focus:border-[#34D164] focus:ring-[#34D164]/20" 
                        {...field} 
                      />
                    </FormControl>
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keep me logged in + Forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#34D164] focus:ring-[#34D164]/20" />
                <span className="text-gray-600 font-lato">Keep me logged in</span>
              </label>
              <button 
                type="button" 
                onClick={onSwitchToForgotPassword} 
                className="text-[#34D164] font-lato font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Error */}
            {formState.errors.root?.message && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm flex items-center font-lato">
                  <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                  {formState.errors.root.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={!formState.isValid || formState.isSubmitting} 
              className="w-full h-12 text-white font-lato font-semibold text-sm rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ backgroundColor: '#34D164' }}
            >
              {formState.isSubmitting ? 'Signing in...' : 'Login'}
            </Button>

            {/* Switch to Signup */}
            <p className="text-center text-gray-500 font-lato text-sm pt-2">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={onSwitchToSignup} 
                className="text-[#34D164] font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          </form>
        </Form>
      </div>

      {/* Right side - Image with motivational overlay (hidden on medium and smaller screens) */}
      <div className="hidden lg:block w-[45%] relative">
        <img
          src="/stock/bg13.jpg"
          alt="Professional tradesperson"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Motivational overlay text */}
        <div className="absolute bottom-8 left-6 right-6 text-white">
          <p className="text-lg font-semibold font-montserrat mb-2">
            Welcome back to ServiceHub
          </p>
          <p className="text-sm text-white/80 font-lato">
            Connect with trusted professionals in your area
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
