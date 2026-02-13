import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { referralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Copy, Share2, Users, Gift, CheckCircle, Clock, XCircle } from 'lucide-react';

const ReferralsPage = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated()) {
      fetchReferralData();
    }
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [statsData, referralsData] = await Promise.all([
        referralsAPI.getMyStats(),
        referralsAPI.getMyReferrals(0, 10)
      ]);
      
      setStats(statsData);
      setReferrals(referralsData.referrals || []);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      toast({
        title: "Error",
        description: "Failed to load referral information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (stats?.referral_link) {
      try {
        await navigator.clipboard.writeText(stats.referral_link);
        toast({
          title: "Link Copied!",
          description: "Referral link has been copied to clipboard"
        });
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = stats.referral_link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        toast({
          title: "Link Copied!",
          description: "Referral link has been copied to clipboard"
        });
      }
    }
  };

  const shareToWhatsApp = () => {
    const message = `Join ServiceHub Nigeria - the best platform to find trusted tradespeople! Use my referral link: ${stats.referral_link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(stats.referral_link)}`;
    window.open(facebookUrl, '_blank');
  };

  const shareToTwitter = () => {
    const message = `Check out ServiceHub Nigeria - connecting homeowners with trusted tradespeople! ${stats.referral_link}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(twitterUrl, '_blank');
  };

  const getStatusBadge = (status, isVerified) => {
    if (status === 'verified' || isVerified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Verified
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          Pending
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to access your referral dashboard</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Referral Dashboard</h1>
            <p className="text-gray-600">
              Earn rewards when your referrals verify: 5 coins for homeowners, 10 coins for tradespeople after business verification
            </p>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Referral Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                        <p className="text-2xl font-bold text-blue-600">{stats?.total_referrals || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Verified Referrals</p>
                        <p className="text-2xl font-bold text-green-600">{stats?.verified_referrals || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                      <Gift className="h-8 w-8 text-yellow-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Coins Earned</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats?.total_coins_earned || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Referral Code</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-green-600 font-mono">{stats?.referral_code}</p>
                        <p className="text-sm text-gray-600 mt-1">Share this code with friends</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={copyReferralLink}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <Copy size={16} />
                          <span>Copy Link</span>
                        </button>
                        <button
                          onClick={() => setShowShareModal(true)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                        >
                          <Share2 size={16} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Referrals */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Referrals</h3>
                  
                  {referrals.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No referrals yet</p>
                      <p className="text-sm text-gray-500 mt-1">Share your referral code to start earning coins!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Users size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{referral.referred_user_name}</h4>
                              <p className="text-sm text-gray-600">
                                {referral.referred_user_role} • Joined {formatDate(referral.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(referral.status, referral.is_verified)}
                            {referral.coins_earned > 0 && (
                              <p className="text-sm text-green-600 mt-1">
                                +{referral.coins_earned} coins earned
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* How It Works */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">1</div>
                      <div>
                        <h4 className="font-medium text-gray-800">Share Your Code</h4>
                        <p className="text-sm text-gray-600">Send your referral code to friends and family</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">2</div>
                      <div>
                        <h4 className="font-medium text-gray-800">They Sign Up</h4>
                        <p className="text-sm text-gray-600">Friends create account using your referral code</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 text-blue-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">3</div>
                      <div>
                        <h4 className="font-medium text-gray-800">They Verify</h4>
                        <p className="text-sm text-gray-600">Friends upload ID for account verification</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 text-green-600 rounded-full p-2 text-sm font-bold min-w-[2rem] h-8 flex items-center justify-center">4</div>
                      <div>
                        <h4 className="font-medium text-gray-800">You Earn Coins</h4>
                        <p className="text-sm text-gray-600">Earn 5 coins when homeowners verify identity; earn 10 coins when tradespeople complete business verification</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Earn Rewards</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>5 coins</strong> per verified homeowner referral</p>
                    <p><strong>10 coins</strong> per verified tradesperson referral (business verification)</p>
                    <p><strong>Withdraw</strong> with minimum 5 coins</p>
                    <p><strong>No limit</strong> on referrals</p>
                  </div>
                </div>

                {/* Verify Account CTA */}
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Verify Your Account</h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    Verify your identity to build trust and unlock all features
                  </p>
                  <button
                    onClick={() => window.location.href = '/verify-account'}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Upload ID Documents
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Share Your Referral</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Your referral link:</p>
                <p className="text-sm font-mono bg-white p-2 rounded border break-all">
                  {stats?.referral_link}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={shareToWhatsApp}
                  className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center"
                >
                  <div className="font-semibold">WhatsApp</div>
                </button>
                
                <button
                  onClick={shareToFacebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center"
                >
                  <div className="font-semibold">Facebook</div>
                </button>
                
                <button
                  onClick={shareToTwitter}
                  className="bg-blue-400 hover:bg-blue-500 text-white p-4 rounded-lg text-center"
                >
                  <div className="font-semibold">Twitter</div>
                </button>
              </div>

              <button
                onClick={copyReferralLink}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <Copy size={16} />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ReferralsPage;
