import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { useNavigate } from 'react-router-dom';
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
    if (walletBalance < accessFeeCoins) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${accessFeeCoins} coins to access contact details. Please fund your wallet.`,
        variant: "destructive",
      });
      navigate('/wallet');
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      'contact_shared': { color: 'bg-blue-100 text-blue-800', icon: MessageCircle, label: 'Contact Shared' },
      'paid': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid Access' },
      'expired': { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Expired' }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent size={12} />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
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
      minute: '2-digit'
    });
  };

  const filterInterests = (interests, tab) => {
    switch (tab) {
      case 'pending':
        return interests.filter(interest => interest.status === 'pending');
      case 'contact_shared':
        return interests.filter(interest => interest.status === 'contact_shared');
      case 'paid':
        return interests.filter(interest => interest.status === 'paid_access');
      default:
        return interests;
    }
  };

  const getTabCount = (interests, tab) => {
    return filterInterests(interests, tab).length;
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
        showContactDetails: true
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
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#2F8140'}} />
            <p className="text-gray-600">Loading your interests...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                My Interests
              </h1>
              <p className="text-gray-600 font-lato">
                Track and manage jobs you've shown interest in
              </p>
            </div>
            
            {/* Wallet Balance Card */}
            <Card className="min-w-[200px]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-lato">Wallet Balance</p>
                    <p className="text-xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                      {walletBalance} coins
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/wallet')}
                    className="text-sm"
                  >
                    Fund Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Heart className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Interests</p>
                  <p className="text-2xl font-bold">{interests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{getTabCount(interests, 'pending')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageCircle className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Contact Shared</p>
                  <p className="text-2xl font-bold">{getTabCount(interests, 'contact_shared')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Paid Access</p>
                  <p className="text-2xl font-bold">{getTabCount(interests, 'paid')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interests Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat">Your Job Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  All ({interests.length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({getTabCount(interests, 'pending')})
                </TabsTrigger>
                <TabsTrigger value="contact_shared">
                  Contact Shared ({getTabCount(interests, 'contact_shared')})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid Access ({getTabCount(interests, 'paid')})
                </TabsTrigger>
              </TabsList>

              {(['all', 'pending', 'contact_shared', 'paid']).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-6">
                  {filterInterests(interests, tab).length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No interests found
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {tab === 'all' 
                          ? "You haven't shown interest in any jobs yet."
                          : `No interests with ${tab.replace('_', ' ')} status.`
                        }
                      </p>
                      {tab === 'all' && (
                        <Button 
                          onClick={() => navigate('/browse-jobs')}
                          className="text-white"
                          style={{backgroundColor: '#2F8140'}}
                        >
                          Browse Available Jobs
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterInterests(interests, tab).map((interest) => (
                        <Card key={interest.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold font-montserrat">
                                    {interest.job_title}
                                  </h3>
                                  {getStatusBadge(interest.status)}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    <span>{interest.job_location}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    <span>Interested: {formatDate(interest.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={16} />
                                    <span>
                                      {interest.job_budget_min && interest.job_budget_max
                                        ? `${formatCurrency(interest.job_budget_min)} - ${formatCurrency(interest.job_budget_max)}`
                                        : 'Budget negotiable'
                                      }
                                    </span>
                                  </div>
                                </div>

                                <p className="text-gray-700 mt-3 line-clamp-2">
                                  {interest.job_description}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t">
                              <div className="text-sm text-gray-500">
                                Access Fee: {interest.access_fee_coins} coins ({formatCurrency(interest.access_fee_naira)})
                              </div>
                              
                              <div className="flex gap-2">
                                {interest.status === 'pending' && (
                                  <Badge variant="outline" className="text-yellow-600">
                                    Waiting for homeowner response
                                  </Badge>
                                )}
                                
                                {interest.status === 'contact_shared' && (
                                  <Button
                                    onClick={() => handlePayForAccess(interest.id, interest.access_fee_coins)}
                                    disabled={paymentLoading[interest.id]}
                                    className="text-white"
                                    style={{backgroundColor: '#2F8140'}}
                                  >
                                    {paymentLoading[interest.id] ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Pay {interest.access_fee_coins} coins
                                      </>
                                    )}
                                  </Button>
                                )}
                                
                                {interest.status === 'paid_access' && (
                                  <Button
                                    onClick={() => handleStartChatAfterPayment(interest)}
                                    className="text-white"
                                    style={{backgroundColor: '#2F8140'}}
                                  >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Chat with Homeowner
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Contact Details Modal */}
      {showContactModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                Homeowner Contact Details
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Contact Access Granted</span>
                </div>
                <p className="text-green-700 text-sm">
                  You can now contact the homeowner directly about this job.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{selectedContact.homeowner_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold">{selectedContact.homeowner_phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg col-span-1 md:col-span-2">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{selectedContact.homeowner_email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Next Steps</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Contact the homeowner to discuss the job requirements</li>
                  <li>• Provide a detailed quote and timeline</li>
                  <li>• Schedule a site visit if necessary</li>
                  <li>• Maintain professional communication throughout</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowContactModal(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowContactModal(false);
                  // You could add functionality to open phone/email app here
                }}
                className="text-white"
                style={{backgroundColor: '#2F8140'}}
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Now
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
        />
      )}

      <Footer />
    </div>
  );
};

export default MyInterestsPage;