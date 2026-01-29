import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
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
  ExternalLink,
  FileText
} from 'lucide-react';
import AuthenticatedImage from '../components/common/AuthenticatedImage';
import { tradespeopleAPI, portfolioAPI, reviewsAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const TradespersonProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [tradesperson, setTradesperson] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioView, setPortfolioView] = useState('grid');
  const [reviewsFilter, setReviewsFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);

  useEffect(() => {
    if (!id) {
      toast({
        title: "Invalid Profile",
        description: "Tradesperson ID is required.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    loadTradespersonData();
    loadPortfolio();
    loadReviews();
  }, [id]);

  const loadTradespersonData = async () => {
    try {
      setLoading(true);
      const response = await tradespeopleAPI.getTradesperson(id);
      setTradesperson(response.tradesperson || response);
      
      // Load reviews summary
      const summaryResponse = await reviewsAPI.getReviewSummary(id);
      setReviewsSummary(summaryResponse);
    } catch (error) {
      console.error('Failed to load tradesperson data:', error);
      toast({
        title: "Error",
        description: "Failed to load tradesperson profile. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      setPortfolioLoading(true);
      const response = await portfolioAPI.getTradespersonPortfolio(id);
      setPortfolio(response.portfolio || response.items || []);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      // Don't show error toast for portfolio as it's optional
    } finally {
      setPortfolioLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const params = {
        page: reviewsPage,
        limit: 10,
        filter: reviewsFilter !== 'all' ? reviewsFilter : undefined
      };
      const response = await tradespeopleAPI.getTradespersonReviews(id, params);
      setReviews(response.reviews || []);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      // Don't show error toast for reviews as it's optional
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleContactTradesperson = () => {
    if (!isAuthenticated()) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to contact tradespeople.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to job posting with pre-filled tradesperson
    navigate('/post-job', { 
      state: { 
        preferredTradesperson: tradesperson,
        category: tradesperson?.main_trade 
      } 
    });
  };

  const handleHireTradesperson = () => {
    if (!isAuthenticated()) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to hire tradespeople.",
        variant: "destructive",
      });
      return;
    }

    navigate('/post-job', { 
      state: { 
        preferredTradesperson: tradesperson,
        category: tradesperson?.main_trade,
        skipSearch: true 
      } 
    });
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
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
      day: 'numeric'
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

  const getVerificationStatus = (verified) => {
    return verified ? 
      { icon: CheckCircle, label: 'Verified', color: 'text-green-600' } :
      { icon: AlertCircle, label: 'Unverified', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#34D164'}} />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tradesperson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Tradesperson Not Found</h2>
          <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')} style={{backgroundColor: '#34D164'}} className="text-white">
            Go Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const experienceLevel = getExperienceLevel(tradesperson.years_experience || 0);
  const verificationStatus = getVerificationStatus(tradesperson.is_verified);
  const VerificationIcon = verificationStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft size={20} />
            Back to Search
          </Button>

          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gray-200 overflow-hidden">
                  {tradesperson.profile_image ? (
                    <img
                      src={tradesperson.profile_image}
                      alt={tradesperson.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                      <User size={60} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                        {tradesperson.name}
                      </h1>
                      <VerificationIcon size={24} className={verificationStatus.color} />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase size={18} />
                        <span className="font-medium">{tradesperson.main_trade}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={18} />
                        <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={18} />
                        <Badge className={experienceLevel.color}>
                          {experienceLevel.label} ({tradesperson.years_experience || 0} years)
                        </Badge>
                      </div>
                    </div>

                    {/* Rating */}
                    {reviewsSummary && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1">
                          {getStarRating(reviewsSummary.average_rating || 0)}
                        </div>
                        <span className="text-lg font-semibold">
                          {(reviewsSummary.average_rating || 0).toFixed(1)}
                        </span>
                        <span className="text-gray-600">
                          ({reviewsSummary.total_reviews || 0} reviews)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
                    <Button
                      variant="outline"
                      onClick={handleContactTradesperson}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle size={18} />
                      Contact
                    </Button>
                    <Button
                      onClick={handleHireTradesperson}
                      className="text-white flex items-center gap-2"
                      style={{backgroundColor: '#34D164'}}
                    >
                      <Briefcase size={18} />
                      Hire Now
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 size={18} />
                    </Button>
                  </div>
                </div>

                {/* Bio */}
                {tradesperson.bio && (
                  <p className="text-gray-700 leading-relaxed">
                    {tradesperson.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{reviewsSummary?.total_reviews || 0}</p>
              <p className="text-sm text-gray-600">Total Reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{tradesperson.completed_jobs || 0}</p>
              <p className="text-sm text-gray-600">Jobs Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">{tradesperson.success_rate || 95}%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold">{tradesperson.response_time || 2}h</p>
              <p className="text-sm text-gray-600">Response Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="portfolio">
                  Portfolio ({portfolio.length})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews ({reviewsSummary?.total_reviews || 0})
                </TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  {/* Skills & Specializations */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 font-montserrat">Skills & Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {tradesperson.skills && tradesperson.skills.length > 0 ? (
                        tradesperson.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="px-3 py-1">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <div className="text-gray-500">No skills listed</div>
                      )}
                    </div>
                  </div>

                  {/* Service Areas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 font-montserrat">Service Areas</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={18} />
                      <span>
                        {tradesperson.service_areas && tradesperson.service_areas.length > 0 
                          ? tradesperson.service_areas.join(', ')
                          : `${tradesperson.city}, ${tradesperson.state} and surrounding areas`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Recent Portfolio Samples */}
                  {portfolio.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold font-montserrat">Recent Work</h3>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveTab('portfolio')}
                          className="text-sm"
                        >
                          View All →
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {portfolio.slice(0, 4).map((item, index) => (
                          <div 
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleImageClick(item)}
                          >
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Reviews */}
                  {reviews.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold font-montserrat">Recent Reviews</h3>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveTab('reviews')}
                          className="text-sm"
                        >
                          View All →
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {reviews.slice(0, 3).map((review, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex">{getStarRating(review.rating)}</div>
                                <span className="font-medium">{review.reviewer_name}</span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm line-clamp-3">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold font-montserrat">
                      Portfolio ({portfolio.length} items)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant={portfolioView === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPortfolioView('grid')}
                      >
                        <Grid size={16} />
                      </Button>
                      <Button
                        variant={portfolioView === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPortfolioView('list')}
                      >
                        <List size={16} />
                      </Button>
                    </div>
                  </div>

                  {portfolioLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : portfolio.length === 0 ? (
                    <div className="text-center py-8">
                      <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No portfolio items yet</p>
                    </div>
                  ) : portfolioView === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {portfolio.map((item, index) => (
                        <div 
                          key={index}
                          className="group cursor-pointer"
                          onClick={() => handleImageClick(item)}
                        >
                          <div className="aspect-square rounded-lg overflow-hidden mb-3">
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <h4 className="font-medium mb-1">{item.title || 'Untitled'}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.description}
                          </p>
                          {item.completion_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completed: {formatDate(item.completion_date)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {portfolio.map((item, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => handleImageClick(item)}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{item.title || 'Untitled'}</h4>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            {item.completion_date && (
                              <p className="text-xs text-gray-500">
                                Completed: {formatDate(item.completion_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold font-montserrat">
                      Reviews ({reviewsSummary?.total_reviews || 0})
                    </h3>
                    <select
                      value={reviewsFilter}
                      onChange={(e) => setReviewsFilter(e.target.value)}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="all">All Reviews</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>

                  {reviewsSummary && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold mb-1">
                            {(reviewsSummary.average_rating || 0).toFixed(1)}
                          </div>
                          <div className="flex justify-center mb-2">
                            {getStarRating(reviewsSummary.average_rating || 0)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {reviewsSummary.total_reviews || 0} reviews
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = reviewsSummary.rating_breakdown?.[rating] || 0;
                            const percentage = reviewsSummary.total_reviews > 0 
                              ? (count / reviewsSummary.total_reviews) * 100 
                              : 0;
                            
                            return (
                              <div key={rating} className="flex items-center gap-2 mb-1">
                                <span className="text-sm w-8">{rating}★</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-yellow-400 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-8">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {reviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <div key={index} className="border rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User size={20} className="text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">{review.reviewer_name}</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex">{getStarRating(review.rating)}</div>
                                  <span className="text-sm text-gray-500">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {review.job_title && (
                              <Badge variant="outline" className="text-xs">
                                {review.job_title}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-gray-700 mb-4">{review.comment}</p>
                          
                          {review.response && (
                            <div className="bg-blue-50 rounded-lg p-4 mt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <User size={16} className="text-blue-600" />
                                <span className="font-medium text-blue-800">Response from {tradesperson.name}</span>
                              </div>
                              <p className="text-blue-700 text-sm">{review.response}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                              <ThumbsUp size={16} />
                              Helpful ({review.helpful_count || 0})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Phone size={20} />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-gray-500" />
                          <span className="text-sm">Available through ServiceHub</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone size={16} className="text-gray-500" />
                          <span className="text-sm">Contact via job posting</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-gray-500" />
                          <span className="text-sm">
                            {tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Professional Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase size={20} />
                          Professional Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Experience:</span>
                          <span className="text-sm font-medium">
                            {tradesperson.years_experience || 0} years
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Verification:</span>
                          <span className={`text-sm font-medium ${verificationStatus.color}`}>
                            {verificationStatus.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Member Since:</span>
                          <span className="text-sm font-medium">
                            {formatDate(tradesperson.created_at)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Response Rate:</span>
                          <span className="text-sm font-medium">
                            {tradesperson.response_rate || 98}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Certifications */}
                  {tradesperson.certifications && tradesperson.certifications.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award size={20} className="text-green-600" />
                          Certifications & Licenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tradesperson.certifications.map((c, index) => {
                            const name = typeof c === 'string' ? c : (c?.name || '');
                            const image_url = typeof c === 'string' ? '' : (c?.image_url || c?.image || '');
                            const isPdf = image_url?.toLowerCase().endsWith('.pdf');
                            
                            const getFullUrl = (url) => {
                              if (!url) return '';
                              if (url.startsWith('http')) return url;
                              const baseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
                              return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                            };

                            return (
                              <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-green-200 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Shield size={18} className="text-green-600" />
                                    <h4 className="font-semibold text-gray-800">{name}</h4>
                                  </div>
                                  {image_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 h-auto p-0 flex items-center gap-1"
                                      onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                    >
                                      <ExternalLink size={14} />
                                      View
                                    </Button>
                                  )}
                                </div>

                                {image_url && (
                                  <div className="mt-1">
                                    {isPdf ? (
                                      <div 
                                        className="flex items-center p-3 bg-white border rounded cursor-pointer hover:border-green-400 transition-colors"
                                        onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                      >
                                        <FileText size={24} className="text-red-500 mr-3" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-700">Certification Document (PDF)</p>
                                          <p className="text-xs text-gray-500">Click to view or download</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full h-32 rounded-md overflow-hidden border bg-white shadow-sm">
                                        <AuthenticatedImage 
                                          src={image_url} 
                                          alt={name} 
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
                {selectedImage.completion_date && (
                  <p className="text-sm text-gray-500 mt-2">
                    Completed: {formatDate(selectedImage.completion_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TradespersonProfilePage;
