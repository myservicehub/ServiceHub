import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import WalletBalance from '../components/wallet/WalletBalance';
import FundWalletModal from '../components/wallet/FundWalletModal';
import WalletTransactions from '../components/wallet/WalletTransactions';

const WalletPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showFundModal, setShowFundModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isAuthenticated()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access your wallet</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const handleFundSuccess = () => {
    setRefreshTrigger(Date.now());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C]">My Wallet</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your wallet balance and fund your account to access job contact details
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet Balance */}
          <WalletBalance 
            refreshToken={refreshTrigger}
            onFundClick={() => setShowFundModal(true)}
          />

          {/* How It Works */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-[#121E3C] mb-4">How It Works</h3>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Fund Your Wallet', desc: 'Transfer money to ServiceHub account and upload payment proof' },
                { step: '2', title: 'Admin Confirmation', desc: 'Admin verifies your payment and adds coins to your wallet (1 coin = ₦100)' },
                { step: '3', title: 'Access Contact Details', desc: 'Use coins to pay access fees when homeowners share contact details' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#34D164] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[#121E3C]">{item.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <WalletTransactions refreshToken={refreshTrigger} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[#121E3C] mb-4">Quick Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Coin Value', value: '1 coin = ₦100' },
                { label: 'Min. Funding', value: '₦100' },
                { label: 'Typical Access Fee', value: '5-100 coins' },
                { label: 'Processing Time', value: 'Within 24hrs' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="font-medium text-[#121E3C]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-[#121E3C] rounded-2xl p-5 text-white">
            <h3 className="text-sm font-semibold mb-2">Need Help?</h3>
            <p className="text-xs text-white/60 mb-4">
              Having trouble with wallet funding or transactions?
            </p>
            <button
              onClick={() => navigate('/help')}
              className="w-full bg-[#34D164] hover:bg-[#2FBD59] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              aria-label="Contact Support"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        onSuccess={handleFundSuccess}
      />

    </div>
  );
};

export default WalletPage;