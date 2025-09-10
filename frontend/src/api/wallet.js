import apiClient from './client';

export const walletAPI = {
  // Get wallet balance and recent transactions
  async getBalance() {
    const response = await apiClient.get('/wallet/balance');
    return response.data;
  },

  // Get bank details for funding
  async getBankDetails() {
    const response = await apiClient.get('/wallet/bank-details');
    return response.data;
  },

  // Fund wallet with payment proof
  async fundWallet(amountNaira, proofImageFile) {
    const formData = new FormData();
    formData.append('amount_naira', amountNaira);
    formData.append('proof_image', proofImageFile);
    
    const response = await apiClient.post('/wallet/fund', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get transaction history
  async getTransactions(skip = 0, limit = 20) {
    const response = await apiClient.get(`/wallet/transactions?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Check if balance is sufficient for access fee
  async checkBalance(accessFeeCoins) {
    const response = await apiClient.post(`/wallet/check-balance/${accessFeeCoins}`);
    return response.data;
  },

  // Get payment proof image
  getPaymentProofUrl(filename) {
    return `${process.env.REACT_APP_BACKEND_URL}/api/wallet/payment-proof/${filename}`;
  }
};

export const adminAPI = {
  // Admin login
  async login(username, password) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await apiClient.post('/admin/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get pending funding requests
  async getFundingRequests(skip = 0, limit = 20) {
    const response = await apiClient.get(`/admin/wallet/funding-requests?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Confirm funding request
  async confirmFunding(transactionId, adminNotes = '') {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    
    const response = await apiClient.post(`/admin/wallet/confirm-funding/${transactionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Reject funding request
  async rejectFunding(transactionId, adminNotes) {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    
    const response = await apiClient.post(`/admin/wallet/reject-funding/${transactionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get jobs with access fees
  async getJobsWithFees(skip = 0, limit = 20) {
    const response = await apiClient.get(`/admin/jobs/access-fees?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Update job access fee
  async updateJobAccessFee(jobId, accessFeeNaira) {
    const formData = new FormData();
    formData.append('access_fee_naira', accessFeeNaira);
    
    const response = await apiClient.put(`/admin/jobs/${jobId}/access-fee`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Comprehensive Job Management Methods
  async getAllJobsAdmin(skip = 0, limit = 50, status = null) {
    const params = { skip, limit };
    if (status) params.status = status;
    
    const response = await apiClient.get('/admin/jobs/all', { params });
    return response.data;
  },

  async getJobDetailsAdmin(jobId) {
    const response = await apiClient.get(`/admin/jobs/${jobId}/details`);
    return response.data;
  },

  async updateJobAdmin(jobId, jobData) {
    const response = await apiClient.put(`/admin/jobs/${jobId}`, jobData);
    return response.data;
  },

  async updateJobStatus(jobId, status) {
    const response = await apiClient.patch(`/admin/jobs/${jobId}/status`, { status });
    return response.data;
  },

  async deleteJob(jobId) {
    const response = await apiClient.delete(`/admin/jobs/${jobId}`);
    return response.data;
  },

  async getJobStatsAdmin() {
    const response = await apiClient.get('/admin/jobs/stats');
    return response.data;
  },

  // Get admin dashboard stats
  async getDashboardStats() {
    const response = await apiClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Get transaction details
  async getTransactionDetails(transactionId) {
    const response = await apiClient.get(`/admin/wallet/transaction/${transactionId}`);
    return response.data;
  },

  // Get payment proof image (admin)
  getPaymentProofUrl(filename) {
    return `${process.env.REACT_APP_BACKEND_URL}/api/admin/wallet/payment-proof/${filename}`;
  },

  // User Management Methods
  async getAllUsers(skip = 0, limit = 50, role = null, status = null, search = null) {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  async getUserDetails(userId) {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  async updateUserStatus(userId, status, adminNotes = '') {
    const formData = new FormData();
    formData.append('status', status);
    formData.append('admin_notes', adminNotes);
    
    const response = await apiClient.put(`/admin/users/${userId}/status`, formData);
    return response.data;
  },

  // Location Management Methods
  async getAllStates() {
    const response = await apiClient.get('/admin/locations/states');
    return response.data;
  },

  async addNewState(stateName, region = '', postcodes = '') {
    const formData = new FormData();
    formData.append('state_name', stateName);
    formData.append('region', region);
    formData.append('postcode_samples', postcodes);
    
    // Let axios set the correct Content-Type for FormData automatically
    const response = await apiClient.post('/admin/locations/states', formData, {
      headers: {
        'Content-Type': undefined, // This allows axios to set multipart/form-data with boundary
      },
    });
    return response.data;
  },

  async updateState(oldName, newName, region = '', postcodes = '') {
    const formData = new FormData();
    formData.append('new_name', newName);
    formData.append('region', region);
    formData.append('postcode_samples', postcodes);
    
    const response = await apiClient.put(`/admin/locations/states/${oldName}`, formData);
    return response.data;
  },

  async deleteState(stateName) {
    const response = await apiClient.delete(`/admin/locations/states/${stateName}`);
    return response.data;
  },

  async getAllLGAs() {
    const response = await apiClient.get('/admin/locations/lgas');
    return response.data;
  },

  async getLGAsForState(stateName) {
    const response = await apiClient.get(`/admin/locations/lgas/${stateName}`);
    return response.data;
  },

  async addNewLGA(stateName, lgaName, zipCodes = '') {
    const formData = new FormData();
    formData.append('state_name', stateName);
    formData.append('lga_name', lgaName);
    formData.append('zip_codes', zipCodes);
    
    const response = await apiClient.post('/admin/locations/lgas', formData);
    return response.data;
  },

  async updateLGA(stateName, oldName, newName, zipCodes = '') {
    const formData = new FormData();
    formData.append('new_name', newName);
    formData.append('zip_codes', zipCodes);
    
    const response = await apiClient.put(`/admin/locations/lgas/${stateName}/${oldName}`, formData);
    return response.data;
  },

  async deleteLGA(stateName, lgaName) {
    const response = await apiClient.delete(`/admin/locations/lgas/${stateName}/${lgaName}`);
    return response.data;
  },

  async getAllTowns() {
    const response = await apiClient.get('/admin/locations/towns');
    return response.data;
  },

  async addNewTown(stateName, lgaName, townName, zipCode = '') {
    const formData = new FormData();
    formData.append('state_name', stateName);
    formData.append('lga_name', lgaName);
    formData.append('town_name', townName);
    formData.append('zip_code', zipCode);
    
    const response = await apiClient.post('/admin/locations/towns', formData);
    return response.data;
  },

  async deleteTown(stateName, lgaName, townName) {
    const response = await apiClient.delete(`/admin/locations/towns/${stateName}/${lgaName}/${townName}`);
    return response.data;
  },

  // Trade Categories Management Methods
  async getAllTrades() {
    const response = await apiClient.get('/admin/trades');
    return response.data;
  },

  async addNewTrade(tradeName, group = 'General Services', description = '') {
    const formData = new FormData();
    formData.append('trade_name', tradeName);
    formData.append('group', group);
    formData.append('description', description);
    
    const response = await apiClient.post('/admin/trades', formData);
    return response.data;
  },

  async updateTrade(oldName, newName, group = '', description = '') {
    const formData = new FormData();
    formData.append('new_name', newName);
    formData.append('group', group);
    formData.append('description', description);
    
    const response = await apiClient.put(`/admin/trades/${oldName}`, formData);
    return response.data;
  },

  async deleteTrade(tradeName) {
    const response = await apiClient.delete(`/admin/trades/${tradeName}`);
    return response.data;
  },

  // Skills Test Questions Management
  async getAllSkillsQuestions() {
    const response = await apiClient.get('/admin/skills-questions');
    return response.data;
  },

  async getQuestionsForTrade(tradeCategory) {
    const response = await apiClient.get(`/admin/skills-questions/${encodeURIComponent(tradeCategory)}`);
    return response.data;
  },

  async addSkillsQuestion(tradeCategory, questionData) {
    const response = await apiClient.post(`/admin/skills-questions/${encodeURIComponent(tradeCategory)}`, questionData);
    return response.data;
  },

  async updateSkillsQuestion(questionId, questionData) {
    const response = await apiClient.put(`/admin/skills-questions/${questionId}`, questionData);
    return response.data;
  },

  async deleteSkillsQuestion(questionId) {
    const response = await apiClient.delete(`/admin/skills-questions/${questionId}`);
    return response.data;
  },

  // Policy Management Methods
  async getAllPolicies() {
    const response = await apiClient.get('/admin/policies');
    return response.data;
  },

  async getPolicyTypes() {
    const response = await apiClient.get('/admin/policies/types');
    return response.data;
  },

  async getPolicyByType(policyType) {
    const response = await apiClient.get(`/admin/policies/${policyType}`);
    return response.data;
  },

  async getPolicyHistory(policyType) {
    const response = await apiClient.get(`/admin/policies/${policyType}/history`);
    return response.data;
  },

  async createPolicy(policyData) {
    const response = await apiClient.post('/admin/policies', policyData);
    return response.data;
  },

  async updatePolicy(policyId, policyData) {
    const response = await apiClient.put(`/admin/policies/${policyId}`, policyData);
    return response.data;
  },

  async deletePolicy(policyId) {
    const response = await apiClient.delete(`/admin/policies/${policyId}`);
    return response.data;
  },

  async restorePolicyVersion(policyType, version) {
    const response = await apiClient.post(`/admin/policies/${policyType}/restore/${version}`);
    return response.data;
  },

  async archivePolicy(policyId) {
    const response = await apiClient.post(`/admin/policies/${policyId}/archive`);
    return response.data;
  },

  async activateScheduledPolicies() {
    const response = await apiClient.post('/admin/policies/activate-scheduled');
    return response.data;
  },

  // Contact Management Methods
  async getAllContacts() {
    const response = await apiClient.get('/admin/contacts');
    return response.data;
  },

  async getContactTypes() {
    const response = await apiClient.get('/admin/contacts/types');
    return response.data;
  },

  async getContactById(contactId) {
    const response = await apiClient.get(`/admin/contacts/${contactId}`);
    return response.data;
  },

  async createContact(contactData) {
    const response = await apiClient.post('/admin/contacts', contactData);
    return response.data;
  },

  async updateContact(contactId, contactData) {
    const response = await apiClient.put(`/admin/contacts/${contactId}`, contactData);
    return response.data;
  },

  async deleteContact(contactId) {
    const response = await apiClient.delete(`/admin/contacts/${contactId}`);
    return response.data;
  },

  async initializeDefaultContacts() {
    const response = await apiClient.post('/admin/contacts/initialize-defaults');
    return response.data;
  }
};

// Public API for skills test (no admin required)
export const skillsAPI = {
  async getQuestionsForTrade(tradeCategory) {
    const response = await apiClient.get(`/skills-questions/${encodeURIComponent(tradeCategory)}`);
    return response.data;
  }
};

// Public API for policies (no authentication required)
export const policiesAPI = {
  async getAllPolicies() {
    const response = await apiClient.get('/jobs/policies');
    return response.data;
  },

  async getPolicyByType(policyType) {
    const response = await apiClient.get(`/jobs/policies/${policyType}`);
    return response.data;
  }
};

// Public API for contacts (no authentication required)
export const contactsAPI = {
  async getAllContacts() {
    const response = await apiClient.get('/jobs/contacts');
    return response.data;
  },

  async getContactsByType(contactType) {
    const response = await apiClient.get(`/jobs/contacts/${contactType}`);
    return response.data;
  }
};