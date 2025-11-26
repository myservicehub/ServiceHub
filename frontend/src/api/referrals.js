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
    return `${(process.env.REACT_APP_BACKEND_URL ? process.env.REACT_APP_BACKEND_URL + '/api' : (apiClient?.defaults?.baseURL || '/api'))}/referrals/verification-document/${filename}`;
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
    return `${(process.env.REACT_APP_BACKEND_URL ? process.env.REACT_APP_BACKEND_URL + '/api' : (apiClient?.defaults?.baseURL || '/api'))}/admin/verifications/document/${filename}`;
  }
};

// Tradespeople references verification API
export const verificationAPI = {
  // Submit tradesperson references
  async submitTradespersonReferences(payload) {
    const formData = new FormData();
    formData.append('work_referrer_name', payload.work_referrer_name);
    formData.append('work_referrer_phone', payload.work_referrer_phone);
    formData.append('work_referrer_company_email', payload.work_referrer_company_email);
    formData.append('work_referrer_company_name', payload.work_referrer_company_name);
    formData.append('work_referrer_relationship', payload.work_referrer_relationship);
    formData.append('character_referrer_name', payload.character_referrer_name);
    formData.append('character_referrer_phone', payload.character_referrer_phone);
    formData.append('character_referrer_email', payload.character_referrer_email);
    formData.append('character_referrer_relationship', payload.character_referrer_relationship);
    const response = await apiClient.post('/referrals/tradesperson-references', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Admin API for tradespeople references verification
export const adminVerificationAPI = {
  async getPendingTradespeopleVerifications(skip = 0, limit = 20) {
    const response = await apiClient.get(`/admin/tradespeople-verifications/pending?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  async approveTradespeopleVerification(verificationId, adminNotes = '') {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    const response = await apiClient.post(`/admin/tradespeople-verifications/${verificationId}/approve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async rejectTradespeopleVerification(verificationId, adminNotes) {
    const formData = new FormData();
    formData.append('admin_notes', adminNotes);
    const response = await apiClient.post(`/admin/tradespeople-verifications/${verificationId}/reject`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  // Build URL to view tradespeople verification files (work photos, documents)
  getTradespeopleVerificationFileUrl(filename) {
    const base = (process.env.REACT_APP_BACKEND_URL ? process.env.REACT_APP_BACKEND_URL + '/api' : (apiClient?.defaults?.baseURL || '/api'));
    return `${base}/admin/tradespeople-verifications/document/${filename}`;
  }
};
