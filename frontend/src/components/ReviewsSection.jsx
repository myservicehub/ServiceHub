import React from 'react';
import { Card, CardContent } from './ui/card';
import { Star, MapPin } from 'lucide-react';
import { reviewsAPI } from '../api/services';
import { useAPI } from '../hooks/useAPI';

const ReviewsSection = () => {
  const { data: reviews, loading, error } = useAPI(() => reviewsAPI.getFeaturedReviews(4));

  // Fallback data while loading or on error
  const defaultReviews = [
    {
      homeowner_name: 'Sarah Johnson',
      location: 'London',
      rating: 5,
      title: 'Kitchen renovation',
      comment: 'Absolutely fantastic work! The tradesperson was professional, punctual, and delivered exactly what was promised. Highly recommend.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      homeowner_name: 'Michael Brown',
      location: 'Manchester',
      rating: 5,
      title: 'Bathroom installation',
      comment: 'Excellent service from start to finish. Great communication throughout the project and finished to a very high standard.',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      homeowner_name: 'Emma Wilson',
      location: 'Birmingham',
      rating: 5,
      title: 'Garden landscaping',
      comment: 'Transformed our garden completely! The attention to detail was amazing and the final result exceeded our expectations.',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      homeowner_name: 'David Smith',
      location: 'Leeds',
      rating: 5,
      title: 'Roof repair',
      comment: 'Quick response to our emergency roof leak. Professional work and fair pricing. Will definitely use again for future projects.',
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  // Use real reviews if available, otherwise use defaults
  const displayReviews = reviews || defaultReviews;

  if (error) {
    console.warn('Failed to load reviews, using defaults:', error);
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Millions of genuine reviews
            </h2>
            <p className="text-xl text-gray-600">
              Reviews on MyBuilder are written by customers like you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse mr-3"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-24"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                    <div className="flex items-center mb-2">
                      <div className="flex mr-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-1"></div>
                        ))}
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              displayReviews.slice(0, 4).map((review, index) => (
                <Card key={review.id || index} className="bg-white hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        {getInitials(review.homeowner_name)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{review.homeowner_name}</h4>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin size={12} className="mr-1" />
                          {review.location}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center mb-2">
                      <div className="flex mr-2">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                    </div>

                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {review.title}
                    </p>

                    <p className="text-sm text-gray-600 line-clamp-4">
                      "{review.comment}"
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Join thousands of satisfied homeowners who found their perfect tradesperson on MyBuilder
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
              <span className="bg-white px-3 py-1 rounded-full">⭐ 4.8/5 average rating</span>
              <span className="bg-white px-3 py-1 rounded-full">🔒 Verified reviews</span>
              <span className="bg-white px-3 py-1 rounded-full">✅ Quality guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;