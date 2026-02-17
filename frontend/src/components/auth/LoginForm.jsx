import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form';
import { loginSchema } from '../../utils/validation';

const LoginForm = ({ onClose, onSwitchToSignup, onSwitchToForgotPassword }) => {
  // Remove local formData/errors state; use react-hook-form instead
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
          navigate('/browse-jobs');
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
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
          Welcome Back
        </CardTitle>
        <p className="text-gray-600 font-lato">Sign in to your serviceHub account</p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Email Address
                  </FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" className="pl-10 font-lato" {...field} />
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
                  <FormLabel className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Password
                  </FormLabel>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <FormControl>
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="pl-10 pr-10 font-lato" {...field} />
                    </FormControl>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Error */}
            {formState.errors.root?.message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {formState.errors.root.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={!formState.isValid || formState.isSubmitting} className="w-full text-white font-lato py-3 disabled:opacity-50" style={{backgroundColor: '#34D164'}}>
              {formState.isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Forgot Password */}
            <div className="text-center">
              <button type="button" onClick={onSwitchToForgotPassword} className="text-sm font-lato hover:underline" style={{color: '#34D164'}}>
                Forgot your password?
              </button>
            </div>

            {/* Switch to Signup */}
            <div className="text-center pt-4 border-t">
              <p className="text-gray-600 font-lato text-sm">
                Don't have an account?{' '}
                <button type="button" onClick={onSwitchToSignup} className="font-semibold hover:underline" style={{color: '#34D164'}}>
                  Sign up here
                </button>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
