import apiClient from './client';

// Jobs API endpoints
export const jobsAPI = {
  // Create a new job
  createJob: async (jobData) => {
    const response = await apiClient.post('/jobs', jobData);
    return response.data;
  },

  // Get all jobs with filters
  getAllJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs', { params });
    return response.data;
  },

  // Get jobs for current user
  getMyJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs/my-jobs', { params });
    return response.data;
  },

  // Get a specific job by ID
  getJobById: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  // Update a job
  updateJob: async (jobId, jobData) => {
    const response = await apiClient.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },

  // Delete a job
  deleteJob: async (jobId) => {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  },

  // Close a job
  closeJob: async (jobId) => {
    const response = await apiClient.put(`/jobs/${jobId}/close`);
    return response.data;
  },

  // Reopen a job
  reopenJob: async (jobId) => {
    const response = await apiClient.put(`/jobs/${jobId}/reopen`);
    return response.data;
  },

  // Complete a job
  completeJob: async (jobId) => {
    const response = await apiClient.put(`/jobs/${jobId}/complete`);
    return response.data;
  },

  // Get job statistics
  getJobStats: async () => {
    const response = await apiClient.get('/jobs/stats');
    return response.data;
  },

  // Search jobs
  searchJobs: async (searchParams) => {
    const response = await apiClient.get('/jobs/search', { params: searchParams });
    return response.data;
  },

  // Get jobs by category
  getJobsByCategory: async (category, params = {}) => {
    const response = await apiClient.get(`/jobs/category/${category}`, { params });
    return response.data;
  },

  // Get jobs by location
  getJobsByLocation: async (location, params = {}) => {
    const response = await apiClient.get(`/jobs/location/${location}`, { params });
    return response.data;
  }
};

export default jobsAPI;