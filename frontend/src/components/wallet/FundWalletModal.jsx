import React, { useState, useEffect } from 'react';
import { walletAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';

const FundWalletModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount_naira: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({ amount_naira: '' });
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount_naira) {
      toast({
        title: "Missing Information",
        description: "Please enter an amount",
        variant: "destructive"
      });
      return;
    }

    if (parseInt(formData.amount_naira) < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum funding amount is ₦100",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const redirectPath = window.location.pathname || '/trades/wallet';
      const init = await walletAPI.initializePaystackFunding(parseInt(formData.amount_naira), redirectPath);
      if (!init?.authorization_url) {
        throw new Error('Payment link not available');
      }
      window.location.href = init.authorization_url;
      
    } catch (error) {
      console.error('Failed to initialize funding payment:', error);
      toast({
        title: "Unable to Continue",
        description: error.response?.data?.detail || "Failed to initialize Paystack payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const calculateCoins = (naira) => Math.floor(naira / 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full my-auto shadow-xl">
        <div className="p-5 sm:p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-[#121E3C] font-montserrat">Fund Wallet</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 font-lato">
                Amount to Fund (₦)
              </label>
              <input
                type="number"
                name="amount_naira"
                value={formData.amount_naira}
                onChange={handleInputChange}
                min="100"
                step="100"
                placeholder="Enter amount (min. ₦100)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164] focus:border-[#34D164] text-sm font-lato"
                required
              />
              {formData.amount_naira && (
                <p className="text-xs text-[#34D164] mt-1.5 font-medium font-lato">
                  = {calculateCoins(parseInt(formData.amount_naira) || 0)} coins
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
              <h4 className="text-xs font-medium text-amber-700 mb-1.5 font-montserrat">Instructions:</h4>
              <ol className="text-[10px] sm:text-xs text-amber-600 space-y-1 font-lato">
                <li>1. Enter amount and continue to Paystack</li>
                <li>2. Complete payment securely on Paystack</li>
                <li>3. Return to wallet and your coins are added automatically</li>
                <li>4. Keep your payment reference for support</li>
              </ol>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium font-lato"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.amount_naira}
                className="flex-1 px-4 py-2.5 bg-[#34D164] hover:bg-[#2FBD59] disabled:bg-gray-300 text-white rounded-xl transition-colors text-sm font-medium shadow-md shadow-[#34D164]/20 font-lato"
              >
                {loading ? 'Initializing...' : 'Continue to Paystack'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FundWalletModal;
