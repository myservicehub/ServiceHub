import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Star, Calendar, MapPin, User, MessageSquare, Award, CheckCircle2, ExternalLink, Briefcase } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonLayout from '../layouts/TradespersonLayout';
import { reviewsAPI } from '../api/reviews';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import RequestExternalReviewModal from '../components/reviews/RequestExternalReviewModal';

const MyReceivedReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0
  });

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Check if we're inside the dashboard route
  const isInDashboard = location.pathname.startsWith('/trades');

  // Helper function to check if user is tradesperson
  const isTradesperson = () => user?.role === 'tradesperson';

  useEffect(() => {
    if (isAuthenticated && isTradesperson()) {
      loadReceivedReviews();
    }
  }, [isAuthenticated, user]);

  const loadReceivedReviews = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading received reviews for tradesperson...');
      
      const response = await reviewsAPI.getReceivedReviews();
      console.log('✅ Received reviews loaded:', response);
      
      setReviews(response.reviews || []);
      calculateStats(response.reviews || []);
    } catch (error) {
      console.error('❌ Error loading received reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load your received reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    const total = reviewsData.length;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalRating = 0;

    reviewsData.forEach(review => {
      const rating = review.rating;
      ratingCounts[rating]++;
      totalRating += rating;
    });

    const average = total > 0 ? (totalRating / total).toFixed(1) : 0;

    setStats({
      totalReviews: total,
      averageRating: average,
      fiveStars: ratingCounts[5],
      fourStars: ratingCounts[4],
      threeStars: ratingCounts[3],
      twoStars: ratingCounts[2],
      oneStar: ratingCounts[1]
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating 
            ? 'text-yellow-400 fill-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusBadgeColor = (rating) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800';
    if (rating >= 3.5) return 'bg-blue-100 text-blue-800';
    if (rating >= 2.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Please Login
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              You need to be logged in to view your reviews.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isTradesperson()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Tradesperson Access Only
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              This page is only available to tradespeople to view reviews they received.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const pageContent = (
    <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
      <div className={isInDashboard ? "" : "container mx-auto px-4 py-8"}>
        {/* Header - Simplified */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-[#121E3C]">
              My Reviews
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''} received
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#34D164] hover:bg-[#2ab854] text-white text-sm px-4 py-2 rounded-xl"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Request Review
          </Button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#34D164] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Loading your reviews...</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-[#121E3C]">{stats.totalReviews}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-2xl font-bold text-[#121E3C]">{stats.averageRating || '-'}★</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">5 Stars</p>
                    <p className="text-2xl font-bold text-[#121E3C]">{stats.fiveStars}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">4+ Stars</p>
                    <p className="text-2xl font-bold text-[#121E3C]">{stats.fiveStars + stats.fourStars}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No reviews yet</h3>
                <p className="text-gray-500 text-sm">
                  Complete jobs to start receiving reviews from homeowners.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const ratingColor = review.rating >= 4 ? 'text-green-500' : review.rating >= 3 ? 'text-amber-500' : 'text-red-500';
                  const ratingBg = review.rating >= 4 ? 'bg-green-50' : review.rating >= 3 ? 'bg-amber-50' : 'bg-red-50';
                  
                  return (
                    <div 
                      key={review.id} 
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      {/* Card Header */}
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Avatar with Rating */}
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#121E3C] to-[#1a2d54] flex items-center justify-center shrink-0">
                              <User className="w-7 h-7 text-white" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg ${ratingBg} flex items-center justify-center border-2 border-white shadow-sm`}>
                              <span className={`text-xs font-bold ${ratingColor}`}>{review.rating}</span>
                            </div>
                          </div>
                          
                          {/* Reviewer Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-[#121E3C]">
                                  {review.reviewer_name || 'Homeowner'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex gap-0.5">
                                    {renderStars(review.rating)}
                                  </div>
                                  {review.is_verified_external && (
                                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
                                      <CheckCircle2 size={10} className="mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg">
                                <Calendar size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-600">{new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Review Content */}
                        {(review.content || review.comment) && (
                          <div className="mt-4 relative">
                            <div className="absolute -left-1 top-0 text-4xl text-[#34D164]/20 font-serif">"</div>
                            <p className="text-gray-700 pl-6 pr-2 py-2 text-sm leading-relaxed italic">
                              {review.content || review.comment}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Footer - Job Info */}
                      {review.job_title && (
                        <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                            <Briefcase size={14} className="text-[#121E3C]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#121E3C] truncate">{review.job_title}</p>
                            {review.job_location && (
                              <p className="text-xs text-gray-400">{review.job_location}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <RequestExternalReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
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

export default MyReceivedReviewsPage;