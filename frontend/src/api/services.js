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

  getTradeCategories: async () => {
    const response = await apiClient.get('/auth/trade-categories');
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

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  // Phone verification via OTP
  sendPhoneOTP: async (phone = null) => {
    const response = await apiClient.post('/auth/send-phone-otp', { phone });
    return response.data;
  },

  verifyPhoneOTP: async (otpCode, phone = null) => {
    const response = await apiClient.post('/auth/verify-phone-otp', { otp_code: otpCode, phone });
    return response.data;
  },

  // Email verification via OTP
  sendEmailOTP: async (email = null) => {
    const response = await apiClient.post('/auth/send-email-otp', { email });
    return response.data;
  },

  verifyEmailOTP: async (otpCode, email = null) => {
    const response = await apiClient.post('/auth/verify-email-otp', { otp_code: otpCode, email });
    return response.data;
  },

  confirmEmailVerification: async (token) => {
    const response = await apiClient.get(`/auth/email-verification/confirm?token=${encodeURIComponent(token)}`);
    return response.data;
  },

  getTradespersonVerificationStatus: async () => {
    const response = await apiClient.get('/auth/tradesperson-verification/status');
    return response.data;
  },

  uploadCertificationImage: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post('/auth/profile/certification-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  submitTradespersonVerification: async (payload) => {
    const formData = new FormData();
    if (payload.business_type) formData.append('business_type', payload.business_type);
    if (payload.id_document) formData.append('id_document', payload.id_document);
    if (payload.id_selfie) formData.append('id_selfie', payload.id_selfie);
    if (payload.proof_of_address) formData.append('proof_of_address', payload.proof_of_address);
    if (payload.residential_address) formData.append('residential_address', payload.residential_address);
    if (Array.isArray(payload.work_photos)) {
      payload.work_photos.forEach((f) => { if (f) formData.append('work_photos', f); });
    }
    if (payload.trade_certificate) formData.append('trade_certificate', payload.trade_certificate);
    if (payload.cac_certificate) formData.append('cac_certificate', payload.cac_certificate);
    if (payload.cac_status_report) formData.append('cac_status_report', payload.cac_status_report);
    if (payload.company_address) formData.append('company_address', payload.company_address);
    if (payload.director_name) formData.append('director_name', payload.director_name);
    if (payload.director_id_document) formData.append('director_id_document', payload.director_id_document);
    if (payload.company_bank_name) formData.append('company_bank_name', payload.company_bank_name);
    if (payload.company_account_number) formData.append('company_account_number', payload.company_account_number);
    if (payload.company_account_name) formData.append('company_account_name', payload.company_account_name);
    if (payload.tin) formData.append('tin', payload.tin);
    if (payload.business_logo) formData.append('business_logo', payload.business_logo);
    if (payload.bn_certificate) formData.append('bn_certificate', payload.bn_certificate);
    if (payload.partnership_agreement) formData.append('partnership_agreement', payload.partnership_agreement);
    if (Array.isArray(payload.partner_id_documents)) {
      payload.partner_id_documents.forEach((f) => { if (f) formData.append('partner_id_documents', f); });
    }
    if (payload.llp_certificate) formData.append('llp_certificate', payload.llp_certificate);
    if (payload.llp_agreement) formData.append('llp_agreement', payload.llp_agreement);
    if (payload.designated_partners) formData.append('designated_partners', payload.designated_partners);
    const response = await apiClient.post('/auth/tradesperson-verification', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Account deletion
  deleteAccount: async () => {
    const response = await apiClient.delete('/auth/account');
    return response.data;
  },
};

// Statistics API
export const statsAPI = {
  getStats: async () => {
    const response = await apiClient.get('/stats');
    const d = response.data || {};
    // Normalize stats shape to ensure numeric fields and consistent keys
    return {
      ...d,
      total_tradespeople: Number(d.total_tradespeople ?? d.totalTradespeople ?? 0),
      total_categories: Number(d.total_categories ?? d.totalCategories ?? d.categories_count ?? 0),
      total_reviews: Number(d.total_reviews ?? d.totalReviews ?? 0),
    };
  },

  getCategories: async () => {
    const response = await apiClient.get('/stats/categories');
    const data = response.data;
    // Always return an array of categories
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.categories)) return data.categories;
    return [];
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

  getCompletedJobs: async () => {
    const response = await apiClient.get('/interests/completed-jobs');
    return response.data;
  },
};

// Jobs API
export const jobsAPI = {
  apiClient, // Export apiClient for direct access
  
  createJob: async (jobData) => {
    const response = await apiClient.post('/jobs/', jobData);
    return response.data;
  },

  registerAndPost: async (payload) => {
    const response = await apiClient.post('/jobs/register-and-post', payload);
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

  // Text-based search that supports string location (e.g., state names)
  searchJobsText: async (params = {}) => {
    const response = await apiClient.get('/jobs/search-text', { params });
    return response.data;
  },

  updateJob: async (jobId, jobData) => {
    const response = await apiClient.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },

  closeJob: async (jobId, closeData) => {
    const response = await apiClient.put(`/jobs/${jobId}/close`, closeData);
    return response.data;
  },

  reopenJob: async (jobId) => {
    const response = await apiClient.put(`/jobs/${jobId}/reopen`);
    return response.data;
  },

  getCloseReasons: async () => {
    const response = await apiClient.get('/jobs/close-reasons');
    return response.data;
  },


};

// Tradespeople API
export const tradespeopleAPI = {
  createTradesperson: async (tradespersonData) => {
    const response = await apiClient.post('/tradespeople/', tradespersonData);
    return response.data;
  },

  getTradespeople: async (params = {}) => {
    const response = await apiClient.get('/tradespeople/', { params });
    return response.data;
  },

  getAllTradespeople: async (params = {}) => {
    const response = await apiClient.get('/tradespeople/', { params });
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
    const data = response.data;
    // Normalize to always return an array
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.reviews)) return data.reviews;
    return [];
  },
};
