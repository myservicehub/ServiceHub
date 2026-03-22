import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, AlertCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { walletAPI } from '../../api/wallet';
import { useAuth } from '../../contexts/AuthContext';

const PaymentPage = ({ formData, onBack, onRegistrationComplete }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { toast } = useToast();
  const { registerTradesperson } = useAuth();

  const formatNigerianPhone = (phone) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) return `+${cleanPhone}`;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) return `+234${cleanPhone.substring(1)}`;
    if ((cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9')) && cleanPhone.length === 10) return `+234${cleanPhone}`;
    return phone;
  };

  const handleCompleteRegistration = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 100) {
      toast({
        title: 'Enter a valid amount',
        description: 'Please enter an amount of at least ₦100.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSubmitError('');
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;
      const rawDescription = (formData.profileDescription || '').trim();
      const description = rawDescription.length >= 50
        ? rawDescription
        : `Professional ${formData.selectedTrades?.[0] || 'Trades'} services. Experienced tradesperson committed to quality work and customer satisfaction. Contact me for reliable and affordable services across ${formData.state || 'your area'}.`;
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
        description,
        certifications: formData.certifications || []
      });

      if (!registrationResult.success) {
        const errorMessage = typeof registrationResult.error === 'string'
          ? registrationResult.error
          : registrationResult.error?.message || registrationResult.error?.msg || 'Registration failed. Please check your information and try again.';
        setSubmitError(errorMessage);
        toast({
          title: 'Registration Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (onRegistrationComplete) {
        onRegistrationComplete({
          ...registrationResult,
          walletFunded: false,
          paymentStarted: true,
        });
      }

      const init = await walletAPI.initializePaystackFunding(parseInt(amount, 10), '/trades/wallet');
      if (!init?.authorization_url) {
        throw new Error('Payment link not available');
      }
      window.location.href = init.authorization_url;
    } catch (error) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Unable to continue with Paystack at the moment.';
      setSubmitError(errorMessage);
      toast({
        title: 'Payment Initialization Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 h-full overflow-y-auto overscroll-contain">
      {submitError && (
        <div className="mb-4 flex items-start rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mr-2 h-4 w-4" />
          <div className="flex-1">
            <p>{submitError}</p>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (typeof onBack === 'function') onBack();
                }}
              >
                Back to Registration to fix details
              </Button>
            </div>
          </div>
        </div>
      )}
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
                <h4 className="font-medium text-blue-800 mb-2">How this works:</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal ml-4">
                  <li>Enter the amount you want to fund</li>
                  <li>Click complete registration to continue to Paystack</li>
                  <li>Pay securely and return automatically</li>
                  <li>Your wallet gets credited immediately after verification</li>
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <span>Secure Checkout</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                You will be redirected to Paystack to complete your wallet funding securely.
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Accepted by Paystack:</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                  <li>Debit and credit cards</li>
                  <li>Bank transfer and bank channels</li>
                  <li>USSD and supported payment methods</li>
                </ul>
              </div>
              <Button
                onClick={handleCompleteRegistration}
                disabled={isLoading || !amount || isNaN(Number(amount)) || Number(amount) < 100}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
              >
                {isLoading ? 'Initializing Paystack...' : 'Complete Registration'}
              </Button>
              <p className="text-sm text-gray-500 text-center">
                You’ll be redirected to Paystack to complete payment
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
