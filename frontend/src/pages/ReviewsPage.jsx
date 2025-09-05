import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import StarRating, { RatingSummary } from '../components/reviews/StarRating';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';
import { 
  Star, 
  MessageSquare, 
  ArrowLeft, 
  Filter, 
  SortDesc,
  Edit3,
  Plus,
  Award,
  TrendingUp
} from 'lucide-react';
import { reviewsAPI, ReviewUtils } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  
  const { userId } = useParams(); // For viewing other users' reviews
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentUserId = userId || user?.id;
  const isOwnProfile = !userId && isAuthenticated();

  useEffect(() => {
    if (!isAuthenticated() && !userId) {
      navigate('/');
      return;
    }
    loadReviewData();
  }, [currentUserId, activeTab, pagination.page]);

  const loadReviewData = async () => {
    if (!currentUserId) return;
    
    try {
      setLoading(true);

      // Load review summary
      const summary = await reviewsAPI.getReviewSummary(currentUserId);
      setReviewSummary(summary);

      // Load reviews based on active tab
      if (activeTab === 'received') {
        const reviewsData = await reviewsAPI.getUserReviews(currentUserId, {
          page: pagination.page,
          limit: 10
        });
        setReviews(reviewsData.reviews || []);
        setPagination(prev => ({
          ...prev,
          total: reviewsData.total,
          totalPages: reviewsData.total_pages
        }));
      } else if (activeTab === 'written' && isOwnProfile) {
        const myReviewsData = await reviewsAPI.getMyReviews({
          page: pagination.page,
          limit: 10
        });
        setMyReviews(myReviewsData.reviews || []);
        setPagination(prev => ({
          ...prev,
          total: myReviewsData.total,
          totalPages: myReviewsData.total_pages
        }));
      }

    } catch (error) {
      console.error('Failed to load review data:', error);
      toast({
        title: "Failed to load reviews",
        description: "There was an error loading review data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await reviewsAPI.markReviewHelpful(reviewId);
      toast({
        title: "Thank you!",
        description: "You've marked this review as helpful.",
      });
      loadReviewData(); // Refresh to show updated helpful count
    } catch (error) {
      toast({
        title: "Action failed",
        description: error.response?.data?.detail || "Could not mark review as helpful.",
        variant: "destructive",
      });
    }
  };

  const handleReplyToReview = async (reviewId, responseText) => {
    try {
      await reviewsAPI.respondToReview(reviewId, { response: responseText });
      toast({
        title: "Response posted!",
        description: "Your response has been added to the review.",
      });
      loadReviewData(); // Refresh to show the response
    } catch (error) {
      toast({
        title: "Failed to post response",
        description: error.response?.data?.detail || "Could not post your response.",
        variant: "destructive",
      });
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      if (editingReview) {
        await reviewsAPI.updateReview(editingReview.id, reviewData);
        toast({
          title: "Review updated!",
          description: "Your review has been successfully updated.",
        });
      } else {
        await reviewsAPI.createReview(reviewData);
        toast({
          title: "Review posted!",
          description: "Thank you for sharing your experience.",
        });
      }
      
      setShowReviewForm(false);
      setEditingReview(null);
      loadReviewData();
    } catch (error) {
      toast({
        title: editingReview ? "Failed to update review" : "Failed to post review",
        description: error.response?.data?.detail || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getReputationLevel = (rating, reviewCount) => {
    if (reviewCount < 5) return { level: 'New', color: 'text-gray-600', badge: '🌱' };
    if (rating >= 4.8) return { level: 'Outstanding', color: 'text-green-600', badge: '🏆' };
    if (rating >= 4.5) return { level: 'Excellent', color: 'text-green-500', badge: '⭐' };
    if (rating >= 4.0) return { level: 'Very Good', color: 'text-blue-500', badge: '👍' };
    if (rating >= 3.5) return { level: 'Good', color: 'text-yellow-500', badge: '👌' };
    return { level: 'Needs Improvement', color: 'text-red-500', badge: '📈' };
  };

  const reputation = reviewSummary ? getReputationLevel(reviewSummary.average_rating, reviewSummary.total_reviews) : null;

  if (!isAuthenticated() && !userId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Sign In Required
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              Please sign in to view and manage reviews.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="text-white font-lato"
              style={{backgroundColor: '#2F8140'}}
            >
              Go to Homepage
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (showReviewForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewForm(false);
                setEditingReview(null);
              }}
              className="mb-6 font-lato"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Reviews
            </Button>
            
            <ReviewForm
              jobId={editingReview?.job_id}
              revieweeId={editingReview?.reviewee_id}
              revieweeName={editingReview?.reviewee_name}
              jobTitle={editingReview?.job_title}
              onSubmit={handleReviewSubmit}
              onCancel={() => {
                setShowReviewForm(false);
                setEditingReview(null);
              }}
              initialData={editingReview}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            {userId && (
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="mb-4 font-lato"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                  {isOwnProfile ? 'My Reviews' : 'Reviews'}
                </h1>
                <p className="text-lg text-gray-600 font-lato">
                  {isOwnProfile ? 'Manage your reviews and reputation' : 'User reviews and ratings'}
                </p>
              </div>
              
              {reputation && (
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-2xl">{reputation.badge}</span>
                    <span className={`text-lg font-bold font-montserrat ${reputation.color}`}>
                      {reputation.level}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 font-lato">
                    Reputation Level
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Review Summary */}
          {reviewSummary && (
            <div className="mb-8">
              <RatingSummary
                averageRating={reviewSummary.average_rating}
                totalReviews={reviewSummary.total_reviews}
                ratingDistribution={reviewSummary.rating_distribution}
              />
              
              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-montserrat text-green-600">
                      {reviewSummary.recommendation_percentage}%
                    </div>
                    <div className="text-sm text-gray-600 font-lato">Recommend Rate</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-montserrat text-blue-600">
                      {reviewSummary.verified_reviews_count}
                    </div>
                    <div className="text-sm text-gray-600 font-lato">Verified Reviews</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                      {Object.keys(reviewSummary.category_averages).length}
                    </div>
                    <div className="text-sm text-gray-600 font-lato">Categories Rated</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received" className="font-lato">
                Reviews Received ({reviewSummary?.total_reviews || 0})
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="written" className="font-lato">
                  Reviews Written
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="received" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
                  <p className="text-gray-600 font-lato">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Star size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
                      No reviews yet
                    </h3>
                    <p className="text-gray-600 font-lato">
                      {isOwnProfile 
                        ? "Complete jobs to start receiving reviews from clients."
                        : "This user hasn't received any reviews yet."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onReply={handleReplyToReview}
                      onEdit={handleEditReview}
                      onMarkHelpful={handleMarkHelpful}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="written" className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
                    <p className="text-gray-600 font-lato">Loading your reviews...</p>
                  </div>
                ) : myReviews.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Edit3 size={48} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
                        No reviews written
                      </h3>
                      <p className="text-gray-600 font-lato">
                        You haven't written any reviews yet. Help the community by sharing your experiences!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {myReviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        onEdit={handleEditReview}
                        onMarkHelpful={handleMarkHelpful}
                        showActions={true}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    onClick={() => handlePageChange(page)}
                    style={pagination.page === page ? {backgroundColor: '#2F8140'} : {}}
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ReviewsPage;