import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ValidationBanner from './ValidationBanner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  DollarSign, 
  User, 
  Mail, 
  Phone,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  Coins,
  Users,
  Bell,
  Star
} from 'lucide-react';
import { jobsAPI, authAPI } from '../api/services';
import { adminAPI, tradeCategoryQuestionsAPI } from '../api/wallet';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import useStates from '../hooks/useStates';
import LocationPicker from './maps/LocationPicker';

// Fallback trade categories (used while loading or if API fails)
const FALLBACK_TRADE_CATEGORIES = [
  // Column 1
  "Building",
  "Concrete Works",
  "Tiling",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Plumbing",
  
  // Column 2
  "Home Extensions",
  "Scaffolding",
  "Flooring",
  "Bathroom Fitting",
  "Generator Services",
  "Welding",
  
  // Column 3
  "Renovations",
  "Painting",
  "Carpentry",
  "Interior Design",
  "Solar & Inverter Installation",
  "Locksmithing",
  
  // Column 4
  "Roofing",
  "Plastering/POP",
  "Furniture Making",
  "Electrical Repairs",
  "CCTV & Security Systems",
  "General Handyman Work",
  // Additional services to maintain strict 28
  "Cleaning",
  "Relocation/Moving",
  "Waste Disposal",
  "Recycling"
];

