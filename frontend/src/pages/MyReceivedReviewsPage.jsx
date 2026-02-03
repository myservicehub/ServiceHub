import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Star, Calendar, MapPin, User, MessageSquare, Award, CheckCircle2, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              My Received Reviews
            </h1>
            <p className="text-gray-600 font-lato">
              Reviews and feedback from homeowners who hired you
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Request External Review
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 font-lato">Loading your reviews...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 font-lato">Total Reviews</p>
                      <p className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                        {stats.totalReviews}
                      </p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 font-lato">Average Rating</p>
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-bold font-montserrat text-yellow-600">
                          {stats.averageRating}
                        </p>
                        <div className="flex">
                          {renderStars(Math.round(stats.averageRating))}
                        </div>
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 font-lato">5-Star Reviews</p>
                      <p className="text-3xl font-bold font-montserrat text-green-600">
                        {stats.fiveStars}
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 font-lato">Rating Breakdown</p>
                      <div className="text-sm text-gray-600 font-lato">
                        <div>5★: {stats.fiveStars} • 4★: {stats.fourStars}</div>
                        <div>3★: {stats.threeStars} • 2★: {stats.twoStars} • 1★: {stats.oneStar}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold font-montserrat mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600 font-lato">
                    You haven't received any reviews from homeowners yet. 
                    Complete jobs and provide excellent service to start receiving reviews!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-montserrat flex items-center gap-2">
                              {review.reviewer_name || 'Anonymous Homeowner'}
                              {review.is_verified_external && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified External
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {renderStars(review.rating)}
                              </div>
                              <Badge className={getStatusBadgeColor(review.rating)}>
                                {review.rating} Stars
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500 font-lato">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(review.content || review.comment) && (
                        <div className="mb-4">
                          <p className="text-gray-700 font-lato leading-relaxed bg-gray-50 p-3 rounded-lg">
                            "{review.content || review.comment}"
                          </p>
                        </div>
                      )}
                      
                      {review.title && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-800 font-montserrat">
                            "{review.title}"
                          </h4>
                        </div>
                      )}
                      
                      {review.job_title && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-lato">
                          <MapPin className="h-4 w-4" />
                          <span>Job: {review.job_title}</span>
                          {review.job_location && (
                            <>
                              <span>•</span>
                              <span>{review.job_location}</span>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
      
      <RequestExternalReviewModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default MyReceivedReviewsPage;