import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonLayout from '../layouts/TradespersonLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Heart,
  Eye,
  Clock,
  Briefcase,
  TrendingUp,
  Users,
  MessageCircle,
  CreditCard,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  Building,
  Star
} from 'lucide-react';
import { interestsAPI } from '../api/services';
import { walletAPI } from '../api/wallet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatModal from '../components/ChatModal';

const MyInterestsPage = () => {
  const [interests, setInterests] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState({});
  const [contactDetails, setContactDetails] = useState({});
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedInterestForChat, setSelectedInterestForChat] = useState(null);

  const { user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're inside the dashboard route
  const isInDashboard = location.pathname.startsWith('/trades');

  useEffect(() => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your interests.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (!isTradesperson()) {
      toast({
        title: "Access Denied",
        description: "This page is only available for tradespeople.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    loadMyInterests();
    loadWalletBalance();
  }, []);

  const loadMyInterests = async () => {
    try {
      setLoading(true);
      const response = await interestsAPI.getMyInterests();
      setInterests(response || []);
    } catch (error) {
      console.error('Failed to load interests:', error);
      toast({
        title: "Error",
        description: "Failed to load your interests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const response = await walletAPI.getBalance();
      setWalletBalance(response.balance_coins || 0);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
    }
  };

  const handlePayForAccess = async (interestId, accessFeeCoins) => {
    const feeAmount = accessFeeCoins || 0;
    
    if (walletBalance < feeAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${feeAmount} coins to access contact details. Please fund your wallet.`,
        variant: "destructive",
      });
      navigate('/trades/wallet');
      return;
    }

    try {
      setPaymentLoading(prev => ({ ...prev, [interestId]: true }));
      
      const response = await interestsAPI.payForAccess(interestId);
      
      toast({
        title: "Payment Successful!",
        description: "Opening chat with homeowner...",
      });

      // CRITICAL FIX: Add delay and multiple refresh attempts to ensure status update
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for backend to process
      
      // Refresh interests and wallet balance
      await loadMyInterests();
      await loadWalletBalance();
      
      // CRITICAL FIX: Add another delay and refresh to ensure we get the updated status
      await new Promise(resolve => setTimeout(resolve, 500)); // Additional wait
      
      // Find the updated interest after payment with multiple attempts
      let paidInterest = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!paidInterest && attempts < maxAttempts) {
        const updatedInterests = await interestsAPI.getMyInterests();
        paidInterest = updatedInterests.find(interest => 
          interest.id === interestId && interest.status === 'paid_access'
        );
        
        if (!paidInterest) {
          attempts++;
          console.log(`Attempt ${attempts}: Interest status not yet updated, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
        }
      }
      
      if (paidInterest) {
        console.log(`Payment confirmed! Interest status: ${paidInterest.status}`);
        // Automatically open chat with homeowner after successful payment
        await handleStartChatAfterPayment(paidInterest);
      } else {
        console.error('Payment processed but status not updated. Manual refresh may be needed.');
        toast({
          title: "Payment Processed",
          description: "Payment successful! Please refresh the page and try starting the chat again.",
          variant: "default",
        });
        // Trigger a final refresh
        await loadMyInterests();
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      
      // Handle different error response formats safely
      let errorMessage = "Payment failed. Please try again.";
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = error.response.data.detail.msg || error.response.data.detail.message || 'Unknown error';
        }
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(prev => ({ ...prev, [interestId]: false }));
    }
  };

  const handleViewContactDetails = async (jobId, interestId) => {
    try {
      const response = await interestsAPI.getContactDetails(jobId);
      setSelectedContact({
        ...response,
        interestId: interestId
      });
      setShowContactModal(true);
    } catch (error) {
      console.error('Failed to load contact details:', error);
      toast({
        title: "Error",
        description: "Failed to load contact details. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (interest) => {
    // First check if the job itself is completed or cancelled - this takes priority
    if (interest.job_status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle size={12} />
          Job Completed
        </Badge>
      );
    }
    
    if (interest.job_status === 'cancelled') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle size={12} />
          Job Cancelled
        </Badge>
      );
    }
    
    // If job is still active, show the interest status
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      'interested': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      'contact_shared': { color: 'bg-blue-100 text-blue-800', icon: MessageCircle, label: 'Contact Shared' },
      'paid_access': { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Paid Access' },
      'expired': { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Expired' }
    };

    const config = statusConfig[interest.status] || statusConfig['pending'];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent size={12} />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₦0'; // Default to ₦0 for null/undefined values
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleManualRefresh = async () => {
    console.log('=== MANUAL REFRESH TRIGGERED ===');
    setLoading(true);
    try {
      await loadMyInterests();
      await loadWalletBalance();
      toast({
        title: "Refreshed Successfully",
        description: "Your interests and wallet balance have been updated.",
      });
      console.log('✅ Manual refresh completed successfully');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos'
    });
  };

  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    const s = String(status).toLowerCase().trim().replace(/[^a-z]+/g, '_');
    if (s.includes('paid') && s.includes('access')) return 'paid_access';
    if (s.includes('contact') && s.includes('shared')) return 'contact_shared';
    if (s === 'interested' || s === 'pending') return 'interested';
    return s;
  };

  const filterInterests = (interests, tab) => {
    switch (tab) {
      case 'pending':
        return interests.filter(interest => ['pending', 'interested'].includes(normalizeStatus(interest.status)));
      case 'contact_shared':
        return interests.filter(interest => normalizeStatus(interest.status) === 'contact_shared');
      case 'paid':
        return interests.filter(interest => normalizeStatus(interest.status) === 'paid_access');
      default:
        return interests;
    }
  };

  const getTabCount = (interests, tab) => {
    return filterInterests(interests, tab).length;
  };

  // Helper function to check if chat should be disabled based on job status
  const isChatDisabled = (interest) => {
    if (!interest.job_status) return false; // If job status is not available, don't disable
    return interest.job_status === 'cancelled' || interest.job_status === 'completed';
  };

  // Get message for why chat is disabled
  const getChatDisabledMessage = (interest) => {
    if (!interest.job_status) return '';
    if (interest.job_status === 'cancelled') return 'Chat disabled - Job has been cancelled';
    if (interest.job_status === 'completed') return 'Chat disabled - Job has been completed';
    return '';
  };

  const handleStartChat = (interest) => {
    setSelectedInterestForChat({
      jobId: interest.job_id,
      jobTitle: interest.job_title,
      homeowner: {
        id: interest.homeowner_id,
        name: interest.homeowner_name,
        type: 'homeowner',
        email: interest.homeowner_email,
        phone: interest.homeowner_phone,
        location: interest.job_location
      }
    });
    setShowChatModal(true);
  };

  const handleStartChatAfterPayment = async (interest) => {
    console.log('=== START CHAT DEBUG ===');
    console.log('Interest object:', interest);
    console.log('Interest status:', interest.status);
    console.log('Interest payment_made_at:', interest.payment_made_at);
    console.log('Expected status for chat: paid_access');
    console.log('Status match:', interest.status === 'paid_access');
    
    if (interest.status !== 'paid_access') {
      console.error('❌ CHAT BLOCKED: Status check failed');
      console.error(`Current status: '${interest.status}', Required: 'paid_access'`);
      
      // Provide specific guidance based on current status
      let message = "Please complete payment before starting chat.";
      if (interest.status === 'interested') {
        message = "Please wait for the homeowner to share contact details, then complete payment.";
      } else if (interest.status === 'contact_shared') {
        message = "Please complete payment to start chatting with the homeowner.";
      }
      
      toast({
        title: "Chat Access Required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('✅ CHAT ALLOWED: Status check passed, loading contact details...');
      
      // Load contact details for the paid interest
      const contactDetails = await interestsAPI.getContactDetails(interest.job_id);
      console.log('✅ Contact details loaded successfully');
      
      // Set up chat with full contact details
      setSelectedInterestForChat({
        jobId: interest.job_id,
        jobTitle: interest.job_title,
        homeowner: {
          id: interest.homeowner_id,
          name: contactDetails.homeowner_name,
          type: 'homeowner',
          email: contactDetails.homeowner_email,
          phone: contactDetails.homeowner_phone,
          location: interest.job_location
        },
        contactDetails: contactDetails,
        showContactDetails: true,
        jobStatus: interest.job_status
      });
      setShowChatModal(true);
      console.log('✅ Chat modal opened successfully');
      
    } catch (error) {
      console.error('❌ CHAT ERROR:', error);
      console.error('Full error object:', error.response || error);
      
      let errorMessage = "Failed to start chat. Please try again.";
      
      // Handle specific errors
      if (error.response?.status === 403) {
        const detail = error.response.data?.detail || "Access required";
        console.error('❌ 403 ERROR:', detail);
        errorMessage = "You need to complete payment before starting a conversation. Please pay for access first.";
        
        // If we got 403 but thought we had paid access, force a refresh
        if (interest.status === 'paid_access') {
          console.error('❌ CRITICAL: 403 error despite paid_access status - refreshing data...');
          loadMyInterests(); // Refresh the interests list
          errorMessage = "There was a synchronization issue. Please wait a moment and try again.";
        }
      } else if (error.response?.status === 400) {
        const detail = error.response.data?.detail || "Bad request";
        console.error('❌ 400 ERROR:', detail);
        errorMessage = detail;
      }
      
      toast({
        title: "Failed to Start Chat",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    const loadingContent = (
      <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#34D164'}} />
            <p className="text-gray-600">Loading your interests...</p>
          </div>
        </div>
      </div>
    );
    
    if (isInDashboard) return loadingContent;
    return <TradespersonLayout>{loadingContent}</TradespersonLayout>;
  }

  const pageContent = (
    <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
      
      <div className={isInDashboard ? "" : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        {/* Header Section - Simplified */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-[#121E3C]">
              My Interests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {interests.length} job{interests.length !== 1 ? 's' : ''} you've shown interest in
            </p>
          </div>
          
          {/* Wallet Quick Info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#121E3C]/5 rounded-xl">
            <div className="text-right">
              <p className="text-xs text-gray-500">Balance</p>
              <p className="text-sm font-semibold text-[#121E3C]">{walletBalance} coins</p>
            </div>
            <Button
              onClick={() => navigate('/trades/wallet')}
              size="sm"
              className="bg-[#34D164] hover:bg-[#2ab854] text-white text-xs px-3 py-1.5 h-auto rounded-lg"
            >
              Top Up
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-[#121E3C]">{interests.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-[#121E3C]">{getTabCount(interests, 'pending')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Shared</p>
                <p className="text-2xl font-bold text-[#121E3C]">{getTabCount(interests, 'contact_shared')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid Access</p>
                <p className="text-2xl font-bold text-[#121E3C]">{getTabCount(interests, 'paid')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 p-1 mb-6 inline-flex">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'contact_shared', label: 'Contact Shared' },
            { key: 'paid', label: 'Paid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-[#121E3C] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interests List */}
        {filterInterests(interests, activeTab).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No interests found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {activeTab === 'all' 
                ? "You haven't shown interest in any jobs yet."
                : `No interests with "${activeTab.replace('_', ' ')}" status.`
              }
            </p>
            {activeTab === 'all' && (
              <Button 
                onClick={() => navigate('/trades/browsejobs')}
                className="bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl"
              >
                Browse Available Jobs
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filterInterests(interests, activeTab).map((interest) => {
              const statusColors = {
                'pending': { bg: 'bg-amber-50', border: 'border-l-amber-400', icon: 'text-amber-500' },
                'interested': { bg: 'bg-amber-50', border: 'border-l-amber-400', icon: 'text-amber-500' },
                'contact_shared': { bg: 'bg-blue-50', border: 'border-l-blue-400', icon: 'text-blue-500' },
                'paid_access': { bg: 'bg-green-50', border: 'border-l-green-400', icon: 'text-green-500' },
              };
              const colors = statusColors[interest.status] || { bg: 'bg-gray-50', border: 'border-l-gray-400', icon: 'text-gray-500' };
              
              return (
                <div 
                  key={interest.id} 
                  className={`bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${colors.border}`}
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                          <Briefcase className={`w-6 h-6 ${colors.icon}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-[#121E3C] mb-1 line-clamp-2">{interest.job_title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(interest)}
                            {(interest.job_budget_min || interest.job_budget_max) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                <DollarSign size={10} />
                                {interest.job_budget_max ? `₦${(interest.job_budget_max/1000).toFixed(0)}k` : 'Flexible'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Job Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                        <MapPin size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{interest.job_location || 'Location TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                        <Calendar size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700">{formatDate(interest.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Access fee:</span>
                      <span className="text-sm font-semibold text-[#121E3C]">{interest.access_fee_coins || 0} coins</span>
                    </div>
                    
                    <div className="flex gap-2">
                      {(interest.status === 'pending' || interest.status === 'interested') && (
                        <span className="text-xs text-amber-600 font-medium">Awaiting response...</span>
                      )}
                      
                      {interest.status === 'contact_shared' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handlePayForAccess(interest.id, interest.access_fee_coins || 0); }}
                          disabled={paymentLoading[interest.id]}
                          className="bg-[#34D164] hover:bg-[#2ab854] text-white text-sm px-4 py-2 h-auto rounded-xl font-medium shadow-sm"
                        >
                          {paymentLoading[interest.id] ? 'Processing...' : `Pay ${interest.access_fee_coins || 0} coins`}
                        </Button>
                      )}
                      
                      {interest.status === 'paid_access' && !isChatDisabled(interest) && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleStartChatAfterPayment(interest); }}
                          className="bg-[#121E3C] hover:bg-[#1a2d54] text-white text-sm px-4 py-2 h-auto rounded-xl font-medium shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Start Chat
                        </Button>
                      )}
                      
                      {interest.status === 'paid_access' && isChatDisabled(interest) && (
                        <span className="text-xs text-gray-500 italic">
                          {interest.job_status === 'completed' ? 'Job Completed' : 'Unavailable'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Details Modal */}
      {showContactModal && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-montserrat text-[#121E3C]">
                      Contact Details
                    </h3>
                    <p className="text-sm text-gray-500 font-lato">Access granted</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-500 text-xl">×</span>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                <p className="text-green-700 text-sm font-lato">
                  You can now contact the homeowner directly about this job.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-11 h-11 rounded-xl bg-[#121E3C]/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#121E3C]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-lato">Name</p>
                    <p className="font-semibold text-[#121E3C] font-lato">{selectedContact.homeowner_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-11 h-11 rounded-xl bg-[#34D164]/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-[#34D164]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-lato">Phone</p>
                    <p className="font-semibold text-[#121E3C] font-lato">{selectedContact.homeowner_phone}</p>
                  </div>
                  <a 
                    href={`tel:${selectedContact.homeowner_phone}`}
                    className="px-3 py-1.5 bg-[#34D164] text-white text-xs font-medium rounded-lg hover:bg-[#2ab854] transition-colors"
                  >
                    Call
                  </a>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-lato">Email</p>
                    <p className="font-semibold text-[#121E3C] font-lato truncate">{selectedContact.homeowner_email}</p>
                  </div>
                  <a 
                    href={`mailto:${selectedContact.homeowner_email}`}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Email
                  </a>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-[#121E3C]/5 rounded-2xl p-4">
                <h4 className="font-semibold text-[#121E3C] font-montserrat text-sm mb-3">Next Steps</h4>
                <ul className="text-gray-600 text-sm space-y-2 font-lato">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D164] mt-1.5 shrink-0"></span>
                    Contact the homeowner to discuss job requirements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D164] mt-1.5 shrink-0"></span>
                    Provide a detailed quote and timeline
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D164] mt-1.5 shrink-0"></span>
                    Schedule a site visit if necessary
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
              <Button
                onClick={() => setShowContactModal(false)}
                className="w-full h-12 rounded-xl bg-[#121E3C] hover:bg-[#1a2d54] text-white font-lato"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedInterestForChat && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedInterestForChat(null);
          }}
          jobId={selectedInterestForChat.jobId}
          jobTitle={selectedInterestForChat.jobTitle}
          otherParty={selectedInterestForChat.homeowner}
          contactDetails={selectedInterestForChat.contactDetails}
          showContactDetails={selectedInterestForChat.showContactDetails}
          jobStatus={selectedInterestForChat.jobStatus}
        />
      )}

    </div>
  );

  // If inside dashboard, return content directly without TradespersonLayout wrapper
  if (isInDashboard) {
    return pageContent;
  }

  // Otherwise wrap in TradespersonLayout for standalone page
  return (
    <TradespersonLayout>
      {pageContent}
    </TradespersonLayout>
  );
};

export default MyInterestsPage;




