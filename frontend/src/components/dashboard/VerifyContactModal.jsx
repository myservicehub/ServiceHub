import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, CheckCircle, Send, ArrowRight, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { jobsAPI } from '../../api/jobs';

const VerifyContactModal = ({ isOpen, onClose, onComplete }) => {
  const [activeTab, setActiveTab] = useState('email');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const emailVerified = user?.email_verified || false;
  const phoneVerified = user?.phone_verified || false;

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendEmailCode = async () => {
    setIsLoading(true);
    try {
      await jobsAPI.apiClient.post('/auth/verify/email/send');
      setEmailSent(true);
      setCountdown(60);
      toast({
        title: "Verification code sent!",
        description: `Check your inbox at ${user?.email}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: error.response?.data?.detail || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    setIsLoading(true);
    try {
      await jobsAPI.apiClient.post('/auth/verify/phone/send');
      setPhoneSent(true);
      setCountdown(60);
      toast({
        title: "Verification code sent!",
        description: `Check your SMS at ${user?.phone}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: error.response?.data?.detail || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (emailCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await jobsAPI.apiClient.post('/auth/verify/email', { code: emailCode });
      if (refreshUser) await refreshUser();
      toast({
        title: "Email verified! ✓",
        description: "Your email has been verified successfully",
      });
      setEmailCode('');
      
      // If both verified, complete
      if (phoneVerified) {
        if (onComplete) onComplete();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error.response?.data?.detail || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (phoneCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await jobsAPI.apiClient.post('/auth/verify/phone', { code: phoneCode });
      if (refreshUser) await refreshUser();
      toast({
        title: "Phone verified! ✓",
        description: "Your phone number has been verified successfully",
      });
      setPhoneCode('');
      
      // If both verified, complete
      if (emailVerified) {
        if (onComplete) onComplete();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error.response?.data?.detail || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#121E3C] font-montserrat">
                  Verify Your Contact
                </h2>
                <p className="text-xs text-gray-500 font-lato mt-0.5">
                  Secure your account and build trust
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`p-4 rounded-xl border-2 ${
              emailVerified 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Mail className={`w-4 h-4 ${emailVerified ? 'text-green-500' : 'text-orange-500'}`} />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </div>
              <p className={`text-xs font-lato ${emailVerified ? 'text-green-600' : 'text-orange-600'}`}>
                {emailVerified ? 'Verified ✓' : 'Not verified'}
              </p>
            </div>
            <div className={`p-4 rounded-xl border-2 ${
              phoneVerified 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Phone className={`w-4 h-4 ${phoneVerified ? 'text-green-500' : 'text-orange-500'}`} />
                <span className="text-sm font-medium text-gray-700">Phone</span>
              </div>
              <p className={`text-xs font-lato ${phoneVerified ? 'text-green-600' : 'text-orange-600'}`}>
                {phoneVerified ? 'Verified ✓' : 'Not verified'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          {(!emailVerified || !phoneVerified) && (
            <>
              <div className="flex border-b border-gray-200 mb-6">
                {!emailVerified && (
                  <button
                    onClick={() => setActiveTab('email')}
                    className={`flex-1 py-3 text-sm font-medium font-lato transition-colors relative ${
                      activeTab === 'email' 
                        ? 'text-orange-500' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </span>
                    {activeTab === 'email' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                )}
                {!phoneVerified && (
                  <button
                    onClick={() => setActiveTab('phone')}
                    className={`flex-1 py-3 text-sm font-medium font-lato transition-colors relative ${
                      activeTab === 'phone' 
                        ? 'text-orange-500' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </span>
                    {activeTab === 'phone' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                )}
              </div>

              {/* Email Verification */}
              {activeTab === 'email' && !emailVerified && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 font-lato">
                      We'll send a verification code to:
                    </p>
                    <p className="text-sm font-medium text-[#121E3C] mt-1">{user?.email}</p>
                  </div>

                  {!emailSent ? (
                    <Button
                      onClick={handleSendEmailCode}
                      disabled={isLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                    >
                      {isLoading ? 'Sending...' : 'Send Verification Code'}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
                          Enter 6-digit code
                        </label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                          className="h-12 text-center text-xl tracking-widest font-mono"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyEmail}
                        disabled={isLoading || emailCode.length !== 6}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                      >
                        {isLoading ? 'Verifying...' : 'Verify Email'}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                      <button
                        onClick={handleSendEmailCode}
                        disabled={countdown > 0 || isLoading}
                        className="w-full text-sm text-gray-500 hover:text-orange-500 disabled:opacity-50"
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Phone Verification */}
              {activeTab === 'phone' && !phoneVerified && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 font-lato">
                      We'll send a verification code to:
                    </p>
                    <p className="text-sm font-medium text-[#121E3C] mt-1">{user?.phone}</p>
                  </div>

                  {!phoneSent ? (
                    <Button
                      onClick={handleSendPhoneCode}
                      disabled={isLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                    >
                      {isLoading ? 'Sending...' : 'Send SMS Code'}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium font-lato mb-2 text-[#121E3C]">
                          Enter 6-digit code
                        </label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                          className="h-12 text-center text-xl tracking-widest font-mono"
                        />
                      </div>
                      <Button
                        onClick={handleVerifyPhone}
                        disabled={isLoading || phoneCode.length !== 6}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3"
                      >
                        {isLoading ? 'Verifying...' : 'Verify Phone'}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                      <button
                        onClick={handleSendPhoneCode}
                        disabled={countdown > 0 || isLoading}
                        className="w-full text-sm text-gray-500 hover:text-orange-500 disabled:opacity-50"
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* All verified message */}
          {emailVerified && phoneVerified && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-[#121E3C] font-montserrat mb-2">
                All Verified!
              </h3>
              <p className="text-sm text-gray-500 font-lato">
                Your email and phone are both verified.
              </p>
              <Button
                onClick={onClose}
                className="mt-4 bg-green-500 hover:bg-green-600 text-white"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-lato text-center">
            Verified accounts are trusted by homeowners and receive more job inquiries
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyContactModal;
