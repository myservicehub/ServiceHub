import React, { useState, useEffect } from 'react';
import { walletAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';

const WalletBalance = ({ showFundButton = true, onFundClick }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const data = await walletAPI.getBalance();
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
    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Wallet Balance</h3>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-green-600">
              ₦{balance?.balance_naira?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-600">
              {balance?.balance_coins || 0} coins (1 coin = ₦100)
            </p>
          </div>
        </div>
        
        {showFundButton && (
          <div className="text-right">
            <button
              onClick={onFundClick || (() => {})}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Fund Wallet
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Any amount
            </p>
          </div>
        )}
      </div>
      
      {balance?.balance_coins < 5 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Low balance: You may need more coins to access some job contact details.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletBalance;