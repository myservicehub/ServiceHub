import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  MapPin,
  Star,
  Phone,
  Mail,
  User,
  Briefcase,
  Award,
  Clock,
  ChevronLeft,
  Share2,
  MessageCircle,
  ThumbsUp,
  Grid,
  List,
  Loader2,
  Camera,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Target,
  Wrench,
  Shield,
  Zap,
  ExternalLink,
  FileText,
  Quote,
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

  useSEO({
    title: tradesperson ? `${tradesperson.name} — ${tradesperson.main_trade}` : 'Tradesperson Profile',
    description: tradesperson?.bio || `View the profile, portfolio, and reviews for ${tradesperson?.name || 'this tradesperson'} on ServiceHub.`,
    canonical: `/tradesperson/${id}`,
  });

  useEffect(() => {
    if (!id) {
      toast({ title: 'Invalid Profile', description: 'Tradesperson ID is required.', variant: 'destructive' });
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
      } catch {
        setReviewsSummary(null);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load tradesperson profile. Please try again.', variant: 'destructive' });
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
    } catch {
      // optional
    } finally {
      setPortfolioLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const params = { page: reviewsPage, limit: 10, filter: reviewsFilter !== 'all' ? reviewsFilter : undefined };
      const response = await tradespeopleAPI.getTradespersonReviews(id, params);
      setReviews(response.reviews || []);
    } catch {
      // optional
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleHireTradesperson = () => {
    navigate('/post-job', { state: { preferredTradesperson: tradesperson, category: tradesperson?.main_trade, skipSearch: true } });
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderStars = (rating, size = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 fill-white/10'}
      />
    ));
  };

  const renderStarsDark = (rating, size = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}
      />
    ));
  };

  const getExperienceLabel = (years) => {
    if (years >= 10) return 'Expert';
    if (years >= 5) return 'Professional';
    if (years >= 2) return 'Experienced';
    return 'Beginner';
  };

  const getInitials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http')) return url;
    if (!url.includes('/')) return `/api/auth/certifications/image/${url}`;
    if (url.startsWith('/api/')) return url;
    const base = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc]">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="text-center">
            <div className="w-14 h-14 bg-[#34D164]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 animate-spin text-[#34D164]" />
            </div>
            <p className="text-gray-400 font-lato text-sm">Loading profile…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tradesperson) {
    return (
      <div className="min-h-screen bg-[#f8f9fc]">
        <Header />
        <div className="text-center py-40">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
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

  const avgRating = reviewsSummary?.average_rating || 0;
  const totalReviews = reviewsSummary?.total_reviews || 0;
  const expYears = tradesperson.years_experience || 0;

  const displaySkills = Array.isArray(tradesperson.skills) && tradesperson.skills.length > 0
    ? tradesperson.skills
    : Array.isArray(tradesperson.trade_categories) && tradesperson.trade_categories.length > 0
      ? tradesperson.trade_categories
      : tradesperson.main_trade ? [tradesperson.main_trade] : [];

  const displayServiceAreas = Array.isArray(tradesperson.service_areas) && tradesperson.service_areas.length > 0
    ? tradesperson.service_areas
    : tradesperson.location
      ? [tradesperson.location]
      : (tradesperson.city || tradesperson.state)
        ? [`${[tradesperson.city, tradesperson.state].filter(Boolean).join(', ')}`]
        : [];

  const location = tradesperson.location || [tradesperson.city, tradesperson.state].filter(Boolean).join(', ') || 'Nigeria';

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Header />

      {/* ── HERO ── */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-36 lg:pb-44 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src="/stock/bg9.jpg" alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1628]/90 via-[#121E3C]/85 to-[#0d1a30]/95" />
          {/* subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />
        </div>

        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          {/* Back link */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm font-lato mb-10 transition-colors group"
          >
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-xl shadow-black/30">
                    {tradesperson.profile_image ? (
                      <img src={tradesperson.profile_image} alt={tradesperson.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a2d4f] to-[#0c1628]">
                        <span className="text-3xl font-bold font-montserrat text-white/60">{getInitials(tradesperson.name)}</span>
                      </div>
                    )}
                  </div>
                  {tradesperson.is_verified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#34D164] rounded-full flex items-center justify-center ring-2 ring-[#121E3C] shadow-lg">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white leading-tight">
                        {tradesperson.name}
                      </h1>
                      {tradesperson.is_verified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#34D164]/15 border border-[#34D164]/25 rounded-full text-[10px] font-semibold font-lato uppercase tracking-wider text-[#34D164]">
                          <CheckCircle size={9} />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Pill meta */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {[
                        { icon: Briefcase, text: tradesperson.main_trade },
                        { icon: MapPin, text: location },
                        { icon: Clock, text: `${getExperienceLabel(expYears)} · ${expYears} yrs` },
                      ].map((item, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/8 backdrop-blur-sm border border-white/10 rounded-full text-xs text-white/75 font-lato">
                          <item.icon size={11} className="text-white/50" />
                          {item.text}
                        </div>
                      ))}
                    </div>

                    {/* Rating row */}
                    {totalReviews > 0 && (
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="flex gap-0.5">{renderStars(avgRating, 15)}</div>
                        <span className="text-white font-semibold font-montserrat text-sm">{avgRating.toFixed(1)}</span>
                        <span className="text-white/40 text-xs font-lato">({totalReviews} reviews)</span>
                      </div>
                    )}

                    {/* Bio */}
                    {tradesperson.bio && (
                      <p className="text-white/55 font-lato text-sm leading-relaxed max-w-xl">
                        {tradesperson.bio}
                      </p>
                    )}
                  </div>

                  {/* CTA — desktop hero */}
                  <div className="hidden lg:flex flex-col gap-3 shrink-0">
                    <button
                      onClick={handleHireTradesperson}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-[#34D164] hover:bg-[#2ab854] transition-colors shadow-lg shadow-[#34D164]/20"
                    >
                      <Briefcase size={15} />
                      Hire Now
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white/70 bg-white/8 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:text-white transition-all">
                      <Share2 size={14} />
                      Share Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT STRIP (glass, overlaps hero bottom) ── */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12 -mt-16 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, value: totalReviews, label: 'Reviews' },
            { icon: Users, value: tradesperson.completed_jobs || 0, label: 'Jobs Done' },
            { icon: Target, value: `${tradesperson.success_rate || 95}%`, label: 'Success Rate' },
            { icon: Zap, value: `${tradesperson.response_time || 2}h`, label: 'Avg Response' },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 lg:p-5 text-center shadow-sm shadow-black/5 hover:shadow-md hover:bg-white transition-all duration-300"
            >
              <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center mx-auto mb-2.5">
                <s.icon className="w-4 h-4 text-[#34D164]" />
              </div>
              <p className="text-lg lg:text-xl font-bold font-montserrat text-[#121E3C]">{s.value}</p>
              <p className="text-[11px] text-gray-400 font-lato mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <section className="py-10 lg:py-14">
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ── Tabs (left / full) ── */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tab nav */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
                  <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0 gap-0 border-b border-gray-100">
                    {[
                      { value: 'overview', label: 'Overview' },
                      { value: 'portfolio', label: `Portfolio${portfolio.length ? ` (${portfolio.length})` : ''}` },
                      { value: 'reviews', label: `Reviews${totalReviews ? ` (${totalReviews})` : ''}` },
                      { value: 'details', label: 'Details' },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="relative px-3 py-3.5 rounded-none border-b-2 border-transparent font-lato text-xs sm:text-sm text-gray-400 hover:text-[#121E3C] data-[state=active]:text-[#34D164] data-[state=active]:border-[#34D164] data-[state=active]:bg-[#34D164]/3 data-[state=active]:shadow-none transition-all"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="space-y-4 mt-0">

                  {/* Skills */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-4">Skills & Specialisations</h3>
                    {displaySkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {displaySkills.map((skill, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#34D164]/5 border border-[#34D164]/15 text-[#121E3C] rounded-full text-xs font-medium font-lato hover:bg-[#34D164]/10 transition-colors cursor-default">
                            <div className="w-1.5 h-1.5 bg-[#34D164] rounded-full flex-shrink-0" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm font-lato">No skills listed</p>
                    )}
                  </div>

                  {/* Service areas */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-4">Service Areas</h3>
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin size={15} className="text-[#34D164]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#121E3C] font-lato font-medium">
                          {displayServiceAreas.length > 0 ? displayServiceAreas.join(', ') : 'Not specified'}
                        </p>
                        {displayServiceAreas.length > 0 && (
                          <p className="text-xs text-gray-400 font-lato mt-0.5">and surrounding areas</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Work */}
                  {portfolio.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Recent Work</h3>
                        <button onClick={() => setActiveTab('portfolio')} className="text-xs font-medium font-lato text-[#34D164] hover:text-[#2ab854] transition-colors">
                          View All →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {portfolio.slice(0, 4).map((item, i) => (
                          <div
                            key={i}
                            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-gray-100"
                            onClick={() => handleImageClick(item)}
                          >
                            <img
                              src={item.image_url || item.url}
                              alt={item.title || 'Portfolio'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-[#121E3C]/0 group-hover:bg-[#121E3C]/40 transition-all duration-300 flex items-end">
                              <div className="w-full p-2.5 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <p className="text-white text-xs font-medium font-montserrat truncate drop-shadow">{item.title || 'View'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Reviews */}
                  {reviews.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Recent Reviews</h3>
                        <button onClick={() => setActiveTab('reviews')} className="text-xs font-medium font-lato text-[#34D164] hover:text-[#2ab854] transition-colors">
                          View All →
                        </button>
                      </div>
                      <div className="space-y-3">
                        {reviews.slice(0, 2).map((review, i) => (
                          <ReviewCard key={i} review={review} tradespersonName={tradesperson.name} formatDate={formatDate} renderStarsDark={renderStarsDark} getInitials={getInitials} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── PORTFOLIO ── */}
                <TabsContent value="portfolio" className="mt-0">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">Portfolio</h3>
                        <p className="text-xs text-gray-400 font-lato mt-0.5">{portfolio.length} items</p>
                      </div>
                      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                        {[{ v: 'grid', Icon: Grid }, { v: 'list', Icon: List }].map(({ v, Icon }) => (
                          <button
                            key={v}
                            onClick={() => setPortfolioView(v)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${portfolioView === v ? 'bg-white text-[#34D164] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Icon size={14} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {portfolioLoading ? (
                      <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#34D164]" /></div>
                    ) : portfolio.length === 0 ? (
                      <EmptyState icon={Camera} label="No portfolio items yet" />
                    ) : portfolioView === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolio.map((item, i) => (
                          <div
                            key={i}
                            className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 hover:border-[#34D164]/20 hover:shadow-lg transition-all duration-300"
                            onClick={() => handleImageClick(item)}
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                              <img
                                src={item.image_url || item.url}
                                alt={item.title || 'Portfolio'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#121E3C]/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="p-4">
                              <h4 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-1 truncate">{item.title || 'Untitled'}</h4>
                              {item.description && (
                                <p className="text-xs text-gray-400 font-lato line-clamp-2 leading-relaxed">{item.description}</p>
                              )}
                              {item.completion_date && (
                                <p className="text-[10px] text-gray-300 font-lato mt-2">Completed {formatDate(item.completion_date)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {portfolio.map((item, i) => (
                          <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#34D164]/15 hover:bg-gray-50/50 transition-all duration-200">
                            <div
                              className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 cursor-pointer"
                              onClick={() => handleImageClick(item)}
                            >
                              <img src={item.image_url || item.url} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-1 truncate">{item.title || 'Untitled'}</h4>
                              {item.description && <p className="text-xs text-gray-400 font-lato mb-1 line-clamp-2">{item.description}</p>}
                              {item.completion_date && <p className="text-[10px] text-gray-300 font-lato">Completed {formatDate(item.completion_date)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── REVIEWS ── */}
                <TabsContent value="reviews" className="mt-0 space-y-4">

                  {/* Rating summary */}
                  {reviewsSummary && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Dark header with big number */}
                      <div className="bg-[#121E3C] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="text-center shrink-0">
                          <div className="text-5xl font-bold font-montserrat text-white mb-1.5">
                            {avgRating.toFixed(1)}
                          </div>
                          <div className="flex justify-center gap-0.5 mb-1.5">{renderStars(avgRating, 16)}</div>
                          <div className="text-white/40 text-xs font-lato">{totalReviews} reviews</div>
                        </div>
                        <div className="flex-1 w-full max-w-xs sm:max-w-none">
                          {[5, 4, 3, 2, 1].map((r) => {
                            const count = reviewsSummary.rating_breakdown?.[r] || 0;
                            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div key={r} className="flex items-center gap-3 mb-2 last:mb-0">
                                <span className="text-xs text-white/40 font-lato w-4 text-right shrink-0">{r}</span>
                                <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />
                                <div className="flex-1 bg-white/10 rounded-full h-1.5">
                                  <div className="bg-[#34D164] h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-white/30 font-lato w-4 shrink-0">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter + list */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-sm font-semibold font-montserrat text-[#121E3C]">All Reviews</h3>
                      <select
                        value={reviewsFilter}
                        onChange={(e) => setReviewsFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-[#34D164] font-lato text-gray-600 cursor-pointer"
                      >
                        <option value="all">All Ratings</option>
                        {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                      </select>
                    </div>

                    {reviewsLoading ? (
                      <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#34D164]" /></div>
                    ) : reviews.length === 0 ? (
                      <EmptyState icon={MessageCircle} label="No reviews yet" />
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review, i) => (
                          <ReviewCard key={i} review={review} tradespersonName={tradesperson.name} formatDate={formatDate} renderStarsDark={renderStarsDark} getInitials={getInitials} />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── DETAILS ── */}
                <TabsContent value="details" className="mt-0 space-y-4">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                          <Phone size={15} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Contact</h4>
                      </div>
                      <div className="space-y-3">
                        {[
                          { Icon: Mail, text: 'Available through ServiceHub' },
                          { Icon: Phone, text: 'Contact via job posting' },
                          { Icon: MapPin, text: location },
                        ].map(({ Icon, text }, i) => (
                          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                              <Icon size={13} className="text-gray-400" />
                            </div>
                            <span className="text-xs text-gray-600 font-lato">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Professional */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                          <Briefcase size={15} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Professional Details</h4>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Experience', value: `${expYears} years` },
                          { label: 'Level', value: getExperienceLabel(expYears) },
                          {
                            label: 'Verification',
                            value: tradesperson.is_verified ? 'Verified' : 'Unverified',
                            valueClass: tradesperson.is_verified ? 'text-[#34D164]' : 'text-gray-400',
                          },
                          { label: 'Member Since', value: formatDate(tradesperson.created_at) },
                          { label: 'Response Rate', value: `${tradesperson.response_rate || 98}%` },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                            <span className="text-xs text-gray-400 font-lato">{row.label}</span>
                            <span className={`text-xs font-medium font-lato ${row.valueClass || 'text-[#121E3C]'}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  {tradesperson.certifications && tradesperson.certifications.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                          <Award size={15} className="text-[#34D164]" />
                        </div>
                        <h4 className="text-sm font-semibold font-montserrat text-[#121E3C]">Certifications & Licences</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tradesperson.certifications.map((c, i) => {
                          const name = typeof c === 'string' ? c : (c?.name || '');
                          const image_url = typeof c === 'string' ? '' : (c?.image_url || c?.image || '');
                          const isPdf = image_url?.toLowerCase().endsWith('.pdf');
                          return (
                            <div key={i} className="flex flex-col p-4 bg-gray-50/60 rounded-xl border border-gray-100 hover:border-[#34D164]/20 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Shield size={13} className="text-[#34D164] shrink-0" />
                                  <h4 className="text-xs font-semibold text-[#121E3C] font-montserrat truncate">{name}</h4>
                                </div>
                                {image_url && (
                                  <button
                                    className="text-[10px] text-[#34D164] hover:text-[#2ab854] flex items-center gap-1 font-medium font-lato transition-colors shrink-0 ml-2"
                                    onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                  >
                                    <ExternalLink size={10} />
                                    View
                                  </button>
                                )}
                              </div>
                              {image_url && (
                                isPdf ? (
                                  <div
                                    className="flex items-center p-3 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-[#34D164]/20 transition-colors"
                                    onClick={() => window.open(getFullUrl(image_url), '_blank')}
                                  >
                                    <FileText size={18} className="text-red-400 mr-3 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-[#121E3C] font-lato">PDF Document</p>
                                      <p className="text-[10px] text-gray-400 font-lato">Click to open</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-100 bg-white">
                                    <AuthenticatedImage src={getFullUrl(image_url)} alt={name} className="w-full h-full object-cover" />
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* ── STICKY SIDEBAR (desktop) ── */}
            <div className="hidden lg:block w-64 xl:w-72 shrink-0">
              <div className="sticky top-24 space-y-4">

                {/* Hire card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-[#121E3C] p-5">
                    <p className="text-xs font-lato text-white/50 mb-1">Looking for someone reliable?</p>
                    <h4 className="text-sm font-semibold font-montserrat text-white leading-snug">Hire {tradesperson.name.split(' ')[0]} for your next job</h4>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <button
                      onClick={handleHireTradesperson}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#34D164] hover:bg-[#2ab854] transition-colors"
                    >
                      <Briefcase size={14} />
                      Hire Now
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all">
                      <Share2 size={14} />
                      Share Profile
                    </button>
                  </div>
                </div>

                {/* Quick facts */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h4 className="text-xs font-semibold font-montserrat text-[#121E3C] mb-4 uppercase tracking-wider">Quick Facts</h4>
                  <div className="space-y-3">
                    {[
                      { icon: Clock, label: 'Experience', value: `${expYears} years` },
                      { icon: MapPin, label: 'Location', value: location },
                      { icon: Shield, label: 'Status', value: tradesperson.is_verified ? 'Verified' : 'Unverified', valueClass: tradesperson.is_verified ? 'text-[#34D164]' : '' },
                      { icon: Star, label: 'Rating', value: totalReviews > 0 ? `${avgRating.toFixed(1)} / 5.0` : 'No reviews yet' },
                    ].map(({ icon: Icon, label, value, valueClass }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#34D164]/8 flex items-center justify-center shrink-0">
                          <Icon size={13} className="text-[#34D164]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 font-lato">{label}</p>
                          <p className={`text-xs font-medium font-lato truncate ${valueClass || 'text-[#121E3C]'}`}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile CTA strip */}
          <div className="lg:hidden mt-6 flex gap-3">
            <button
              onClick={handleHireTradesperson}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#34D164] hover:bg-[#2ab854] transition-colors"
            >
              <Briefcase size={14} />
              Hire Now
            </button>
            <button className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-[#121E3C] transition-colors">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── IMAGE MODAL ── */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="max-w-2xl w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
              <h3 className="text-sm font-semibold font-montserrat text-white">{selectedImage.title || 'Portfolio Item'}</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.image_url || selectedImage.url}
                alt={selectedImage.title || 'Portfolio'}
                className="w-full h-auto max-h-[30rem] object-contain rounded-xl"
              />
              {selectedImage.description && (
                <p className="text-white/60 text-sm font-lato mt-4 leading-relaxed">{selectedImage.description}</p>
              )}
              {selectedImage.completion_date && (
                <p className="text-white/30 text-xs font-lato mt-2">Completed {formatDate(selectedImage.completion_date)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

/* ── Sub-components ── */

const EmptyState = ({ icon: Icon, label }) => (
  <div className="text-center py-14">
    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
      <Icon className="w-5 h-5 text-gray-300" />
    </div>
    <p className="text-gray-400 text-sm font-lato">{label}</p>
  </div>
);

const ReviewCard = ({ review, tradespersonName, formatDate, renderStarsDark, getInitials, compact = false }) => (
  <div className={`rounded-xl border border-gray-100 hover:border-gray-200 transition-colors ${compact ? 'p-4' : 'p-5'}`}>
    <div className="flex items-start gap-3 mb-3">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-[#121E3C]/6 flex items-center justify-center shrink-0 text-xs font-bold font-montserrat text-[#121E3C]/40">
        {getInitials(review.reviewer_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h4 className="text-sm font-medium font-montserrat text-[#121E3C] truncate">{review.reviewer_name}</h4>
          <span className="text-[10px] text-gray-300 font-lato shrink-0">{formatDate(review.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex gap-0.5">{renderStarsDark(review.rating, 12)}</div>
          {review.job_title && (
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full font-lato truncate max-w-[120px]">{review.job_title}</span>
          )}
        </div>
      </div>
    </div>

    {review.comment && (
      <p className="text-gray-500 text-sm font-lato leading-relaxed line-clamp-3">{review.comment}</p>
    )}

    {!compact && review.response && (
      <div className="bg-[#34D164]/5 border border-[#34D164]/10 rounded-xl p-4 mt-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 bg-[#34D164]/15 rounded-md flex items-center justify-center">
            <User size={9} className="text-[#34D164]" />
          </div>
          <span className="text-xs font-medium text-[#121E3C] font-montserrat">Response from {tradespersonName}</span>
        </div>
        <p className="text-gray-500 text-xs font-lato leading-relaxed">{review.response}</p>
      </div>
    )}

    {!compact && (
      <div className="flex items-center mt-3 pt-3 border-t border-gray-50">
        <button className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-[#34D164] transition-colors font-lato">
          <ThumbsUp size={11} />
          Helpful ({review.helpful_count || 0})
        </button>
      </div>
    )}
  </div>
);

export default TradespersonProfilePage;
