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
import { tradespeopleAPI, portfolioAPI } from '../api/services';
import { reviewsAPI } from '../api/reviews';
import { useToast } from '../hooks/use-toast';

const TradespersonProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      try {
        const summaryResponse = await reviewsAPI.getReviewSummary(id);
        setReviewsSummary(summaryResponse);
      } catch (summaryError) {
        console.error('Failed to load reviews summary:', summaryError);
        setReviewsSummary(null);
      }
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

  const handleHireTradesperson = () => {
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
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-14 h-14 bg-[#34D164]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-7 h-7 animate-spin text-[#34D164]" />
            </div>
            <p className="text-gray-500 font-lato text-sm">Loading profile...</p>
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
        <div className="text-center py-32">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <User size={24} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold font-montserrat text-[#121E3C] mb-2">Tradesperson Not Found</h2>
          <p className="text-gray-500 font-lato text-sm mb-6">The profile you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-full text-sm font-medium text-white bg-[#34D164] hover:bg-[#2ab854] transition-colors">
            Go Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const experienceLevel = getExperienceLevel(tradesperson.years_experience || 0);
  const verificationStatus = getVerificationStatus(tradesperson.is_verified);
  const VerificationIcon = verificationStatus.icon;
  const displaySkills = Array.isArray(tradesperson.skills) && tradesperson.skills.length > 0
    ? tradesperson.skills
    : (Array.isArray(tradesperson.trade_categories) && tradesperson.trade_categories.length > 0
      ? tradesperson.trade_categories
      : (tradesperson.main_trade ? [tradesperson.main_trade] : []));
  const displayServiceAreas = Array.isArray(tradesperson.service_areas) && tradesperson.service_areas.length > 0
    ? tradesperson.service_areas
    : (tradesperson.location
      ? [tradesperson.location]
      : ((tradesperson.city || tradesperson.state)
        ? [`${[tradesperson.city, tradesperson.state].filter(Boolean).join(', ')}`]
        : []));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Profile Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-28 lg:pb-36 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/stock/bg9.jpg" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/85 via-[#121E3C]/80 to-[#121E3C]/90" />
        </div>

        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-lato mb-8 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Search
          </button>

          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-2xl bg-white/10 overflow-hidden ring-4 ring-white/10">
                  {tradesperson.profile_image ? (
                    <img src={tradesperson.profile_image} alt={tradesperson.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121E3C] to-[#1a2d4f]">
                      <User size={48} className="text-white/60" />
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-white">
                        {tradesperson.name}
                      </h1>
                      {tradesperson.is_verified && (
                        <div className="w-7 h-7 bg-[#34D164] rounded-full flex items-center justify-center ring-2 ring-white/20">
                          <CheckCircle size={16} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90 font-lato">
                        <Briefcase size={12} />
                        <span>{tradesperson.main_trade}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90 font-lato">
                        <MapPin size={12} />
                        <span>{tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs text-white/90 font-lato">
                        <Clock size={12} />
                        <span>{experienceLevel.label} ({tradesperson.years_experience || 0} yrs)</span>
                      </div>
                    </div>

                    {/* Rating */}
                    {reviewsSummary && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {getStarRating(reviewsSummary.average_rating || 0)}
                        </div>
                        <span className="text-white font-semibold font-montserrat text-sm">
                          {(reviewsSummary.average_rating || 0).toFixed(1)}
                        </span>
                        <span className="text-white/50 text-xs font-lato">
                          ({reviewsSummary.total_reviews || 0} reviews)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={handleHireTradesperson}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white bg-[#34D164] hover:bg-[#2ab854] transition-colors"
                    >
                      <Briefcase size={16} />
                      Hire Now
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Bio */}
                {tradesperson.bio && (
                  <p className="text-white/60 font-lato text-sm leading-relaxed max-w-2xl">
                    {tradesperson.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards - Overlapping hero */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 -mt-14 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, value: reviewsSummary?.total_reviews || 0, label: 'Total Reviews', color: 'text-[#34D164]' },
            { icon: Users, value: tradesperson.completed_jobs || 0, label: 'Jobs Completed', color: 'text-[#34D164]' },
            { icon: Target, value: `${tradesperson.success_rate || 95}%`, label: 'Success Rate', color: 'text-[#34D164]' },
            { icon: Zap, value: `${tradesperson.response_time || 2}h`, label: 'Response Time', color: 'text-[#34D164]' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold font-montserrat text-[#121E3C]">{stat.value}</p>
              <p className="text-xs text-gray-500 font-lato mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Tabs */}
      <section
        className="py-10 lg:py-14"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(52,209,100,0.08) 1px, transparent 1px),
            linear-gradient(rgba(52,209,100,0.08) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-gray-100 px-6 pt-4">
                <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0 gap-0">
                  {[
                    { value: 'overview', label: 'Overview' },
                    { value: 'portfolio', label: `Portfolio (${portfolio.length})` },
                    { value: 'reviews', label: `Reviews (${reviewsSummary?.total_reviews || 0})` },
                    { value: 'details', label: 'Details' }
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative px-4 py-3 rounded-none border-b-2 border-transparent font-lato text-sm text-gray-500 hover:text-[#121E3C] data-[state=active]:text-[#34D164] data-[state=active]:border-[#34D164] data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6">
                <div className="space-y-8">
                  {/* Skills & Specializations */}
                  <div>
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-4">Skills & Specializations</h3>
                    <div className="flex flex-wrap gap-2">
                      {displaySkills.length > 0 ? (
                        displaySkills.map((skill, index) => (
                          <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#34D164]/5 border border-[#34D164]/15 text-[#121E3C] rounded-full text-xs font-medium font-lato">
                            <div className="w-1 h-1 bg-[#34D164] rounded-full" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm font-lato">No skills listed</p>
                      )}
                    </div>
                  </div>

                  {/* Service Areas */}
                  <div>
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-4">Service Areas</h3>
                    <div className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-xl">
                      <div className="w-9 h-9 bg-[#34D164]/10 rounded-lg flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-[#34D164]" />
                      </div>
                      <span className="text-sm text-gray-600 font-lato">
                        {displayServiceAreas.length > 0
                          ? `${displayServiceAreas.join(', ')} and surrounding areas`
                          : 'Service area not set'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Recent Portfolio Samples */}
                  {portfolio.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold font-montserrat text-[#121E3C]">Recent Work</h3>
                        <button 
                          onClick={() => setActiveTab('portfolio')}
                          className="text-xs font-medium font-lato text-[#34D164] hover:text-[#2ab854] transition-colors"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {portfolio.slice(0, 4).map((item, index) => (
                          <div 
                            key={index}
                            className="aspect-square rounded-xl overflow-hidden cursor-pointer group border border-gray-100 hover:border-[#34D164]/20 hover:shadow-md transition-all duration-300"
                            onClick={() => handleImageClick(item)}
                          >
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Reviews */}
                  {reviews.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold font-montserrat text-[#121E3C]">Recent Reviews</h3>
                        <button 
                          onClick={() => setActiveTab('reviews')}
                          className="text-xs font-medium font-lato text-[#34D164] hover:text-[#2ab854] transition-colors"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="space-y-3">
                        {reviews.slice(0, 3).map((review, index) => (
                          <div key={index} className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex">{getStarRating(review.rating)}</div>
                                <span className="text-sm font-medium font-montserrat text-[#121E3C]">{review.reviewer_name}</span>
                              </div>
                              <span className="text-xs text-gray-400 font-lato">
                                {formatDate(review.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm font-lato line-clamp-3 leading-relaxed">
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
              <TabsContent value="portfolio" className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C]">
                      Portfolio ({portfolio.length} items)
                    </h3>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setPortfolioView('grid')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${portfolioView === 'grid' ? 'bg-[#34D164]/10 text-[#34D164]' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <Grid size={15} />
                      </button>
                      <button
                        onClick={() => setPortfolioView('list')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${portfolioView === 'list' ? 'bg-[#34D164]/10 text-[#34D164]' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>

                  {portfolioLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[#34D164]" />
                    </div>
                  ) : portfolio.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-sm font-lato">No portfolio items yet</p>
                    </div>
                  ) : portfolioView === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {portfolio.map((item, index) => (
                        <div 
                          key={index}
                          className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 hover:border-[#34D164]/20 hover:shadow-md transition-all duration-300"
                          onClick={() => handleImageClick(item)}
                        >
                          <div className="aspect-square overflow-hidden">
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-1">{item.title || 'Untitled'}</h4>
                            <p className="text-xs text-gray-500 font-lato line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                            {item.completion_date && (
                              <p className="text-[10px] text-gray-400 font-lato mt-2">
                                Completed: {formatDate(item.completion_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.map((item, index) => (
                        <div key={index} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#34D164]/20 hover:shadow-sm transition-all duration-300">
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || item.description}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => handleImageClick(item)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-1">{item.title || 'Untitled'}</h4>
                            <p className="text-xs text-gray-500 font-lato mb-1.5">{item.description}</p>
                            {item.completion_date && (
                              <p className="text-[10px] text-gray-400 font-lato">
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
              <TabsContent value="reviews" className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold font-montserrat text-[#121E3C]">
                      Reviews ({reviewsSummary?.total_reviews || 0})
                    </h3>
                    <select
                      value={reviewsFilter}
                      onChange={(e) => setReviewsFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-[#34D164] font-lato"
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
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-6">
                        <div className="text-center shrink-0">
                          <div className="text-3xl font-bold font-montserrat text-[#121E3C] mb-1">
                            {(reviewsSummary.average_rating || 0).toFixed(1)}
                          </div>
                          <div className="flex justify-center mb-1.5">
                            {getStarRating(reviewsSummary.average_rating || 0)}
                          </div>
                          <div className="text-xs text-gray-500 font-lato">
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
                                <span className="text-xs text-gray-500 w-6 font-lato">{rating}★</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-[#34D164] h-1.5 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-6 text-right font-lato">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {reviewsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[#34D164]" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-sm font-lato">No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((review, index) => (
                        <div key={index} className="p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#121E3C]/5 flex items-center justify-center">
                                <User size={16} className="text-[#121E3C]/40" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium font-montserrat text-[#121E3C]">{review.reviewer_name}</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex">{getStarRating(review.rating)}</div>
                                  <span className="text-[10px] text-gray-400 font-lato">{formatDate(review.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            {review.job_title && (
                              <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full font-lato">{review.job_title}</span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm font-lato leading-relaxed mb-3">{review.comment}</p>
                          
                          {review.response && (
                            <div className="bg-[#34D164]/5 border border-[#34D164]/10 rounded-xl p-4 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 bg-[#34D164]/20 rounded-md flex items-center justify-center">
                                  <User size={10} className="text-[#34D164]" />
                                </div>
                                <span className="text-xs font-medium text-[#121E3C] font-montserrat">Response from {tradesperson.name}</span>
                              </div>
                              <p className="text-gray-600 text-xs font-lato leading-relaxed">{review.response}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#34D164] transition-colors font-lato">
                              <ThumbsUp size={12} />
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
              <TabsContent value="details" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Information */}
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                          <Phone size={16} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Contact Information</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-600 font-lato">Available through ServiceHub</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-600 font-lato">Contact via job posting</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-600 font-lato">
                            {tradesperson.location || `${tradesperson.city}, ${tradesperson.state}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                          <Briefcase size={16} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Professional Details</h4>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Experience', value: `${tradesperson.years_experience || 0} years` },
                          { label: 'Verification', value: verificationStatus.label, color: verificationStatus.color },
                          { label: 'Member Since', value: formatDate(tradesperson.created_at) },
                          { label: 'Response Rate', value: `${tradesperson.response_rate || 98}%` }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-lato">{item.label}</span>
                            <span className={`text-xs font-medium font-lato ${item.color || 'text-[#121E3C]'}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  {tradesperson.certifications && tradesperson.certifications.length > 0 && (
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-lg flex items-center justify-center">
                          <Award size={16} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Certifications & Licenses</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {tradesperson.certifications.map((c, index) => {
                          const name = typeof c === 'string' ? c : (c?.name || '');
                          const image_url = typeof c === 'string' ? '' : (c?.image_url || c?.image || '');
                          const isPdf = image_url?.toLowerCase().endsWith('.pdf');
                          
                          const getFullUrl = (url) => {
                            if (!url) return '';
                            if (url.startsWith('data:')) return url;
                            if (url.startsWith('http')) return url;
                            // If url is just a filename (no path separators), prepend the certification image API path
                            if (!url.includes('/')) {
                              return `/api/auth/certifications/image/${url}`;
                            }
                            // If url already starts with /api, return as-is
                            if (url.startsWith('/api/')) return url;
                            const baseUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
                            return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                          };

                          return (
                            <div key={index} className="flex flex-col p-4 bg-white rounded-xl border border-gray-100 hover:border-[#34D164]/20 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Shield size={14} className="text-[#34D164]" />
                                  <h4 className="text-xs font-semibold text-[#121E3C] font-montserrat">{name}</h4>
                                </div>
                                {image_url && (
                                  <button
                                    className="text-[10px] text-[#34D164] hover:text-[#2ab854] flex items-center gap-1 font-medium font-lato transition-colors"
                                    onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                  >
                                    <ExternalLink size={10} />
                                    View
                                  </button>
                                )}
                              </div>

                              {image_url && (
                                <div className="mt-1">
                                  {isPdf ? (
                                    <div 
                                      className="flex items-center p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:border-[#34D164]/30 transition-colors"
                                      onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                    >
                                      <FileText size={20} className="text-red-400 mr-3" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-[#121E3C] font-lato">Certification Document (PDF)</p>
                                        <p className="text-[10px] text-gray-400 font-lato">Click to view or download</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-100 bg-white">
                                      <AuthenticatedImage 
                                        src={getFullUrl(image_url)} 
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
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">{selectedImage.title || 'Portfolio Item'}</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
                >
                  ✕
                </button>
              </div>
              <div className="p-5">
                <img
                  src={selectedImage.image_url || selectedImage.url}
                  alt={selectedImage.title || selectedImage.description}
                  className="w-full h-auto max-h-[28rem] object-contain mx-auto rounded-xl"
                />
                {selectedImage.description && (
                  <p className="text-gray-600 text-sm font-lato mt-4 leading-relaxed">{selectedImage.description}</p>
                )}
                {selectedImage.completion_date && (
                  <p className="text-xs text-gray-400 font-lato mt-2">
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
