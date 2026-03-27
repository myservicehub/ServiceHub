import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, CheckCircle, Send, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { authAPI } from '../../api/services';

const VerifyContactModal = ({ isOpen, onClose, onComplete }) => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  
  const [localEmailVerified, setLocalEmailVerified] = useState(false);
  const [localPhoneVerified, setLocalPhoneVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('email');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // Sync local state with user data
  useEffect(() => {
    if (isOpen) {
      setLocalEmailVerified(user?.email_verified || false);
      setLocalPhoneVerified(user?.phone_verified || false);
      // Start on first unverified tab
      if (!user?.email_verified) setActiveTab('email');
      else if (!user?.phone_verified) setActiveTab('phone');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = setInterval(() => setEmailCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [emailCountdown]);

  useEffect(() => {
    if (phoneCountdown <= 0) return;
    const timer = setInterval(() => setPhoneCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [phoneCountdown]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const handleSendEmailCode = async () => {
    setIsLoading(true);
    try {
      const resp = await authAPI.sendEmailOTP(user?.email);
      setEmailSent(true);
      setEmailCountdown(600);
      if (resp?.debug_code) {
        setEmailCode(resp.debug_code);
        toast({ title: "Code sent", description: `Dev: ${resp.debug_code}` });
      } else {
        toast({ title: "Code sent", description: `Check ${user?.email}` });
      }
    } catch (error) {
      toast({ title: "Failed", description: error.response?.data?.detail || "Try again", variant: "destructive" });
      setEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    setIsLoading(true);
    try {
      const resp = await authAPI.sendPhoneOTP(user?.phone);
      setPhoneSent(true);
      setPhoneCountdown(600);
      if (resp?.debug_code) {
        setPhoneCode(resp.debug_code);
        toast({ title: "Code sent", description: `Dev: ${resp.debug_code}` });
      } else {
        toast({ title: "Code sent", description: `Check ${user?.phone}` });
      }
    } catch (error) {
      toast({ title: "Failed", description: error.response?.data?.detail || "Try again", variant: "destructive" });
      setPhoneSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (emailCode.length !== 6) {
      toast({ title: "Invalid code", description: "Enter 6 digits", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.verifyEmailOTP(emailCode, user?.email);
      setLocalEmailVerified(true);
      setEmailCode('');
      setEmailSent(false);
      toast({ title: "Email verified ✓" });
      if (refreshUser) refreshUser();
      // Auto-switch to phone if not verified
      if (!localPhoneVerified) {
        setActiveTab('phone');
      }
    } catch (error) {
      toast({ title: "Failed", description: error.response?.data?.detail || "Invalid code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (phoneCode.length !== 6) {
      toast({ title: "Invalid code", description: "Enter 6 digits", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.verifyPhoneOTP(phoneCode, user?.phone);
      setLocalPhoneVerified(true);
      setPhoneCode('');
      setPhoneSent(false);
      toast({ title: "Phone verified ✓" });
      if (refreshUser) refreshUser();
    } catch (error) {
      toast({ title: "Failed", description: error.response?.data?.detail || "Invalid code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const bothVerified = localEmailVerified && localPhoneVerified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Verify Contact</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-3 mb-5">
            <div className={`flex-1 p-3 rounded-lg border ${localEmailVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {localEmailVerified ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Mail className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-medium">{localEmailVerified ? 'Email ✓' : 'Email'}</span>
              </div>
            </div>
            <div className={`flex-1 p-3 rounded-lg border ${localPhoneVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {localPhoneVerified ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Phone className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-medium">{localPhoneVerified ? 'Phone ✓' : 'Phone'}</span>
              </div>
            </div>
          </div>

          {bothVerified ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">All Verified</h3>
              <p className="text-sm text-gray-500 mb-4">Your contact details are verified.</p>
              <Button onClick={handleComplete} className="bg-green-500 hover:bg-green-600 text-white">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <>
              {(!localEmailVerified || !localPhoneVerified) && (
                <div className="flex mb-4 border-b">
                  {!localEmailVerified && (
                    <button
                      onClick={() => setActiveTab('email')}
                      className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'email' ? 'border-[#121E3C] text-[#121E3C]' : 'border-transparent text-gray-500'}`}
                    >
                      Email
                    </button>
                  )}
                  {!localPhoneVerified && (
                    <button
                      onClick={() => setActiveTab('phone')}
                      className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'phone' ? 'border-[#121E3C] text-[#121E3C]' : 'border-transparent text-gray-500'}`}
                    >
                      Phone
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'email' && !localEmailVerified && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Send code to <strong>{user?.email}</strong></p>
                  {!emailSent ? (
                    <Button onClick={handleSendEmailCode} disabled={isLoading} className="w-full bg-[#121E3C] hover:bg-[#0d1629]">
                      {isLoading ? 'Sending...' : 'Send Code'} <Send className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                        className="h-11 text-center text-lg tracking-widest font-mono"
                      />
                      <Button onClick={handleVerifyEmail} disabled={isLoading || emailCode.length !== 6} className="w-full bg-[#121E3C] hover:bg-[#0d1629]">
                        {isLoading ? 'Verifying...' : 'Verify'} <CheckCircle className="w-4 h-4 ml-1" />
                      </Button>
                      <button onClick={handleSendEmailCode} disabled={emailCountdown > 0 || isLoading} className="w-full text-sm text-gray-500 hover:text-[#121E3C] disabled:opacity-50">
                        {emailCountdown > 0 ? `Resend in ${formatCountdown(emailCountdown)}` : 'Resend code'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'phone' && !localPhoneVerified && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Send code to <strong>{user?.phone}</strong></p>
                  {!phoneSent ? (
                    <Button onClick={handleSendPhoneCode} disabled={isLoading} className="w-full bg-[#121E3C] hover:bg-[#0d1629]">
                      {isLoading ? 'Sending...' : 'Send SMS'} <Send className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <>
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                        className="h-11 text-center text-lg tracking-widest font-mono"
                      />
                      <Button onClick={handleVerifyPhone} disabled={isLoading || phoneCode.length !== 6} className="w-full bg-[#121E3C] hover:bg-[#0d1629]">
                        {isLoading ? 'Verifying...' : 'Verify'} <CheckCircle className="w-4 h-4 ml-1" />
                      </Button>
                      <button onClick={handleSendPhoneCode} disabled={phoneCountdown > 0 || isLoading} className="w-full text-sm text-gray-500 hover:text-[#121E3C] disabled:opacity-50">
                        {phoneCountdown > 0 ? `Resend in ${formatCountdown(phoneCountdown)}` : 'Resend code'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyContactModal;
