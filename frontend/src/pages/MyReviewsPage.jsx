import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Star, Calendar, MapPin, Edit, Trash2, MessageCircle, 
  ThumbsUp, Eye, User, Briefcase, Clock, AlertCircle 
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
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

  // Helper function to check if user is homeowner
  const isHomeowner = () => user?.role === 'homeowner';

  useEffect(() => {
    if (isAuthenticated && isHomeowner()) {
      loadMyReviews();
    }
  }, [isAuthenticated, user]);

  const loadMyReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getMyReviews({ limit: 50 });
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
      published: { label: 'Published', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800' },
      moderated: { label: 'Under Review', className: 'bg-blue-100 text-blue-800' },
      flagged: { label: 'Flagged', className: 'bg-red-100 text-red-800' },
      hidden: { label: 'Hidden', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status] || statusConfig.published;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  if (!isHomeowner()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                My Reviews
              </h1>
              <p className="text-gray-600 font-lato">
                Manage your reviews and feedback for tradespeople you've worked with.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average Rating</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ThumbsUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Helpful Votes</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalHelpfulVotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reviews List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
                <p className="text-gray-600 font-lato">Loading your reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Star size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-gray-600 font-lato mb-6">
                    You haven't left any reviews yet. When you complete jobs and work with tradespeople, you can leave reviews to help other homeowners.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/my-jobs'}
                    className="text-white font-lato"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    <Briefcase size={16} className="mr-2" />
                    View My Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <CardTitle className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                              {review.title}
                            </CardTitle>
                            {getStatusBadge(review.status)}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato mb-3">
                            <span className="flex items-center">
                              <User size={14} className="mr-1" />
                              {review.reviewee_name}
                            </span>
                            <span className="flex items-center">
                              <Briefcase size={14} className="mr-1" />
                              {review.job_title}
                            </span>
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
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
                        
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => handleEditReview(review)}
                            variant="outline"
                            size="sm"
                            className="font-lato"
                          >
                            <Edit size={14} className="mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-gray-700 font-lato mb-4 line-clamp-3">
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
                          <div className="flex space-x-2">
                            {review.photos.slice(0, 3).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Review photo ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ))}
                            {review.photos.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-600">
                                +{review.photos.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 text-sm text-gray-500">
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
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-center mb-2">
                            <User size={14} className="mr-2 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">
                              {review.reviewee_name} responded:
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatDate(review.response_date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{review.response}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
      
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