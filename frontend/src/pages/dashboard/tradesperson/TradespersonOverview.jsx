import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { jobsAPI } from '../../../api/jobs';
import { authAPI } from '../../../api/services';
import { walletAPI } from '../../../api/wallet';
import {
  Search,
  Heart,
  CheckCircle,
  Wallet,
  TrendingUp,
  ArrowRight,
  Star,
  MessageSquare,
  MapPin,
  Clock,
  Briefcase,
  ArrowUpRight,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import ProfileCompletionBanner from '../../../components/dashboard/ProfileCompletionBanner';
import CompleteProfileModal from '../../../components/dashboard/CompleteProfileModal';
import VerifyContactModal from '../../../components/dashboard/VerifyContactModal';
import SkillsAssessmentModal from '../../../components/dashboard/SkillsAssessmentModal';
import BusinessVerificationModal from '../../../components/dashboard/BusinessVerificationModal';
import { getTradespersonCompletionStatus } from '../../../utils/tradespersonCompletion';

const TradespersonOverview = () => {
  const [stats, setStats] = useState({
    activeInterests: 0,
    completedJobs: 0,
    totalEarnings: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [showVerifyContactModal, setShowVerifyContactModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [profileModalInitialStep, setProfileModalInitialStep] = useState(1);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState('not_submitted');
  const [identityVerificationRejectionReason, setIdentityVerificationRejectionReason] = useState('');
  const [businessVerificationStatus, setBusinessVerificationStatus] = useState(null);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const {
    profileCompleted,
    contactVerified: isContactVerified,
    skillsTestPassed: isSkillsTestPassed,
    businessVerified: isBusinessVerified,
    businessPending: isBusinessPending,
  } = getTradespersonCompletionStatus(user);

  const isBusinessVerifiedLive = businessVerificationStatus === 'approved' || isBusinessVerified;
  const isBusinessPendingLive = businessVerificationStatus == null
    ? isBusinessPending
    : businessVerificationStatus === 'pending';

  const isProfileIncomplete = !profileCompleted;

  useEffect(() => {
    loadDashboardData();
    fetchVerificationStatuses();

    const intervalId = window.setInterval(() => {
      fetchVerificationStatuses();
    }, 30000);

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchVerificationStatuses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Auto-show the next incomplete step modal on load
  useEffect(() => {
    if (loading) return;
    if (isProfileIncomplete) {
      setProfileModalInitialStep(1);
      setShowCompleteProfileModal(true);
      return;
    }
    if (!isContactVerified) {
      setShowVerifyContactModal(true);
    } else if (!isSkillsTestPassed) {
      setShowSkillsModal(true);
    } else if (!isBusinessVerifiedLive && !isBusinessPendingLive) {
      setShowBusinessModal(true);
    }
  }, [loading, isProfileIncomplete, isContactVerified, isSkillsTestPassed, isBusinessVerifiedLive, isBusinessPendingLive]);

  const handleCloseProfileModal = () => {
    setShowCompleteProfileModal(false);
    // Do not suppress future auto-open; always prompt until completed
  };

  const handleProfileComplete = async () => {
    if (refreshUser) await refreshUser();
    setShowCompleteProfileModal(false);
    localStorage.removeItem('profileModalDismissed');
    setShowVerifyContactModal(true);
  };

  const handleVerifyContactComplete = async () => {
    if (refreshUser) await refreshUser();
    setShowVerifyContactModal(false);
  };

  const handleSkillsComplete = async () => {
    if (refreshUser) await refreshUser();
    setShowSkillsModal(false);
  };

  const handleBusinessVerification = () => {
    setShowBusinessModal(true);
  };

  const handleBusinessComplete = async () => {
    if (refreshUser) await refreshUser();
    fetchVerificationStatuses();
    setShowBusinessModal(false);
  };

  const fetchVerificationStatuses = async () => {
    try {
      const statusResp = await authAPI.getTradespersonVerificationStatus();
      setIdentityVerificationStatus(statusResp?.identity_verification_status || 'not_submitted');
      setIdentityVerificationRejectionReason((statusResp?.identity_rejection_reason || '').trim());
      setBusinessVerificationStatus(statusResp?.status || 'not_submitted');
    } catch {
      setIdentityVerificationStatus('not_submitted');
      setIdentityVerificationRejectionReason('');
      setBusinessVerificationStatus(null);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch interests/jobs data and live wallet balance in parallel
      const [interestsResponse, walletResponse] = await Promise.all([
        jobsAPI.getMyInterests({ limit: 50 }),
        walletAPI.getBalance().catch(() => null),
      ]);
      const interests = Array.isArray(interestsResponse)
        ? interestsResponse
        : (interestsResponse?.interests || []);
      const liveWalletNaira = Number(walletResponse?.balance_naira);
      const liveWalletCoins = Number(walletResponse?.balance_coins);
      const totalEarnings = Number.isFinite(liveWalletNaira)
        ? liveWalletNaira
        : (Number.isFinite(liveWalletCoins) ? liveWalletCoins * 100 : (user?.wallet_balance || 0));

      // Calculate stats
      const activeInterests = interests.filter(i => i.status === 'pending' || i.status === 'accepted').length;
      const completedJobs = interests.filter(i => i.status === 'completed').length;

      setStats({
        activeInterests,
        completedJobs,
        totalEarnings,
        averageRating: user?.average_rating || 0,
        reviewCount: user?.review_count || 0,
      });

      // Get recent jobs
      const sortedRecentInterests = [...interests].sort((a, b) => {
        const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return bTime - aTime;
      });
      setRecentJobs(sortedRecentInterests.slice(0, 5));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      icon: Search,
      label: 'Browse Jobs',
      description: 'Find new opportunities',
      href: '/trades/browsejobs',
      primary: true,
    },
    {
      icon: Heart,
      label: 'My Interests',
      description: 'View active interests',
      href: '/trades/interests',
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      description: 'Check conversations',
      href: '/trades/messages',
    },
    {
      icon: Wallet,
      label: 'Wallet',
      description: 'Manage earnings',
      href: '/trades/wallet',
    },
  ];

  const statsCards = [
    {
      label: 'Active Interests',
      value: stats.activeInterests,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
    },
    {
      label: 'Completed Jobs',
      value: stats.completedJobs,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Avg. Rating',
      value: stats.averageRating ? stats.averageRating.toFixed(1) : '0.0',
      suffix: stats.reviewCount > 0 ? ` (${stats.reviewCount})` : '',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Wallet Balance',
      value: `₦${stats.totalEarnings.toLocaleString()}`,
      icon: Wallet,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#121E3C] font-montserrat">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Pro'}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <Button
          onClick={() => navigate('/trades/browsejobs')}
          className="bg-[#34D164] hover:bg-[#2ab854] text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all duration-300 hover:shadow-md inline-flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Browse Jobs
        </Button>
      </div>

      {identityVerificationStatus === 'rejected' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-amber-900 font-semibold font-montserrat text-sm sm:text-base">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                ID verification rejected
              </p>
              <p className="text-amber-800 text-sm mt-1 font-lato">
                Please retake your ID verification to continue using all tradesperson features.
              </p>
              {identityVerificationRejectionReason && (
                <p className="text-amber-900 text-sm mt-2 font-lato">
                  Reason: {identityVerificationRejectionReason}
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                setProfileModalInitialStep(3);
                setShowCompleteProfileModal(true);
              }}
              className="bg-[#34D164] hover:bg-[#2ab854] text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              Retake now
            </Button>
          </div>
        </div>
      )}

      {/* Profile Completion Banner - Shows only for incomplete profiles */}
      {(isProfileIncomplete || !isContactVerified || !isSkillsTestPassed || !isBusinessVerifiedLive) && (
        <ProfileCompletionBanner
          onCompleteProfile={() => {
            setProfileModalInitialStep(1);
            setShowCompleteProfileModal(true);
          }}
          onVerifyContact={() => setShowVerifyContactModal(true)}
          onTakeSkillsTest={() => setShowSkillsModal(true)}
          onBusinessVerification={handleBusinessVerification}
          profileCompleted={profileCompleted}
          contactVerified={isContactVerified}
          skillsTestPassed={isSkillsTestPassed}
          businessVerified={isBusinessVerifiedLive}
          businessPending={isBusinessPendingLive}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-[#121E3C] font-montserrat">
              {stat.value}
              {stat.suffix && <span className="text-sm font-normal text-gray-400">{stat.suffix}</span>}
            </p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-[#121E3C] font-montserrat mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.href)}
              className={cn(
                "group flex flex-col items-start p-4 rounded-xl border transition-all duration-300 text-left",
                action.primary
                  ? "bg-[#34D164]/10 border-[#34D164]/20 hover:bg-[#34D164]/20"
                  : "bg-gray-50 border-gray-100 hover:bg-gray-100"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl mb-3 transition-colors",
                action.primary ? "bg-[#34D164]/20" : "bg-white"
              )}>
                <action.icon className={cn(
                  "w-5 h-5",
                  action.primary ? "text-[#34D164]" : "text-gray-500"
                )} />
              </div>
              <span className="font-medium text-[#121E3C] text-sm">{action.label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{action.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Interests */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#121E3C] font-montserrat">
              Recent Interests
            </h2>
            <button
              onClick={() => navigate('/trades/interests')}
              className="text-sm text-[#34D164] hover:text-[#2ab854] font-medium inline-flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.slice(0, 4).map((job, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/trades/interests`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#121E3C]/5 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-[#121E3C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#121E3C] truncate">
                      {job.job?.title || 'Job Request'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{job.job?.location || 'Unknown'}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium shrink-0",
                    job.status === 'accepted' ? "bg-green-100 text-green-700" :
                    job.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No interests yet</p>
              <Button
                onClick={() => navigate('/trades/browsejobs')}
                className="mt-3 text-[#34D164] hover:text-[#2ab854] text-sm font-medium"
                variant="ghost"
              >
                Browse available jobs
              </Button>
            </div>
          )}
        </div>

        {/* Profile Completion / Tips */}
        <div className="bg-gradient-to-br from-[#121E3C] to-[#1a2d4f] rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold font-montserrat mb-1">
                Boost Your Profile
              </h2>
              <p className="text-white/60 text-sm">
                Complete your profile to get more job opportunities
              </p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: 'Add portfolio photos', icon: Eye },
              { label: 'Complete your bio', icon: Briefcase },
              { label: 'Verify your identity', icon: CheckCircle },
            ].map((tip, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <tip.icon className="w-3.5 h-3.5 text-[#34D164]" />
                </div>
                <span className="text-sm text-white/80">{tip.label}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate('/trades/profile')}
            className="w-full bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl py-2.5 text-sm font-medium transition-all inline-flex items-center justify-center gap-2"
          >
            Complete Profile
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Complete Profile Modal */}
      <CompleteProfileModal
        isOpen={showCompleteProfileModal}
        onClose={handleCloseProfileModal}
        onComplete={handleProfileComplete}
        initialStep={profileModalInitialStep}
      />

      {/* Verify Contact Modal */}
      <VerifyContactModal
        isOpen={showVerifyContactModal}
        onClose={() => setShowVerifyContactModal(false)}
        onComplete={handleVerifyContactComplete}
      />

      {/* Skills Assessment Modal */}
      <SkillsAssessmentModal
        isOpen={showSkillsModal}
        onClose={() => setShowSkillsModal(false)}
        onComplete={handleSkillsComplete}
      />

      {/* Business Verification Modal */}
      <BusinessVerificationModal
        isOpen={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        onComplete={handleBusinessComplete}
      />
    </div>
  );
};

export default TradespersonOverview;
