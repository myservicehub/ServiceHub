import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WalletBalance from '../components/wallet/WalletBalance';
import FundWalletModal from '../components/wallet/FundWalletModal';
import WalletTransactions from '../components/wallet/WalletTransactions';
import Header from '../components/Header';
import Footer from '../components/Footer';

const WalletPage = () => {
  const { isAuthenticated } = useAuth();
  const [showFundModal, setShowFundModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  const handleFundSuccess = () => {
    setRefreshTrigger(Date.now());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Wallet</h1>
            <p className="text-gray-600">
              Manage your wallet balance and fund your account to access job contact details
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Wallet Balance */}
              <WalletBalance 
                key={refreshTrigger}
                onFundClick={() => setShowFundModal(true)}
              />

              {/* How It Works */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">1</div>
                    <div>
                      <h4 className="font-medium text-gray-800">Fund Your Wallet</h4>
                      <p className="text-sm text-gray-600">Transfer money to ServiceHub account and upload payment proof</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">2</div>
                    <div>
                      <h4 className="font-medium text-gray-800">Admin Confirmation</h4>
                      <p className="text-sm text-gray-600">Admin verifies your payment and adds coins to your wallet (1 coin = ₦100)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">3</div>
                    <div>
                      <h4 className="font-medium text-gray-800">Access Contact Details</h4>
                      <p className="text-sm text-gray-600">Use coins to pay access fees when homeowners share contact details</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <WalletTransactions key={refreshTrigger} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coin Value</span>
                    <span className="font-medium">1 coin = ₦100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min. Funding</span>
                    <span className="font-medium">₦1,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Typical Access Fee</span>
                    <span className="font-medium">15-50 coins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Time</span>
                    <span className="font-medium">Within 24hrs</span>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Having trouble with wallet funding or transactions?
                </p>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        onSuccess={handleFundSuccess}
      />

      <Footer />
    </div>
  );
};

export default WalletPage;