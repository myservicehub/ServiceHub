import apiClient from './client';

// Interests API endpoints
export const interestsAPI = {
  // Show interest in a job
  showInterest: async (jobId) => {
    const response = await apiClient.post(`/interests/show/${jobId}`);
    return response.data;
  },

  // Get interests for current user
  getMyInterests: async (params = {}) => {
    const response = await apiClient.get('/interests/my-interests', { params });
    return response.data;
  },

  // Get interested tradespeople for a job
  getJobInterestedTradespeople: async (jobId) => {
    const response = await apiClient.get(`/interests/job/${jobId}`);
    return response.data;
  },

  // Share contact details with interested tradesperson
  shareContactDetails: async (interestId) => {
    const response = await apiClient.put(`/interests/share-contact/${interestId}`);
    return response.data;
  },

  // Pay for access to job contact details
  payForAccess: async (interestId) => {
    const response = await apiClient.post(`/interests/pay-access/${interestId}`);
    return response.data;
  },

  // Get interest by ID
  getInterestById: async (interestId) => {
    const response = await apiClient.get(`/interests/${interestId}`);
    return response.data;
  },

  // Update interest status
  updateInterestStatus: async (interestId, status) => {
    const response = await apiClient.put(`/interests/${interestId}/status`, { status });
    return response.data;
  },

  // Get interest statistics
  getInterestStats: async () => {
    const response = await apiClient.get('/interests/stats');
    return response.data;
  }
};

export default interestsAPI;