import apiClient from './client';

// Reviews API endpoints
export const reviewsAPI = {
  // Get all reviews (admin use)
  getAllReviews: async (params = {}) => {
    const { page = 1, limit = 10, min_rating } = params;
    const response = await apiClient.get('/reviews', {
      params: {
        page,
        limit,
        ...(min_rating ? { min_rating } : {})
      }
    });
    return response.data;
  },
  // Create a new review
  createReview: async (reviewData) => {
    const response = await apiClient.post('/reviews/create', reviewData);
    return response.data;
  },

  // Get reviews for a user
  getUserReviews: async (userId, params = {}) => {
    const { reviewType, page = 1, limit = 10 } = params;
    const queryParams = { page, limit };
    if (reviewType) queryParams.review_type = reviewType;
    
    const response = await apiClient.get(`/reviews/user/${userId}`, {
      params: queryParams
    });
    return response.data;
  },

  // Get reviews for a specific job
  getJobReviews: async (jobId) => {
    const response = await apiClient.get(`/reviews/job/${jobId}`);
    return response.data;
  },

  // Get review summary for a user
  getReviewSummary: async (userId) => {
    const response = await apiClient.get(`/reviews/summary/${userId}`);
    return response.data;
  },

  // Respond to a review
  respondToReview: async (reviewId, responseData) => {
    const response = await apiClient.post(`/reviews/respond/${reviewId}`, responseData);
    return response.data;
  },

  // Update a review
  updateReview: async (reviewId, updateData) => {
    const response = await apiClient.put(`/reviews/update/${reviewId}`, updateData);
    return response.data;
  },

  // Mark review as helpful
  markReviewHelpful: async (reviewId) => {
    const response = await apiClient.post(`/reviews/helpful/${reviewId}`);
    return response.data;
  },

  // Get platform review statistics
  getPlatformStats: async () => {
    const response = await apiClient.get('/reviews/stats/platform');
    return response.data;
  },

  // Check if user can review another user for a job
  canReviewUser: async (revieweeId, jobId) => {
    const response = await apiClient.get(`/reviews/can-review/${revieweeId}/${jobId}`);
    return response.data;
  },

  // Get current user's reviews
  getMyReviews: async (params = {}) => {
    const { page = 1, limit = 10 } = params;
    const response = await apiClient.get('/reviews/my-reviews', {
      params: { page, limit }
    });
    return response.data;
  },

  // Get reviews received by current tradesperson
  getReceivedReviews: async (params = {}) => {
    const { page = 1, limit = 10 } = params;
    const response = await apiClient.get('/reviews/received', {
      params: { page, limit }
    });
    return response.data;
  }
};

// Review utility functions
export const ReviewUtils = {
  // Format rating display
  formatRating: (rating) => {
    return Number(rating).toFixed(1);
  },

  // Generate star display
  generateStars: (rating, maxStars = 5) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
    
    return {
      full: fullStars,
      half: hasHalfStar ? 1 : 0,
      empty: emptyStars,
      display: '⭐'.repeat(fullStars) + (hasHalfStar ? '⭐' : '') + '☆'.repeat(emptyStars)
    };
  },

  // Format review date
  formatReviewDate: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  // Get review type display name
  getReviewTypeDisplay: (reviewType) => {
    const types = {
      'homeowner_to_tradesperson': 'Review of Tradesperson',
      'tradesperson_to_homeowner': 'Review of Homeowner'
    };
    return types[reviewType] || reviewType;
  },

  // Calculate recommendation text
  getRecommendationText: (percentage) => {
    if (percentage >= 90) return 'Highly Recommended';
    if (percentage >= 75) return 'Recommended';
    if (percentage >= 60) return 'Generally Recommended';
    if (percentage >= 40) return 'Mixed Reviews';
    return 'Not Recommended';
  },

  // Get rating color class
  getRatingColor: (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 3.0) return 'text-yellow-600';
    return 'text-red-500';
  },

  // Get rating background color
  getRatingBgColor: (rating) => {
    if (rating >= 4.5) return 'bg-green-100';
    if (rating >= 4.0) return 'bg-green-50';
    if (rating >= 3.5) return 'bg-yellow-50';
    if (rating >= 3.0) return 'bg-yellow-100';
    return 'bg-red-50';
  },

  // Truncate review content
  truncateContent: (content, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  },

  // Validate review data
  validateReviewData: (reviewData) => {
    const errors = {};
    
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.rating = 'Rating must be between 1 and 5 stars';
    }
    
    if (!reviewData.title || reviewData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }
    
    if (!reviewData.content || reviewData.content.length < 10) {
      errors.content = 'Review content must be at least 10 characters';
    }
    
    if (reviewData.title && reviewData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }
    
    if (reviewData.content && reviewData.content.length > 1000) {
      errors.content = 'Review content must be less than 1000 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Review categories for Nigerian market
export const ReviewCategories = {
  quality: {
    label: 'Quality of Work',
    description: 'How satisfied were you with the quality?',
    icon: '🔧'
  },
  timeliness: {
    label: 'Timeliness',
    description: 'Did they complete work on time?',
    icon: '⏰'
  },
  communication: {
    label: 'Communication',
    description: 'How well did they communicate?',
    icon: '💬'
  },
  professionalism: {
    label: 'Professionalism',
    description: 'How professional were they?',
    icon: '👔'
  },
  value_for_money: {
    label: 'Value for Money',
    description: 'Was the service worth the cost?',
    icon: '💰'
  }
};

export default reviewsAPI;