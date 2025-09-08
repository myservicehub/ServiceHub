import apiClient from './client';

export const referralsAPI = {
  // Get my referral statistics and code
  async getMyStats() {
    const response = await apiClient.get('/referrals/my-stats');
    return response.data;
  },

  // Get list of users I have referred
  async getMyReferrals(skip = 0, limit = 10) {
    const response = await apiClient.get(`/referrals/my-referrals?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Submit verification documents
  async submitVerificationDocuments(documentType, fullName, documentNumber, documentImageFile) {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('full_name', fullName);
    formData.append('document_number', documentNumber);
    formData.append('document_image', documentImageFile);
    
    const response = await apiClient.post('/referrals/verify-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get wallet with referral information
  async getWalletWithReferrals() {
    const response = await apiClient.get('/referrals/wallet-with-referrals');
    return response.data;
  },

  // Check withdrawal eligibility
  async checkWithdrawalEligibility() {
    const response = await apiClient.get('/referrals/withdrawal-eligibility');
    return response.data;
  },

  // Get verification document image URL
  getDocumentUrl(filename) {
    return `${process.env.REACT_APP_BACKEND_URL}/api/referrals/verification-document/${filename}`;
  }
};

// Admin referral management API
export const adminReferralsAPI = {
  // Get pending verifications
  async getPendingVerifications(skip = 0, limit = 20) {
    const response = await apiClient.get(`/admin/verifications/pending?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Approve verification
  async approveVerification(verificationId, adminNotes = '') {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    
    const response = await apiClient.post(`/admin/verifications/${verificationId}/approve`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Reject verification
  async rejectVerification(verificationId, adminNotes) {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    
    const response = await apiClient.post(`/admin/verifications/${verificationId}/reject`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get verification details
  async getVerificationDetails(verificationId) {
    const response = await apiClient.get(`/admin/verifications/${verificationId}`);
    return response.data;
  },

  // Get verification document image URL (admin)
  getDocumentUrl(filename) {
    return `${import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL}/api/admin/verifications/document/${filename}`;
  }
};