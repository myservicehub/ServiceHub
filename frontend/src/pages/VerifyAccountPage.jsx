import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verificationAPI } from '../api/referrals';
import { authAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';

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
  const [nextPath, setNextPath] = useState('/my-jobs');
  const [businessType, setBusinessType] = useState(user?.business_type || '');
  const [idSelfie, setIdSelfie] = useState(null);
  const [idDocument, setIdDocument] = useState(null);
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
    if (nextParam) setNextPath(nextParam);
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
          } else {
            toast({ title: 'Email Verified', description: resp?.message || 'Your email has been verified.' });
          }
          setVerified(true);
          // Navigate to provided nextPath (if any) or default /my-jobs
          try { navigate(nextPath || '/my-jobs', { replace: true }); } catch (e) { navigate('/my-jobs', { replace: true }); }
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
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, user, location.search]);

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-sm border text-center">
            <CheckCircle size={64} className="mx-auto mb-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified</h2>
            <p className="text-gray-600 mb-6">You’re all set. Continue where you left off.</p>
            <Button onClick={() => navigate(nextPath, { replace: true })} className="w-full text-white" style={{backgroundColor: '#34D164'}}>
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
    if (!idDocument) errs.id_document = 'Valid ID is required';
    if (!idSelfie) errs.id_selfie = 'Selfie holding ID is required';
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
    if (!workRef.phone?.trim()) {
      errs.work_referrer_phone = 'Work referee phone is required';
    } else if (!isValidPhone(workRef.phone)) {
      errs.work_referrer_phone = 'Enter a valid phone (+234XXXXXXXXXX or 0XXXXXXXXXX)';
    }
    if (!workRef.company_email?.trim()) errs.work_referrer_company_email = 'Company email is required';
    if (!workRef.company_name?.trim()) errs.work_referrer_company_name = 'Company name is required';
    if (!workRef.relationship?.trim()) errs.work_referrer_relationship = 'Relationship is required';
    if (!charRef.name?.trim()) errs.character_referrer_name = 'Character referee name is required';
    if (!charRef.phone?.trim()) {
      errs.character_referrer_phone = 'Character referee phone is required';
    } else if (!isValidPhone(charRef.phone)) {
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
            seErrs.id_document && 'Valid ID',
            seErrs.id_selfie && 'Selfie holding ID',
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
        id_document: idDocument,
        id_selfie: idSelfie,
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
              seErrs.id_document && 'Valid ID',
              seErrs.id_selfie && 'Selfie holding ID',
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
                  <li>• Referees will receive their 5 coin reward</li>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Verify Your Account</h1>
            <p className="text-gray-600">Verify your email and phone. Tradespeople complete business verification and references.</p>
          </div>

          {/* Current Verification Status for Tradespeople */}
          {user?.role === 'tradesperson' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Current Verification Status</h3>
              {isTradespersonVerified ? (
                <div className="flex items-center space-x-3 text-green-700">
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="font-medium">Account Verified</span>
                </div>
              ) : (
                <>
                  {verificationStatus === 'rejected' ? (
                    <div className="flex items-center space-x-3 text-red-700">
                      <Clock size={20} className="text-red-600" />
                      <span className="font-medium">Verification Rejected</span>
                    </div>
                  ) : verificationStatus === 'not_submitted' ? (
                    <div className="flex items-center space-x-3 text-gray-700">
                      <Clock size={20} className="text-gray-600" />
                      <span className="font-medium">Not Submitted</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-yellow-700">
                      <Clock size={20} className="text-yellow-600" />
                      <span className="font-medium">Verification Pending</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    {verificationStatus === 'rejected'
                      ? 'Your submission was not approved. Please review notes and resubmit.'
                      : verificationStatus === 'not_submitted'
                        ? 'You have not submitted your business verification yet.'
                        : 'Your documents are under review. You\'ll be notified once approved.'}
                  </p>
                </>
              )}
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
                <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Verification</h3>
                  {verificationStatus === 'rejected' && (
                    <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                      Your previous submission was rejected. Please correct issues and upload clear documents.
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <select value={businessType} onChange={(e)=>setBusinessType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Select business type</option>
                        <option>Self-Employed / Sole Trader</option>
                        <option>Limited Company (LTD)</option>
                        <option>Ordinary Partnership</option>
                        <option>Limited Liability Partnership (LLP)</option>
                      </select>
                      {user?.business_type && (
                        <p className="text-xs text-gray-500 mt-1">Pre-selected from your registration. Update only if incorrect.</p>
                      )}
                    </div>
                    {(businessType === 'Self-Employed / Sole Trader') && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valid ID (NIN, Voter’s Card, Driver’s Licence, Passport)</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setIdDocument(e.target.files[0])} />
                          {selfErrors.id_document && (<p className="text-xs text-red-600 mt-1">{selfErrors.id_document}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Selfie holding ID</label>
                          <input type="file" accept="image/*" onChange={(e)=>setIdSelfie(e.target.files[0])} />
                          {selfErrors.id_selfie && (<p className="text-xs text-red-600 mt-1">{selfErrors.id_selfie}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Residential address</label>
                          <input className="w-full px-3 py-2 border rounded-lg" value={residentialAddress} onChange={(e)=>setResidentialAddress(e.target.value)} />
                          {selfErrors.residential_address && (<p className="text-xs text-red-600 mt-1">{selfErrors.residential_address}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Proof of address (utility bill, bank statement)</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setProofOfAddress(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Recent work photos (min 2)</label>
                          <input type="file" accept="image/*" multiple onChange={(e)=>handleWorkPhotosSelect(e.target.files)} />
                          {Array.isArray(workPhotos) && workPhotos.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">Selected {workPhotos.length} of 6</p>
                          )}
                          {selfErrors.work_photos && (<p className="text-xs text-red-600 mt-1">{selfErrors.work_photos}</p>)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Trade or apprenticeship certificate (optional)</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setTradeCertificate(e.target.files[0])} />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">References</h4>
                          <p className="text-sm text-gray-600 mb-4">As part of your verification on ServiceHub, we require two types of references to help confirm your professionalism and integrity:</p>
                          {/* Stack Character Referrer below Work Referrer on all screen sizes */}
                          <div className="space-y-6">
                            <div>
                              <h5 className="font-medium mb-2">Work Referee</h5>
                              <p className="text-xs text-gray-600 mb-2">This should be someone you’ve worked for or with — a previous client, supervisor, or colleague (not a family member).</p>
                              <div className="space-y-3">
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Referee name" value={workRef.name} onChange={(e)=>setWorkRef({...workRef, name: e.target.value})} />
                                {refErrors.work_referrer_name && (<p className="text-xs text-red-600 mt-1">{refErrors.work_referrer_name}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Referee phone" value={workRef.phone} onChange={(e)=>setWorkRef({...workRef, phone: e.target.value})} />
                                {refErrors.work_referrer_phone && (<p className="text-xs text-red-600 mt-1">{refErrors.work_referrer_phone}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Company email (referee)" value={workRef.company_email} onChange={(e)=>setWorkRef({...workRef, company_email: e.target.value})} />
                                {refErrors.work_referrer_company_email && (<p className="text-xs text-red-600 mt-1">{refErrors.work_referrer_company_email}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Company name (referee)" value={workRef.company_name} onChange={(e)=>setWorkRef({...workRef, company_name: e.target.value})} />
                                {refErrors.work_referrer_company_name && (<p className="text-xs text-red-600 mt-1">{refErrors.work_referrer_company_name}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Relationship to referee" value={workRef.relationship} onChange={(e)=>setWorkRef({...workRef, relationship: e.target.value})} />
                                {refErrors.work_referrer_relationship && (<p className="text-xs text-red-600 mt-1">{refErrors.work_referrer_relationship}</p>)}
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium mb-2">Character Referee</h5>
                              <p className="text-xs text-gray-600 mb-2">This should be someone who can vouch for your behaviour, reliability, and trustworthiness. This can be a community leader, neighbour, mentor, or someone you’ve known personally (but not an immediate family member).</p>
                              <div className="space-y-3">
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Referee name" value={charRef.name} onChange={(e)=>setCharRef({...charRef, name: e.target.value})} />
                                {refErrors.character_referrer_name && (<p className="text-xs text-red-600 mt-1">{refErrors.character_referrer_name}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Referee phone" value={charRef.phone} onChange={(e)=>setCharRef({...charRef, phone: e.target.value})} />
                                {refErrors.character_referrer_phone && (<p className="text-xs text-red-600 mt-1">{refErrors.character_referrer_phone}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Referee email" value={charRef.email} onChange={(e)=>setCharRef({...charRef, email: e.target.value})} />
                                {refErrors.character_referrer_email && (<p className="text-xs text-red-600 mt-1">{refErrors.character_referrer_email}</p>)}
                                <input className="w-full px-3 py-2 border rounded-lg" placeholder="Relationship to referee" value={charRef.relationship} onChange={(e)=>setCharRef({...charRef, relationship: e.target.value})} />
                                {refErrors.character_referrer_relationship && (<p className="text-xs text-red-600 mt-1">{refErrors.character_referrer_relationship}</p>)}
                              </div>
                            </div>
                          </div>
                          {/* References are now submitted together with Business Verification for Self-Employed */}
                        </div>
                      </div>
                    )}
                    {(businessType === 'Limited Company (LTD)') && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CAC Certificate</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setCacCertificate(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CAC Status Report/Extract</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setCacStatusReport(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company address</label>
                          <input className="w-full px-3 py-2 border rounded-lg" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Director name</label>
                          <input className="w-full px-3 py-2 border rounded-lg" value={directorName} onChange={(e)=>setDirectorName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Director ID document</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setDirectorIdDocument(e.target.files[0])} />
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Bank name" value={companyBankName} onChange={(e)=>setCompanyBankName(e.target.value)} />
                          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Account number" value={companyAccountNumber} onChange={(e)=>setCompanyAccountNumber(e.target.value)} />
                          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Account name" value={companyAccountName} onChange={(e)=>setCompanyAccountName(e.target.value)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <input className="w-full px-3 py-2 border rounded-lg" placeholder="TIN (optional)" value={tin} onChange={(e)=>setTin(e.target.value)} />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business logo or office/team photo (optional)</label>
                            <input type="file" accept="image/*" onChange={(e)=>setBusinessLogo(e.target.files[0])} />
                          </div>
                        </div>
                      </div>
                    )}
                    {(businessType === 'Ordinary Partnership') && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CAC Business Name Certificate (BN)</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setBnCertificate(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partnership agreement</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setPartnershipAgreement(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partner ID documents</label>
                          <input type="file" accept="image/*,application/pdf" multiple onChange={(e)=>handlePartnerIdsSelect(e.target.files)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business address</label>
                          <input className="w-full px-3 py-2 border rounded-lg" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                      </div>
                    )}
                    {(businessType === 'Limited Liability Partnership (LLP)') && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CAC LLP Certificate/Registration</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setLlpCertificate(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">LLP agreement</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e)=>setLlpAgreement(e.target.files[0])} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Designated partners (names, roles)</label>
                          <textarea className="w-full px-3 py-2 border rounded-lg" value={designatedPartners} onChange={(e)=>setDesignatedPartners(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partner ID documents</label>
                          <input type="file" accept="image/*,application/pdf" multiple onChange={(e)=>handlePartnerIdsSelect(e.target.files)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Business address</label>
                          <input className="w-full px-3 py-2 border rounded-lg" value={companyAddress} onChange={(e)=>setCompanyAddress(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      disabled={loading || !businessType}
                      onClick={handleBusinessVerificationSubmit}
                      className=""
                    >
                      {loading ? 'Submitting...' : 'Submit'}
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
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Why Verify?</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Build Trust</h4>
                      <p className="text-sm text-gray-600">Verified accounts are more trusted by users</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Unlock Features</h4>
                      <p className="text-sm text-gray-600">Access all platform features</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Earn Rewards</h4>
                      <p className="text-sm text-gray-600">Help friends earn referral coins</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">🔒 Your Privacy</h3>
                <p className="text-sm text-blue-700">
                  Your documents are encrypted and securely stored. We use them only for identity verification and never share them with third parties.
                </p>
              </div>

              {/* Processing Time */}
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">⏱️ Processing Time</h3>
                <p className="text-sm text-gray-600">
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