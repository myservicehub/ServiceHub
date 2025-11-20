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

  async submitTradespersonVerification(payload) {
    const formData = new FormData();
    if (payload.business_type) formData.append('business_type', payload.business_type);
    if (payload.id_document) formData.append('id_document', payload.id_document);
    if (payload.id_selfie) formData.append('id_selfie', payload.id_selfie);
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
    const response = await apiClient.post('/referrals/tradesperson-verification', formData, {
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
};