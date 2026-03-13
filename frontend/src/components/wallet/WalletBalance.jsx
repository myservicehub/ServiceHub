import React, { useState, useEffect } from 'react';
import { walletAPI } from '../../api/wallet';
import { referralsAPI } from '../../api/referrals';
import { useToast } from '../../hooks/use-toast';

const WalletBalance = ({ showFundButton = true, onFundClick, refreshToken = 0 }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
  }, [refreshToken]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const data = await referralsAPI.getWalletWithReferrals();
      setBalance(data);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet balance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdrawReferral = async () => {
    try {
      const data = await referralsAPI.withdrawReferralToWallet();
      setBalance(data);
      toast({
        title: "Referral bonus converted",
        description: "Referral rewards moved to your normal wallet balance",
        variant: "default"
      });
    } catch (error) {
      const msg = error?.response?.data?.detail || "Unable to convert referral rewards";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#34D164]/10 via-[#34D164]/5 to-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#121E3C] mb-2 font-montserrat">Wallet Balance</h3>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold text-[#34D164]">
              ₦{balance?.balance_naira?.toLocaleString() || '0'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 font-lato">
              {balance?.balance_coins || 0} coins (1 coin = ₦100)
            </p>
          </div>
        </div>
        
        {showFundButton && (
          <div className="sm:text-right flex-shrink-0">
            <button
              onClick={onFundClick || (() => {})}
              className="w-full sm:w-auto bg-[#34D164] hover:bg-[#2FBD59] text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm shadow-md shadow-[#34D164]/20 font-lato"
            >
              Fund Wallet
            </button>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 font-lato">
              Any amount
            </p>
          </div>
        )}
      </div>
      
      {balance?.balance_coins < 5 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs sm:text-sm text-amber-700 font-lato">
            ⚠️ Low balance: You may need more coins to access some job contact details.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletBalance;
