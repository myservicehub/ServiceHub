import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft,
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
      navigate('/my-jobs');
      return;
    }

    loadInterestedTradespeople();
  }, [jobId, isAuthenticated, isHomeowner, toast, navigate]);

  const loadInterestedTradespeople = async () => {
    try {
      setLoading(true);
      console.log('Loading interested tradespeople for job:', jobId);
      
      const response = await interestsAPI.getJobInterestedTradespeople(jobId);
      console.log('API response:', response);
      
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
      navigate('/my-jobs');
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
      navigate('/profile');
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
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
      <Card key={tradesperson.interest_id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                {tradesperson.profile_image ? (
                  <img
                    src={tradesperson.profile_image}
                    alt={tradesperson.tradesperson_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                    <User size={32} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Tradesperson Info */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold font-montserrat">
                      {tradesperson.tradesperson_name}
                    </h3>
                    {getStatusBadge(tradesperson.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Briefcase size={14} />
                      <span>{tradesperson.trade_categories?.join(', ') || 'No categories listed'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{tradesperson.location || 'Location not specified'}</span>
                    </div>
                    <Badge className={experienceLevel.color}>
                      {experienceLevel.label} ({tradesperson.experience_years} years)
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">{getStarRating(tradesperson.average_rating || 0)}</div>
                    <span className="text-sm font-medium">
                      {(tradesperson.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-600">
                      ({tradesperson.total_reviews || 0} reviews)
                    </span>
                  </div>

                  {/* Company */}
                  {tradesperson.company_name && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <Building size={14} />
                      <span>{tradesperson.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {tradesperson.description && (
                <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                  {tradesperson.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-xs text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Applied: {formatDate(tradesperson.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} />
                  <span>{tradesperson.portfolio_count || 0} portfolio items</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewFullProfile(tradesperson)}
                  className="flex items-center gap-2"
                >
                  <Eye size={16} />
                  View Full Profile
                </Button>

                {tradesperson.status === 'interested' && (
                  <Button
                    onClick={() => handleShareContact(tradesperson.interest_id)}
                    disabled={actionLoading[tradesperson.interest_id]}
                    className="text-white flex items-center gap-2"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    {actionLoading[tradesperson.interest_id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Contact size={16} />
                        Share Contact Details
                      </>
                    )}
                  </Button>
                )}

                {tradesperson.status === 'contact_shared' && (
                  <div className="space-y-2">
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Contact details shared, waiting for feedback
                    </Badge>
                    <Button
                      onClick={() => {
                        if (!job) {
                          toast({
                            title: "Loading...",
                            description: "Please wait for job details to load before starting chat",
                            variant: "default",
                          });
                          return;
                        }
                        handleStartChat(tradesperson);
                      }}
                      className="text-white font-lato bg-blue-600 hover:bg-blue-700 w-full"
                    >
                      <MessageCircle size={16} className="mr-2" />
                      Start Chat
                    </Button>
                  </div>
                )}

                {tradesperson.status === 'paid_access' && (
                  <div className="space-y-2">
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                      Access granted - Tradesperson can contact you
                    </Badge>
                    <Button
                      onClick={() => {
                        console.log('🔥 HOMEOWNER START CHAT BUTTON CLICKED!');
                        console.log('Button click event for tradesperson:', tradesperson);
                        console.log('Job data for chat:', job);
                        
                        // Safety check for job object
                        if (!job) {
                          console.error('Job object is null:', job);
                          toast({
                            title: "Loading...",
                            description: "Please wait for job details to load before starting chat",
                            variant: "default",
                          });
                          return;
                        }
                        
                        const chatData = {
                          type: 'start_chat',
                          participants: [
                            { id: user.id, name: user.name, role: 'homeowner' },
                            { id: tradesperson.tradesperson_id, name: tradesperson.name, role: 'tradesperson' }
                          ],
                          jobId: job.id || jobId, // Use jobId from URL as fallback
                          jobTitle: job.title || 'Job Chat',
                          chatContext: 'paid_access'
                        };
                        
                        console.log('Chat data being passed:', chatData);
                        
                        // Start chat
                        handleStartChat(tradesperson);
                      }}
                      className="text-white font-lato bg-blue-600 hover:bg-blue-700 w-full"
                    >
                      <MessageCircle size={16} className="mr-2" />
                      Start Chat
                    </Button>
                  </div>
                )}

                {tradesperson.status === 'interested' && (
                  <Button
                    onClick={() => {
                      if (!job) {
                        toast({
                          title: "Loading...",
                          description: "Please wait for job details to load before starting chat",
                          variant: "default",
                        });
                        return;
                      }
                      handleStartChat(tradesperson);
                    }}
                    className="text-white font-lato bg-green-600 hover:bg-green-700 w-full"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Chat with Tradesperson
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#2F8140'}} />
            <p className="text-gray-600">Loading interested tradespeople...</p>
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
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/my-jobs')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              Back to My Jobs
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                  Interested Tradespeople
                </h1>
                <p className="text-gray-600 font-lato mb-4">
                  Review profiles and portfolios of tradespeople interested in your job
                </p>
                
                {job && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Job Details:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Title:</span>
                        <span className="ml-2 font-medium">{job.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Category:</span>
                        <span className="ml-2 font-medium">{job.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <span className="ml-2 font-medium">{job.location}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Budget:</span>
                        <span className="ml-2 font-medium">
                          {job.budget_min && job.budget_max 
                            ? `${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}`
                            : 'Budget negotiable'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Interested</p>
                  <p className="text-2xl font-bold">{interestedTradespeople.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Heart className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Applications</p>
                  <p className="text-2xl font-bold">
                    {interestedTradespeople.filter(tp => tp.status === 'interested').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Contact Shared</p>
                  <p className="text-2xl font-bold">
                    {interestedTradespeople.filter(tp => tp.status === 'contact_shared').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid Access card hidden from homeowners but functionality preserved */}
        </div>

        {/* Interested Tradespeople List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-montserrat">
              Interested Tradespeople ({interestedTradespeople.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interestedTradespeople.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No interested tradespeople yet
                </h3>
                <p className="text-gray-500 mb-6">
                  When tradespeople show interest in your job, they'll appear here.
                </p>
                <Button 
                  onClick={() => navigate('/my-jobs')}
                  className="text-white"
                  style={{backgroundColor: '#2F8140'}}
                >
                  Back to My Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {interestedTradespeople.map((tradesperson) => getTradespersonCard(tradesperson))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Profile Modal */}
      {showProfileModal && selectedTradesperson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                  {selectedTradesperson.tradesperson_name} - Full Profile
                </h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Profile Header */}
              <div className="flex gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {selectedTradesperson.profile_image ? (
                    <img
                      src={selectedTradesperson.profile_image}
                      alt={selectedTradesperson.tradesperson_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                      <User size={40} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Contact size={20} style={{color: '#2F8140'}} />
                    <h3 className="text-2xl font-bold font-montserrat">
                      {selectedTradesperson.tradesperson_name}
                    </h3>
                    {getStatusBadge(selectedTradesperson.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Briefcase size={16} />
                      <span>{selectedTradesperson.trade_categories?.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span>{selectedTradesperson.location}</span>
                    </div>
                    <Badge className={getExperienceLevel(selectedTradesperson.experience_years).color}>
                      {getExperienceLevel(selectedTradesperson.experience_years).label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex">{getStarRating(selectedTradesperson.average_rating || 0)}</div>
                    <span className="font-medium">
                      {(selectedTradesperson.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-gray-600">
                      ({selectedTradesperson.total_reviews || 0} reviews)
                    </span>
                  </div>

                  {selectedTradesperson.company_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building size={16} />
                      <span>{selectedTradesperson.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="portfolio">
                    Portfolio ({portfolioData[selectedTradesperson.tradesperson_id]?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="reviews">
                    Reviews ({reviewsData[selectedTradesperson.tradesperson_id]?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    {/* Description */}
                    {selectedTradesperson.description && (
                      <div>
                        <h4 className="font-semibold mb-2">About</h4>
                        <p className="text-gray-700">{selectedTradesperson.description}</p>
                      </div>
                    )}

                    {/* Certifications */}
                    {selectedTradesperson.certifications && selectedTradesperson.certifications.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Certifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTradesperson.certifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="flex items-center gap-1">
                              <Award size={12} />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Service Areas */}
                    <div>
                      <h4 className="font-semibold mb-2">Service Areas</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span>{selectedTradesperson.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="portfolio" className="mt-6">
                  <div className="space-y-4">
                    {portfolioData[selectedTradesperson.tradesperson_id]?.length === 0 ? (
                      <div className="text-center py-8">
                        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No portfolio items available</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolioData[selectedTradesperson.tradesperson_id]?.map((item, index) => (
                          <div 
                            key={index}
                            className="group cursor-pointer"
                            onClick={() => handleImageClick(item)}
                          >
                            <div className="aspect-square rounded-lg overflow-hidden mb-2">
                              <img
                                src={item.image_url || item.url}
                                alt={item.title || item.description}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <h5 className="font-medium text-sm">{item.title || 'Untitled'}</h5>
                            {item.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                  <div className="space-y-4">
                    {reviewsData[selectedTradesperson.tradesperson_id]?.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No reviews available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviewsData[selectedTradesperson.tradesperson_id]?.map((review, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User size={20} className="text-gray-600" />
                                </div>
                                <div>
                                  <h5 className="font-medium">{review.reviewer_name || 'Anonymous'}</h5>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">{getStarRating(review.rating)}</div>
                                    <span className="text-sm text-gray-500">
                                      {formatDate(review.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-700">{review.comment || review.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-semibold">{selectedImage.title || 'Portfolio Item'}</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedImage.image_url || selectedImage.url}
                  alt={selectedImage.title || selectedImage.description}
                  className="w-full h-auto max-h-96 object-contain mx-auto"
                />
                {selectedImage.description && (
                  <p className="text-gray-600 mt-4">{selectedImage.description}</p>
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
          />
        </>
      )}

      <Footer />
    </div>
  );
};

export default InterestedTradespeopleePage;