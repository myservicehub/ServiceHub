import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Wallet,
  CreditCard,
  FileText,
  Mail,
  Phone
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { walletAPI } from '../../api/wallet';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/services';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../ui/input-otp';

const PaymentPage = ({ formData, onBack, onRegistrationComplete }) => {
  const [bankDetails, setBankDetails] = useState(null);
  const [amount, setAmount] = useState(''); // Start empty; user enters preferred amount
  const [proofFile, setProofFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBankDetails, setLoadingBankDetails] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState('payment'); // 'payment' or 'proof'

  // Post-registration verification state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [registeredFullName, setRegisteredFullName] = useState('');
  
  const { toast } = useToast();
  const { registerTradesperson, updateUser, getCurrentUser, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Load bank details on component mount
  useEffect(() => {
    const loadBankDetails = async () => {
      try {
        const details = await walletAPI.getBankDetails();
        setBankDetails(details);
      } catch (error) {
        console.error('Failed to load bank details:', error);
        toast({
          title: "Error Loading Payment Details",
          description: "Failed to load bank account details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingBankDetails(false);
      }
    };

    loadBankDetails();
  }, [toast]);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (JPEG, PNG, WebP).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setProofFile(file);
    }
  };

  // Copy account details to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Account details copied to clipboard.",
    });
  };

  // Nigerian phone helpers (consistent with TradespersonRegistration)
  const validateNigerianPhone = (phone) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) return true;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) return true;
    if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) && cleanPhone.length === 10) return true;
    return false;
  };

  const formatNigerianPhone = (phone) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) return `+${cleanPhone}`;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) return `+234${cleanPhone.substring(1)}`;
    if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) && cleanPhone.length === 10) return `+234${cleanPhone}`;
    return phone;
  };

  // Enforce verification before redirecting
  useEffect(() => {
    if (emailVerified && phoneVerified) {
      setShowVerificationModal(false);
      const fullName = registeredFullName || `${formData.firstName} ${formData.lastName}`;
      navigate('/browse-jobs', {
        state: {
          welcomeMessage: `Welcome to ServiceHub, ${fullName}! Your account has been created successfully.`,
          walletFunded: true,
          fundingAmount: amount
        }
      });
    }
  }, [emailVerified, phoneVerified, registeredFullName, amount, formData.firstName, formData.lastName, navigate]);

  // Handle registration completion with wallet funding
  const handleCompleteRegistration = async () => {
    if (!proofFile) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload your payment proof before completing registration.",
        variant: "destructive",
      });
      return;
    }

    // Validate amount input (must be a number and at least ₦100)
    if (!amount || isNaN(Number(amount)) || Number(amount) < 100) {
      toast({
        title: "Enter a valid amount",
        description: "Please enter an amount of at least ₦100.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, complete the registration
      const fullName = `${formData.firstName} ${formData.lastName}`;
      setRegisteredFullName(fullName);
      
      // Ensure description meets backend minimum length (>= 50 chars)
      const rawDescription = (formData.profileDescription || '').trim();
      const description = rawDescription.length >= 50
        ? rawDescription
        : `Professional ${formData.selectedTrades?.[0] || 'Trades'} services. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services across ${formData.state || 'your area'}.`;

      // Map experience years from string to number
      const experienceMapping = {
        '0-1': 1,
        '1-3': 2,
        '3-5': 4,
        '5-10': 7,
        '10+': 15
      };

      const registrationResult = await registerTradesperson({
        name: fullName,
        email: formData.email,
        password: formData.password,
        phone: formatNigerianPhone(formData.phone),
        location: formData.state,
        postcode: formData.postcode || '000000',
        trade_categories: formData.selectedTrades,
        experience_years: experienceMapping[formData.experienceYears] || 1,
        company_name: formData.tradingName,
        description: description,
        certifications: formData.certifications || []
      });

      if (registrationResult.success) {
        // Now submit the wallet funding proof
        try {
          await walletAPI.fundWallet(parseFloat(amount), proofFile);
          
          toast({
            title: "Registration & Payment Successful!",
            description: `Welcome to ServiceHub, ${fullName}! Your account has been created and payment proof submitted. You'll be notified once your payment is verified.`,
          });

          // Trigger verification modal and send OTPs
          try {
            if (formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
              await authAPI.sendEmailOTP(formData.email);
              toast({ title: 'Email verification code sent', description: 'Check your inbox to verify your email.' });
            }
          } catch (emailErr) {
            console.warn('Failed to send email OTP:', emailErr?.response?.data || emailErr?.message || emailErr);
          }
          try {
            if (formData.phone && validateNigerianPhone(formData.phone)) {
              const formattedPhone = formatNigerianPhone(formData.phone);
              await authAPI.sendPhoneOTP(formattedPhone);
              toast({ title: 'SMS verification code sent', description: 'Check your phone to verify your number.' });
            }
          } catch (phoneErr) {
            console.warn('Failed to send phone OTP:', phoneErr?.response?.data || phoneErr?.message || phoneErr);
          }

          setShowVerificationModal(true);

          // Also call the completion handler to close modal
          if (onRegistrationComplete) {
            onRegistrationComplete({
              ...registrationResult,
              walletFunded: true,
              fundingAmount: amount
            });
          }
        } catch (walletError) {
          console.error('Wallet funding error:', walletError);
          // Registration succeeded but wallet funding failed
          toast({
            title: "Registration Successful, Payment Pending",
            description: `Your account has been created successfully! However, there was an issue submitting your payment proof. Please try uploading it again from your wallet page.`,
            variant: "warning",
          });

          // Send OTPs and show verification modal even if wallet funding failed
          try {
            if (formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
              await authAPI.sendEmailOTP(formData.email);
              toast({ title: 'Email verification code sent', description: 'Check your inbox to verify your email.' });
            }
          } catch (emailErr) {
            console.warn('Failed to send email OTP:', emailErr?.response?.data || emailErr?.message || emailErr);
          }
          try {
            if (formData.phone && validateNigerianPhone(formData.phone)) {
              const formattedPhone = formatNigerianPhone(formData.phone);
              await authAPI.sendPhoneOTP(formattedPhone);
              toast({ title: 'SMS verification code sent', description: 'Check your phone to verify your number.' });
            }
          } catch (phoneErr) {
            console.warn('Failed to send phone OTP:', phoneErr?.response?.data || phoneErr?.message || phoneErr);
          }

          setShowVerificationModal(true);

          if (onRegistrationComplete) {
            onRegistrationComplete({
              ...registrationResult,
              walletFunded: false,
              walletError: walletError.message
            });
          }
        }
      } else {
        const errorMessage = typeof registrationResult.error === 'string' 
          ? registrationResult.error 
          : registrationResult.error?.message || registrationResult.error?.msg || 'Registration failed. Please check your information and try again.';
        
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Registration failed. Please try again.';
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingBankDetails) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Post-registration verification modal */}
      <Dialog
        open={showVerificationModal}
        onOpenChange={(open) => {
          if (open) {
            setShowVerificationModal(true);
          } else if (emailVerified && phoneVerified) {
            setShowVerificationModal(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Verify your contact details</DialogTitle>
            <DialogDescription>
              We sent codes to your email and phone. Please verify both to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail className="h-4 w-4" />
                <span>{formData.email || 'No email provided'}</span>
                {emailVerified && (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={emailSending || !formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
                  onClick={async () => {
                    try {
                      setEmailSending(true);
                      await authAPI.sendEmailOTP(formData.email);
                      toast({ title: 'Email code sent', description: 'Check your inbox for the OTP code.' });
                    } catch (err) {
                      toast({ title: 'Failed to send email code', description: err?.response?.data?.detail || err?.message || 'Please try again.', variant: 'destructive' });
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                >
                  {emailSending ? 'Sending…' : 'Resend code'}
                </Button>
                <InputOTP maxLength={6} value={emailOtpCode} onChange={(val) => setEmailOtpCode(val)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={emailVerifying || !emailOtpCode || !formData.email}
                  onClick={async () => {
                    try {
                      setEmailVerifying(true);
                      await authAPI.verifyEmailOTP(emailOtpCode, formData.email);
                      setEmailVerified(true);
                      // Immediately reflect verification in auth context
                      try {
                        if (updateUser) {
                          updateUser({ ...(user || {}), email_verified: true });
                        }
                        if (typeof getCurrentUser === 'function') {
                          await getCurrentUser();
                        }
                      } catch (ctxErr) {
                        console.warn('Failed to refresh user after email verification:', ctxErr);
                      }
                      toast({ title: 'Email verified', description: 'Your email was verified successfully.' });
                    } catch (err) {
                      setEmailVerified(false);
                      toast({ title: 'Verification failed', description: err?.response?.data?.detail || err?.message || 'Invalid code. Please try again.', variant: 'destructive' });
                    } finally {
                      setEmailVerifying(false);
                    }
                  }}
                >
                  {emailVerifying ? 'Verifying…' : 'Verify'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="h-4 w-4" />
                <span>{formData.phone ? formatNigerianPhone(formData.phone) : 'No phone provided'}</span>
                {phoneVerified && (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" /> Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={phoneSending || !formData.phone || !validateNigerianPhone(formData.phone)}
                  onClick={async () => {
                    try {
                      setPhoneSending(true);
                      const formatted = formatNigerianPhone(formData.phone);
                      await authAPI.sendPhoneOTP(formatted);
                      toast({ title: 'SMS code sent', description: 'Check your phone for the OTP code.' });
                    } catch (err) {
                      toast({ title: 'Failed to send SMS code', description: err?.response?.data?.detail || err?.message || 'Please try again.', variant: 'destructive' });
                    } finally {
                      setPhoneSending(false);
                    }
                  }}
                >
                  {phoneSending ? 'Sending…' : 'Resend code'}
                </Button>
                <InputOTP maxLength={6} value={phoneOtpCode} onChange={(val) => setPhoneOtpCode(val)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={phoneVerifying || !phoneOtpCode || !formData.phone}
                  onClick={async () => {
                    try {
                      setPhoneVerifying(true);
                      const formatted = formatNigerianPhone(formData.phone);
                      await authAPI.verifyPhoneOTP(phoneOtpCode, formatted);
                      setPhoneVerified(true);
                      // Immediately reflect verification in auth context
                      try {
                        if (updateUser) {
                          updateUser({ ...(user || {}), phone_verified: true });
                        }
                        if (typeof getCurrentUser === 'function') {
                          await getCurrentUser();
                        }
                      } catch (ctxErr) {
                        console.warn('Failed to refresh user after phone verification:', ctxErr);
                      }
                      toast({ title: 'Phone verified', description: 'Your phone number was verified successfully.' });
                    } catch (err) {
                      setPhoneVerified(false);
                      toast({ title: 'Verification failed', description: err?.response?.data?.detail || err?.message || 'Invalid code. Please try again.', variant: 'destructive' });
                    } finally {
                      setPhoneVerifying(false);
                    }
                  }}
                >
                  {phoneVerifying ? 'Verifying…' : 'Verify'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={16} />
          <span>Back to Registration</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Instructions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-6 w-6 text-green-600" />
                <span>Fund Your Wallet</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">How to Fund Your Wallet:</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                  <li>Transfer money to the account details below</li>
                  <li>Upload a screenshot/photo of your payment confirmation</li>
                  <li>Click "Complete Registration" to finish</li>
                  <li>Your account will be activated once payment is verified</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Fund (₦)
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="100"
                  step="100"
                  className="text-lg font-semibold"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum: ₦100 (1 coin = ₦100)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          {bankDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-6 w-6 text-green-600" />
                  <span>Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Account Name</p>
                      <p className="font-semibold">{bankDetails.account_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.account_name)}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Account Number</p>
                      <p className="font-semibold text-lg">{bankDetails.account_number}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.account_number)}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Bank Name</p>
                      <p className="font-semibold">{bankDetails.bank_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(bankDetails.bank_name)}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Important:</p>
                      <p>Make sure to transfer exactly ₦{amount} and upload clear proof of payment.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Proof Upload */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-green-600" />
                <span>Upload Payment Proof</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="proof-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="proof-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {proofFile ? 'Change Payment Proof' : 'Upload Payment Proof'}
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, WebP up to 5MB
                    </p>
                  </div>
                </label>
              </div>

              {proofFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">File Uploaded Successfully</p>
                      <p className="text-sm text-green-700">{proofFile.name}</p>
                      <p className="text-xs text-green-600">
                        Size: {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">What to Upload:</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                  <li>Bank transfer receipt/screenshot</li>
                  <li>Mobile money confirmation message</li>
                  <li>ATM receipt with transaction details</li>
                  <li>Any proof showing successful payment</li>
                </ul>
              </div>

              <Button
                onClick={handleCompleteRegistration}
                disabled={isLoading || !proofFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Completing Registration...</span>
                  </div>
                ) : (
                  'Complete Registration'
                )}
              </Button>

              {!proofFile && (
                <p className="text-sm text-gray-500 text-center">
                  Please upload your payment proof to complete registration
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;