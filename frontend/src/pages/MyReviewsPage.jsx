import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Star, Calendar, MapPin, Edit, Trash2, MessageCircle, 
  ThumbsUp, Eye, User, Briefcase, Clock, AlertCircle 
} from 'lucide-react';
import ReviewForm from '../components/reviews/ReviewForm';
import { reviewsAPI } from '../api/reviews';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

const MyReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState(null);
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    totalHelpfulVotes: 0
  });

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Helper function to check if user is homeowner or tradesperson
  const isHomeowner = () => user?.role === 'homeowner';
  const isTradesperson = () => user?.role === 'tradesperson';

  useEffect(() => {
    if (isAuthenticated && (isHomeowner() || isTradesperson())) {
      loadMyReviews();
    }
  }, [isAuthenticated, user]);

  const loadMyReviews = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading reviews for user role:', user?.role);
      
      let response;
      if (isTradesperson()) {
        // Tradespeople see reviews they received
        response = await reviewsAPI.getReceivedReviews({ limit: 50 });
        console.log('✅ Received reviews loaded for tradesperson:', response);
      } else {
        // Homeowners see reviews they wrote
        response = await reviewsAPI.getMyReviews({ limit: 50 });
        console.log('✅ Written reviews loaded for homeowner:', response);
      }
      
      setReviews(response.reviews || []);
      
      // Calculate stats
      const reviews = response.reviews || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;
      const totalHelpfulVotes = reviews.reduce((sum, review) => sum + (review.helpful_count || 0), 0);
      
      setStats({
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        totalHelpfulVotes
      });
      
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast({
        title: "Failed to Load Reviews",
        description: "There was an error loading your reviews.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (review) => {
    setReviewToEdit(review);
    setShowEditModal(true);
  };

  const handleUpdateReview = async (reviewData) => {
    try {
      setSubmittingReview(true);
      
      await reviewsAPI.updateReview(reviewToEdit.id, {
        title: reviewData.title,
        content: reviewData.content,
        rating: reviewData.rating,
        category_ratings: reviewData.categoryRatings,
        photos: reviewData.photos,
        would_recommend: reviewData.wouldRecommend
      });
      
      toast({
        title: "Review Updated",
        description: "Your review has been updated successfully.",
      });
      
      setShowEditModal(false);
      setReviewToEdit(null);
      await loadMyReviews();
      
    } catch (error) {
      console.error('Failed to update review:', error);
      toast({
        title: "Failed to Update Review",
        description: error.response?.data?.detail || "There was an error updating your review.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        className={index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { label: 'Published', className: 'bg-[#34D164]/10 text-[#34D164]' },
      pending: { label: 'Pending Review', className: 'bg-amber-50 text-amber-600' },
      moderated: { label: 'Under Review', className: 'bg-blue-50 text-blue-600' },
      flagged: { label: 'Flagged', className: 'bg-red-50 text-red-500' },
      hidden: { label: 'Hidden', className: 'bg-gray-100 text-gray-500' }
    };
    
    const config = statusConfig[status] || statusConfig.published;
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
            Sign In Required
          </h1>
          <p className="text-gray-600 font-lato mb-6">
            Please sign in to view your reviews.
          </p>
        </div>
      </div>
    );
  }

  if (!isHomeowner()) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
            Homeowner Access Only
          </h1>
          <p className="text-gray-600 font-lato mb-6">
            This page is only available to homeowners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C]">
          My Reviews
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your reviews and feedback for tradespeople you've worked with.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#121E3C] overflow-hidden">
          <div className="p-2 bg-[#121E3C]/10 rounded-xl w-fit mb-3">
            <MessageCircle className="w-5 h-5 text-[#121E3C]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats.totalReviews}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Total Reviews</p>
        </div>
        
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-amber-400 overflow-hidden">
          <div className="p-2 bg-amber-50 rounded-xl w-fit mb-3">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats.averageRating}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Avg Rating</p>
        </div>
        
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#34D164] overflow-hidden">
          <div className="p-2 bg-[#34D164]/10 rounded-xl w-fit mb-3">
            <ThumbsUp className="w-5 h-5 text-[#34D164]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{stats.totalHelpfulVotes}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Helpful</p>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#34D164] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading your reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 mx-auto bg-[#121E3C]/5 rounded-2xl flex items-center justify-center mb-4">
            <Star size={28} className="text-[#121E3C]/40" />
          </div>
          <h3 className="text-base font-semibold text-[#121E3C] mb-1">No Reviews Yet</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
            When you complete jobs and work with tradespeople, you can leave reviews to help other homeowners.
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard/jobs'}
            className="bg-[#34D164] hover:bg-[#2FBD59] text-white"
          >
            <Briefcase size={16} className="mr-2" />
            View My Jobs
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-sm sm:text-base font-semibold text-[#121E3C] truncate">
                        {review.title}
                      </h3>
                      {getStatusBadge(review.status)}
                    </div>
                          
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {review.reviewee_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} />
                        {review.job_title}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-gray-600 font-lato">
                              {review.rating}/5 stars
                            </span>
                            {review.would_recommend && (
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                  <Button
                    onClick={() => handleEditReview(review)}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Edit size={14} className="mr-1" />
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {review.content}
                </p>
                      
                      {/* Category Ratings */}
                      {review.category_ratings && Object.keys(review.category_ratings).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Category Ratings:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(review.category_ratings).map(([category, rating]) => (
                              <div key={category} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 capitalize">{category.replace('_', ' ')}</span>
                                <div className="flex items-center">
                                  {renderStars(rating)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Photos */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Photos:</h4>
                          <div className="flex flex-wrap gap-2">
                            {review.photos.slice(0, 3).map((photo, index) => (
                              <div key={index} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                <img
                                  src={photo}
                                  alt={`Review photo ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {review.photos.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-600 flex-shrink-0">
                                +{review.photos.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 text-xs text-gray-400">
                        <span>
                          {review.helpful_count > 0 && (
                            <span className="flex items-center">
                              <ThumbsUp size={14} className="mr-1" />
                              {review.helpful_count} found this helpful
                            </span>
                          )}
                        </span>
                        
                        {review.response && (
                          <Badge variant="outline" className="text-xs">
                            <MessageCircle size={12} className="mr-1" />
                            Tradesperson Responded
                          </Badge>
                        )}
                      </div>
                      
                {/* Tradesperson Response */}
                {review.response && (
                  <div className="mt-4 p-3 bg-[#121E3C]/5 rounded-xl border-l-3 border-[#121E3C]">
                    <div className="flex items-center mb-1">
                      <User size={12} className="mr-1.5 text-[#121E3C]" />
                      <span className="text-xs font-semibold text-[#121E3C]">
                        {review.reviewee_name} responded:
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {formatDate(review.response_date)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{review.response}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {showEditModal && reviewToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ReviewForm
              jobId={reviewToEdit.job_id}
              revieweeId={reviewToEdit.reviewee_id}
              revieweeName={reviewToEdit.reviewee_name}
              jobTitle={reviewToEdit.job_title}
              loading={submittingReview}
              initialData={reviewToEdit}
              onSubmit={handleUpdateReview}
              onCancel={() => {
                setShowEditModal(false);
                setReviewToEdit(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
