import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft,
  ArrowUpRight,
  MapPin, 
  Star, 
  Calendar,
  Phone,
  Mail,
  User,
  Briefcase,
  Award,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  MessageCircle,
  ThumbsUp,
  Eye,
  Filter,
  Grid,
  List,
  Loader2,
  Camera,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Target,
  Building,
  Wrench,
  Shield,
  Zap,
  UserCheck,
  Contact,
  FileText,
  Info,
  ExternalLink
} from 'lucide-react';
import AuthenticatedImage from '../components/common/AuthenticatedImage';
import { interestsAPI, portfolioAPI, tradespeopleAPI, jobsAPI } from '../api/services';
import { reviewsAPI } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import ChatModal from '../components/ChatModal';

const InterestedTradespeopleePage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isHomeowner } = useAuth();
  const { toast } = useToast();

  const [job, setJob] = useState(null);
  const [interestedTradespeople, setInterestedTradespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedTradesperson, setSelectedTradesperson] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [portfolioData, setPortfolioData] = useState({});
  const [reviewsData, setReviewsData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('overview');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedTradespersonForChat, setSelectedTradespersonForChat] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view interested tradespeople.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (!isHomeowner()) {
      toast({
        title: "Access Denied",
        description: "This page is only available for homeowners.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (!jobId) {
      toast({
        title: "Invalid Job",
        description: "Job ID is required.",
        variant: "destructive",
      });
      navigate('/dashboard/jobs');
      return;
    }

    loadInterestedTradespeople();
  }, [jobId]);

  const loadInterestedTradespeople = async () => {
    try {
      setLoading(true);
      console.log('Loading interested tradespeople for job:', jobId);
      
      const response = await interestsAPI.getJobInterestedTradespeople(jobId);
      console.log('API response:', response);
      
      if (!response) {
        throw new Error('No response from API');
      }
      
      setInterestedTradespeople(response.interested_tradespeople || []);
      
      // Check if job details come with the response
      if (response.job) {
        console.log('Job data found in response:', response.job);
        setJob(response.job);
      } else {
        console.log('No job data in response, attempting to fetch job details separately');
        // If job details aren't included, we need to fetch them separately
        try {
          const jobResponse = await jobsAPI.getJob(jobId);
          console.log('Separate job API response:', jobResponse);
          setJob(jobResponse);
        } catch (jobError) {
          console.error('Failed to fetch job details:', jobError);
          // Create a minimal job object if we can't fetch full details
          setJob({
            id: jobId,
            title: 'Job Details',
            // We'll still allow chat functionality even with minimal job data
          });
        }
      }
    } catch (error) {
      console.error('Failed to load interested tradespeople:', error);
      toast({
        title: "Error",
        description: "Failed to load interested tradespeople. Please try again.",
        variant: "destructive",
      });
      navigate('/dashboard/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleShareContact = async (interestId) => {
    if (!user?.name || !user?.email || !user?.phone) {
      toast({
        title: "Incomplete Profile",
        description: "Please complete your profile with name, email, and phone before sharing contact details.",
        variant: "destructive",
      });
      navigate('/dashboard/settings');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [interestId]: true }));
      
      await interestsAPI.shareContactDetails(interestId);
      
      toast({
        title: "Contact Details Shared!",
        description: "The tradesperson can now access your contact details after payment.",
      });

      // Refresh the list to show updated status
      loadInterestedTradespeople();
      
    } catch (error) {
      console.error('Failed to share contact details:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to share contact details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [interestId]: false }));
    }
  };

  const handleViewFullProfile = async (tradesperson) => {
    try {
      setSelectedTradesperson(tradesperson);
      setShowProfileModal(true);
      setActiveProfileTab('overview');

      // Load portfolio and reviews for this tradesperson
      const [portfolioResponse, reviewsResponse] = await Promise.all([
        portfolioAPI.getTradespersonPortfolio(tradesperson.tradesperson_id).catch(() => ({ items: [] })),
        reviewsAPI.getUserReviews(tradesperson.tradesperson_id, { limit: 10 }).catch(() => ({ reviews: [] }))
      ]);

      setPortfolioData({
        [tradesperson.tradesperson_id]: portfolioResponse.items || portfolioResponse.portfolio || []
      });
      
      setReviewsData({
        [tradesperson.tradesperson_id]: reviewsResponse.reviews || []
      });

    } catch (error) {
      console.error('Failed to load full profile:', error);
      toast({
        title: "Error",
        description: "Failed to load full profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  // Helper function to check if chat should be disabled based on job status and payment
  const isChatDisabled = (tradesperson = null) => {
    if (!job) return false; // If job is not loaded yet, don't disable
    
    // Check job status first
    if (job.status === 'cancelled' || job.status === 'completed') {
      return true;
    }
    
    // Check if tradesperson has paid access fee or contact is shared
    if (tradesperson && 
        tradesperson.status !== 'paid_access' && 
        tradesperson.status !== 'contact_shared') {
      return true;
    }
    
    return false;
  };

  // Get message for why chat is disabled
  const getChatDisabledMessage = (tradesperson = null) => {
    if (!job) return '';
    
    // Job status messages take priority
    if (job.status === 'cancelled') return 'Chat disabled - Job has been cancelled';
    if (job.status === 'completed') return 'Chat disabled - Job has been completed';
    
    // Payment status messages
    if (tradesperson && tradesperson.status !== 'paid_access') {
      return 'Chat available after tradesperson pays access fee';
    }
    
    return '';
  };

  const handleStartChat = async (tradesperson) => {
    console.log('=== HOMEOWNER START CHAT DEBUG ===');
    console.log('handleStartChat called with tradesperson:', tradesperson);
    console.log('User data:', user);
    console.log('Job data:', job);
    
    // Add immediate toast feedback for mobile users
    toast({
      title: "Opening Chat...",
      description: `Starting conversation with ${tradesperson.tradesperson_name}`,
    });
    
    try {
      // Simplified chat data setup
      const chatData = {
        id: tradesperson.tradesperson_id,
        name: tradesperson.tradesperson_name,
        type: 'tradesperson',
        email: tradesperson.email || '',
        phone: tradesperson.phone || '',
        location: tradesperson.location || '',
        contactDetails: {
          homeowner_name: user?.name || '',
          homeowner_email: user?.email || '',
          homeowner_phone: user?.phone || ''
        },
        showContactDetails: true
      };
      
      console.log('✅ Chat data prepared:', chatData);
      
      setSelectedTradespersonForChat(chatData);
      setShowChatModal(true);
      
      console.log('✅ Homeowner chat setup complete');
      
      // Success feedback
      toast({
        title: "Chat Opened!",
        description: "You can now message the tradesperson.",
      });
      
    } catch (error) {
      console.error('❌ Failed to prepare chat:', error);
      
      // Error feedback
      toast({
        title: "Error Opening Chat",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      
      // Fallback attempt
      try {
        setSelectedTradespersonForChat({
          id: tradesperson.tradesperson_id,
          name: tradesperson.tradesperson_name,
          type: 'tradesperson'
        });
        setShowChatModal(true);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    }
  };

  const handleContactTradesperson = (tradesperson) => {
    // If contact is already shared or access is paid, start chat
    if (tradesperson.status === 'contact_shared' || tradesperson.status === 'paid_access') {
      handleStartChat(tradesperson);
    } 
    // If just interested, check if chat is allowed or if they need to share contact
    else if (tradesperson.status === 'interested') {
      // Logic from card buttons: homeowners can chat even if just interested 
      // as long as job is not cancelled/completed
      if (!isChatDisabled(tradesperson)) {
        handleStartChat(tradesperson);
      } else {
        handleShareContact(tradesperson.interest_id);
      }
    }
  };

  const formatCurrency = (amount) => {
    try {
      const num = Number(amount);
      if (isNaN(num)) return '₦0';
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
      }).format(num);
    } catch (e) {
      return '₦0';
    }
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

  const getStarRating = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  const getExperienceLevel = (experience) => {
    if (experience >= 10) return { label: 'Expert', color: 'bg-purple-100 text-purple-800' };
    if (experience >= 5) return { label: 'Professional', color: 'bg-blue-100 text-blue-800' };
    if (experience >= 2) return { label: 'Experienced', color: 'bg-green-100 text-green-800' };
    return { label: 'Beginner', color: 'bg-yellow-100 text-yellow-800' };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'interested': { color: 'bg-blue-100 text-blue-800', icon: Heart, label: 'Interested' },
      'contact_shared': { color: 'bg-green-100 text-green-800', icon: UserCheck, label: 'Contact Shared' },
      'paid_access': { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Paid Access' },
      'cancelled': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Cancelled' }
    };

    // Hide "Paid Access" badge from homeowners while preserving backend functionality
    if (status === 'paid_access') {
      return <></>;
    }

    const config = statusConfig[status] || statusConfig['interested'];
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent size={12} />
        {config.label}
      </Badge>
    );
  };

  const getTradespersonCard = (tradesperson) => {
    const experienceLevel = getExperienceLevel(tradesperson.experience_years || 0);
    
    return (
      <Card key={tradesperson.interest_id} className="hover:shadow-lg transition-shadow bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header Area */}
          <div className="p-5 pb-4">
            <div className="flex items-start gap-4">
              {/* Initials Avatar */}
              <div className="shrink-0">
                <div className="w-14 h-14 rounded-xl bg-[#34D164] flex items-center justify-center overflow-hidden">
                  {tradesperson.profile_image ? (
                    <img
                      src={tradesperson.profile_image}
                      alt={tradesperson.tradesperson_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-lg font-bold font-montserrat">
                      {tradesperson.tradesperson_name ? 
                        tradesperson.tradesperson_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                        'TP'
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Name & Company */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-lg font-bold font-montserrat text-[#121E3C] truncate leading-tight">
                      {tradesperson.tradesperson_name}
                    </h3>
                    <p className="text-xs text-[#34D164] font-bold font-lato mt-0.5">
                      {tradesperson.company_name || 'Individual'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(tradesperson.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Icons Row - Moved below avatar/name */}
            <div className="flex flex-wrap items-center gap-2 text-gray-500 mt-4">
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                <Briefcase size={12} className="text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tradesperson.trade_categories?.[0] || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tradesperson.location || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                <Clock size={12} className="text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{tradesperson.experience_years || 0} years exp.</span>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
              <span className="text-[11px] font-bold text-[#121E3C]">
                {(tradesperson.average_rating || 0).toFixed(1)} · {tradesperson.average_rating > 0 ? 'Tradesperson' : 'New tradesperson'}
              </span>
            </div>
          </div>

          {/* Description & Footer */}
          <div className="px-5 pb-5">
            {tradesperson.description && (
              <div className="bg-gray-50/80 p-4 rounded-2xl mb-4">
                <p className="text-sm text-gray-600 font-lato leading-relaxed line-clamp-3">
                  {tradesperson.description}
                </p>
              </div>
            )}

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-5">
              <div className="flex items-center gap-1.5">
                <Camera size={12} />
                <span>{tradesperson.portfolio_count || 0} portfolio items</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Applied: {formatDate(tradesperson.created_at)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleViewFullProfile(tradesperson)}
                className="rounded-xl border-gray-200 text-[#121E3C] font-bold text-xs h-10 flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                View Profile
                <ArrowUpRight size={14} />
              </Button>

              {tradesperson.status === 'interested' && (
                <Button
                  onClick={() => handleShareContact(tradesperson.interest_id)}
                  disabled={actionLoading[tradesperson.interest_id]}
                  className="rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-[#121E3C] font-bold text-xs h-10 flex items-center justify-center gap-2 border-none"
                >
                  {actionLoading[tradesperson.interest_id] ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      Share Contact
                      <ArrowUpRight size={14} />
                    </>
                  )}
                </Button>
              )}

              {(tradesperson.status === 'contact_shared' || tradesperson.status === 'paid_access') && (
                <Button
                  onClick={() => handleStartChat(tradesperson)}
                  disabled={isChatDisabled(tradesperson)}
                  className="rounded-xl bg-[#121E3C] hover:bg-[#1a2d54] text-white font-bold text-xs h-10 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  Start Chat
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#34D164'}} />
          <p className="text-gray-600">Loading interested tradespeople...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/jobs')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              Back to My Jobs
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-[#121E3C] mb-2">
              Interested Tradespeople
            </h1>
            <p className="text-sm text-gray-500 font-lato">
              Review profiles and portfolios of tradespeople interested in your job
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Job Details & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {job && (
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-[#34D164]/10 rounded-lg">
                    <FileText size={18} className="text-[#34D164]" />
                  </div>
                  <h3 className="font-bold text-[#121E3C] font-montserrat">Job Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Job ID</span>
                    <span className="font-bold text-[#121E3C]">#{job.id || job._id || job.job_id}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Title</span>
                    <span className="font-bold text-[#121E3C] text-right ml-4">{job.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Category</span>
                    <span className="font-bold text-[#121E3C] text-right ml-4">{job.category}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Location</span>
                    <span className="font-bold text-[#121E3C] text-right ml-4">{job.location}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Budget</span>
                    <span className="font-bold text-[#34D164] text-right ml-4">
                      {job.budget_min && job.budget_max 
                        ? `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
                        : 'Budget negotiable'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Total Interested</p>
                <p className="text-xl font-bold text-[#121E3C]">{(interestedTradespeople || []).length}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">New Applications</p>
                <p className="text-xl font-bold text-[#34D164]">
                  {(interestedTradespeople || []).filter(tp => tp && tp.status === 'interested').length}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Contact Shared</p>
                <p className="text-xl font-bold text-[#121E3C]">
                  {(interestedTradespeople || []).filter(tp => tp && tp.status === 'contact_shared').length}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interested Tradespeople List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xl font-bold font-montserrat text-[#121E3C]">
              Interested Tradespeople
            </h2>
              <div className="w-6 h-6 rounded-full bg-[#34D164] text-white text-[10px] font-bold flex items-center justify-center">
                {(interestedTradespeople || []).length}
              </div>
            </div>

            {(!interestedTradespeople || interestedTradespeople.length === 0) ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-600 mb-2">
                  No interested tradespeople yet
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  When tradespeople show interest in your job, they'll appear here.
                </p>
                <Button 
                  onClick={() => navigate('/dashboard/jobs')}
                  className="rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-[#121E3C] font-bold"
                >
                  Back to My Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {interestedTradespeople.map((tradesperson) => getTradespersonCard(tradesperson))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Profile Modal */}
      {showProfileModal && selectedTradesperson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 sm:p-6 z-10">
              <div className="flex justify-between items-center mb-5">
                <span className="text-[#34D164] text-[10px] font-bold tracking-widest uppercase">myservicehub.co</span>
                <div className="flex items-center gap-2">
                  {/* Verified Badge */}
                  {(selectedTradesperson.is_verified || selectedTradesperson.verified_tradesperson) && (
                    <div className="bg-[#34D164] text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircle size={10} fill="white" className="text-[#34D164]" />
                      <span>Verified</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <span className="text-gray-500 text-lg">×</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#34D164] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {selectedTradesperson.profile_image ? (
                    <img
                      src={selectedTradesperson.profile_image}
                      alt={selectedTradesperson.tradesperson_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-lg font-bold font-montserrat">
                      {selectedTradesperson.tradesperson_name ? 
                        selectedTradesperson.tradesperson_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                        'TP'
                      }
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold font-montserrat text-[#121E3C] leading-tight break-words">
                    {selectedTradesperson.tradesperson_name}
                  </h2>
                  <p className="text-sm text-gray-500 font-lato truncate mt-0.5">
                    {selectedTradesperson.company_name ? `${selectedTradesperson.company_name} · ` : ''}
                    {selectedTradesperson.trade_categories?.[0] || 'Tradesperson'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <div className="flex">{getStarRating(selectedTradesperson.average_rating || 0)}</div>
                  <span className="text-xs font-bold text-[#121E3C]">
                    {selectedTradesperson.average_rating > 0 ? (
                      <>
                        {selectedTradesperson.average_rating.toFixed(1)}
                        <span className="text-gray-400 font-medium ml-1">Tradesperson</span>
                      </>
                    ) : 'New tradesperson'}
                  </span>
                </div>
                
                {selectedTradesperson.total_reviews > 0 ? (
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedTradesperson.total_reviews} reviews
                  </span>
                ) : (
                  <button className="text-xs text-[#34D164] font-semibold hover:underline flex items-center gap-1">
                    Be the first to review
                    <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-32 sm:pb-6">
              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="w-10 h-10 rounded-xl bg-[#34D164]/10 flex items-center justify-center shrink-0">
                    <Briefcase size={18} className="text-[#34D164]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Trade</p>
                    <p className="text-sm font-bold text-[#121E3C] font-lato truncate">{selectedTradesperson.trade_categories?.[0] || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Location</p>
                    <p className="text-sm font-bold text-[#121E3C] font-lato truncate">{selectedTradesperson.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Experience</p>
                    <p className="text-sm font-bold text-[#121E3C] font-lato">{selectedTradesperson.experience_years || 0} years</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Building size={18} className="text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Company</p>
                    <p className="text-sm font-bold text-[#121E3C] font-lato truncate">{selectedTradesperson.company_name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab}>
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1 h-auto">
                  <TabsTrigger value="overview" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#121E3C] data-[state=active]:shadow-sm">Overview</TabsTrigger>
                  <TabsTrigger value="portfolio" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#121E3C] data-[state=active]:shadow-sm">
                    Portfolio ({portfolioData[selectedTradesperson.tradesperson_id]?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#121E3C] data-[state=active]:shadow-sm">
                    Reviews ({reviewsData[selectedTradesperson.tradesperson_id]?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-5">
                  <div className="space-y-5">
                    {/* Description */}
                    {selectedTradesperson.description && (
                      <div className="bg-[#121E3C]/5 rounded-2xl p-4">
                        <h4 className="font-semibold text-[#121E3C] font-montserrat text-sm mb-2">About</h4>
                        <p className="text-gray-600 text-sm font-lato leading-relaxed">{selectedTradesperson.description}</p>
                      </div>
                    )}

                    {/* Certifications */}
                    {selectedTradesperson.certifications && selectedTradesperson.certifications.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#121E3C] font-montserrat text-sm mb-3 flex items-center gap-2">
                          <Award size={16} className="text-[#34D164]" />
                          Certifications
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedTradesperson.certifications.map((c, index) => {
                            const name = typeof c === 'string' ? c : (c?.name || '');
                            const image_url = typeof c === 'string' ? '' : (c?.image_url || c?.image || '');
                            const isPdf = image_url?.toLowerCase().endsWith('.pdf');
                            
                            const getFullUrl = (url) => {
                              if (!url) return '';
                              if (url.startsWith('data:')) return url;
                              if (url.startsWith('http')) return url;
                              if (!url.includes('/')) {
                                return `/api/auth/certifications/image/${url}`;
                              }
                              if (url.startsWith('/api/')) return url;
                              const baseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
                              return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                            };

                            return (
                              <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-[#34D164]" />
                                    <span className="text-sm font-medium text-[#121E3C] font-lato">{name}</span>
                                  </div>
                                  {image_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-[#34D164] hover:text-[#2ab854] h-auto p-0 flex items-center gap-1"
                                      onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                    >
                                      <ExternalLink size={12} />
                                      <span className="text-xs">View</span>
                                    </Button>
                                  )}
                                </div>
                                
                                {image_url && !isPdf && (
                                  <div className="h-20 rounded-xl overflow-hidden border bg-white shadow-sm mt-1">
                                    <AuthenticatedImage 
                                      src={getFullUrl(image_url)} 
                                      alt={name} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                {image_url && isPdf && (
                                  <div 
                                    className="flex items-center p-2 bg-white border rounded-xl cursor-pointer hover:border-[#34D164] transition-colors mt-1"
                                    onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                  >
                                    <FileText size={16} className="text-red-500 mr-2" />
                                    <span className="text-xs font-medium text-gray-600 font-lato">PDF Document</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="portfolio" className="mt-5">
                  <div className="space-y-4">
                    {portfolioData[selectedTradesperson.tradesperson_id]?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <Camera className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-lato">No portfolio items available</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {portfolioData[selectedTradesperson.tradesperson_id]?.map((item, index) => (
                          <div 
                            key={index}
                            className="group cursor-pointer"
                            onClick={() => handleImageClick(item)}
                          >
                            <div className="aspect-square rounded-2xl overflow-hidden mb-2 bg-gray-100">
                              <img
                                src={item.image_url || item.url}
                                alt={item.title || item.description}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <h5 className="font-medium text-sm text-[#121E3C] font-lato truncate">{item.title || 'Untitled'}</h5>
                            {item.description && (
                              <p className="text-xs text-gray-500 font-lato line-clamp-1">{item.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-5">
                  <div className="space-y-3">
                    {reviewsData[selectedTradesperson.tradesperson_id]?.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <MessageCircle className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-lato">No reviews available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviewsData[selectedTradesperson.tradesperson_id]?.map((review, index) => (
                          <div key={index} className="bg-gray-50 rounded-2xl p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-[#121E3C]/10 flex items-center justify-center shrink-0">
                                <User size={18} className="text-[#121E3C]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-[#121E3C] font-lato">{review.reviewer_name || 'Anonymous'}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <div className="flex">{getStarRating(review.rating)}</div>
                                  <span className="text-xs text-gray-400">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm font-lato leading-relaxed">{review.comment || review.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-gray-100 bg-white sticky bottom-0 z-20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6">
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleContactTradesperson(selectedTradesperson)}
                  className="w-full h-12 rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-[#121E3C] font-bold flex items-center justify-center gap-2 group border-none"
                >
                  Contact Tradesperson
                  <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-full py-2 text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors sm:hidden"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full">
            <div className="bg-white rounded-3xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="font-semibold text-[#121E3C] font-montserrat">{selectedImage.title || 'Portfolio Item'}</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-500 text-xl">×</span>
                </button>
              </div>
              <div className="p-5">
                <img
                  src={selectedImage.image_url || selectedImage.url}
                  alt={selectedImage.title || selectedImage.description}
                  className="w-full h-auto max-h-[60vh] object-contain mx-auto rounded-2xl"
                />
                {selectedImage.description && (
                  <p className="text-gray-600 mt-4 text-sm font-lato text-center">{selectedImage.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal - Fixed to work without full job object */}
      {showChatModal && selectedTradespersonForChat && jobId && (
        <>
          {console.log('✅ RENDERING CHAT MODAL - All conditions met (removed job requirement)')}
          <ChatModal
            isOpen={showChatModal}
            onClose={() => {
              console.log('🔥 CHAT MODAL CLOSE CLICKED');
              setShowChatModal(false);
              setSelectedTradespersonForChat(null);
            }}
            jobId={jobId}
            jobTitle={job?.title || 'Job Discussion'} 
            otherParty={selectedTradespersonForChat}
            contactDetails={selectedTradespersonForChat.contactDetails}
            showContactDetails={selectedTradespersonForChat.showContactDetails}
            jobStatus={job?.status} // Pass job status to chat modal
          />
        </>
      )}

    </div>
  );
};

export default InterestedTradespeopleePage;
