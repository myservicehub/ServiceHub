import apiClient from './client';

const careersAPI = {
  // Public APIs for career page
  getJobPostings: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.department) queryParams.append('department', params.department);
    if (params.job_type) queryParams.append('job_type', params.job_type);
    if (params.location) queryParams.append('location', params.location);
    if (params.featured_only) queryParams.append('featured_only', params.featured_only);
    
    const queryString = queryParams.toString();
    const response = await apiClient.get(`/public/content/jobs${queryString ? '?' + queryString : ''}`);
    return response.data;
  },

  getJobBySlug: async (slug) => {
    const response = await apiClient.get(`/public/content/jobs/${slug}`);
    return response.data;
  },

  getFeaturedJobs: async (limit = 3) => {
    const response = await apiClient.get(`/public/content/jobs/featured?limit=${limit}`);
    return response.data;
  },

  getJobDepartments: async () => {
    const response = await apiClient.get('/public/content/jobs/departments');
    return response.data;
  },

  applyToJob: async (jobId, applicationData) => {
    const response = await apiClient.post(`/public/content/jobs/${jobId}/apply`, applicationData);
    return response.data;
  },

  // Admin APIs for job management (requires admin authentication)
  admin: {
    getJobPostings: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.department) queryParams.append('department', params.department);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      const response = await apiClient.get(`/admin/jobs/postings${queryString ? '?' + queryString : ''}`);
      return response.data;
    },

    createJobPosting: async (jobData) => {
      const response = await apiClient.post('/admin/jobs/postings', jobData);
      return response.data;
    },

    getJobPosting: async (jobId) => {
      const response = await apiClient.get(`/admin/jobs/postings/${jobId}`);
      return response.data;
    },

    updateJobPosting: async (jobId, updateData) => {
      const response = await apiClient.put(`/admin/jobs/postings/${jobId}`, updateData);
      return response.data;
    },

    deleteJobPosting: async (jobId) => {
      const response = await apiClient.delete(`/admin/jobs/postings/${jobId}`);
      return response.data;
    },

    publishJobPosting: async (jobId) => {
      const response = await apiClient.post(`/admin/jobs/postings/${jobId}/publish`);
      return response.data;
    },

    getJobApplications: async (params = {}) => {
      const queryParams = new URLSearchParams();
      if (params.skip) queryParams.append('skip', params.skip);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.job_id) queryParams.append('job_id', params.job_id);
      if (params.status) queryParams.append('status', params.status);
      
      const queryString = queryParams.toString();
      const response = await apiClient.get(`/admin/jobs/applications${queryString ? '?' + queryString : ''}`);
      return response.data;
    },

    updateJobApplication: async (applicationId, updateData) => {
      const response = await apiClient.put(`/admin/jobs/applications/${applicationId}`, updateData);
      return response.data;
    },

    getJobStatistics: async () => {
      const response = await apiClient.get('/admin/jobs/statistics');
      return response.data;
    },
  }
};

export default careersAPI;