import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verificationAPI } from '../api/referrals';
import { authAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonLayout from '../layouts/TradespersonLayout';
import { CheckCircle, Clock, Upload, FileText, Image, Shield, Award, Users, XCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';

const BUSINESS_TYPE_OPTIONS = [
  'Self-Employed / Sole Trader',
  'Limited Company (LTD)',
  'Ordinary Partnership',
  'Limited Liability Partnership (LLP)',
];

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

const VerifyAccountPage = () => {
  const { isAuthenticated, user, getCurrentUser, updateUser, loginWithToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const { toast } = useToast();

  // Email/Phone OTP states
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  // Tradespeople references
  const [workRef, setWorkRef] = useState({
    name: '', phone: '', company_email: '', company_name: '', relationship: ''
  });
  const [charRef, setCharRef] = useState({
    name: '', phone: '', email: '', relationship: ''
  });
  const [verified, setVerified] = useState(false);
  const [businessType, setBusinessType] = useState(normalizeBusinessType(user?.business_type || ''));
  const [proofOfAddress, setProofOfAddress] = useState(null);
  const [residentialAddress, setResidentialAddress] = useState('');
  const [workPhotos, setWorkPhotos] = useState([]);
  const [tradeCertificate, setTradeCertificate] = useState(null);
  const [cacCertificate, setCacCertificate] = useState(null);
  const [cacStatusReport, setCacStatusReport] = useState(null);
  const [companyAddress, setCompanyAddress] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorIdDocument, setDirectorIdDocument] = useState(null);
  const [companyBankName, setCompanyBankName] = useState('');
  const [companyAccountNumber, setCompanyAccountNumber] = useState('');
  const [companyAccountName, setCompanyAccountName] = useState('');
  const [tin, setTin] = useState('');
  const [businessLogo, setBusinessLogo] = useState(null);
  const [bnCertificate, setBnCertificate] = useState(null);
  const [partnershipAgreement, setPartnershipAgreement] = useState(null);
  const [partnerIdDocuments, setPartnerIdDocuments] = useState([]);
  const [llpCertificate, setLlpCertificate] = useState(null);
  const [llpAgreement, setLlpAgreement] = useState(null);
  const [designatedPartners, setDesignatedPartners] = useState('');
  
  const [selfErrors, setSelfErrors] = useState({});
  const [refErrors, setRefErrors] = useState({});

  
  const isTradespersonVerified = !!(user?.verified_tradesperson || user?.is_verified);

  // Refresh user data on page load to ensure latest verification status
  useEffect(() => {
    try {
      if (typeof getCurrentUser === 'function') {
        getCurrentUser();
      }
    } catch {}
  }, []);

  // Fetch tradesperson verification status from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (user?.role !== 'tradesperson' || !isAuthenticated()) return;
      try {
        setStatusLoading(true);
        const resp = await authAPI.getTradespersonVerificationStatus();
        if (!mounted) return;
        const st = resp?.status || '';
        setVerificationStatus(st);
      } catch (e) {
        // Silently ignore status errors; UI will default to pending if flags indicate
      } finally {
        setStatusLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.role, isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const nextParam = params.get('next');
    const redirectPath = nextParam || '/dashboard/jobs';
    if (!token) return;
    let isMounted = true;
    (async () => {
      try {
        const resp = await authAPI.confirmEmailVerification(token);
        if (isMounted) {
          if (resp?.access_token && resp?.user) {
            try { loginWithToken(resp.access_token, resp.user); } catch {}
            if (resp?.refresh_token) {
              try { localStorage.setItem('refresh_token', resp.refresh_token); } catch {}
            }
          }
          if (resp?.auto_posted && resp?.job?.id) {
            toast({
              title: 'Email Verified — Job Submitted',
              description: `Your job has been submitted for admin review. Job ID: ${resp.job.id}`,
            });
            try {
              localStorage.removeItem('pending_job_id');
              localStorage.removeItem('job_posting_draft_v2');
            } catch {}
          } else {
            toast({ title: 'Email Verified', description: resp?.message || 'Your email has been verified.' });
          }
          setVerified(true);
          // Navigate to provided next path when no auto-post happened.
          const destination = resp?.auto_posted ? '/dashboard/jobs' : redirectPath;
          try { navigate(destination, { replace: true }); } catch (e) { navigate('/dashboard/jobs', { replace: true }); }
        }
      } catch (e) {
        const msg = e?.response?.data?.detail || 'Invalid or expired verification link';
        if (isMounted) {
          toast({ title: 'Verification Failed', description: msg, variant: 'destructive' });
        }
      }
    })();
    return () => { isMounted = false; };
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasToken = !!params.get('token');
    if (!hasToken && isAuthenticated() && user?.role === 'homeowner') {
      navigate('/dashboard/profile', { replace: true });
    }
  }, [isAuthenticated, user, location.search]);

  useEffect(() => {
    setBusinessType(normalizeBusinessType(user?.business_type || ''));
  }, [user?.business_type]);

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
            <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified</h2>
            <p className="text-gray-600 mb-6">You’re all set. Continue where you left off.</p>
            <Button onClick={() => navigate('/dashboard/jobs', { replace: true })} className="w-full text-white" style={{backgroundColor: '#34D164'}}>
              Continue
            </Button>
            <p className="text-xs text-gray-500 mt-3">Redirecting in a few seconds…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  

  const handleWorkPhotosSelect = (files) => {
    const incoming = Array.from(files || []);
    // Accumulate selections across multiple file-picks, cap at 6
    setWorkPhotos((prev) => {
      const merged = [...prev, ...incoming].filter(Boolean);
      // De-duplicate by name+size+lastModified to avoid repeats
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
      // Live validation feedback for minimum 2 photos
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

  // Validation helpers for Self-Employed submission
  const validateSelfEmployed = () => {
    const errs = {};
    if (!residentialAddress || !residentialAddress.trim()) errs.residential_address = 'Residential address is required';
    if (!Array.isArray(workPhotos) || workPhotos.length < 2) errs.work_photos = 'At least 2 recent work photos are required';
    return errs;
  };

  const validateReferences = () => {
    const errs = {};
    if (!workRef.name?.trim()) errs.work_referrer_name = 'Work referee name is required';
    const isValidPhone = (p) => {
      try {
        const phone = (p || '').trim();
        // Accept Nigerian formats: +234XXXXXXXXXX or 0XXXXXXXXXX
        return (/^\+234\d{10}$/.test(phone) || /^0\d{10}$/.test(phone));
      } catch { return false; }
    };
    if (workRef.phone?.trim() && !isValidPhone(workRef.phone)) {
      errs.work_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
    }
    if (!workRef.company_email?.trim()) errs.work_referrer_company_email = 'Company email is required';
    if (!workRef.company_name?.trim()) errs.work_referrer_company_name = 'Company name is required';
    if (!workRef.relationship?.trim()) errs.work_referrer_relationship = 'Relationship is required';
    if (!charRef.name?.trim()) errs.character_referrer_name = 'Character referee name is required';
    if (charRef.phone?.trim() && !isValidPhone(charRef.phone)) {
      errs.character_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
    }
    if (!charRef.email?.trim()) errs.character_referrer_email = 'Character referee email is required';
    if (!charRef.relationship?.trim()) errs.character_referrer_relationship = 'Relationship is required';
    return errs;
  };

  const handlePartnerIdsSelect = (files) => {
    const arr = Array.from(files || []).slice(0, 6);
    setPartnerIdDocuments(arr);
  };

  const handleBusinessVerificationSubmit = async () => {
    try {
      setLoading(true);
      if (!user?.role || user.role !== 'tradesperson') {
        toast({ title: 'Not Allowed', description: 'Only tradespeople can submit business verification', variant: 'destructive' });
        return;
      }
      // Clear previous errors
      setSelfErrors({});
      setRefErrors({});

      // Pre-validate Self-Employed required fields and references
      if (businessType === 'Self-Employed / Sole Trader') {
        const seErrs = validateSelfEmployed();
        const rfErrs = validateReferences();
        if (Object.keys(seErrs).length || Object.keys(rfErrs).length) {
          setSelfErrors(seErrs);
          setRefErrors(rfErrs);
          const missingLabels = [
            seErrs.residential_address && 'Residential address',
            seErrs.work_photos && 'Recent work photos (min 2)',
            rfErrs.work_referrer_name && 'Work referee name',
            rfErrs.work_referrer_phone && 'Work referee phone',
            rfErrs.work_referrer_company_email && 'Work referee company email',
            rfErrs.work_referrer_company_name && 'Work referee company name',
            rfErrs.work_referrer_relationship && 'Work referee relationship',
            rfErrs.character_referrer_name && 'Character referee name',
            rfErrs.character_referrer_phone && 'Character referee phone',
            rfErrs.character_referrer_email && 'Character referee email',
            rfErrs.character_referrer_relationship && 'Character referee relationship',
          ].filter(Boolean);
          toast({ title: 'Missing Required Fields', description: `Please complete: ${missingLabels.join(', ')}`, variant: 'destructive' });
          return;
        }
      }
      const payload = {
        business_type: businessType,
        proof_of_address: proofOfAddress,
        residential_address: residentialAddress,
        work_photos: workPhotos,
        trade_certificate: tradeCertificate,
        cac_certificate: cacCertificate,
        cac_status_report: cacStatusReport,
        company_address: companyAddress,
        director_name: directorName,
        director_id_document: directorIdDocument,
        company_bank_name: companyBankName,
        company_account_number: companyAccountNumber,
        company_account_name: companyAccountName,
        tin,
        business_logo: businessLogo,
        bn_certificate: bnCertificate,
        partnership_agreement: partnershipAgreement,
        partner_id_documents: partnerIdDocuments,
        llp_certificate: llpCertificate,
        llp_agreement: llpAgreement,
        designated_partners: designatedPartners,
      };
      // For Self-Employed, submit references first so backend check passes
      if (businessType === 'Self-Employed / Sole Trader') {
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
      }

      // Then submit business verification
      await authAPI.submitTradespersonVerification(payload);
      try {
        if (typeof getCurrentUser === 'function') {
          await getCurrentUser();
        } else if (typeof updateUser === 'function') {
          updateUser({ ...(user || {}), verification_submitted: true, business_verification_submitted: true });
        }
      } catch {}

      setSubmitted(true);
      toast({ title: 'Submitted', description: "Your verification and references have been submitted for review. You'll be notified within 2-3 business days." });
    } catch (error) {
      console.error('Failed to submit business verification:', error);
      let errorMessage = 'Failed to submit business verification';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
          // Map generic backend messages to detailed field feedback
          if (errorMessage.includes('Required fields missing for self-employed')) {
            const seErrs = validateSelfEmployed();
            const rfErrs = validateReferences();
            setSelfErrors(seErrs);
            setRefErrors(rfErrs);
            const missingLabels = [
              seErrs.residential_address && 'Residential address',
              seErrs.work_photos && 'Recent work photos (min 2)',
            ].filter(Boolean);
            if (missingLabels.length) {
              errorMessage = `Please complete: ${missingLabels.join(', ')}`;
            }
          } else if (errorMessage.includes('Self-employed requires work and character references')) {
            const rfErrs = validateReferences();
            setRefErrors(rfErrs);
            const missingLabels = [
              rfErrs.work_referrer_name && 'Work referrer name',
              rfErrs.work_referrer_phone && 'Work referrer phone',
              rfErrs.work_referrer_company_email && 'Work referrer company email',
              rfErrs.work_referrer_company_name && 'Work referrer company name',
              rfErrs.work_referrer_relationship && 'Work referrer relationship',
              rfErrs.character_referrer_name && 'Character referee name',
              rfErrs.character_referrer_phone && 'Character referee phone',
              rfErrs.character_referrer_email && 'Character referee email',
              rfErrs.character_referrer_relationship && 'Character referee relationship',
            ].filter(Boolean);
            if (missingLabels.length) {
              errorMessage = `Please complete: ${missingLabels.join(', ')}`;
            }
          }
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = error.response.data.detail.msg || error.response.data.detail.message || 'Unknown error';
        }
      }
      toast({ title: 'Submission Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to verify your account</p>
              <Button
                onClick={() => window.location.href = '/'}
                className=""
              >
                Go to Homepage
              </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Verification Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your business verification has been submitted successfully. Our team will review it within 2-3 business days.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Our verification team will review your documents</li>
                  <li>• You'll receive an email notification with the result</li>
                  <li>• Once verified, you'll unlock all platform features</li>
                  <li>• Referees will receive their 20 points reward</li>
                </ul>
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={() => window.location.href = '/referrals'}
                  className="flex-1"
                >
                  View Referrals
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="secondary"
                  className="flex-1"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // For tradespeople, use the dashboard layout
  if (user?.role === 'tradesperson') {
    return (
      <TradespersonLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-[#121E3C]">Verify Your Business</h1>
            <p className="text-gray-500 mt-1 text-sm font-lato">Complete your business verification to unlock all platform features</p>
          </div>

          {/* Verification Status Card */}
          <div className={`rounded-2xl p-5 mb-6 border ${
            isTradespersonVerified 
              ? 'bg-green-50 border-green-200' 
              : verificationStatus === 'rejected' 
                ? 'bg-red-50 border-red-200' 
                : verificationStatus === 'not_submitted'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                isTradespersonVerified 
                  ? 'bg-green-100' 
                  : verificationStatus === 'rejected' 
                    ? 'bg-red-100' 
                    : verificationStatus === 'not_submitted'
                      ? 'bg-gray-100'
                      : 'bg-amber-100'
              }`}>
                {isTradespersonVerified ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : verificationStatus === 'rejected' ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : verificationStatus === 'not_submitted' ? (
                  <AlertCircle className="w-6 h-6 text-gray-500" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className={`font-semibold font-montserrat ${
                  isTradespersonVerified 
                    ? 'text-green-800' 
                    : verificationStatus === 'rejected' 
                      ? 'text-red-800' 
                      : verificationStatus === 'not_submitted'
                        ? 'text-gray-700'
                        : 'text-amber-800'
                }`}>
                  {isTradespersonVerified 
                    ? 'Account Verified' 
                    : verificationStatus === 'rejected' 
                      ? 'Verification Rejected' 
                      : verificationStatus === 'not_submitted'
                        ? 'Not Submitted'
                        : 'Verification Pending'}
                </h3>
                <p className={`text-sm font-lato ${
                  isTradespersonVerified 
                    ? 'text-green-700' 
                    : verificationStatus === 'rejected' 
                      ? 'text-red-700' 
                      : verificationStatus === 'not_submitted'
                        ? 'text-gray-500'
                        : 'text-amber-700'
                }`}>
                  {isTradespersonVerified 
                    ? 'Full access to all platform features'
                    : verificationStatus === 'rejected'
                      ? 'Please review and resubmit'
                      : verificationStatus === 'not_submitted'
                        ? 'Submit your documents to get verified'
                        : 'Under review (2-3 business days)'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Form Area */}
            <div className="lg:col-span-2">
              {!isTradespersonVerified && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-[#121E3C]/5">
                      <FileText className="w-5 h-5 text-[#121E3C]" />
                    </div>
                    <h3 className="text-lg font-semibold font-montserrat text-[#121E3C]">Business Verification</h3>
                  </div>
                  
                  {verificationStatus === 'rejected' && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3">
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="font-lato">Your previous submission was rejected. Please correct issues and upload clear documents.</p>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Business Type</label>
                      <select 
                        value={businessType} 
                        onChange={(e) => setBusinessType(normalizeBusinessType(e.target.value))} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm"
                      >
                        <option value="">Select business type</option>
                        {BUSINESS_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {user?.business_type && (
                        <p className="text-xs text-gray-400 mt-2 font-lato">Pre-selected from registration. Update only if incorrect.</p>
                      )}
                    </div>

                    {businessType === 'Self-Employed / Sole Trader' && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                            Residential address <span className="text-red-500">*</span>
                          </label>
                          <input 
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato text-sm" 
                            placeholder="Enter your residential address" 
                            value={residentialAddress} 
                            onChange={(e) => setResidentialAddress(e.target.value)} 
                          />
                          {selfErrors.residential_address && (
                            <p className="text-xs text-red-600 mt-2 font-lato">{selfErrors.residential_address}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                            Proof of address (utility bill, bank statement)
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Upload className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">
                                {proofOfAddress ? proofOfAddress.name : 'Click to upload'}
                              </p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} />
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                            Recent work photos (min 2) <span className="text-red-500">*</span>
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Image className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">
                                {workPhotos.length > 0 ? `${workPhotos.length} photos selected` : 'Click to upload (max 6)'}
                              </p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleWorkPhotosSelect(e.target.files)} />
                          </label>
                          {selfErrors.work_photos && (
                            <p className="text-xs text-red-600 mt-2 font-lato">{selfErrors.work_photos}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                            Trade certificate (optional)
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Award className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">
                                {tradeCertificate ? tradeCertificate.name : 'Click to upload'}
                              </p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setTradeCertificate(e.target.files?.[0] || null)} />
                          </label>
                        </div>

                        {/* References Section */}
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-semibold text-[#121E3C] mb-4 font-montserrat flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#34D164]" />
                            References
                          </h4>
                          
                          {/* Work Reference */}
                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-xs font-medium text-gray-600 mb-3 font-lato">Work Reference</p>
                            <div className="grid gap-3">
                              <input 
                                placeholder="Name *" 
                                value={workRef.name} 
                                onChange={(e) => setWorkRef({...workRef, name: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Phone *" 
                                value={workRef.phone} 
                                onChange={(e) => setWorkRef({...workRef, phone: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Company Email *" 
                                value={workRef.company_email} 
                                onChange={(e) => setWorkRef({...workRef, company_email: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Company Name *" 
                                value={workRef.company_name} 
                                onChange={(e) => setWorkRef({...workRef, company_name: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Relationship *" 
                                value={workRef.relationship} 
                                onChange={(e) => setWorkRef({...workRef, relationship: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                            </div>
                          </div>

                          {/* Character Reference */}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-600 mb-3 font-lato">Character Reference</p>
                            <div className="grid gap-3">
                              <input 
                                placeholder="Name *" 
                                value={charRef.name} 
                                onChange={(e) => setCharRef({...charRef, name: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Phone *" 
                                value={charRef.phone} 
                                onChange={(e) => setCharRef({...charRef, phone: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Email *" 
                                value={charRef.email} 
                                onChange={(e) => setCharRef({...charRef, email: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                              <input 
                                placeholder="Relationship *" 
                                value={charRef.relationship} 
                                onChange={(e) => setCharRef({...charRef, relationship: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-lato focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {businessType === 'Limited Company (LTD)' && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Certificate <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Upload className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{cacCertificate ? cacCertificate.name : 'Click to upload'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setCacCertificate(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Status Report/Extract <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <FileText className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{cacStatusReport ? cacStatusReport.name : 'Click to upload'}</p>
                            </div>
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
                      </div>
                    )}

                    {businessType === 'Ordinary Partnership' && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">BN Certificate <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Upload className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{bnCertificate ? bnCertificate.name : 'Click to upload'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setBnCertificate(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partnership Agreement <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <FileText className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{partnershipAgreement ? partnershipAgreement.name : 'Click to upload'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setPartnershipAgreement(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                      </div>
                    )}

                    {businessType === 'Limited Liability Partnership (LLP)' && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">LLP Certificate <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <Upload className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{llpCertificate ? llpCertificate.name : 'Click to upload'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLlpCertificate(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">LLP Agreement <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center py-4">
                              <FileText className="w-5 h-5 text-gray-400 mb-1" />
                              <p className="text-xs text-gray-500 font-lato">{llpAgreement ? llpAgreement.name : 'Click to upload'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setLlpAgreement(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                      </div>
                    )}

                    {businessType && (
                      <Button
                        onClick={handleBusinessVerificationSubmit}
                        disabled={loading}
                        className="w-full h-12 rounded-xl text-white font-lato font-medium mt-4"
                        style={{ backgroundColor: '#34D164' }}
                      >
                        {loading ? 'Submitting...' : 'Submit Verification'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Why Verify Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-[#121E3C] mb-4 font-montserrat">Why Verify?</h3>
                <div className="space-y-3">
                  {[
                    { icon: CheckCircle, title: 'Build Trust', desc: 'Verified accounts get more responses' },
                    { icon: Shield, title: 'Unlock Features', desc: 'Access all platform capabilities' },
                    { icon: Award, title: 'Earn Rewards', desc: 'Referral bonuses for verified users' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <item.icon className="w-4 h-4 text-[#34D164] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[#121E3C]">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Card */}
              <div className="bg-[#34D164]/5 rounded-2xl border border-[#34D164]/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-[#34D164]" />
                  <h3 className="text-sm font-semibold text-[#121E3C] font-montserrat">Your Privacy</h3>
                </div>
                <p className="text-xs text-gray-600 font-lato">
                  Documents are encrypted and used only for verification. We never share with third parties.
                </p>
              </div>

              {/* Processing Time Card */}
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800 font-montserrat">Processing Time</h3>
                </div>
                <p className="text-xs text-amber-700 font-lato">
                  Verification takes 2-3 business days. You'll receive an email once reviewed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </TradespersonLayout>
    );
  }

  // For homeowners and non-authenticated users, use the original layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#34D164]/10 mb-4">
              <Shield className="w-8 h-8 text-[#34D164]" />
            </div>
            <h1 className="text-3xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>Verify Your Account</h1>
            <p className="text-gray-600 font-lato">Verify your email and phone. Tradespeople complete business verification and references.</p>
          </div>

          {/* Current Verification Status for Tradespeople */}
          {user?.role === 'tradesperson' && (
            <div className={`rounded-2xl p-6 mb-8 border-2 ${
              isTradespersonVerified 
                ? 'bg-green-50 border-green-200' 
                : verificationStatus === 'rejected' 
                  ? 'bg-red-50 border-red-200' 
                  : verificationStatus === 'not_submitted'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  isTradespersonVerified 
                    ? 'bg-green-100' 
                    : verificationStatus === 'rejected' 
                      ? 'bg-red-100' 
                      : verificationStatus === 'not_submitted'
                        ? 'bg-gray-100'
                        : 'bg-amber-100'
                }`}>
                  {isTradespersonVerified ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : verificationStatus === 'rejected' ? (
                    <XCircle className="w-6 h-6 text-red-600" />
                  ) : verificationStatus === 'not_submitted' ? (
                    <AlertCircle className="w-6 h-6 text-gray-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold font-montserrat mb-1 ${
                    isTradespersonVerified 
                      ? 'text-green-800' 
                      : verificationStatus === 'rejected' 
                        ? 'text-red-800' 
                        : verificationStatus === 'not_submitted'
                          ? 'text-gray-800'
                          : 'text-amber-800'
                  }`}>
                    {isTradespersonVerified 
                      ? 'Account Verified' 
                      : verificationStatus === 'rejected' 
                        ? 'Verification Rejected' 
                        : verificationStatus === 'not_submitted'
                          ? 'Not Submitted'
                          : 'Verification Pending'}
                  </h3>
                  <p className={`text-sm font-lato ${
                    isTradespersonVerified 
                      ? 'text-green-700' 
                      : verificationStatus === 'rejected' 
                        ? 'text-red-700' 
                        : verificationStatus === 'not_submitted'
                          ? 'text-gray-600'
                          : 'text-amber-700'
                  }`}>
                    {isTradespersonVerified 
                      ? 'Your account is fully verified. You have access to all platform features.'
                      : verificationStatus === 'rejected'
                        ? 'Your submission was not approved. Please review notes and resubmit.'
                        : verificationStatus === 'not_submitted'
                          ? 'You have not submitted your business verification yet.'
                          : 'Your documents are under review. You\'ll be notified once approved.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              {/* Contact Verification */}
              {user?.role !== 'tradesperson' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 overflow-hidden">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Verification</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                      <Button
                        type="button"
                        disabled={emailSending}
                        onClick={async () => {
                          try {
                            setEmailSending(true);
                            const resp = await authAPI.sendEmailOTP(emailInput);
                            if (resp?.debug_code) {
                              setEmailOtpCode(resp.debug_code);
                              toast({ title: 'Code Sent', description: `Dev code: ${resp.debug_code}` });
                            } else {
                              toast({ title: 'Code Sent', description: 'Check your email for the code.' });
                            }
                          } catch (e) {
                            const msg = e?.response?.data?.detail || 'Could not send email code';
                            toast({ title: 'Send Failed', description: msg, variant: 'destructive' });
                          } finally { setEmailSending(false); }
                        }}
                        size="sm"
                        className="min-w-[120px]"
                      >
                        {emailSending ? 'Sending...' : 'Send Code'}
                      </Button>
                      <input
                        type="text"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        placeholder="Enter code"
                        className="w-full sm:flex-1 sm:max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <Button
                        type="button"
                        disabled={emailVerifying || !emailOtpCode}
                        onClick={async () => {
                          try {
                            setEmailVerifying(true);
                            await authAPI.verifyEmailOTP(emailOtpCode, emailInput);
                            toast({ title: 'Email Verified', description: 'Your email has been verified.' });
                          } catch (e) {
                            toast({ title: 'Verification Failed', description: 'Invalid or expired code', variant: 'destructive' });
                          } finally { setEmailVerifying(false); }
                        }}
                        size="sm"
                        className="min-w-[100px]"
                      >
                        {emailVerifying ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Enter your registered phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                      <Button
                        type="button"
                        disabled={phoneSending}
                        onClick={async () => {
                          try {
                            setPhoneSending(true);
                            const resp = await authAPI.sendPhoneOTP(phoneInput);
                            if (resp?.debug_code) {
                              setPhoneOtpCode(resp.debug_code);
                              toast({ title: 'Code Sent', description: `Dev code: ${resp.debug_code}` });
                            } else {
                              toast({ title: 'Code Sent', description: 'SMS code sent to your phone.' });
                            }
                          } catch (e) {
                            const msg = e?.response?.data?.detail || 'Could not send SMS code';
                            toast({ title: 'Send Failed', description: msg, variant: 'destructive' });
                          } finally { setPhoneSending(false); }
                        }}
                        size="sm"
                        className="min-w-[120px]"
                      >
                        {phoneSending ? 'Sending...' : 'Send Code'}
                      </Button>
                      <input
                        type="text"
                        value={phoneOtpCode}
                        onChange={(e) => setPhoneOtpCode(e.target.value)}
                        placeholder="Enter code"
                        className="w-full sm:flex-1 sm:max-w-[220px] px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <Button
                        type="button"
                        disabled={phoneVerifying || !phoneOtpCode}
                        onClick={async () => {
                          try {
                            setPhoneVerifying(true);
                            await authAPI.verifyPhoneOTP(phoneOtpCode, phoneInput);
                            toast({ title: 'Phone Verified', description: 'Your phone has been verified.' });
                          } catch (e) {
                            toast({ title: 'Verification Failed', description: 'Invalid or expired code', variant: 'destructive' });
                          } finally { setPhoneVerifying(false); }
                        }}
                        size="sm"
                        className="min-w-[100px]"
                      >
                        {phoneVerifying ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </div>
                </div>
                </div>
              )}

              

              {user?.role === 'tradesperson' && !isTradespersonVerified && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-[#121E3C]/5">
                      <FileText className="w-5 h-5 text-[#121E3C]" />
                    </div>
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>Business Verification</h3>
                  </div>
                  {verificationStatus === 'rejected' && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3">
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>Your previous submission was rejected. Please correct issues and upload clear documents.</p>
                    </div>
                  )}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Business Type</label>
                      <select value={businessType} onChange={(e)=>setBusinessType(normalizeBusinessType(e.target.value))} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato">
                        <option value="">Select business type</option>
                        {BUSINESS_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {user?.business_type && (
                        <p className="text-xs text-gray-500 mt-2 font-lato">Pre-selected from your registration. Update only if incorrect.</p>
                      )}
                    </div>
                    {(businessType === 'Self-Employed / Sole Trader') && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Residential address <span className="text-red-500">*</span></label>
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Enter your residential address" value={residentialAddress} onChange={(e)=>setResidentialAddress(e.target.value)} />
                          {selfErrors.residential_address && (<p className="text-xs text-red-600 mt-2 font-lato">{selfErrors.residential_address}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Proof of address (utility bill, bank statement)</label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{proofOfAddress ? proofOfAddress.name : 'Click to upload or drag and drop'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setProofOfAddress(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Recent work photos (min 2) <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Image className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">Click to upload work photos</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e)=>handleWorkPhotosSelect(e.target.files)} />
                          </label>
                          {Array.isArray(workPhotos) && workPhotos.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {workPhotos.map((photo, idx) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full bg-[#34D164]/10 text-[#34D164] text-xs font-medium">
                                  <Image className="w-3 h-3 mr-1" />
                                  {photo.name?.substring(0, 15)}...
                                </span>
                              ))}
                            </div>
                          )}
                          {selfErrors.work_photos && (<p className="text-xs text-red-600 mt-2 font-lato">{selfErrors.work_photos}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Trade or apprenticeship certificate (optional)</label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FileText className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{tradeCertificate ? tradeCertificate.name : 'Click to upload certificate'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setTradeCertificate(e.target.files[0])} />
                          </label>
                        </div>
                        <div className="border-t border-gray-100 pt-6 mt-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-[#121E3C]/5">
                              <Users className="w-4 h-4 text-[#121E3C]" />
                            </div>
                            <h4 className="font-semibold font-montserrat" style={{color: '#121E3C'}}>References</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-6 font-lato">As part of your verification on ServiceHub, we require two types of references to help confirm your professionalism and integrity:</p>
                          <div className="space-y-6">
                            <div className="bg-gray-50 rounded-xl p-5">
                              <h5 className="font-medium mb-2 font-montserrat text-[#121E3C]">Work Referee</h5>
                              <p className="text-xs text-gray-600 mb-4 font-lato">This should be someone you've worked for or with — a previous client, supervisor, or colleague (not a family member).</p>
                              <div className="space-y-3">
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Referee name *" value={workRef.name} onChange={(e)=>setWorkRef({...workRef, name: e.target.value})} />
                                {refErrors.work_referrer_name && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.work_referrer_name}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Referee phone (optional)" value={workRef.phone} onChange={(e)=>setWorkRef({...workRef, phone: e.target.value})} />
                                {refErrors.work_referrer_phone && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.work_referrer_phone}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Company email *" value={workRef.company_email} onChange={(e)=>setWorkRef({...workRef, company_email: e.target.value})} />
                                {refErrors.work_referrer_company_email && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.work_referrer_company_email}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Company name *" value={workRef.company_name} onChange={(e)=>setWorkRef({...workRef, company_name: e.target.value})} />
                                {refErrors.work_referrer_company_name && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.work_referrer_company_name}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Relationship *" value={workRef.relationship} onChange={(e)=>setWorkRef({...workRef, relationship: e.target.value})} />
                                {refErrors.work_referrer_relationship && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.work_referrer_relationship}</p>)}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-5">
                              <h5 className="font-medium mb-2 font-montserrat text-[#121E3C]">Character Referee</h5>
                              <p className="text-xs text-gray-600 mb-4 font-lato">This should be someone who can vouch for your behaviour, reliability, and trustworthiness. This can be a community leader, neighbour, mentor, or someone you've known personally (but not an immediate family member).</p>
                              <div className="space-y-3">
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Referee name *" value={charRef.name} onChange={(e)=>setCharRef({...charRef, name: e.target.value})} />
                                {refErrors.character_referrer_name && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.character_referrer_name}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Referee phone (optional)" value={charRef.phone} onChange={(e)=>setCharRef({...charRef, phone: e.target.value})} />
                                {refErrors.character_referrer_phone && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.character_referrer_phone}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Referee email *" value={charRef.email} onChange={(e)=>setCharRef({...charRef, email: e.target.value})} />
                                {refErrors.character_referrer_email && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.character_referrer_email}</p>)}
                                <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato bg-white" placeholder="Relationship *" value={charRef.relationship} onChange={(e)=>setCharRef({...charRef, relationship: e.target.value})} />
                                {refErrors.character_referrer_relationship && (<p className="text-xs text-red-600 mt-1 font-lato">{refErrors.character_referrer_relationship}</p>)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {(businessType === 'Limited Company (LTD)') && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Certificate <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{cacCertificate ? cacCertificate.name : 'Click to upload CAC Certificate'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setCacCertificate(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Status Report/Extract <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FileText className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{cacStatusReport ? cacStatusReport.name : 'Click to upload Status Report'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setCacStatusReport(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Company address <span className="text-red-500">*</span></label>
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Enter company address" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Director name <span className="text-red-500">*</span></label>
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Enter director name" value={directorName} onChange={(e)=>setDirectorName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Director ID document <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{directorIdDocument ? directorIdDocument.name : 'Click to upload ID document'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setDirectorIdDocument(e.target.files[0])} />
                          </label>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Bank name" value={companyBankName} onChange={(e)=>setCompanyBankName(e.target.value)} />
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Account number" value={companyAccountNumber} onChange={(e)=>setCompanyAccountNumber(e.target.value)} />
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Account name" value={companyAccountName} onChange={(e)=>setCompanyAccountName(e.target.value)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="TIN (optional)" value={tin} onChange={(e)=>setTin(e.target.value)} />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Business logo (optional)</label>
                            <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                              <p className="text-sm text-gray-500 font-lato">{businessLogo ? businessLogo.name : 'Upload logo'}</p>
                              <input type="file" className="hidden" accept="image/*" onChange={(e)=>setBusinessLogo(e.target.files[0])} />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    {(businessType === 'Ordinary Partnership') && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC Business Name Certificate (BN) <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{bnCertificate ? bnCertificate.name : 'Click to upload BN Certificate'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setBnCertificate(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partnership agreement <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FileText className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{partnershipAgreement ? partnershipAgreement.name : 'Click to upload agreement'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setPartnershipAgreement(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partner ID documents <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Users className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">Click to upload partner IDs</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" multiple onChange={(e)=>handlePartnerIdsSelect(e.target.files)} />
                          </label>
                          {partnerIdDocuments.length > 0 && (
                            <p className="text-xs text-[#34D164] mt-2 font-lato">{partnerIdDocuments.length} file(s) selected</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Business address <span className="text-red-500">*</span></label>
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Enter business address" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                      </div>
                    )}
                    {(businessType === 'Limited Liability Partnership (LLP)') && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">CAC LLP Certificate/Registration <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{llpCertificate ? llpCertificate.name : 'Click to upload LLP Certificate'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setLlpCertificate(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">LLP agreement <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FileText className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">{llpAgreement ? llpAgreement.name : 'Click to upload LLP agreement'}</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e)=>setLlpAgreement(e.target.files[0])} />
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Designated partners (names, roles) <span className="text-red-500">*</span></label>
                          <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato min-h-[100px]" placeholder="Enter partner names and their roles" value={designatedPartners} onChange={(e)=>setDesignatedPartners(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Partner ID documents <span className="text-red-500">*</span></label>
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Users className="w-6 h-6 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 font-lato">Click to upload partner IDs</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*,application/pdf" multiple onChange={(e)=>handlePartnerIdsSelect(e.target.files)} />
                          </label>
                          {partnerIdDocuments.length > 0 && (
                            <p className="text-xs text-[#34D164] mt-2 font-lato">{partnerIdDocuments.length} file(s) selected</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">Business address <span className="text-red-500">*</span></label>
                          <input className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] transition-all font-lato" placeholder="Enter business address" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <Button
                      type="button"
                      disabled={loading || !businessType}
                      onClick={handleBusinessVerificationSubmit}
                      className="w-full py-3 text-white font-medium font-lato rounded-xl transition-all"
                      style={{backgroundColor: loading ? '#9CA3AF' : '#34D164'}}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : 'Submit Verification'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tradespeople References */}
              {/* Tradespeople References moved into Self-Employed verification section */}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Why Verify */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-[#34D164]/10">
                    <Award className="w-5 h-5 text-[#34D164]" />
                  </div>
                  <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>Why Verify?</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-green-100 mt-0.5">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 font-montserrat">Build Trust</h4>
                      <p className="text-sm text-gray-500 font-lato">Verified accounts are more trusted by users</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-green-100 mt-0.5">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 font-montserrat">Unlock Features</h4>
                      <p className="text-sm text-gray-500 font-lato">Access all platform features</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-green-100 mt-0.5">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 font-montserrat">Earn Rewards</h4>
                      <p className="text-sm text-gray-500 font-lato">Help friends earn referral coins</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="bg-[#121E3C]/5 p-6 rounded-2xl border border-[#121E3C]/10">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="w-5 h-5 text-[#121E3C]" />
                  <h3 className="text-base font-semibold font-montserrat" style={{color: '#121E3C'}}>Your Privacy</h3>
                </div>
                <p className="text-sm text-gray-600 font-lato">
                  Your documents are encrypted and securely stored. We use them only for identity verification and never share them with third parties.
                </p>
              </div>

              {/* Processing Time */}
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-semibold font-montserrat text-amber-800">Processing Time</h3>
                </div>
                <p className="text-sm text-amber-700 font-lato">
                  Verification typically takes 2-3 business days. You'll receive an email notification once reviewed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VerifyAccountPage;
