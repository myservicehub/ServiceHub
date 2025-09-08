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
    return `${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/wallet/payment-proof/${filename}`;
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
  }
};