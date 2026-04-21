import React, { useEffect, useState } from 'react';
import { X, Building2, Upload, FileText, CheckCircle, ArrowRight, Image, Users, Award, Shield, Clock, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { authAPI } from '../../api/services';
import { verificationAPI } from '../../api/referrals';

const BUSINESS_TYPES = [
  'Self-Employed / Sole Trader',
  'Limited Company (LTD)',
  'Ordinary Partnership',
  'Limited Liability Partnership (LLP)'
];

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'yandex.com',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
  'mail.com'
]);

const normalizeBusinessType = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (normalized.includes('self') && normalized.includes('sole')) return 'Self-Employed / Sole Trader';
  if (normalized.includes('limited') && normalized.includes('company')) return 'Limited Company (LTD)';
  if (normalized.includes('ordinary') && normalized.includes('partnership')) return 'Ordinary Partnership';
  if (normalized.includes('limited liability') || normalized.includes('(llp)')) return 'Limited Liability Partnership (LLP)';
  return raw;
};

const isValidEmailFormat = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const isWorkEmailDomain = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!isValidEmailFormat(normalized)) return false;
  const domain = normalized.split('@')[1] || '';
  return domain && !GENERIC_EMAIL_DOMAINS.has(domain);
};

const BusinessVerificationModal = ({ isOpen, onClose, onComplete }) => {
  const { user, getCurrentUser, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // null, 'pending', 'approved', 'rejected', 'not_submitted'
  const [statusLoading, setStatusLoading] = useState(false);
  const [businessType, setBusinessType] = useState(normalizeBusinessType(user?.business_type || ''));
  
  // Self-Employed fields
  const [residentialAddress, setResidentialAddress] = useState('');
  const [proofOfAddress, setProofOfAddress] = useState(null);
  const [workPhotos, setWorkPhotos] = useState([]);
  const [tradeCertificate, setTradeCertificate] = useState(null);
  const [workRef, setWorkRef] = useState({ name: '', phone: '', company_email: '', company_name: '', relationship: '' });
  const [charRef, setCharRef] = useState({ name: '', phone: '', email: '', relationship: '' });
  
  // LTD fields
  const [cacCertificate, setCacCertificate] = useState(null);
  const [cacStatusReport, setCacStatusReport] = useState(null);
  const [companyAddress, setCompanyAddress] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorIdDocument, setDirectorIdDocument] = useState(null);
  const [companyBankName, setCompanyBankName] = useState('');
  const [companyAccountNumber, setCompanyAccountNumber] = useState('');
  const [companyAccountName, setCompanyAccountName] = useState('');
  
  // Partnership fields
  const [bnCertificate, setBnCertificate] = useState(null);
  const [partnershipAgreement, setPartnershipAgreement] = useState(null);
  const [partnerIdDocuments, setPartnerIdDocuments] = useState([]);
  
  // LLP fields
  const [llpCertificate, setLlpCertificate] = useState(null);
  const [llpAgreement, setLlpAgreement] = useState(null);
  const [designatedPartners, setDesignatedPartners] = useState('');
  
  const [selfErrors, setSelfErrors] = useState({});
  const [refErrors, setRefErrors] = useState({});

  const focusFirstErrorField = (errors = {}) => {
    const [firstErrorKey] = Object.keys(errors || {});
    if (!firstErrorKey) return;
    const element = document.querySelector(`[data-field="${firstErrorKey}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  };

  const mapServerValidationErrors = (detail) => {
    const mappedRefErrors = {};
    let message = 'Failed to submit business verification';

    if (typeof detail === 'string') {
      message = detail;
      const detailLc = detail.toLowerCase();
      if (detailLc.includes('company email must be a work domain') || detailLc.includes('invalid company email format')) {
        mappedRefErrors.work_referrer_company_email = 'Use a valid work email (company domain), not a generic provider';
      }
      if (detailLc.includes('invalid work referee phone')) {
        mappedRefErrors.work_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
      }
      if (detailLc.includes('invalid character referee phone')) {
        mappedRefErrors.character_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
      }
    } else if (Array.isArray(detail)) {
      message = detail.map((err) => err?.msg || err?.message || 'Validation error').join(', ');
      detail.forEach((err) => {
        const loc = Array.isArray(err?.loc) ? err.loc.join('.') : '';
        const fieldName = String(loc || '').split('.').pop();
        if (!fieldName) return;
        if (fieldName === 'work_referrer_company_email') mappedRefErrors.work_referrer_company_email = err?.msg || 'Invalid company email';
        if (fieldName === 'work_referrer_phone') mappedRefErrors.work_referrer_phone = err?.msg || 'Invalid work referee phone';
        if (fieldName === 'character_referrer_phone') mappedRefErrors.character_referrer_phone = err?.msg || 'Invalid character referee phone';
        if (fieldName === 'character_referrer_email') mappedRefErrors.character_referrer_email = err?.msg || 'Invalid character referee email';
      });
    } else if (detail && typeof detail === 'object') {
      message = detail.msg || detail.message || message;
    }

    return { mappedRefErrors, message };
  };

  useEffect(() => {
    setBusinessType(normalizeBusinessType(user?.business_type || ''));
  }, [user?.business_type]);

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setSelfErrors({});
      setRefErrors({});
      // Fetch current verification status when modal opens
      const fetchStatus = async () => {
        setStatusLoading(true);
        try {
          const status = await authAPI.getTradespersonVerificationStatus();
          setVerificationStatus(status?.status || 'not_submitted');
        } catch (error) {
          // If error, assume not submitted
          setVerificationStatus('not_submitted');
        } finally {
          setStatusLoading(false);
        }
      };
      fetchStatus();
    }
  }, [isOpen]);

  const handleWorkPhotosSelect = (files) => {
    const incoming = Array.from(files || []);
    setWorkPhotos((prev) => {
      const merged = [...prev, ...incoming].filter(Boolean);
      const seen = new Set();
      const unique = [];
      for (const f of merged) {
        const key = `${f?.name || ''}:${f?.size || 0}:${f?.lastModified || 0}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(f);
        }
      }
      const next = unique.slice(0, 6);
      setSelfErrors((errs) => {
        const updated = { ...errs };
        if (!Array.isArray(next) || next.length < 2) {
          updated.work_photos = 'At least 2 recent work photos are required';
        } else {
          delete updated.work_photos;
        }
        return updated;
      });
      return next;
    });
  };

  const validateSelfEmployed = () => {
    const errs = {};
    if (!residentialAddress || !residentialAddress.trim()) errs.residential_address = 'Residential address is required';
    if (!proofOfAddress) errs.proof_of_address = 'Proof of address is required';
    if (!Array.isArray(workPhotos) || workPhotos.length < 2) errs.work_photos = 'At least 2 recent work photos are required';
    return errs;
  };

  const validateBusinessEntity = () => {
    const errs = {};
    if (!companyAddress || !companyAddress.trim()) errs.company_address = 'Company/Business address is required';
    if (!proofOfAddress) errs.proof_of_address = 'Company proof of address is required';
    
    if (businessType === 'Limited Company (LTD)') {
      if (!cacCertificate) errs.cac_certificate = 'CAC Certificate is required';
      if (!cacStatusReport) errs.cac_status_report = 'CAC Status Report is required';
      if (!directorName || !directorName.trim()) errs.director_name = 'Director name is required';
      if (!directorIdDocument) errs.director_id_document = 'Director ID is required';
    } else if (businessType === 'Ordinary Partnership') {
      if (!bnCertificate) errs.bn_certificate = 'BN Certificate is required';
      if (!partnershipAgreement) errs.partnership_agreement = 'Partnership Agreement is required';
      if (partnerIdDocuments.length < 1) errs.partner_ids = 'At least 1 partner ID is required';
    } else if (businessType === 'Limited Liability Partnership (LLP)') {
      if (!llpCertificate) errs.llp_certificate = 'LLP Certificate is required';
      if (!llpAgreement) errs.llp_agreement = 'LLP Agreement is required';
      if (!designatedPartners?.trim()) errs.designated_partners = 'Designated partners are required';
      if (partnerIdDocuments.length < 1) errs.partner_ids = 'At least 1 partner ID is required';
    }
    
    return errs;
  };

  const validateReferences = () => {
    const errs = {};
    if (!workRef.name?.trim()) errs.work_referrer_name = 'Work referee name is required';
    const isValidPhone = (p) => {
      try {
        const phone = (p || '').trim();
        return (/^\+234\d{10}$/.test(phone) || /^0\d{10}$/.test(phone));
      } catch { return false; }
    };
    if (workRef.phone?.trim() && !isValidPhone(workRef.phone)) {
      errs.work_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
    }
    if (!workRef.company_email?.trim()) errs.work_referrer_company_email = 'Company email is required';
    else if (!isValidEmailFormat(workRef.company_email)) errs.work_referrer_company_email = 'Enter a valid company email';
    else if (!isWorkEmailDomain(workRef.company_email)) errs.work_referrer_company_email = 'Use a work email (company domain), not Gmail/Yahoo/etc';
    if (!workRef.company_name?.trim()) errs.work_referrer_company_name = 'Company name is required';
    if (!workRef.relationship?.trim()) errs.work_referrer_relationship = 'Relationship is required';
    if (!charRef.name?.trim()) errs.character_referrer_name = 'Character referee name is required';
    if (charRef.phone?.trim() && !isValidPhone(charRef.phone)) {
      errs.character_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
    }
    if (!charRef.email?.trim()) errs.character_referrer_email = 'Character referee email is required';
    else if (!isValidEmailFormat(charRef.email)) errs.character_referrer_email = 'Enter a valid email address';
    if (!charRef.relationship?.trim()) errs.character_referrer_relationship = 'Relationship is required';
    return errs;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!user?.role || user.role !== 'tradesperson') {
        toast({ title: 'Not Allowed', description: 'Only tradespeople can submit business verification', variant: 'destructive' });
        return;
      }
      setSelfErrors({});
      setRefErrors({});

      // Always validate references
      const rfErrs = validateReferences();
      
      if (businessType === 'Self-Employed / Sole Trader') {
        const seErrs = validateSelfEmployed();
        if (Object.keys(seErrs).length || Object.keys(rfErrs).length) {
          setSelfErrors(seErrs);
          setRefErrors(rfErrs);
          focusFirstErrorField({ ...seErrs, ...rfErrs });
          const missingLabels = [
            seErrs.residential_address && 'Residential address',
            seErrs.proof_of_address && 'Proof of address',
            seErrs.work_photos && 'Recent work photos (min 2)',
            rfErrs.work_referrer_name && 'Work referee name',
            rfErrs.work_referrer_company_email && 'Work referee company email',
            rfErrs.work_referrer_company_name && 'Work referee company name',
            rfErrs.work_referrer_relationship && 'Work referee relationship',
            rfErrs.character_referrer_name && 'Character referee name',
            rfErrs.character_referrer_email && 'Character referee email',
            rfErrs.character_referrer_relationship && 'Character referee relationship',
          ].filter(Boolean);
          toast({ title: 'Fix Highlighted Fields', description: `Please correct: ${missingLabels.slice(0, 3).join(', ')}${missingLabels.length > 3 ? '...' : ''}`, variant: 'destructive' });
          return;
        }
      } else {
        const beErrs = validateBusinessEntity();
        if (Object.keys(beErrs).length || Object.keys(rfErrs).length) {
          setSelfErrors(beErrs); // Reuse selfErrors state for display
          setRefErrors(rfErrs);
          focusFirstErrorField({ ...beErrs, ...rfErrs });
          toast({ title: 'Fix Highlighted Fields', description: 'Please correct the highlighted fields before submitting', variant: 'destructive' });
          return;
        }
      }

      const payload = {
        business_type: businessType,
        proof_of_address: proofOfAddress,
        residential_address: residentialAddress,
        work_photos: workPhotos,
        trade_certificate: tradeCertificate,
        // LTD fields
        cac_certificate: cacCertificate,
        cac_status_report: cacStatusReport,
        company_address: companyAddress,
        director_name: directorName,
        director_id_document: directorIdDocument,
        company_bank_name: companyBankName,
        company_account_number: companyAccountNumber,
        company_account_name: companyAccountName,
        // Partnership fields
        bn_certificate: bnCertificate,
        partnership_agreement: partnershipAgreement,
        partner_id_documents: partnerIdDocuments,
        // LLP fields
        llp_certificate: llpCertificate,
        llp_agreement: llpAgreement,
        designated_partners: designatedPartners,
        // Referrers
        work_referrer_name: workRef.name,
        work_referrer_phone: workRef.phone,
        work_referrer_company_email: workRef.company_email,
        work_referrer_company_name: workRef.company_name,
        work_referrer_relationship: workRef.relationship,
        character_referrer_name: charRef.name,
        character_referrer_phone: charRef.phone,
        character_referrer_email: charRef.email,
        character_referrer_relationship: charRef.relationship,
      };

      // For Self-Employed, we still call the references endpoint to trigger emails,
      // but the full verification endpoint will now also save the data.
      if (businessType === 'Self-Employed / Sole Trader') {
        try {
          await verificationAPI.submitTradespersonReferences({
            work_referrer_name: workRef.name,
            work_referrer_phone: workRef.phone,
            work_referrer_company_email: workRef.company_email,
            work_referrer_company_name: workRef.company_name,
            work_referrer_relationship: workRef.relationship,
            character_referrer_name: charRef.name,
            character_referrer_phone: charRef.phone,
            character_referrer_email: charRef.email,
            character_referrer_relationship: charRef.relationship,
          });
        } catch (e) {
          console.warn('Reference submission (emails) failed, continuing with full verification:', e);
          // If references changed, this might fail (e.g. email provider error), 
          // but we still want to submit the full verification data.
        }
      }

      await authAPI.submitTradespersonVerification(payload);
      
      try {
        if (typeof getCurrentUser === 'function') {
          await getCurrentUser();
        } else if (typeof updateUser === 'function') {
          updateUser({ ...(user || {}), verification_submitted: true, business_verification_submitted: true });
        }
      } catch {}

      setSubmitted(true);
      toast({ title: 'Submitted', description: "Your verification has been submitted for review. You'll be notified within 2-3 business days." });
    } catch (error) {
      let errorMessage = 'Failed to submit business verification';
      if (error.response?.data?.detail) {
        const { mappedRefErrors, message } = mapServerValidationErrors(error.response.data.detail);
        if (Object.keys(mappedRefErrors).length) {
          setRefErrors((prev) => ({ ...prev, ...mappedRefErrors }));
          focusFirstErrorField(mappedRefErrors);
        }
        errorMessage = message;
      }
      toast({ title: 'Submission Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted && onComplete) {
      onComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  // Loading state while fetching verification status
  if (statusLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5 animate-pulse">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-lato">Checking verification status...</p>
          </div>
        </div>
      </div>
    );
  }

  // Pending state - verification already submitted and awaiting review
  if (verificationStatus === 'pending' || submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold font-montserrat text-[#121E3C] mb-2">Verification Pending</h2>
            <p className="text-gray-500 text-sm font-lato mb-6">
              Your business verification is currently under review. Our team will process it within 2-3 business days.
            </p>
            <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left border border-amber-100">
              <h3 className="font-semibold text-amber-800 text-sm mb-2 font-montserrat">What happens next?</h3>
              <ul className="text-xs text-amber-700 space-y-1.5 font-lato">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  Our verification team is reviewing your documents
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  You'll receive an email notification with the result
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  Once approved, you'll unlock all platform features
                </li>
              </ul>
            </div>
            <Button onClick={handleClose} className="w-full h-12 rounded-xl bg-[#121E3C] hover:bg-[#1a2d52] text-white font-lato">
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Approved state - already verified
  if (verificationStatus === 'approved') {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#34D164]/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-[#34D164]" />
            </div>
            <h2 className="text-xl font-bold font-montserrat text-[#121E3C] mb-2">Already Verified</h2>
            <p className="text-gray-500 text-sm font-lato mb-6">
              Your business has been verified. You have full access to all platform features.
            </p>
            <Button onClick={handleClose} className="w-full h-12 rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-white font-lato">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90dvh] sm:h-auto sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#121E3C]/5">
              <Building2 className="w-5 h-5 text-[#121E3C]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-montserrat text-[#121E3C]">Business Verification</h2>
              <p className="text-xs text-gray-400 font-lato">Complete to unlock all features</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-[#34D164]/5 rounded-xl p-3 text-center">
              <Shield className="w-4 h-4 text-[#34D164] mx-auto mb-1" />
              <p className="text-[10px] text-gray-600 font-lato">Build Trust</p>
            </div>
            <div className="bg-[#34D164]/5 rounded-xl p-3 text-center">
              <Award className="w-4 h-4 text-[#34D164] mx-auto mb-1" />
              <p className="text-[10px] text-gray-600 font-lato">Unlock Features</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-[10px] text-gray-600 font-lato">2-3 Days</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select 
                value={businessType} 
                onChange={(e) => setBusinessType(normalizeBusinessType(e.target.value))} 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm bg-white"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {user?.business_type && (
                <p className="text-xs text-gray-400 mt-1.5 font-lato">Pre-selected from registration</p>
              )}
            </div>

            {/* Self-Employed Fields */}
            {businessType === 'Self-Employed / Sole Trader' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Residential Address <span className="text-red-500">*</span>
                  </label>
                  <input 
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm ${selfErrors.residential_address ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Enter your residential address" 
                    value={residentialAddress} 
                    onChange={(e) => setResidentialAddress(e.target.value)} 
                  />
                  {selfErrors.residential_address && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.residential_address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Proof of Address <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${selfErrors.proof_of_address ? 'border-red-300' : 'border-gray-200'}`}>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{proofOfAddress ? proofOfAddress.name : 'Utility bill or bank statement'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} />
                  </label>
                  {selfErrors.proof_of_address && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.proof_of_address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Recent Work Photos (min 2) <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${selfErrors.work_photos ? 'border-red-300' : 'border-gray-200'}`}>
                    <Image className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{workPhotos.length > 0 ? `${workPhotos.length} photos selected` : 'Click to upload (max 6)'}</p>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleWorkPhotosSelect(e.target.files)} />
                  </label>
                  {selfErrors.work_photos && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.work_photos}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Trade Certificate (optional)</label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Award className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{tradeCertificate ? tradeCertificate.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setTradeCertificate(e.target.files?.[0] || null)} />
                  </label>
                </div>

                {/* References */}
                <div className="pt-3 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-[#121E3C] mb-3 font-montserrat flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#34D164]" />
                    References
                  </h4>
                  
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <p className="text-xs font-medium text-gray-600 mb-2 font-lato">Work Reference</p>
                    <div className="grid gap-2">
                      <input 
                        placeholder="Name *" 
                        value={workRef.name} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setWorkRef({ ...workRef, name: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (value.trim()) delete next.work_referrer_name;
                            return next;
                          });
                        }}
                        data-field="work_referrer_name"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.work_referrer_name ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.work_referrer_name && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.work_referrer_name}</p>}
                      <input 
                        placeholder="Phone" 
                        value={workRef.phone} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setWorkRef({ ...workRef, phone: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (!value.trim() || /^\+234\d{10}$/.test(value.trim()) || /^0\d{10}$/.test(value.trim())) {
                              delete next.work_referrer_phone;
                            }
                            return next;
                          });
                        }}
                        data-field="work_referrer_phone"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.work_referrer_phone ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.work_referrer_phone && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.work_referrer_phone}</p>}
                      <input 
                        placeholder="Company Email *" 
                        value={workRef.company_email} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setWorkRef({ ...workRef, company_email: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (!value.trim()) {
                              next.work_referrer_company_email = 'Company email is required';
                            } else if (!isValidEmailFormat(value)) {
                              next.work_referrer_company_email = 'Enter a valid company email';
                            } else if (!isWorkEmailDomain(value)) {
                              next.work_referrer_company_email = 'Use a work email (company domain), not Gmail/Yahoo/etc';
                            } else {
                              delete next.work_referrer_company_email;
                            }
                            return next;
                          });
                        }}
                        data-field="work_referrer_company_email"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.work_referrer_company_email ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.work_referrer_company_email && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.work_referrer_company_email}</p>}
                      <input 
                        placeholder="Company Name *" 
                        value={workRef.company_name} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setWorkRef({ ...workRef, company_name: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (value.trim()) delete next.work_referrer_company_name;
                            return next;
                          });
                        }}
                        data-field="work_referrer_company_name"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.work_referrer_company_name ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.work_referrer_company_name && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.work_referrer_company_name}</p>}
                      <input 
                        placeholder="Relationship *" 
                        value={workRef.relationship} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setWorkRef({ ...workRef, relationship: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (value.trim()) delete next.work_referrer_relationship;
                            return next;
                          });
                        }}
                        data-field="work_referrer_relationship"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.work_referrer_relationship ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.work_referrer_relationship && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.work_referrer_relationship}</p>}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-600 mb-2 font-lato">Character Reference</p>
                    <div className="grid gap-2">
                      <input 
                        placeholder="Name *" 
                        value={charRef.name} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setCharRef({ ...charRef, name: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (value.trim()) delete next.character_referrer_name;
                            return next;
                          });
                        }}
                        data-field="character_referrer_name"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.character_referrer_name ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.character_referrer_name && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.character_referrer_name}</p>}
                      <input 
                        placeholder="Phone" 
                        value={charRef.phone} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setCharRef({ ...charRef, phone: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (!value.trim() || /^\+234\d{10}$/.test(value.trim()) || /^0\d{10}$/.test(value.trim())) {
                              delete next.character_referrer_phone;
                            }
                            return next;
                          });
                        }}
                        data-field="character_referrer_phone"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.character_referrer_phone ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.character_referrer_phone && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.character_referrer_phone}</p>}
                      <input 
                        placeholder="Email *" 
                        value={charRef.email} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setCharRef({ ...charRef, email: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (!value.trim()) {
                              next.character_referrer_email = 'Character referee email is required';
                            } else if (!isValidEmailFormat(value)) {
                              next.character_referrer_email = 'Enter a valid email address';
                            } else {
                              delete next.character_referrer_email;
                            }
                            return next;
                          });
                        }}
                        data-field="character_referrer_email"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.character_referrer_email ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.character_referrer_email && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.character_referrer_email}</p>}
                      <input 
                        placeholder="Relationship *" 
                        value={charRef.relationship} 
                        onChange={(e) => {
                          const value = e.target.value;
                          setCharRef({ ...charRef, relationship: value });
                          setRefErrors((prev) => {
                            const next = { ...prev };
                            if (value.trim()) delete next.character_referrer_relationship;
                            return next;
                          });
                        }}
                        data-field="character_referrer_relationship"
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] ${refErrors.character_referrer_relationship ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {refErrors.character_referrer_relationship && <p className="text-xs text-red-500 mt-0.5 font-lato">{refErrors.character_referrer_relationship}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Limited Company Fields */}
            {businessType === 'Limited Company (LTD)' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Certificate <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{cacCertificate ? cacCertificate.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setCacCertificate(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Status Report <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{cacStatusReport ? cacStatusReport.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setCacStatusReport(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Company Address <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                    placeholder="Enter company address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Company Proof of Address <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${selfErrors.proof_of_address ? 'border-red-300' : 'border-gray-200'}`}>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{proofOfAddress ? proofOfAddress.name : 'Utility bill or bank statement'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} />
                  </label>
                  {selfErrors.proof_of_address && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.proof_of_address}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Director Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                    placeholder="Enter director's full name"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Director ID Document <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{directorIdDocument ? directorIdDocument.name : 'Valid ID (NIN, Passport, etc.)'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setDirectorIdDocument(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3 font-lato">Company Bank Details</p>
                  <div className="space-y-3">
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                      placeholder="Bank Name *"
                      value={companyBankName}
                      onChange={(e) => setCompanyBankName(e.target.value)}
                    />
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                      placeholder="Account Number *"
                      value={companyAccountNumber}
                      onChange={(e) => setCompanyAccountNumber(e.target.value)}
                    />
                    <input
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                      placeholder="Account Name *"
                      value={companyAccountName}
                      onChange={(e) => setCompanyAccountName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ordinary Partnership Fields */}
            {businessType === 'Ordinary Partnership' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">BN Certificate <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{bnCertificate ? bnCertificate.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setBnCertificate(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partnership Agreement <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{partnershipAgreement ? partnershipAgreement.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setPartnershipAgreement(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Company/Business Address <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                    placeholder="Enter business address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Company Proof of Address <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${selfErrors.proof_of_address ? 'border-red-300' : 'border-gray-200'}`}>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{proofOfAddress ? proofOfAddress.name : 'Utility bill or bank statement'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} />
                  </label>
                  {selfErrors.proof_of_address && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.proof_of_address}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Company Proof of Address <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${selfErrors.proof_of_address ? 'border-red-300' : 'border-gray-200'}`}>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{proofOfAddress ? proofOfAddress.name : 'Utility bill or bank statement'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} />
                  </label>
                  {selfErrors.proof_of_address && (
                    <p className="text-xs text-red-500 mt-1 font-lato">{selfErrors.proof_of_address}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partner ID Documents <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Users className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{partnerIdDocuments.length > 0 ? `${partnerIdDocuments.length} file(s) selected` : 'Upload partner IDs (at least 1)'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" multiple onChange={(e) => setPartnerIdDocuments(Array.from(e.target.files || []))} />
                  </label>
                </div>
              </div>
            )}

            {/* LLP Fields */}
            {businessType === 'Limited Liability Partnership (LLP)' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">LLP Certificate <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{llpCertificate ? llpCertificate.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLlpCertificate(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">LLP Agreement <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{llpAgreement ? llpAgreement.name : 'Click to upload'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLlpAgreement(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Company/Business Address <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                    placeholder="Enter business address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Designated Partners <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                    placeholder="Enter names of designated partners (comma separated)"
                    value={designatedPartners}
                    onChange={(e) => setDesignatedPartners(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partner ID Documents <span className="text-red-500">*</span></label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Users className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 font-lato">{partnerIdDocuments.length > 0 ? `${partnerIdDocuments.length} file(s) selected` : 'Upload partner IDs (at least 1)'}</p>
                    <input type="file" className="hidden" accept="image/*,.pdf" multiple onChange={(e) => setPartnerIdDocuments(Array.from(e.target.files || []))} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="mt-5 flex items-start gap-2 text-xs text-gray-500 font-lato">
            <Lock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <span>Your documents are encrypted and used only for verification. We never share with third parties.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
          <Button
            onClick={handleSubmit}
            disabled={loading || !businessType}
            className="w-full h-12 rounded-xl bg-[#34D164] hover:bg-[#2ab854] text-white font-lato font-medium disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Verification'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessVerificationModal;
