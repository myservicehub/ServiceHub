import apiClient from './client';

// Authentication API
export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  registerHomeowner: async (registrationData) => {
    const response = await apiClient.post('/auth/register/homeowner', registrationData);
    return response.data;
  },

  registerTradesperson: async (registrationData) => {
    const response = await apiClient.post('/auth/register/tradesperson', registrationData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },

  updateTradespersonProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile/tradesperson', profileData);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/password-reset-request', { email });
    return response.data;
  },
};

// Statistics API
export const statsAPI = {
  getStats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get('/stats/categories');
    return response.data;
  },
};

// Portfolio API
export const portfolioAPI = {
  uploadImage: async (formData) => {
    const response = await apiClient.post('/portfolio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyPortfolio: async () => {
    const response = await apiClient.get('/portfolio/my-portfolio');
    return response.data;
  },

  getTradespersonPortfolio: async (tradespersonId) => {
    const response = await apiClient.get(`/portfolio/tradesperson/${tradespersonId}`);
    return response.data;
  },

  updatePortfolioItem: async (itemId, updateData) => {
    const response = await apiClient.put(`/portfolio/${itemId}`, null, {
      params: updateData
    });
    return response.data;
  },

  deletePortfolioItem: async (itemId) => {
    const response = await apiClient.delete(`/portfolio/${itemId}`);
    return response.data;
  },

  getAllPublicPortfolio: async (params = {}) => {
    const response = await apiClient.get('/portfolio/', { params });
    return response.data;
  },
};

// Interests API (Lead Generation System)
export const interestsAPI = {
  showInterest: async (jobId) => {
    const response = await apiClient.post('/interests/show-interest', { job_id: jobId });
    return response.data;
  },

  getJobInterestedTradespeople: async (jobId) => {
    const response = await apiClient.get(`/interests/job/${jobId}`);
    return response.data;
  },

  shareContactDetails: async (interestId) => {
    const response = await apiClient.put(`/interests/share-contact/${interestId}`);
    return response.data;
  },

  getMyInterests: async () => {
    const response = await apiClient.get('/interests/my-interests');
    return response.data;
  },

  payForAccess: async (interestId) => {
    const response = await apiClient.post(`/interests/pay-access/${interestId}`);
    return response.data;
  },

  getContactDetails: async (jobId) => {
    const response = await apiClient.get(`/interests/contact-details/${jobId}`);
    return response.data;
  },
};

// Jobs API
export const jobsAPI = {
  createJob: async (jobData) => {
    const response = await apiClient.post('/jobs/', jobData);
    return response.data;
  },

  getJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs', { params });
    return response.data;
  },

  getJob: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  getMyJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs/my-jobs', { params });
    return response.data;
  },

  searchJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs/search', { params });
    return response.data;
  },
};

// Tradespeople API
export const tradespeopleAPI = {
  createTradesperson: async (tradespersonData) => {
    const response = await apiClient.post('/tradespeople', tradespersonData);
    return response.data;
  },

  getTradespeople: async (params = {}) => {
    const response = await apiClient.get('/tradespeople', { params });
    return response.data;
  },

  getTradesperson: async (tradespersonId) => {
    const response = await apiClient.get(`/tradespeople/${tradespersonId}`);
    return response.data;
  },

  getTradespersonReviews: async (tradespersonId, params = {}) => {
    const response = await apiClient.get(`/tradespeople/${tradespersonId}/reviews`, { params });
    return response.data;
  },
};

// Quotes API
export const quotesAPI = {
  createQuote: async (quoteData) => {
    const response = await apiClient.post('/quotes', quoteData);
    return response.data;
  },

  getJobQuotes: async (jobId) => {
    const response = await apiClient.get(`/quotes/job/${jobId}`);
    return response.data;
  },

  getMyQuotes: async (params = {}) => {
    const response = await apiClient.get('/quotes/my-quotes', { params });
    return response.data;
  },

  updateQuoteStatus: async (quoteId, status) => {
    const response = await apiClient.put(`/quotes/${quoteId}/status`, { status });
    return response.data;
  },

  getQuoteSummary: async (jobId) => {
    const response = await apiClient.get(`/quotes/job/${jobId}/summary`);
    return response.data;
  },

  getAvailableJobs: async (params = {}) => {
    const response = await apiClient.get('/quotes/available-jobs', { params });
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  createReview: async (reviewData) => {
    const response = await apiClient.post('/reviews', reviewData);
    return response.data;
  },

  getReviews: async (params = {}) => {
    const response = await apiClient.get('/reviews', { params });
    return response.data;
  },

  getFeaturedReviews: async (limit = 4) => {
    const response = await apiClient.get(`/reviews/featured?limit=${limit}`);
    return response.data;
  },
};