function JobPostingForm({ onClose, onJobPosted, initialCategory, initialState, skipDraftRestore = false }) {
  const JOB_POST_DRAFT_KEY = 'job_posting_draft_v2';
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [tradeCategories, setTradeCategories] = useState(FALLBACK_TRADE_CATEGORIES);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [formData, setFormData] = useState({
    // Step 1: Job Details
    title: '',
    description: '',
    category: '',
    
    // Step 2: Location & Timeline
    state: '', 
    lga: '',
    town: '',
    zip_code: '',
    home_address: '',
    timeline: 'Flexible',
    jobLocation: null, // For coordinates
    
    // Step 3: Budget  
    budgetType: 'range', // 'range' or 'discussion'
    budget_min: '',
    budget_max: '',
    
    // Step 4: Contact Details
    homeowner_name: '',
    homeowner_email: '',
    homeowner_phone: '',
    
    // Step 5: Create Account
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [globalErrorMessage, setGlobalErrorMessage] = useState('');
  const [availableLGAs, setAvailableLGAs] = useState([]);
  const [loadingLGAs, setLoadingLGAs] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showVerificationGateModal, setShowVerificationGateModal] = useState(false);
  const [hasPendingJob, setHasPendingJob] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [loggingIn, setLoggingIn] = useState(false);
  // Map centering control
  const [mapCenterAddress, setMapCenterAddress] = useState('');
  const [mapCenterZoom, setMapCenterZoom] = useState(10);

  // Trade category questions state
  const [tradeQuestions, setTradeQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // One-by-one question display state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionsOneByOne, setShowQuestionsOneByOne] = useState(true);
  const [navHistory, setNavHistory] = useState([]);
  const [endAfterQuestionId, setEndAfterQuestionId] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [questionAnswersOtherText, setQuestionAnswersOtherText] = useState({});
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questionsCompleted, setQuestionsCompleted] = useState(false);
  const [showQuizFeedbackModal, setShowQuizFeedbackModal] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState('');
  const [quizFeedbackOption, setQuizFeedbackOption] = useState('');
  const lgaAbortRef = useRef(null);
  const hasRestoredDraft = useRef(false);
  const hasAppliedInitialCategory = useRef(false);
  const hasAppliedInitialState = useRef(false);

  const { loginWithToken, isAuthenticated, user: currentUser, loading, refreshAccessToken, logout } = useAuth();
  const { toast } = useToast();
  const { states: nigerianStates, loading: statesLoading, error: statesError } = useStates();

  const sanitizeQuestionAnswersForStorage = (answers = {}) => {
    const sanitized = {};
    Object.entries(answers).forEach(([key, value]) => {
      if (value instanceof File) return;
      if (Array.isArray(value)) {
        sanitized[key] = value.filter(v => !(v instanceof File));
        return;
      }
      sanitized[key] = value;
    });
    return sanitized;
  };

  const persistDraft = (stepOverride = null) => {
    try {
      const payload = {
        formData,
        currentStep: stepOverride ?? currentStep,
        questionAnswers: sanitizeQuestionAnswersForStorage(questionAnswers),
        questionAnswersOtherText,
        currentQuestionIndex,
        questionsCompleted,
        savedAt: Date.now()
      };
      localStorage.setItem(JOB_POST_DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(JOB_POST_DRAFT_KEY);
      localStorage.removeItem('pending_job_id');
      setHasPendingJob(false);
    } catch {}
  };
  
  // Enhanced authentication check - avoiding immediate currentUser access
  const isUserAuthenticated = () => {
    return isAuthenticated() && !loading;
  };

  // Auto-populate user details for authenticated users
  useEffect(() => {
    if (isAuthenticated() && currentUser && !loading) {
      setFormData(prev => ({
        ...prev,
        homeowner_name: currentUser.name || '',
        homeowner_email: currentUser.email || '',
        homeowner_phone: currentUser.phone || ''
      }));
    }
  }, [currentUser, loading]);
  // Prefill category if provided via navigation
  useEffect(() => {
    if (!hasAppliedInitialCategory.current && initialCategory && !formData.category) {
      setFormData(prev => ({ ...prev, category: initialCategory }));
      hasAppliedInitialCategory.current = true;
    }
  }, [initialCategory, formData.category]);
  // Prefill state if provided via navigation
  useEffect(() => {
    if (!hasAppliedInitialState.current && initialState && !formData.state) {
      setFormData(prev => ({ ...prev, state: initialState }));
      // Load LGAs for the initial state
      fetchLGAsForState(initialState);
      // Center the map to the initial state
      setMapCenterAddress(`${initialState}, Nigeria`);
      setMapCenterZoom(10);
      hasAppliedInitialState.current = true;
    }
  }, [initialState, formData.state]);

  useEffect(() => {
    if (loading || hasRestoredDraft.current) return;
    if (skipDraftRestore) {
      clearDraft();
      hasRestoredDraft.current = true;
      return;
    }
    try {
      const pendingJobId = localStorage.getItem('pending_job_id');
      setHasPendingJob(!!pendingJobId);
      const raw = localStorage.getItem(JOB_POST_DRAFT_KEY);
      if (!raw) {
        hasRestoredDraft.current = true;
        return;
      }
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') {
        hasRestoredDraft.current = true;
        return;
      }
      if (draft.formData && typeof draft.formData === 'object') {
        setFormData(prev => ({ ...prev, ...draft.formData }));
      }
      if (draft.questionAnswers && typeof draft.questionAnswers === 'object') {
        setQuestionAnswers(draft.questionAnswers);
      }
      if (draft.questionAnswersOtherText && typeof draft.questionAnswersOtherText === 'object') {
        setQuestionAnswersOtherText(draft.questionAnswersOtherText);
      }
      const maxStep = isUserAuthenticated() ? 4 : 5;
      const restoredStep = Number.isFinite(Number(draft.currentStep))
        ? Math.max(1, Math.min(Number(draft.currentStep), maxStep))
        : 1;
      setCurrentStep(restoredStep);
      if (Number.isFinite(Number(draft.currentQuestionIndex))) {
        setCurrentQuestionIndex(Math.max(0, Number(draft.currentQuestionIndex)));
      }
      setQuestionsCompleted(!!draft.questionsCompleted);
      if (isUserAuthenticated() && pendingJobId) {
        setCurrentStep(4);
      }
      hasRestoredDraft.current = true;
      toast({
        title: 'Progress restored',
        description: 'We restored your job posting draft so you can continue where you stopped.'
      });
    } catch {
      hasRestoredDraft.current = true;
    }
  }, [loading, skipDraftRestore]);

  useEffect(() => {
    if (!hasRestoredDraft.current) return;
    const timer = setTimeout(() => {
      persistDraft();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    formData,
    currentStep,
    questionAnswers,
    questionAnswersOtherText,
    currentQuestionIndex,
    questionsCompleted
  ]);

  // Fetch trade categories from API
  useEffect(() => {
    const fetchTradeCategories = async () => {
      try {
        setLoadingTrades(true);
        const response = await adminAPI.getAllTrades();
        
        if (response && response.trades && Array.isArray(response.trades)) {
          setTradeCategories(response.trades);
          console.log('✅ Job Posting Form: Loaded trade categories from API:', response.trades.length, 'categories');
        } else {
          console.log('⚠️ Job Posting Form: Invalid API response, using fallback');
          setTradeCategories(FALLBACK_TRADE_CATEGORIES);
        }
      } catch (error) {
        console.error('❌ Job Posting Form: Error fetching trade categories:', error);
        setTradeCategories(FALLBACK_TRADE_CATEGORIES);
      } finally {
        setLoadingTrades(false);
      }
    };

    fetchTradeCategories();
  }, []);

  // Load trade questions when category changes
  useEffect(() => {
    if (formData.category) {
      // Skip auto-popup if questions were already completed (draft restore scenario)
      loadTradeQuestions(formData.category, questionsCompleted);
    }
  }, [formData.category]);

  // Dynamic total steps based on authentication status - using defensive approach
  const totalSteps = (isAuthenticated() && !loading) ? 4 : 5;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (globalErrorMessage) {
      setGlobalErrorMessage('');
    }
    
    // When state changes, fetch LGAs and reset LGA selection
    if (field === 'state' && value) {
      fetchLGAsForState(value);
      setFormData(prev => ({ ...prev, lga: '' })); // Reset LGA when state changes
      // Center map to selected state
      setMapCenterAddress(`${value}, Nigeria`);
      setMapCenterZoom(10);
    }
    // When LGA changes, narrow map to LGA within the state
    if (field === 'lga' && value && formData.state) {
      setMapCenterAddress(`${value}, ${formData.state}, Nigeria`);
      setMapCenterZoom(12);
    }
  };

  // Update map center when address fields change (debounced)
  useEffect(() => {
    const parts = [];
    if (formData.home_address && formData.home_address.trim().length > 0) {
      parts.push(formData.home_address.trim());
    }
    if (formData.town) parts.push(formData.town);
    if (formData.lga) parts.push(formData.lga);
    if (formData.state) parts.push(formData.state);
    parts.push('Nigeria');
    const addr = parts.filter(Boolean).join(', ');

    if (!addr) return;
    // Small debounce to avoid geocoding on every keystroke
    const handle = setTimeout(() => {
      setMapCenterAddress(addr);
      setMapCenterZoom(15);
    }, 350);
    return () => clearTimeout(handle);
  }, [formData.home_address, formData.town, formData.lga, formData.state]);

  // Fetch LGAs for selected state
  const fetchLGAsForState = async (state) => {
    if (!state) {
      setAvailableLGAs([]);
      return;
    }
    
    setLoadingLGAs(true);
    try {
      const base = (import.meta?.env?.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : (apiClient?.defaults?.baseURL || '/api'));
      if (lgaAbortRef.current) {
        try { lgaAbortRef.current.abort(); } catch {}
      }
      lgaAbortRef.current = new AbortController();
      const resp = await fetch(`${base}/auth/lgas/${encodeURIComponent(state)}`, { signal: lgaAbortRef.current.signal });
      if (resp.ok) {
        const data = await resp.json();
        setAvailableLGAs(data.lgas || []);
      } else {
        console.error('Failed to fetch LGAs:', resp.statusText);
        setAvailableLGAs([]);
      }
    } catch (error) {
      console.error('Error fetching LGAs:', error);
      setAvailableLGAs([]);
    } finally {
      setLoadingLGAs(false);
    }
  };

  const hasCoarseJobLocation = (location) => {
    const coarseSources = new Set([
      'state',
      'text-state',
      'town',
      'lga',
      'text-city',
      'text-fallback',
      'geocode',
      'center-coordinates',
      'initial',
    ]);
    return !!(location && location.source && coarseSources.has(location.source));
  };

  const validateStep = (step) => {
    const newErrors = {};

  switch (step) {
    case 1: // Job Details
      if (!formData.title.trim()) newErrors.title = 'Job title is required';
      else if (formData.title.length < 10) newErrors.title = 'Job title must be at least 10 characters';
      
      

      if (!formData.category) newErrors.category = 'Please select a category';

      // If category is selected, validate that questions have been completed
      if (formData.category && tradeQuestions.length > 0) {
        if (!questionsCompleted) {
          newErrors.questions = 'Please answer the job detail questions';
        } else {
          // Validate that all required questions have been answered
          const visibleQuestions = getVisibleQuestions();
          const cutoffIndex = endAfterQuestionId ? visibleQuestions.findIndex(q => q.id === endAfterQuestionId) : -1;
          const questionsToValidate = cutoffIndex !== -1 ? visibleQuestions.slice(0, cutoffIndex + 1) : visibleQuestions;
          
          questionsToValidate.forEach(question => {
            if (question.is_required) {
              const answer = questionAnswers[question.id];
              
              if (question.question_type === 'multiple_choice_multiple') {
                if (!answer || answer.length === 0) {
                  newErrors[`question_${question.id}`] = 'This question is required';
                }
              } else if (question.question_type === 'yes_no') {
                if (answer === undefined || answer === null) {
                  newErrors[`question_${question.id}`] = 'This question is required';
                }
              } else if (isFileUploadType(question.question_type)) {
                const hasFile = Array.isArray(answer)
                  ? answer.length > 0
                  : (answer instanceof File) || (typeof answer === 'string' && !!String(answer).trim());
                if (!hasFile) {
                  newErrors[`question_${question.id}`] = 'This question is required';
                }
              } else {
                if (question.question_type === 'multiple_choice_single' && answer === 'other') {
                  if (!(questionAnswersOtherText[question.id] || '').trim()) {
                    newErrors[`question_${question.id}_other`] = 'Please specify';
                  }
                } else if (question.question_type === 'multiple_choice_multiple' && Array.isArray(answer) && answer.includes('other')) {
                  if (!(questionAnswersOtherText[question.id] || '').trim()) {
                    newErrors[`question_${question.id}_other`] = 'Please specify';
                  }
                } else {
                  if (!answer || (typeof answer === 'string' && !answer.trim())) {
                    newErrors[`question_${question.id}`] = 'This question is required';
                  }
                }
              }
            }
          });
        }
      } else if (formData.category && tradeQuestions.length === 0 && !loadingQuestions) {
        // No questions available for this category - allow proceeding (questions may be optional)
      }
      break;

      case 2: // Location
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.lga.trim()) newErrors.lga = 'Local Government Area (LGA) is required';
        if (!formData.town.trim()) newErrors.town = 'Town/Area is required';
        if (formData.zip_code.trim() && !/^\d{6}$/.test(formData.zip_code.trim())) {
          newErrors.zip_code = 'Zip code must be 6 digits';
        }
        if (!formData.home_address.trim()) {
          newErrors.home_address = 'Home address is required';
        } else if (formData.home_address.trim().length < 10) {
          newErrors.home_address = 'Home address must be at least 10 characters';
        }
        if (!formData.jobLocation || typeof formData.jobLocation.lat !== 'number' || typeof formData.jobLocation.lng !== 'number') {
          newErrors.jobLocation = 'Please pin your exact job location on the map';
        } else if (hasCoarseJobLocation(formData.jobLocation)) {
          newErrors.jobLocation = 'Please pin your exact job location on the map';
        }
        break;

      case 3: // Budget
        if (formData.budgetType === 'range') {
          if (!formData.budget_min || formData.budget_min < 1000) {
            newErrors.budget_min = 'Minimum budget must be at least ₦1,000';
          }
          if (!formData.budget_max || formData.budget_max < 1000) {
            newErrors.budget_max = 'Maximum budget must be at least ₦1,000';
          }
          if (formData.budget_min && formData.budget_max && 
              parseInt(formData.budget_min) >= parseInt(formData.budget_max)) {
            newErrors.budget_max = 'Maximum budget must be higher than minimum';
          }
        }
        break;

      case 4: // Contact Details (skip validation for authenticated users)
        if (isAuthenticated()) {
          // For authenticated users, no validation needed as we use their existing data
          break;
        }
        // For non-authenticated users, validate contact details
        if (!formData.homeowner_name.trim()) newErrors.homeowner_name = 'Your name is required';
        if (!formData.homeowner_email.trim()) newErrors.homeowner_email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.homeowner_email)) {
          newErrors.homeowner_email = 'Please enter a valid email address';
        }
        if (!formData.homeowner_phone.trim()) newErrors.homeowner_phone = 'Phone number is required';
        break;

      case 5: // Create Account
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      const count = Object.keys(newErrors).length;
      setGlobalErrorMessage(`Please fix ${count} highlighted field${count > 1 ? 's' : ''} before continuing.`);
      setTimeout(() => scrollToFirstError(Object.keys(newErrors)), 0);
    } else {
      setGlobalErrorMessage('');
    }
    
    // Debug logging for Step 1 validation
    if (step === 1) {
      console.log('Step 1 validation:', {
        title: formData.title,
        titleLength: formData.title.length,
        description: formData.description,
        descriptionLength: formData.description.length,
        category: formData.category,
        errors: newErrors,
        isValid
      });
    }
    
    return isValid;
  };

  const scrollToFirstError = (keys) => {
    if (!keys || !keys.length) return;
    const firstKey = keys[0];
    const candidates = [
      document.getElementById(`field-${firstKey}`),
      document.querySelector(`[name="${firstKey}"]`),
      document.querySelector(`[data-field="${firstKey}"]`)
    ];
    const el = candidates.find(Boolean);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof el.focus === 'function') {
        try { el.focus(); } catch {}
      }
    }
  };

  const nextStep = () => {
    if (currentStep === 4) {
      if (!isUserAuthenticated()) {
        setShowAccountModal(true);
        return;
      }
    }

    if (validateStep(currentStep)) {
      setIsTransitioning(true);
      const nextStepNumber = Math.min(currentStep + 1, totalSteps);
      setCurrentStep(nextStepNumber);
      // Small delay to prevent accidental double-clicks from triggering the next step's action immediately
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  const prevStep = () => {
    setIsTransitioning(true);
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const continueToAccountCreation = () => {
    persistDraft(5);
    setShowAccountModal(false);
    setCurrentStep(5);
  };

  const continueToLogin = () => {
    persistDraft(currentStep);
    setShowAccountModal(false);
    setShowLoginModal(true);
  };

  const handleJobSubmissionForAuthenticatedUser = async () => {
    // Check authentication with improved loading state handling
    if (!isUserAuthenticated()) {
      toast({
        title: "Error",
        description: "You must be logged in to post a job.",
        variant: "destructive",
      });
      return;
    }

    // Wait for user data to load if we're still in loading state
    if (!currentUser) {
      toast({
        title: "Loading...",
        description: "Please wait while we load your account information.",
        variant: "default",
      });
      return;
    }

    setSubmitting(true);

    try {
      const resolveJobId = (response) => response?.job?.id || response?.job?.job_id || response?.job_id || response?.id;
      const jobData = {
        title: formData.title,
        description: formData.description.trim(),
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code.trim() || null,
        home_address: formData.home_address,
        budget_min: formData.budgetType === 'range' ? parseInt(formData.budget_min) : null,
        budget_max: formData.budgetType === 'range' ? parseInt(formData.budget_max) : null,
        timeline: formData.timeline,
        homeowner_name: currentUser.name || 'Homeowner',
        homeowner_email: currentUser.email || '',
        homeowner_phone: currentUser.phone || ''
      };

      // Add coordinates if location was selected
      if (formData.jobLocation) {
        jobData.latitude = formData.jobLocation.lat;
        jobData.longitude = formData.jobLocation.lng;
      }

      const isAuthError = (error) => {
        const status = error?.response?.status;
        const detail = (error?.response?.data?.detail || '').toString().toLowerCase();
        return status === 401 || (status === 403 && detail.includes('not authenticated'));
      };

      let jobResponse;
      try {
        jobResponse = await jobsAPI.createJob(jobData);
      } catch (error) {
        if (isAuthError(error)) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            jobResponse = await jobsAPI.createJob(jobData);
          } else {
            logout();
            throw new Error('Your session has expired. Please sign in again to post your job.');
          }
        } else {
          throw error;
        }
      }

      const jobId = resolveJobId(jobResponse);

      // Save question answers if there are any
      if (jobId && tradeQuestions.length > 0 && Object.keys(questionAnswers).length > 0) {
        try {
          const updatedAnswers = { ...questionAnswers };
          for (const q of tradeQuestions.filter(q => isFileUploadType(q.question_type))) {
            const val = questionAnswers[q.id];
            if (val instanceof File) {
              try {
                const res = await tradeCategoryQuestionsAPI.uploadJobQuestionAttachment(jobId, q.id, val);
                updatedAnswers[q.id] = res?.url || '';
              } catch (e) {
                console.error('File upload failed for question', q.id, e);
                updatedAnswers[q.id] = '';
              }
            } else if (Array.isArray(val)) {
              const urls = [];
              for (const f of val) {
                if (!(f instanceof File)) continue;
                try {
                  const res = await tradeCategoryQuestionsAPI.uploadJobQuestionAttachment(jobId, q.id, f);
                  if (res?.url) urls.push(res.url);
                } catch (e) {
                  console.error('File upload failed for question', q.id, e);
                }
              }
              updatedAnswers[q.id] = urls;
            }
          }

          const answersData = {
            job_id: jobId,
            trade_category: formData.category,
            answers: getVisibleQuestions(true).map(question => ({
              question_id: question.id,
              question_text: question.question_text,
              question_type: question.question_type,
              answer_value: updatedAnswers[question.id],
              answer_text: formatAnswerText(question, updatedAnswers[question.id])
            }))
          };

          await tradeCategoryQuestionsAPI.saveJobQuestionAnswers(answersData);
          console.log('✅ Question answers saved successfully');
        } catch (answerError) {
          console.error('⚠️ Failed to save question answers, but job was created:', answerError);
        }
      }
      toast({
        title: "Job Submitted for Review!",
        description: `Your job has been submitted and is pending admin approval. Job ID: ${jobId}`,
      });
      clearDraft();

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to My Jobs page instead of homepage to avoid full reload/anchoring
      try {
        navigate('/dashboard/jobs', { replace: true });
      } catch (e) {
        // Fallback to hard redirect if navigate is unavailable
        window.location.href = '/dashboard/jobs';
      }

    } catch (error) {
      console.error('Job posting failed:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Load questions when trade category changes
  const loadTradeQuestions = async (category, skipAutoPopup = false) => {
    if (!category) {
      setTradeQuestions([]);
      setQuestionAnswers({});
      resetQuestionNavigation();
      return;
    }

    try {
      setLoadingQuestions(true);
      const response = await tradeCategoryQuestionsAPI.getJobPostingQuestions(category);
      const questions = response.questions || [];
      setTradeQuestions(questions);
      
      // Only initialize answers if we don't already have saved answers (draft restore)
      setQuestionAnswers(prev => {
        const hasExistingAnswers = Object.keys(prev).length > 0;
        if (hasExistingAnswers) {
          return prev; // Keep existing answers from draft
        }
        // Initialize answers for required questions
        const initialAnswers = {};
        questions.forEach(question => {
          if (question.question_type === 'yes_no') {
            initialAnswers[question.id] = null;
          } else if (question.question_type === 'multiple_choice_multiple') {
            initialAnswers[question.id] = [];
          } else if (question.question_type === 'file_upload') {
            initialAnswers[question.id] = [];
          } else {
            initialAnswers[question.id] = '';
          }
        });
        return initialAnswers;
      });
      
      // Reset to first question only if not restoring
      if (!skipAutoPopup) {
        resetQuestionNavigation();
      }
      
      // Auto-popup the quiz modal if there are questions AND questions aren't already completed
      if (questions.length > 0 && !skipAutoPopup && !questionsCompleted) {
        setShowQuestionsModal(true);
      }
      
    } catch (error) {
      console.error('Failed to load trade questions:', error);
      setTradeQuestions([]);
      setQuestionAnswers({});
      resetQuestionNavigation();
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Handle question answer changes
  const handleQuestionAnswer = (questionId, value, questionType) => {
    setQuestionAnswers(prev => {
      let newAnswers;
      if (questionType === 'multiple_choice_multiple') {
        const currentAnswers = prev[questionId] || [];
        const multipleAnswers = currentAnswers.includes(value)
          ? currentAnswers.filter(v => v !== value)
          : [...currentAnswers, value];
        newAnswers = { ...prev, [questionId]: multipleAnswers };
        if (!multipleAnswers.includes('other')) {
          setQuestionAnswersOtherText(prevOther => ({ ...prevOther, [questionId]: '' }));
        }
      } else {
        if (isFileUploadType(questionType) && Array.isArray(value)) {
          const existing = Array.isArray(prev[questionId]) ? prev[questionId] : [];
          newAnswers = { ...prev, [questionId]: [...existing, ...value] };
        } else {
          newAnswers = { ...prev, [questionId]: value };
        }
        if (value !== 'other') {
          setQuestionAnswersOtherText(prevOther => ({ ...prevOther, [questionId]: '' }));
        }
      }
      
      return newAnswers;
    });
  };

  useEffect(() => {
    const visibleQuestions = getVisibleQuestions();
    if (visibleQuestions.length > 0) {
      if (currentQuestionIndex >= visibleQuestions.length) {
        setCurrentQuestionIndex(visibleQuestions.length - 1);
      }
    } else if (currentQuestionIndex !== 0) {
      setCurrentQuestionIndex(0);
    }

    const visibleQuestionIds = visibleQuestions.map(q => q.id);
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      let changed = false;
      Object.keys(newErrors).forEach(errorKey => {
        if (errorKey.startsWith('question_')) {
          const questionId = errorKey.replace('question_', '');
          if (!visibleQuestionIds.includes(questionId)) {
            delete newErrors[errorKey];
            changed = true;
          }
        }
      });
      return changed ? newErrors : prevErrors;
    });
  }, [tradeQuestions, questionAnswers]);

  const goToNextQuestion = () => {
    const visibleQuestions = getVisibleQuestions();
    const currentQuestion = visibleQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    const answer = questionAnswers[currentQuestion.id];
    let isAnswered = false;
    if (currentQuestion.question_type === 'multiple_choice_multiple') {
      const hasAny = Array.isArray(answer) && answer.length > 0;
      const needsOther = Array.isArray(answer) && answer.includes('other');
      if (needsOther) {
        isAnswered = (questionAnswersOtherText[currentQuestion.id] || '').trim() !== '';
      } else {
        isAnswered = hasAny;
      }
    } else if (currentQuestion.question_type === 'yes_no') {
      isAnswered = answer === true || answer === false;
    } else if (isFileUploadType(currentQuestion.question_type)) {
      isAnswered = Array.isArray(answer)
        ? answer.length > 0
        : (answer && typeof answer === 'string' && String(answer).trim() !== '') || (answer instanceof File);
    } else {
      if (currentQuestion.question_type === 'multiple_choice_single' && answer === 'other') {
        isAnswered = (questionAnswersOtherText[currentQuestion.id] || '').trim() !== '';
      } else {
        isAnswered = answer !== undefined && answer !== null && answer !== '';
      }
    }

    if (!isAnswered && currentQuestion.is_required) {
      setErrors(prev => ({
        ...prev,
        [`question_${currentQuestion.id}`]: 'This question is required'
      }));
      return;
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`question_${currentQuestion.id}`];
      delete newErrors[`question_${currentQuestion.id}_other`];
      return newErrors;
    });

    const normalize = (val) => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return String(val).toLowerCase().trim().replace(/\s+/g, '_');
    };

    let targetIndex = currentQuestionIndex + 1;
    const nav = currentQuestion.navigation_logic;
    if (nav && nav.enabled && isAnswered) {
      let key = '';
      if (currentQuestion.question_type === 'yes_no') {
        key = normalize(answer);
      } else if (currentQuestion.question_type === 'multiple_choice_single') {
        key = normalize(answer);
      }
      const nextIdRaw = findMappedId(nav.next_question_map, key);
      const fallbackId = nav.default_next_question_id || null;
      const candidateId = nextIdRaw || fallbackId;
      const inlineUploadQ = getInlineUploadForAnswer(currentQuestion, answer);
      if (inlineUploadQ) {
        const a2 = questionAnswers[inlineUploadQ.id];
        const ok2 = Array.isArray(a2)
          ? a2.length > 0
          : (a2 instanceof File) || (typeof a2 === 'string' && String(a2).trim() !== '');
        if (inlineUploadQ.is_required && !ok2) {
          setErrors(prev => ({ ...prev, [`question_${inlineUploadQ.id}`]: 'This field is required' }));
          return;
        } else {
          setErrors(prev => { const n = { ...prev }; delete n[`question_${inlineUploadQ.id}`]; return n; });
        }
      }
      if (candidateId) {
        // Skip navigating to inline upload question (already shown inline)
        if (inlineUploadQ && String(candidateId) === String(inlineUploadQ.id)) {
          const afterList = visibleQuestions.slice(currentQuestionIndex + 1);
          if (afterList.length > 0) {
            const targetIdx = currentQuestionIndex + 1;
            setNavHistory(prev => [...prev, currentQuestion.id]);
            setCurrentQuestionIndex(targetIdx);
            return;
          } else {
            setNavHistory(prev => [...prev, currentQuestion.id]);
            setEndAfterQuestionId(currentQuestion.id);
            nextStep();
            return;
          }
        } else {
          if (candidateId === '__END__') {
            const a = questionAnswers[currentQuestion.id];
            const required = currentQuestion.is_required;
            let ok = true;
            if (required) {
              if (currentQuestion.question_type === 'multiple_choice_multiple') ok = Array.isArray(a) && a.length > 0;
              else if (currentQuestion.question_type === 'yes_no') ok = a === true || a === false;
              else if (isFileUploadType(currentQuestion.question_type)) ok = Array.isArray(a) ? a.length > 0 : (a instanceof File) || (typeof a === 'string' && String(a).trim() !== '');
              else {
                if (a === 'other') ok = (questionAnswersOtherText[currentQuestion.id] || '').trim() !== '';
                else ok = a !== undefined && a !== null && String(a).trim() !== '';
              }
            }
            if (!ok) {
              const keyName = a === 'other' ? `question_${currentQuestion.id}_other` : `question_${currentQuestion.id}`;
              setErrors(prev => ({ ...prev, [keyName]: 'This field is required' }));
              return;
            }
            setErrors(prev => { const n = { ...prev }; delete n[`question_${currentQuestion.id}`]; return n; });
            setNavHistory(prev => [...prev, currentQuestion.id]);
            setEndAfterQuestionId(currentQuestion.id);
            nextStep();
            return;
          }
          const visibleIdx = visibleQuestions.findIndex(q => String(q.id) === String(candidateId));
          if (visibleIdx !== -1) {
            targetIndex = visibleIdx;
          } else {
            const allIdx = tradeQuestions.findIndex(q => String(q.id) === String(candidateId));
            if (allIdx !== -1) {
              const q = tradeQuestions[allIdx];
              const shouldShow = evaluateConditionalLogic(q, questionAnswers);
              if (shouldShow) {
                const newVisible = getVisibleQuestions();
                const idx2 = newVisible.findIndex(x => x.id === candidateId);
                if (idx2 !== -1) targetIndex = idx2;
              }
            }
          }
        }
      }
    }

    const isAnsweredQ = (q) => {
      const a = questionAnswers[q.id];
      if (q.question_type === 'multiple_choice_multiple') return Array.isArray(a) && a.length > 0;
      if (q.question_type === 'yes_no') return a === true || a === false;
      if (isFileUploadType(q.question_type)) return Array.isArray(a) ? a.length > 0 : (a instanceof File) || (typeof a === 'string' && String(a).trim() !== '');
      return a !== undefined && a !== null && String(a).trim() !== '';
    };

    if (targetIndex >= 0 && targetIndex < visibleQuestions.length) {
      setNavHistory(prev => [...prev, currentQuestion.id]);
      setCurrentQuestionIndex(targetIndex);
      return;
    }

    const skipIds = [];
    const maybeInline = getInlineUploadForAnswer(currentQuestion, answer);
    if (maybeInline) skipIds.push(String(maybeInline.id));
    const nextUnansweredRel = visibleQuestions
      .slice(currentQuestionIndex + 1)
      .filter(q => !skipIds.includes(String(q.id)))
      .findIndex(q => !isAnsweredQ(q));
    if (nextUnansweredRel !== -1) {
      setNavHistory(prev => [...prev, currentQuestion.id]);
      setCurrentQuestionIndex(currentQuestionIndex + 1 + nextUnansweredRel);
      return;
    }

    const firstUnanswered = visibleQuestions.filter(q => !skipIds.includes(String(q.id))).findIndex(q => !isAnsweredQ(q));
    if (firstUnanswered !== -1) {
      setNavHistory(prev => [...prev, currentQuestion.id]);
      setCurrentQuestionIndex(firstUnanswered);
      return;
    }

    if (currentQuestionIndex < visibleQuestions.length - 1) {
      setNavHistory(prev => [...prev, currentQuestion.id]);
      setCurrentQuestionIndex(prev => prev + 1);
      return;
    }
  };

  // Navigate to previous question (with conditional logic)
  const goToPreviousQuestion = () => {
    const visibleQuestions = getVisibleQuestions();
    if (navHistory.length > 0) {
      const lastId = navHistory[navHistory.length - 1];
      const prevIndex = visibleQuestions.findIndex(q => q.id === lastId);
      if (prevIndex !== -1) {
        setNavHistory(prev => prev.slice(0, -1));
        setCurrentQuestionIndex(prevIndex);
        return;
      }
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Reset question navigation when category changes
  const resetQuestionNavigation = () => {
    setCurrentQuestionIndex(0);
    setNavHistory([]);
    setEndAfterQuestionId(null);
  };

  // Enhanced conditional logic evaluation for multiple rules
  const evaluateConditionalLogicRule = (rule, answers) => {
    const parentAnswer = answers[rule.parent_question_id];
    const { trigger_condition, trigger_value, trigger_values } = rule;

    const normalizeBooleanString = (val) => {
      if (val === undefined || val === null) return val;
      const s = String(val).toLowerCase().trim();
      if (s === 'yes') return 'true';
      if (s === 'no') return 'false';
      return String(val);
    };

    // Handle empty answers
    if (parentAnswer === undefined || parentAnswer === null || parentAnswer === '') {
      return trigger_condition === 'is_empty';
    }

    // Evaluate based on trigger condition
    switch (trigger_condition) {
      case 'equals':
        if (trigger_values && trigger_values.length > 0) {
          // For multiple choice questions
          if (Array.isArray(parentAnswer)) {
            const tvs = trigger_values.map(normalizeBooleanString);
            return parentAnswer.some(value => tvs.includes(normalizeBooleanString(value)));
          }
          const tvs2 = trigger_values.map(normalizeBooleanString);
          return tvs2.includes(normalizeBooleanString(parentAnswer));
        }
        return normalizeBooleanString(parentAnswer).toLowerCase() === normalizeBooleanString(trigger_value).toLowerCase();

      case 'not_equals':
        if (trigger_values && trigger_values.length > 0) {
          if (Array.isArray(parentAnswer)) {
            const tvs = trigger_values.map(normalizeBooleanString);
            return !parentAnswer.some(value => tvs.includes(normalizeBooleanString(value)));
          }
          const tvs2 = trigger_values.map(normalizeBooleanString);
          return !tvs2.includes(normalizeBooleanString(parentAnswer));
        }
        return normalizeBooleanString(parentAnswer).toLowerCase() !== normalizeBooleanString(trigger_value).toLowerCase();

      case 'contains':
        return String(parentAnswer).toLowerCase().includes(normalizeBooleanString(trigger_value).toLowerCase());

      case 'not_contains':
        return !String(parentAnswer).toLowerCase().includes(normalizeBooleanString(trigger_value).toLowerCase());

      case 'greater_than':
        const numAnswer = parseFloat(parentAnswer);
        const numTrigger = parseFloat(trigger_value);
        return !isNaN(numAnswer) && !isNaN(numTrigger) && numAnswer > numTrigger;

      case 'less_than':
        const numAnswer2 = parseFloat(parentAnswer);
        const numTrigger2 = parseFloat(trigger_value);
        return !isNaN(numAnswer2) && !isNaN(numTrigger2) && numAnswer2 < numTrigger2;

      case 'is_empty':
        if (Array.isArray(parentAnswer)) {
          return parentAnswer.length === 0;
        }
        return parentAnswer === '' || parentAnswer === null || parentAnswer === undefined;

      case 'is_not_empty':
        if (Array.isArray(parentAnswer)) {
          return parentAnswer.length > 0;
        }
        return parentAnswer !== '' && parentAnswer !== null && parentAnswer !== undefined;

      default:
        return false;
    }
  };

  const evaluateConditionalLogic = (question, answers) => {
    const conditionalLogic = question.conditional_logic;
    
    // No conditional logic or not enabled
    if (!conditionalLogic || !conditionalLogic.enabled || !conditionalLogic.rules || conditionalLogic.rules.length === 0) {
      return true; // Show question by default
    }

    const { logic_operator = 'AND', rules } = conditionalLogic;
    const ruleResults = rules.map(rule => evaluateConditionalLogicRule(rule, answers));

    // Apply logic operator
    if (logic_operator === 'OR') {
      return ruleResults.some(result => result === true);
    } else { // AND
      return ruleResults.every(result => result === true);
    }
  };

  const getVisibleQuestions = (includeInline = false) => {
    if (!tradeQuestions || tradeQuestions.length === 0) {
      return [];
    }

    const byId = {};
    tradeQuestions.forEach(q => { byId[q.id] = q; });
    const ordered = tradeQuestions.slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let current = ordered[0] || null;
    const path = [];
    const visited = new Set();
    const isAnswered = (q) => {
      const a = questionAnswers[q.id];
      if (q.question_type === 'multiple_choice_multiple') return Array.isArray(a) && a.length > 0;
      if (q.question_type === 'yes_no') return a === true || a === false;
      if (isFileUploadType(q.question_type)) return Array.isArray(a) ? a.length > 0 : (a instanceof File) || (typeof a === 'string' && String(a).trim() !== '');
      return a !== undefined && a !== null && String(a).trim() !== '';
    };
    const normalize = (val) => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return String(val).toLowerCase().trim().replace(/\s+/g, '_');
    };

    while (current && !visited.has(String(current.id))) {
      visited.add(String(current.id));
      if (evaluateConditionalLogic(current, questionAnswers)) {
        path.push(current);
      }

      const nav = current.navigation_logic;
      let nextId = null;
      if (nav && nav.enabled) {
        const hasAnswer = isAnswered(current);
        let key = '';
        const ans = questionAnswers[current.id];
        if (hasAnswer) {
          if (current.question_type === 'yes_no') key = normalize(ans);
          else if (current.question_type === 'multiple_choice_single') key = normalize(ans);
        }
        const nextIdRaw = hasAnswer ? findMappedId(nav.next_question_map, key) : null;
        const fallbackId = hasAnswer ? (nav.default_next_question_id || null) : null;
        const candidateId = nextIdRaw || fallbackId;
        if (candidateId === '__END__') break;
        if (candidateId && byId[String(candidateId)]) {
          nextId = candidateId;
        } else {
          const idx = ordered.findIndex(q => String(q.id) === String(current.id));
          nextId = ordered[idx + 1]?.id || null;
        }
      } else {
        const idx = ordered.findIndex(q => String(q.id) === String(current.id));
        nextId = ordered[idx + 1]?.id || null;
      }

      current = nextId ? byId[String(nextId)] : null;
    }

    if (includeInline) return path;

    const skipInlineIds = new Set();
    for (const q of path) {
      const inline = getInlineUploadForAnswer(q, questionAnswers[q.id]);
      if (inline) skipInlineIds.add(String(inline.id));
    }

    return path.filter(q => !skipInlineIds.has(String(q.id)));
  };

  const isEndAfterThis = (question) => {
    if (!question) return false;
    const nav = question.navigation_logic;
    if (!nav || !nav.enabled) return false;
    if (nav.default_next_question_id === '__END__') return true;
    const normalize = (val) => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return String(val).toLowerCase().trim().replace(/\s+/g, '_');
    };
    let key = '';
    const answer = questionAnswers[question.id];
    if (question.question_type === 'yes_no') key = normalize(answer);
    else if (question.question_type === 'multiple_choice_single') key = normalize(answer);
    const mapped = findMappedId(nav.next_question_map, key);
    return mapped === '__END__';
  };

  const isFileUploadType = (t) => ['file_upload','file_upload_image','file_upload_video','file_upload_pdf','file_upload_document'].includes(t);
  const acceptForUploadType = (t) => {
    switch (t) {
      case 'file_upload_image':
        return 'image/*';
      case 'file_upload_pdf':
        return 'application/pdf';
      case 'file_upload_video':
        return 'video/mp4,video/quicktime';
      case 'file_upload_document':
        return 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv';
    }
  };

  const normalizeNavKey = (k) => {
    const s = String(k).toLowerCase().trim().replace(/\s+/g, '_');
    if (s === 'yes' || s === 'true' || s === '1') return 'true';
    if (s === 'no' || s === 'false' || s === '0') return 'false';
    return s;
  };
  const normalize = (val) => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val).toLowerCase().trim().replace(/\s+/g, '_');
  };
  const normalizeLoose = (val) => String(val).toLowerCase().trim().replace(/\s+/g, '_');
  const keysMatch = (mk, kk) => {
    if (kk === 'true' || kk === 'yes') return mk === 'true' || mk === 'yes';
    if (kk === 'false' || kk === 'no') return mk === 'false' || mk === 'no';
    return mk === kk;
  };
  const findMappedId = (map, key) => {
    const kk = normalizeLoose(key);
    let match = null;
    for (const [mk, mv] of Object.entries(map || {})) {
      const nk = normalizeLoose(mk);
      if (keysMatch(nk, kk)) { match = mv; break; }
    }
    if (!match && kk === 'other') {
      for (const [mk, mv] of Object.entries(map || {})) {
        const nk = normalizeLoose(mk);
        if (nk.includes('other')) { match = mv; break; }
      }
    }
    return match;
  };

  const findQuestionById = (qid) => tradeQuestions.find(q => String(q.id) === String(qid));
  const getInlineUploadForYes = (question) => {
    const nav = question.navigation_logic;
    if (!nav || !nav.enabled) return null;
    const map = nav.next_question_map || {};
    let mappedId = null;
    for (const k of Object.keys(map)) {
      if (normalizeNavKey(k) === 'true') { mappedId = map[k]; break; }
    }
    if (!mappedId) return null;
    const target = findQuestionById(mappedId);
    if (target && isFileUploadType(target.question_type)) return target;
    return null;
  };

  const getInlineUploadForAnswer = (question, ans) => {
    const nav = question.navigation_logic;
    if (!nav || !nav.enabled) return null;
    const key = normalize(ans);
    const mappedId = findMappedId(nav.next_question_map, key);
    if (!mappedId) return null;
    const target = findQuestionById(mappedId);
    if (target && isFileUploadType(target.question_type)) return target;
    return null;
  };

  const getQuestionsForReview = () => {
    const visible = getVisibleQuestions(true);
    if (endAfterQuestionId) {
      const idx = visible.findIndex(q => q.id === endAfterQuestionId);
      return idx !== -1 ? visible.slice(0, idx + 1) : visible;
    }
    return visible;
  };

  const proceedToNextStepWithReview = () => {
    if (!validateStep(currentStep)) return;
    setShowReviewModal(true);
  };

  // Format answer text for human readability
  const formatAnswerText = (question, answer) => {
    if (!answer) return '';
    
    switch (question.question_type) {
      case 'multiple_choice_single':
        if (answer === 'other') {
          const extra = (questionAnswersOtherText[question.id] || '').trim();
          return extra ? `Other: ${extra}` : 'Other';
        }
        const singleOption = question.options?.find(opt => opt.value === answer);
        return singleOption ? singleOption.text : answer;
      
      case 'multiple_choice_multiple':
        if (Array.isArray(answer)) {
          const selectedOptions = question.options?.filter(opt => answer.includes(opt.value)) || [];
          const texts = selectedOptions.map(opt => opt.text);
          if (answer.includes('other')) {
            const extra = (questionAnswersOtherText[question.id] || '').trim();
            texts.push(extra ? `Other: ${extra}` : 'Other');
          }
          return texts.join(', ') || answer.join(', ');
        }
        return answer;
      
      case 'yes_no':
        return answer === true ? 'Yes' : 'No';
      case 'file_upload':
        if (Array.isArray(answer)) {
          const names = answer.filter(a => a instanceof File).map(f => f.name);
          return names.length > 0 ? `Files: ${names.join(', ')}` : 'Attachments uploaded';
        }
        if (answer instanceof File) return `File: ${answer.name}`;
        return 'Attachment uploaded';
      
      case 'text_input':
      case 'text_area':
      case 'number_input':
      default:
        return answer.toString();
    }
  };

  // Render question input based on question type
  const renderQuestionInput = (question) => {
    switch (question.question_type) {
      case 'multiple_choice_single':
        return (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option, optIndex) => (
              <label 
                key={optIndex} 
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                  questionAnswers[question.id] === option.value
                    ? 'border-[#34D164] bg-[#34D164]/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option.value}
                  checked={questionAnswers[question.id] === option.value}
                  onChange={(e) => handleQuestionAnswer(question.id, e.target.value, question.question_type)}
                  className="sr-only"
                  id={`field-question_${question.id}-${optIndex}`}
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  questionAnswers[question.id] === option.value
                    ? 'border-[#34D164] bg-[#34D164]'
                    : 'border-gray-300'
                }`}>
                  {questionAnswers[question.id] === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className={`text-sm font-lato flex-1 leading-snug ${
                  questionAnswers[question.id] === option.value ? 'text-[#121E3C] font-medium' : 'text-gray-700'
                }`}>{option.text}</span>
              </label>
            ))}
            {(() => {
              const selected = questionAnswers[question.id];
              const hasOther = (question.options || []).some(opt => String(opt.value).toLowerCase() === 'other' || String(opt.text).toLowerCase() === 'other');
              if (hasOther && selected === 'other') {
                return (
                  <div className="mt-2">
                    <textarea
                      id={`field-question_${question.id}_other`}
                      data-field={`question_${question.id}_other`}
                      rows={3}
                      placeholder="Please specify"
                      value={questionAnswersOtherText[question.id] || ''}
                      onChange={(e) => setQuestionAnswersOtherText(prev => ({ ...prev, [question.id]: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
                        errors[`question_${question.id}_other`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`question_${question.id}_other`] && (
                      <p className="text-red-500 text-sm font-lato mt-1">{errors[`question_${question.id}_other`]}</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            {(() => {
              const selected = questionAnswers[question.id];
              const inlineQ = getInlineUploadForAnswer(question, selected);
              if (inlineQ && selected) {
                const answer = questionAnswers[inlineQ.id];
                const files = Array.isArray(answer) ? answer : (answer ? [answer] : []);
                
                return (
                  <div className="space-y-2 border rounded-md p-3">
                    <label className="block text-sm font-medium font-lato" style={{color: '#121E3C'}}>{inlineQ.question_text}</label>
                    <input
                      type="file"
                      accept={acceptForUploadType(inlineQ.question_type)}
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleQuestionAnswer(inlineQ.id, files, inlineQ.question_type);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors[`question_${inlineQ.id}`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      name={`question_${inlineQ.id}`}
                      id={`field-question_${inlineQ.id}`}
                    />
                    {files.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {files.filter(f => f instanceof File).map((f, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            {f.type.startsWith('image/') ? (
                              <div className="relative w-16 h-16 rounded overflow-hidden border">
                                <img src={URL.createObjectURL(f)} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border">
                                <span className="text-xs text-gray-500">File</span>
                              </div>
                            )}
                            <span className="text-sm text-gray-600">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors[`question_${inlineQ.id}`] && (
                      <p className="text-red-500 text-sm font-lato mt-1">{errors[`question_${inlineQ.id}`]}</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );
      
      case 'multiple_choice_multiple':
        return (
          <div className="space-y-2 sm:space-y-3">
            {question.options?.map((option, optIndex) => {
              const isSelected = (questionAnswers[question.id] || []).includes(option.value);
              return (
                <label 
                  key={optIndex} 
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#34D164] bg-[#34D164]/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isSelected}
                    onChange={(e) => handleQuestionAnswer(question.id, option.value, question.question_type)}
                    className="sr-only"
                    name={`question_${question.id}`}
                    id={`field-question_${question.id}-${optIndex}`}
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'border-[#34D164] bg-[#34D164]'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                  <span className={`text-sm font-lato flex-1 leading-snug ${
                    isSelected ? 'text-[#121E3C] font-medium' : 'text-gray-700'
                  }`}>{option.text}</span>
                </label>
              );
            })}
            {(() => {
              const selected = questionAnswers[question.id] || [];
              const hasOther = (question.options || []).some(opt => String(opt.value).toLowerCase() === 'other' || String(opt.text).toLowerCase() === 'other');
              if (hasOther && selected.includes('other')) {
                return (
                  <div className="mt-2">
                    <textarea
                      id={`field-question_${question.id}_other`}
                      data-field={`question_${question.id}_other`}
                      rows={3}
                      placeholder="Please specify"
                      value={questionAnswersOtherText[question.id] || ''}
                      onChange={(e) => setQuestionAnswersOtherText(prev => ({ ...prev, [question.id]: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
                        errors[`question_${question.id}_other`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`question_${question.id}_other`] && (
                      <p className="text-red-500 text-sm font-lato mt-1">{errors[`question_${question.id}_other`]}</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );

      case 'text_input':
        return (
          <input
            type="text"
            value={questionAnswers[question.id] || ''}
            onChange={(e) => handleQuestionAnswer(question.id, e.target.value, question.question_type)}
            placeholder={question.placeholder_text || 'Enter your answer...'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
              errors[`question_${question.id}`] ? 'border-red-500' : 'border-gray-300'
            }`}
            name={`question_${question.id}`}
            id={`field-question_${question.id}`}
          />
        );

      case 'text_area':
        return (
          <textarea
            rows={4}
            value={questionAnswers[question.id] || ''}
            onChange={(e) => handleQuestionAnswer(question.id, e.target.value, question.question_type)}
            placeholder={question.placeholder_text || 'Enter your detailed answer...'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
              errors[`question_${question.id}`] ? 'border-red-500' : 'border-gray-300'
            }`}
            name={`question_${question.id}`}
            id={`field-question_${question.id}`}
          />
        );

      case 'number_input':
        return (
          <input
            type="number"
            value={questionAnswers[question.id] || ''}
            onChange={(e) => handleQuestionAnswer(question.id, e.target.value, question.question_type)}
            placeholder={question.placeholder_text || 'Enter number...'}
            min={question.min_value}
            max={question.max_value}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
              errors[`question_${question.id}`] ? 'border-red-500' : 'border-gray-300'
            }`}
            name={`question_${question.id}`}
            id={`field-question_${question.id}`}
          />
        );

      case 'yes_no':
        return (
          <div className="space-y-3">
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value="true"
                  checked={questionAnswers[question.id] === true}
                  onChange={(e) => handleQuestionAnswer(question.id, true, question.question_type)}
                  className="text-green-600 focus:ring-green-500"
                  id={`field-question_${question.id}-yes`}
                />
                <span className="text-sm font-lato">Yes</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value="false"
                  checked={questionAnswers[question.id] === false}
                  onChange={(e) => handleQuestionAnswer(question.id, false, question.question_type)}
                  className="text-green-600 focus:ring-green-500"
                  id={`field-question_${question.id}-no`}
                />
                <span className="text-sm font-lato">No</span>
              </label>
            </div>
            {(() => {
              const inlineQ = getInlineUploadForAnswer(question, true);
              if (questionAnswers[question.id] === true && inlineQ) {
                const answer = questionAnswers[inlineQ.id];
                const files = Array.isArray(answer) ? answer : (answer ? [answer] : []);
                
                return (
                  <div className="space-y-2 border rounded-md p-3">
                    <label className="block text-sm font-medium font-lato" style={{color: '#121E3C'}}>{inlineQ.question_text}</label>
                    <input
                      type="file"
                      accept={acceptForUploadType(inlineQ.question_type)}
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleQuestionAnswer(inlineQ.id, files, inlineQ.question_type);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors[`question_${inlineQ.id}`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      name={`question_${inlineQ.id}`}
                      id={`field-question_${inlineQ.id}`}
                    />
                    {files.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {files.filter(f => f instanceof File).map((f, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            {f.type.startsWith('image/') ? (
                              <div className="relative w-16 h-16 rounded overflow-hidden border">
                                <img src={URL.createObjectURL(f)} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border">
                                <span className="text-xs text-gray-500">File</span>
                              </div>
                            )}
                            <span className="text-sm text-gray-600">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors[`question_${inlineQ.id}`] && (
                      <p className="text-red-500 text-sm font-lato mt-1">{errors[`question_${inlineQ.id}`]}</p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        );

      case 'file_upload':
      case 'file_upload_image':
      case 'file_upload_pdf':
      case 'file_upload_video':
      case 'file_upload_document':
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={acceptForUploadType(question.question_type)}
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                handleQuestionAnswer(question.id, files, question.question_type);
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                errors[`question_${question.id}`] ? 'border-red-500' : 'border-gray-300'
              }`}
              name={`question_${question.id}`}
              id={`field-question_${question.id}`}
            />
            {Array.isArray(questionAnswers[question.id]) && questionAnswers[question.id].length > 0 && (
              <div className="space-y-2 mt-2">
                {questionAnswers[question.id].filter(f => f instanceof File).map((f, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    {f.type.startsWith('image/') ? (
                      <div className="relative w-16 h-16 rounded overflow-hidden border">
                        <img src={URL.createObjectURL(f)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border">
                        <span className="text-xs text-gray-500">File</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-600">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Helper function to extract error message from API response
  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail;
      
      // If detail is an array of validation errors
      if (Array.isArray(detail)) {
        return detail.map(err => {
          if (typeof err === 'string') return err;
          if (err.msg) return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`;
          return JSON.stringify(err);
        }).join(', ');
      }
      
      // If detail is a single validation error object
      if (typeof detail === 'object' && detail.msg) {
        return `${detail.loc ? detail.loc.join('.') + ': ' : ''}${detail.msg}`;
      }
      
      // If detail is a string
      if (typeof detail === 'string') {
        const normalizedDetail = detail.toLowerCase();
        if (
          normalizedDetail.includes('password') &&
          (normalizedDetail.includes('already') || normalizedDetail.includes('exists')) &&
          normalizedDetail.includes('account')
        ) {
          return 'Email address already registered. Please sign in or reset your password.';
        }
        return detail;
      }
      
      // Fallback for objects
      return JSON.stringify(detail);
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return "An unexpected error occurred. Please try again.";
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Prevent premature submission if not on the final step
    // This handles cases where user presses Enter in a form field
    if (currentStep < totalSteps) {
      nextStep();
      return;
    }
    
    // If user is authenticated, use the authenticated flow
    if (isUserAuthenticated()) {
      await handleJobSubmissionForAuthenticatedUser();
      return;
    }
    
    // For non-authenticated users, validate step 5 (account creation)
    if (!validateStep(5)) return;

    setSubmitting(true);

  const resolveJobId = (response) => response?.pending_job_id || response?.job?.id || response?.job?.job_id || response?.job_id || response?.id;
    const saveAnswers = async (jobId) => {
      if (tradeQuestions.length > 0 && Object.keys(questionAnswers).length > 0) {
        try {
          const updatedAnswers = { ...questionAnswers };
          for (const q of tradeQuestions.filter(q => isFileUploadType(q.question_type))) {
            const val = questionAnswers[q.id];
            if (val instanceof File) {
              try {
                const res = await tradeCategoryQuestionsAPI.uploadJobQuestionAttachment(jobId, q.id, val);
                updatedAnswers[q.id] = res?.url || '';
              } catch (e) {
                console.error('File upload failed for question', q.id, e);
                updatedAnswers[q.id] = '';
              }
            } else if (Array.isArray(val)) {
              const urls = [];
              for (const f of val) {
                if (!(f instanceof File)) continue;
                try {
                  const res = await tradeCategoryQuestionsAPI.uploadJobQuestionAttachment(jobId, q.id, f);
                  if (res?.url) urls.push(res.url);
                } catch (e) {
                  console.error('File upload failed for question', q.id, e);
                }
              }
              updatedAnswers[q.id] = urls;
            }
          }

          const answersData = {
            job_id: jobId,
            trade_category: formData.category,
            answers: getVisibleQuestions(true).map(question => ({
              question_id: question.id,
              question_text: question.question_text,
              question_type: question.question_type,
              answer_value: updatedAnswers[question.id],
              answer_text: formatAnswerText(question, updatedAnswers[question.id])
            }))
          };

          await tradeCategoryQuestionsAPI.saveJobQuestionAnswers(answersData);
          console.log('✅ Question answers saved successfully');
          return true;
        } catch (answerError) {
          console.error('⚠️ Failed to save question answers:', answerError);
          return false;
        }
      }
      return true;
    };

    try {
      // Build job payload
      const jobData = {
        title: formData.title,
        description: formData.description.trim(),
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code.trim() || null,
        home_address: formData.home_address,
        budget_min: formData.budgetType === 'range' ? parseInt(formData.budget_min) : null,
        budget_max: formData.budgetType === 'range' ? parseInt(formData.budget_max) : null,
        timeline: formData.timeline,
        homeowner_name: formData.homeowner_name,
        homeowner_email: formData.homeowner_email,
        homeowner_phone: formData.homeowner_phone
      };

      // Add coordinates if location was selected
      if (formData.jobLocation) {
        jobData.latitude = formData.jobLocation.lat;
        jobData.longitude = formData.jobLocation.lng;
      }

      // New flow: register-and-post with email verification gate
      // Include non-file answers in the initial payload if possible
      const initialAnswers = {};
      if (tradeQuestions.length > 0 && Object.keys(questionAnswers).length > 0) {
        getVisibleQuestions(true).forEach(q => {
          if (!isFileUploadType(q.question_type)) {
            initialAnswers[q.id] = questionAnswers[q.id];
          }
        });
      }

      const payload = { 
        job: jobData, 
        email: formData.homeowner_email,
        password: formData.password,
        question_answers: Object.keys(initialAnswers).length > 0 ? {
          trade_category: formData.category,
          answers: getVisibleQuestions(true)
            .filter(q => !isFileUploadType(q.question_type))
            .map(q => ({
              question_id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              answer_value: initialAnswers[q.id],
              answer_text: formatAnswerText(q, initialAnswers[q.id])
            }))
        } : null
      };

      let jobResponse;
      try {
        jobResponse = await jobsAPI.registerAndPost(payload);
      } catch (err) {
        // Backwards-compatible handling: some deployments may still return 403 with detail
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 403 && detail?.verification_required) {
          if (detail.pending_job_id) {
            localStorage.setItem('pending_job_id', detail.pending_job_id);
            setHasPendingJob(true);
            try { await saveAnswers(detail.pending_job_id); } catch (e) { console.error('Failed to save answers for pending job', e); }
          }
          persistDraft(5);
          setVerificationEmail(formData.homeowner_email);
          setShowVerificationGateModal(true);
          setCurrentStep(5);
          setSubmitting(false);
          return;
        }
        throw err;
      }

      // New flow: backend returns 202 with pending_job_id when verification required
      if (jobResponse && (jobResponse.verification_required || jobResponse.pending_job_id)) {
        const pendingId = jobResponse.pending_job_id;
        if (pendingId) {
          localStorage.setItem('pending_job_id', pendingId);
          setHasPendingJob(true);
          try { await saveAnswers(pendingId); } catch (e) { console.error('Failed to save answers for pending job', e); }
          persistDraft(5);
          setVerificationEmail(formData.homeowner_email);
          setShowVerificationGateModal(true);
          setCurrentStep(5);
          setSubmitting(false);
          return;
        }
      }

      if (jobResponse.access_token && jobResponse.user) {
        try { loginWithToken(jobResponse.access_token, jobResponse.user); } catch {}
      }

      // Save/Update question answers (including files)
      const jobId = resolveJobId(jobResponse);
      if (jobId) {
        await saveAnswers(jobId);
      }

      toast({
        title: "Job Submitted!",
        description: `Your job has been submitted for admin review. Job ID: ${jobId}`,
      });
      clearDraft();

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to My Jobs page instead of homepage to avoid full reload/anchoring
      try {
        navigate('/dashboard/jobs', { replace: true });
      } catch (e) {
        // Fallback to hard redirect if navigate is unavailable
        window.location.href = '/dashboard/jobs';
      }

    } catch (error) {
      console.error('Job posting failed:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {
          // Clamp displayed values so mobile UI can't show >100% or "Step 5 of 4"
        }
        <span className="text-sm font-medium text-gray-600 font-lato">
          Step {Math.min(currentStep, totalSteps)} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-600 font-lato">
          {Math.round(Math.min(100, (currentStep / Math.max(1, totalSteps)) * 100))}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, (currentStep / Math.max(1, totalSteps)) * 100)}%`,
            backgroundColor: '#34D164'
          }}
        />
      </div>
    </div>
  );

  // Scroll management: ensure each step starts from top of the form
  const formTopRef = useRef(null);
  useEffect(() => {
    try {
      // Scroll window to top first for long pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
    // Then ensure the card/form top is in view
    if (formTopRef.current && typeof formTopRef.current.scrollIntoView === 'function') {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof formTopRef.current.focus === 'function') {
        try { formTopRef.current.focus(); } catch {}
      }
    }
  }, [currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 px-2">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                Job Title *
              </label>
              <input
                type="text"
                id="field-title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Fix leaky bathroom tap, Install kitchen cabinets"
                className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                  errors.title ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1 font-lato">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                Category *
              </label>
              <select
                id="field-category"
                value={formData.category}
                onChange={(e) => {
                  updateFormData('category', e.target.value);
                  setQuestionsCompleted(false);
                }}
                className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                  errors.category ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <option value="">Select a category</option>
                {tradeCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1 font-lato">{errors.category}</p>}
            </div>

            {/* Questions Button - Opens Modal */}
            {formData.category && (
              <div className="pt-2">
                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34D164]"></div>
                    <span className="ml-3 text-gray-500 font-lato text-sm">Loading questions...</span>
                  </div>
                ) : tradeQuestions.length > 0 && !showQuestionsModal ? (
                  <>
                    <div 
                      onClick={() => setShowQuestionsModal(true)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        errors.questions
                          ? 'border-red-400 bg-red-50/50'
                          : questionsCompleted 
                            ? 'border-[#34D164] bg-[#34D164]/5' 
                            : 'border-gray-200 hover:border-[#34D164]/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            questionsCompleted ? 'bg-[#34D164]' : errors.questions ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {questionsCompleted ? (
                              <Check size={20} className="text-white" />
                            ) : (
                              <span className={`font-bold ${errors.questions ? 'text-red-500' : 'text-gray-500'}`}>?</span>
                            )}
                          </div>
                          <div>
                            <p className={`font-medium font-lato ${errors.questions ? 'text-red-600' : 'text-[#121E3C]'}`}>
                              {questionsCompleted ? 'Job details completed' : 'Answer job questions'}
                            </p>
                            <p className={`text-xs font-lato ${errors.questions ? 'text-red-500' : 'text-gray-500'}`}>
                              {errors.questions ? 'Required - tap to complete' : questionsCompleted ? 'Tap to edit your answers' : 'Tell us more about your job requirements'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={20} className={errors.questions ? 'text-red-400' : 'text-gray-400'} />
                      </div>
                    </div>
                    {errors.questions && <p className="text-red-500 text-xs mt-1 font-lato">{errors.questions}</p>}
                  </>
                ) : tradeQuestions.length === 0 && !loadingQuestions ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-yellow-700 text-sm font-lato">
                      No questions configured for this category yet.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 px-2">
            {/* State and LGA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  State *
                </label>
                <select
                  id="field-state"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                    errors.state ? 'border-red-400' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select your state</option>
                  {nigerianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-xs mt-1 font-lato">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Local Government Area (LGA) *
                </label>
                <select
                  id="field-lga"
                  value={formData.lga}
                  onChange={(e) => updateFormData('lga', e.target.value)}
                  disabled={!formData.state || loadingLGAs}
                  className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all disabled:opacity-50 ${
                    errors.lga ? 'border-red-400' : 'border-gray-200'
                  }`}
                >
                  <option value="">{loadingLGAs ? 'Loading LGAs...' : 'Select LGA'}</option>
                  {availableLGAs.map((lga) => (
                    <option key={lga} value={lga}>{lga}</option>
                  ))}
                </select>
                {errors.lga && <p className="text-red-500 text-xs mt-1 font-lato">{errors.lga}</p>}
              </div>
            </div>

            {/* Town and Zip Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Town/Area *
                </label>
                <input
                  type="text"
                  id="field-town"
                  placeholder="e.g., Victoria Island, Ikeja, Warri"
                  value={formData.town}
                  onChange={(e) => updateFormData('town', e.target.value)}
                  className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                    errors.town ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.town && <p className="text-red-500 text-xs mt-1 font-lato">{errors.town}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Zip Code (Optional)
                </label>
                <input
                  type="text"
                  id="field-zip_code"
                  placeholder="e.g., 100001"
                  value={formData.zip_code}
                  onChange={(e) => updateFormData('zip_code', e.target.value)}
                  maxLength={6}
                  className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                    errors.zip_code ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {errors.zip_code && <p className="text-red-500 text-xs mt-1 font-lato">{errors.zip_code}</p>}
                <p className="text-xs text-gray-400 mt-1 font-lato">Nigerian postal code (6 digits, optional)</p>
              </div>
            </div>

            {/* Home Address */}
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                Home Address *
              </label>
              <textarea
                rows={3}
                id="field-home_address"
                placeholder="Enter your full home address (street, building number, landmarks, etc.)"
                value={formData.home_address}
                onChange={(e) => updateFormData('home_address', e.target.value)}
                className={`w-full px-4 py-3 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all resize-none ${
                  errors.home_address ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.home_address && <p className="text-red-500 text-xs mt-1 font-lato">{errors.home_address}</p>}
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-400 font-lato">Minimum 10 characters</p>
                <p className="text-xs text-gray-400 font-lato">{formData.home_address.length}/500</p>
              </div>
            </div>

            {/* Map Location Picker */}
            <div>
              <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                Precise Location *
              </label>
              <p className="text-xs text-gray-400 mb-3 font-lato">
                Pin the exact location on the map to help tradespeople find you easily
              </p>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <LocationPicker
                  height="280px"
                  placeholder="Search for your exact address..."
                  onLocationSelect={(location) => updateFormData('jobLocation', location)}
                  initialLocation={formData.jobLocation}
                  showCurrentLocation={true}
                  showSearch={true}
                  centerAddress={mapCenterAddress}
                  centerZoom={mapCenterZoom}
                />
              </div>
              {errors.jobLocation && <p className="text-red-500 text-xs mt-1 font-lato">{errors.jobLocation}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 px-2">
            {/* Budget Type Selection */}
            <div className="space-y-3">
              <label
                onClick={() => updateFormData('budgetType', 'range')}
                className={`flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all ${
                  formData.budgetType === 'range'
                    ? 'border-[#34D164] bg-[#34D164]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="budgetType"
                  value="range"
                  checked={formData.budgetType === 'range'}
                  onChange={() => updateFormData('budgetType', 'range')}
                  className="text-[#34D164] focus:ring-[#34D164]/20"
                />
                <div>
                  <span className="text-sm font-medium font-lato text-[#121E3C]">Set Budget Range</span>
                  <p className="text-xs text-gray-500 font-lato mt-0.5">Specify your minimum and maximum budget</p>
                </div>
              </label>

              <label
                onClick={() => updateFormData('budgetType', 'discussion')}
                className={`flex items-center gap-3 cursor-pointer p-4 border-2 rounded-xl transition-all ${
                  formData.budgetType === 'discussion'
                    ? 'border-[#34D164] bg-[#34D164]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="budgetType"
                  value="discussion"
                  checked={formData.budgetType === 'discussion'}
                  onChange={() => updateFormData('budgetType', 'discussion')}
                  className="text-[#34D164] focus:ring-[#34D164]/20"
                />
                <div>
                  <span className="text-sm font-medium font-lato text-[#121E3C]">Discuss with Pros</span>
                  <p className="text-xs text-gray-500 font-lato mt-0.5">Get quotes and discuss pricing</p>
                </div>
              </label>
            </div>

            {/* Budget Range Inputs */}
            {formData.budgetType === 'range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Minimum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    id="field-budget_min"
                    placeholder="e.g., 50000"
                    value={formData.budget_min}
                    onChange={(e) => updateFormData('budget_min', e.target.value)}
                    className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.budget_min ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.budget_min && <p className="text-red-500 text-xs mt-1 font-lato">{errors.budget_min}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Maximum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    id="field-budget_max"
                    placeholder="e.g., 150000"
                    value={formData.budget_max}
                    onChange={(e) => updateFormData('budget_max', e.target.value)}
                    className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.budget_max ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.budget_max && <p className="text-red-500 text-xs mt-1 font-lato">{errors.budget_max}</p>}
                </div>
              </div>
            )}

            {/* Budget Preview */}
            {formData.budgetType === 'range' && formData.budget_min && formData.budget_max && (
              <div className="bg-[#34D164]/5 border border-[#34D164]/20 rounded-xl p-4">
                <p className="text-sm text-[#121E3C] font-lato">
                  <span className="font-medium">Budget:</span> {formatCurrency(formData.budget_min)} – {formatCurrency(formData.budget_max)}
                </p>
              </div>
            )}

            {formData.budgetType === 'discussion' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-lato">
                  Tradespeople will provide quotes based on your job requirements.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 px-2">
            {isAuthenticated() ? (
              // For authenticated users - show review summary
              <div className="space-y-4">
                <div className="bg-[#34D164]/5 border border-[#34D164]/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-[#34D164]" />
                    <span className="text-sm font-medium font-lato text-[#121E3C]">Posting as {currentUser?.name}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-lato">
                    <div className="text-gray-600">
                      <span className="text-gray-400">Email:</span> {currentUser?.email}
                    </div>
                    <div className="text-gray-600">
                      <span className="text-gray-400">Phone:</span> {currentUser?.phone}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium font-lato text-[#121E3C] mb-3">Job Summary</h3>
                  <div className="space-y-2 text-sm font-lato">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Title</span>
                      <span className="text-gray-700">{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category</span>
                      <span className="text-gray-700">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location</span>
                      <span className="text-gray-700">{formData.town}, {formData.state}</span>
                    </div>
                    {formData.budgetType === 'range' && formData.budget_min && formData.budget_max && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Budget</span>
                        <span className="text-gray-700">{formatCurrency(formData.budget_min)} – {formatCurrency(formData.budget_max)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs text-blue-700 font-lato">
                    Your job will be visible to qualified tradespeople in your area. You'll receive notifications when someone shows interest.
                  </p>
                </div>
              </div>
            ) : (
              // For non-authenticated users - show contact form
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    id="field-homeowner_name"
                    placeholder="Enter your full name"
                    value={formData.homeowner_name}
                    onChange={(e) => updateFormData('homeowner_name', e.target.value)}
                    className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.homeowner_name ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.homeowner_name && <p className="text-red-500 text-xs mt-1 font-lato">{errors.homeowner_name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="field-homeowner_email"
                    placeholder="hello@example.com"
                    value={formData.homeowner_email}
                    onChange={(e) => updateFormData('homeowner_email', e.target.value)}
                    className={`w-full h-12 px-4 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.homeowner_email ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.homeowner_email && <p className="text-red-500 text-xs mt-1 font-lato">{errors.homeowner_email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                    Phone Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-lato">
                      +234
                    </span>
                    <input
                      type="tel"
                      id="field-homeowner_phone"
                      placeholder=""
                      value={formData.homeowner_phone}
                      onChange={(e) => updateFormData('homeowner_phone', e.target.value)}
                      className={`w-full h-12 px-4 font-lato text-sm rounded-l-none rounded-r-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                        errors.homeowner_phone ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                  </div>
                                    {errors.homeowner_phone && <p className="text-red-500 text-xs mt-1 font-lato">{errors.homeowner_phone}</p>}
                </div>

                {/* Privacy Notice */}
                <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-4 mt-2">
                  <p className="text-xs text-gray-500 font-lato">
                    Your contact details will only be shared with tradespeople you choose.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        // Account creation step should only be shown for unauthenticated users
        if (isUserAuthenticated()) {
          return null; // Don't render account creation step for authenticated users
        }
        
        return (
          <div className="space-y-6 px-2">
            {/* Account Benefits */}
            <div className="bg-[#34D164]/5 border border-[#34D164]/20 rounded-xl p-5">
              <h3 className="text-sm font-medium font-lato text-[#121E3C] mb-3 flex items-center">
                <Check className="mr-2 text-[#34D164]" size={18} />
                Your ServiceHub Account Benefits
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-lato">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={14} className="text-[#34D164]" />
                  <span>Track interested trades</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Bell size={14} className="text-[#34D164]" />
                  <span>Get notifications</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Star size={14} className="text-[#34D164]" />
                  <span>Rate & review</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Coins size={14} className="text-[#34D164]" />
                  <span>Manage jobs</span>
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Create Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="field-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className={`w-full h-12 px-4 pr-12 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.password ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1 font-lato">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-1.5 text-[#121E3C]">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="field-confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className={`w-full h-12 px-4 pr-12 font-lato text-sm rounded-xl border bg-gray-50/50 focus:bg-white focus:border-[#34D164] focus:ring-[#34D164]/20 transition-all ${
                      errors.confirmPassword ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-lato">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-gray-400 font-lato text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Account/Login Choice Modal
  const accountCreationModal = (
    showAccountModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <User size={32} style={{color: '#34D164'}} />
            </div>
            <h3 className="text-xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Almost ready to post your job!
            </h3>
            <p className="text-gray-600 font-lato text-sm">
              Choose how you'd like to proceed to track interested tradespeople and get notifications.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#34D164'}} />
              </div>
              <span className="text-sm font-lato">Track interested tradespeople</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#34D164'}} />
              </div>
              <span className="text-sm font-lato">Get email and SMS notifications</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={16} style={{color: '#34D164'}} />
              </div>
              <span className="text-sm font-lato">Rate and review tradespeople</span>
            </div>
          </div>

          <div className="space-y-3">
            {!isUserAuthenticated() ? (
              <>
                <Button
                  onClick={continueToAccountCreation}
                  className="w-full text-white font-lato"
                  style={{backgroundColor: '#34D164'}}
                >
                  I'm new - Create Account
                </Button>
                <Button
                  onClick={continueToLogin}
                  variant="outline"
                  className="w-full font-lato"
                >
                  I have an account - Sign In
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    // Close modal to allow user to review details on Step 4 before posting
                    setShowAccountModal(false);
                    // Ensure we stay on the review step
                    setCurrentStep(4);
                  }}
                  className="w-full text-white font-lato"
                  style={{backgroundColor: '#34D164'}}
                >
                  Continue as {currentUser?.name ? currentUser.name.split(' ')[0] : 'you'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    
    try {
      const response = await authAPI.login(loginData.email, loginData.password);
      if (response.access_token) {
        loginWithToken(response.access_token, response.user);
        setShowLoginModal(false);
        
        toast({
          title: "Welcome back!",
          description: "You're now logged in. Let's post your job!",
        });
        try {
          const pendingJobId = localStorage.getItem('pending_job_id');
          setHasPendingJob(!!pendingJobId);
        } catch {}
        
        // After login, return to the preview step instead of auto-posting
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoginErrors({ 
        general: error.response?.data?.detail || "Login failed. Please check your credentials." 
      });
    } finally {
      setLoggingIn(false);
    }
  };

  const loginModal = (
    showLoginModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <User size={32} style={{color: '#121E3C'}} />
            </div>
            <h3 className="text-xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Welcome back!
            </h3>
            <p className="text-gray-600 font-lato text-sm">
              Sign in to your account to post your job and track interested tradespeople.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{loginErrors.general}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium font-lato mb-2">Email</label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-lato"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium font-lato mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-lato"
                required
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => setShowLoginModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loggingIn}
                className="flex-1 text-white"
                style={{backgroundColor: '#121E3C'}}
              >
                {loggingIn ? 'Signing In...' : (hasPendingJob ? 'Sign In & Complete Job Posting' : 'Sign In & Post Job')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  const verificationGateModal = (
    showVerificationGateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full p-6">
          <div className="text-center mb-5">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} style={{color: '#34D164'}} />
            </div>
            <h3 className="text-xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
              Account created successfully
            </h3>
            <p className="text-gray-600 font-lato text-sm">
              We sent a verification link to {verificationEmail || formData.homeowner_email}. Verify your email to continue posting this job.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <p className="text-amber-700 text-sm font-lato">
              Your job progress is saved. After verification or login, you can continue where you stopped.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => {
                setShowVerificationGateModal(false);
                navigate('/verify-account?next=%2Fpost-job');
              }}
              className="w-full text-white font-lato"
              style={{backgroundColor: '#34D164'}}
            >
              Go to Verification
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVerificationGateModal(false);
                setShowLoginModal(true);
              }}
              className="w-full font-lato"
            >
              Login Instead
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowVerificationGateModal(false)}
              className="w-full font-lato"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <>
      <div className="max-w-2xl mx-auto px-2 sm:px-4" ref={formTopRef} tabIndex={-1}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold font-montserrat text-center" style={{color: '#121E3C'}}>
              Post a Job
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ValidationBanner
              message={globalErrorMessage}
              onJump={() => {
                const keys = Object.keys(errors);
                if (keys.length) scrollToFirstError(keys);
              }}
            />
            {renderProgressBar()}
            
            <form onSubmit={handleSubmit}>
              {renderStep()}
              
              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row justify-between pt-8 border-t border-gray-100 gap-3 relative z-10 pb-4 px-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center font-lato w-full sm:w-auto h-12 rounded-xl"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Previous
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={submitting || isTransitioning}
                    className="flex items-center text-white font-lato w-full sm:w-auto h-12 rounded-xl"
                    style={{backgroundColor: '#34D164'}}
                  >
                    Next
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting || isTransitioning}
                    className="flex items-center text-white font-lato w-full sm:w-auto h-12 rounded-xl"
                    style={{backgroundColor: '#34D164'}}
                  >
                    {submitting
                      ? 'Submitting...'
                      : (hasPendingJob
                        ? 'Complete Job Posting'
                        : (isUserAuthenticated() ? 'Post Job' : 'Create Account & Post Job'))}
                    <CheckCircle size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {accountCreationModal}
      {loginModal}
      {verificationGateModal}
      
      {/* Questions Modal */}
      {showQuestionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[calc(100vh-4rem-env(safe-area-inset-bottom))] max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] sm:h-auto sm:max-h-[85dvh] overflow-hidden flex flex-col relative">
            {/* Modal Header - Fixed */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#121E3C] font-montserrat">
                    Job Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionsModal(false);
                    setShowQuizFeedbackModal(true);
                  }}
                  className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-500 text-xl">×</span>
                </button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / Math.max(1, getVisibleQuestions().length)) * 100}%`,
                    backgroundColor: '#34D164'
                  }}
                />
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-white" style={{ minHeight: '150px' }}>
              {(() => {
                const visibleQuestions = getVisibleQuestions();
                
                // If no questions yet, show loading
                if (visibleQuestions.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34D164] mb-4"></div>
                      <p className="font-lato text-sm">Syncing your job details...</p>
                    </div>
                  );
                }

                // Safety check for index out of bounds during restoration
                const safeIndex = Math.max(0, Math.min(currentQuestionIndex, visibleQuestions.length - 1));
                const currentQuestion = visibleQuestions[safeIndex];
                
                if (!currentQuestion) return null;

                return (
                  <div className="space-y-4 pb-4">
                    <label className="block text-base sm:text-lg font-medium font-lato text-[#121E3C] leading-snug">
                      {currentQuestion.question_text}
                      {currentQuestion.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {currentQuestion.help_text && (
                      <p className="text-gray-500 text-xs sm:text-sm font-lato">{currentQuestion.help_text}</p>
                    )}

                    <div className="mt-2">
                      {renderQuestionInput(currentQuestion)}
                    </div>

                    {errors[`question_${currentQuestion.id}`] && (
                      <p className="text-red-500 text-sm font-lato mt-1">
                        {errors[`question_${currentQuestion.id}`]}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="sticky bottom-0 flex-shrink-0 p-4 sm:p-6 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-[110]">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (currentQuestionIndex === 0) {
                      setShowQuestionsModal(false);
                      setShowQuizFeedbackModal(true);
                    } else {
                      goToPreviousQuestion();
                    }
                  }}
                  className="flex-1 h-12 rounded-xl font-lato"
                >
                  {currentQuestionIndex === 0 ? 'Cancel' : 'Previous'}
                </Button>
                
                {(() => {
                  const visibleQuestions = getVisibleQuestions();
                  // If questions are still loading, show a loading button
                  if (visibleQuestions.length === 0) {
                    return (
                      <Button
                        type="button"
                        disabled
                        className="flex-1 h-12 rounded-xl text-white font-lato opacity-70"
                        style={{ backgroundColor: '#34D164' }}
                      >
                        Loading...
                      </Button>
                    );
                  }

                  const safeIndex = Math.max(0, Math.min(currentQuestionIndex, visibleQuestions.length - 1));
                  const currentQuestion = visibleQuestions[safeIndex];
                  const isLastQuestion = safeIndex >= visibleQuestions.length - 1;
                  const finishHere = currentQuestion && isEndAfterThis(currentQuestion);

                  if (isLastQuestion || finishHere) {
                    return (
                      <Button
                        type="button"
                        onClick={() => {
                          const answer = questionAnswers[currentQuestion?.id];
                          let isAnswered = false;
                          
                          if (currentQuestion?.question_type === 'multiple_choice_multiple') {
                            isAnswered = Array.isArray(answer) && answer.length > 0;
                          } else if (currentQuestion?.question_type === 'yes_no') {
                            isAnswered = answer === true || answer === false;
                          } else {
                            isAnswered = answer !== undefined && answer !== null && answer !== '';
                          }
                          
                          if (!isAnswered && currentQuestion?.is_required) {
                            setErrors(prev => ({
                              ...prev,
                              [`question_${currentQuestion.id}`]: 'This question is required'
                            }));
                            return;
                          }
                          
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors[`question_${currentQuestion?.id}`];
                            return newErrors;
                          });
                          
                          if (currentQuestion) {
                            setEndAfterQuestionId(currentQuestion.id);
                            setNavHistory(prev => [...prev, currentQuestion.id]);
                          }
                          setQuestionsCompleted(true);
                          setShowQuestionsModal(false);
                        }}
                        className="flex-1 h-12 rounded-xl text-white font-lato"
                        style={{ backgroundColor: '#34D164' }}
                      >
                        <Check size={18} className="mr-2" />
                        Done
                      </Button>
                    );
                  }

                  return (
                    <Button
                      type="button"
                      onClick={goToNextQuestion}
                      className="flex-1 h-12 rounded-xl text-white font-lato"
                      style={{ backgroundColor: '#34D164' }}
                    >
                      Next
                      <ArrowRight size={18} className="ml-2" />
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[85dvh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold font-montserrat text-[#121E3C]">Review your answers</h3>
              <p className="text-gray-500 text-xs sm:text-sm font-lato mt-1">Please review your responses before continuing.</p>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div className="space-y-4">
                {getQuestionsForReview().map((q) => (
                  <div key={q.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-sm font-medium font-lato text-[#121E3C] mb-1">{q.question_text}</div>
                    <div className="text-sm text-gray-600 font-lato">{formatAnswerText(q, questionAnswers[q.id]) || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-100 bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl font-lato" onClick={() => setShowReviewModal(false)}>Edit Answers</Button>
                <Button className="flex-1 h-12 rounded-xl text-white font-lato" style={{backgroundColor: '#34D164'}} onClick={() => { setShowReviewModal(false); nextStep(); }}>Confirm</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Feedback Modal */}
      {showQuizFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85dvh] sm:max-h-[85dvh] overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold font-montserrat text-[#121E3C]">
                    Can you tell us why you're going?
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm font-lato mt-1">
                    Your feedback will help us serve you better
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuizFeedbackModal(false);
                    setQuizFeedback('');
                    setQuizFeedbackOption('');
                    setQuestionAnswers({});
                    resetQuestionNavigation();
                    setQuestionsCompleted(false);
                  }}
                  className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-500 text-xl">×</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {/* Radio options */}
              <div className="space-y-2 sm:space-y-3">
                {[
                  "I don't want to share my personal information",
                  "I'm not sure what this job will cost",
                  "My job doesn't fit in this category",
                  "I have technical issues with the website",
                  "I'm not ready to post my job yet",
                  "Something else"
                ].map((option) => (
                  <label
                    key={option}
                    className={`flex items-start gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                      quizFeedbackOption === option
                        ? 'border-[#121E3C] bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      quizFeedbackOption === option
                        ? 'border-[#121E3C] bg-[#121E3C]'
                        : 'border-gray-300'
                    }`}>
                      {quizFeedbackOption === option && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="font-lato text-sm text-gray-700 flex-1 leading-snug">{option}</span>
                    <input
                      type="radio"
                      name="quizFeedbackOption"
                      value={option}
                      checked={quizFeedbackOption === option}
                      onChange={(e) => setQuizFeedbackOption(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                ))}

              {/* Conditional textarea for "Something else" */}
              {quizFeedbackOption === "Something else" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-lato">
                    Tell us more:
                  </label>
                  <textarea
                    value={quizFeedback}
                    onChange={(e) => setQuizFeedback(e.target.value)}
                    placeholder="Please share your feedback..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl font-lato text-sm focus:border-[#34D164] focus:ring-[#34D164]/20 focus:outline-none resize-none"
                  />
                </div>
              )}
              </div>
            </div>
            
            <div className="flex-shrink-0 p-4 sm:p-6 bg-white border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6">
              <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await jobsAPI.submitPostingExitFeedback({
                      feedback_option: quizFeedbackOption,
                      feedback_text: quizFeedbackOption === 'Something else' ? quizFeedback : '',
                      job_title: formData.title,
                      job_category: formData.category,
                      current_step: currentStep,
                      homeowner_name: formData.homeowner_name,
                      homeowner_email: formData.homeowner_email,
                      homeowner_phone: formData.homeowner_phone
                    });
                  } catch {}
                  setShowQuizFeedbackModal(false);
                  setQuizFeedback('');
                  setQuizFeedbackOption('');
                  // Clear quiz progress and reset
                  setQuestionAnswers({});
                  resetQuestionNavigation();
                  setQuestionsCompleted(false);
                }}
                disabled={!quizFeedbackOption}
                className="w-full h-12 rounded-xl text-white font-lato disabled:opacity-50"
                style={{ backgroundColor: '#121E3C' }}
              >
                Submit
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowQuizFeedbackModal(false);
                  setQuizFeedback('');
                  setQuizFeedbackOption('');
                  // Clear quiz progress and reset
                  setQuestionAnswers({});
                  resetQuestionNavigation();
                  setQuestionsCompleted(false);
                }}
                className="w-full text-center text-[#34D164] font-medium font-lato py-2"
              >
                Skip
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JobPostingForm;
