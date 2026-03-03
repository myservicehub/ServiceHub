import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { referralsAPI } from '../api/referrals';
import { useToast } from '../hooks/use-toast';
import { Copy, Share2, Users, Gift, CheckCircle, Clock, XCircle } from 'lucide-react';

const ReferralsPage = () => {
  const { isAuthenticated, isHomeowner, isTradesperson, user } = useAuth();
  const location = useLocation();
  const isInDashboard = location.pathname.startsWith('/trades') || location.pathname.startsWith('/dashboard');
  
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated()) {
      fetchReferralData();
    }
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData] = await Promise.all([
        referralsAPI.getMyStats(),
        referralsAPI.getHistory(0, 10)
      ]);
      
      setStats(statsData);
      setHistory(historyData.history || []);
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

  const handleConvertPoints = async () => {
    try {
      setConverting(true);
      const result = await referralsAPI.convertRewards();
      
      if (result.success) {
        toast({
          title: "Points Converted!",
          description: `Successfully converted ${result.converted_points} points to ${result.converted_coins} coins.`,
        });
        // Refresh stats
        fetchReferralData();
      } else {
        toast({
          title: "Conversion Failed",
          description: result.error || "Could not convert points",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Error",
        description: "Failed to process conversion",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
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
      <div>
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
      </div>
    );
  }

  return (
    <div className={isInDashboard ? "space-y-6" : "space-y-6 container mx-auto px-4 py-8"}>
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#121E3C]">Referrals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Earn rewards when you refer friends and family
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="h-10 w-10 bg-gray-100 rounded-xl mb-3"></div>
              <div className="h-8 bg-gray-100 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Referral Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#121E3C] overflow-hidden">
              <div className="p-2 bg-[#121E3C]/10 rounded-xl w-fit mb-3">
                <Users className="h-5 w-5 text-[#121E3C]" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats?.total_referrals || 0}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Referrals</p>
            </div>

            <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#34D164] overflow-hidden">
              <div className="p-2 bg-[#34D164]/10 rounded-xl w-fit mb-3">
                <CheckCircle className="h-5 w-5 text-[#34D164]" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats?.verified_referrals || 0}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Verified</p>
            </div>

            <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-amber-400 overflow-hidden">
              <div className="p-2 bg-amber-50 rounded-xl w-fit mb-3">
                <Gift className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats?.total_coins_earned || 0}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Points</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Referral Code */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <h3 className="text-sm sm:text-base font-semibold text-[#121E3C] mb-4">Your Referral Code</h3>
                <div className="bg-[#F5F5F7] p-3 sm:p-4 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-[#34D164] font-mono truncate">{stats?.referral_code}</p>
                      <p className="text-xs text-gray-400 mt-1">Share this code with friends</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={copyReferralLink}
                        className="bg-[#121E3C] hover:bg-[#121E3C]/90 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        <Copy size={14} />
                        <span>Copy Link</span>
                      </button>
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="bg-[#34D164] hover:bg-[#2FBD59] text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        <Share2 size={14} />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Points History */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-[#121E3C]">Points History</h3>
                </div>
                
                {history.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto bg-[#121E3C]/5 rounded-xl flex items-center justify-center mb-3">
                      <Gift className="h-6 w-6 text-[#121E3C]/40" />
                    </div>
                    <p className="text-sm text-[#121E3C] font-medium">No points earned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Start referring or paying access fees to earn!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {history.map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                            <Gift size={18} className="text-[#34D164]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-[#121E3C]">{txn.description}</h4>
                            <p className="text-xs text-gray-400">
                              {formatDate(txn.processed_at || txn.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#34D164] font-bold">
                            +{txn.amount_coins} points
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* How It Works */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#121E3C] mb-4">How It Works</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Share Your Code', desc: 'Send your referral code to friends and family' },
                    { step: '2', title: 'They Sign Up', desc: 'Friends create account using your referral code' },
                    { step: '3', title: 'They Verify', desc: 'Friends upload ID for account verification' },
                    { step: '4', title: 'You Earn Points', desc: isHomeowner() ? '20 points per verified user + 5 points per job posted' : '20 points per verified user + 5 points per job access fee' },
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

              {/* Rewards Info */}
              <div className="bg-[#121E3C] rounded-2xl p-5 text-white">
                <h3 className="text-sm font-semibold mb-3">Earn Rewards</h3>
                <div className="space-y-2 text-xs text-white/70">
                  <p><span className="text-[#34D164] font-semibold">20 points</span> per verified user</p>
                  {isHomeowner() ? (
                    <p><span className="text-[#34D164] font-semibold">5 points</span> per job posted</p>
                  ) : (
                    <p><span className="text-[#34D164] font-semibold">5 points</span> per job access fee paid</p>
                  )}
                  <p><span className="text-white font-semibold">No limit</span> on referrals</p>
                </div>
                {isTradesperson() && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                     <p className="text-xs text-white/70 mb-3">
                       1 Point = <span className="text-[#34D164]">0.5 Coin</span><br/>
                       Min. conversion: 100 Points
                     </p>
                     
                     {stats?.total_coins_earned >= 100 && (
                       <button
                         onClick={handleConvertPoints}
                         disabled={converting}
                         className="w-full bg-[#34D164] hover:bg-[#2FBD59] disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                       >
                         {converting ? 'Converting...' : 'Convert Points to Coins'}
                       </button>
                     )}
                  </div>
                )}
              </div>

              {/* Verify Account CTA */}
              {!isHomeowner() && !user?.verified_tradesperson && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-[#121E3C] mb-2">Verify Your Account</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Verify your identity to build trust and unlock all features
                  </p>
                  <button
                    onClick={() => window.location.href = '/verify-account'}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Upload ID Documents
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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

    </div>
  );
};

export default ReferralsPage;
