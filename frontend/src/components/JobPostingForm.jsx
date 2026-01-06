import React, { useState, useCallback, useEffect, useRef } from 'react';
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

function JobPostingForm({ onClose, onJobPosted, initialCategory, initialState }) {
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const { loginWithToken, isAuthenticated, user: currentUser, loading } = useAuth();
  const { toast } = useToast();
  const { states: nigerianStates, loading: statesLoading, error: statesError } = useStates();
  
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
    if (initialCategory && !formData.category) {
      setFormData(prev => ({ ...prev, category: initialCategory }));
    }
  }, [initialCategory]);
  // Prefill state if provided via navigation
  useEffect(() => {
    if (initialState && !formData.state) {
      setFormData(prev => ({ ...prev, state: initialState }));
      // Load LGAs for the initial state
      fetchLGAsForState(initialState);
      // Center the map to the initial state
      setMapCenterAddress(`${initialState}, Nigeria`);
      setMapCenterZoom(10);
    }
  }, [initialState]);

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
      loadTradeQuestions(formData.category);
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/lgas/${encodeURIComponent(state)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableLGAs(data.lgas || []);
      } else {
        console.error('Failed to fetch LGAs:', response.statusText);
        setAvailableLGAs([]);
      }
    } catch (error) {
      console.error('Error fetching LGAs:', error);
      setAvailableLGAs([]);
    } finally {
      setLoadingLGAs(false);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Job Details
        if (!formData.title.trim()) newErrors.title = 'Job title is required';
        else if (formData.title.length < 10) newErrors.title = 'Job title must be at least 10 characters';
        
        if (!formData.category) newErrors.category = 'Please select a category';
        

        // If category is selected, validate admin questions instead of description
        if (formData.category) {
          const visibleQuestions = getVisibleQuestions();
          const cutoffIndex = endAfterQuestionId ? visibleQuestions.findIndex(q => q.id === endAfterQuestionId) : -1;
          const questionsToValidate = cutoffIndex !== -1 ? visibleQuestions.slice(0, cutoffIndex + 1) : visibleQuestions;
          if (visibleQuestions.length > 0) {
            // Validate only visible trade category questions (after conditional logic)
            questionsToValidate.forEach(question => {
              if (question.is_required) {
                const answer = questionAnswers[question.id];
                
                if (question.question_type === 'multiple_choice_multiple') {
                  if (!answer || answer.length === 0) {
                    newErrors[`question_${question.id}`] = 'This question is required';
                  }
                } else if (question.question_type === 'yes_no') {
                  // For yes/no questions, any boolean value is valid (including false)
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
          } else if (tradeQuestions.length > 0) {
            // If there are questions configured but none are visible due to conditional logic,
            // this might be valid (all questions might be conditional and hidden)
            // Don't block progression in this case
          } else {
            // No questions available for this category - prevent proceeding
            newErrors.category = 'Questions need to be configured for this category. Please contact support or choose a different category.';
          }
        }
        break;

      case 2: // Location
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.lga.trim()) newErrors.lga = 'Local Government Area (LGA) is required';
        if (!formData.town.trim()) newErrors.town = 'Town/Area is required';
        if (!formData.zip_code.trim()) {
          newErrors.zip_code = 'Zip code is required';
        } else if (!/^\d{6}$/.test(formData.zip_code.trim())) {
          newErrors.zip_code = 'Zip code must be 6 digits';
        }
        if (!formData.home_address.trim()) {
          newErrors.home_address = 'Home address is required';
        } else if (formData.home_address.trim().length < 10) {
          newErrors.home_address = 'Home address must be at least 10 characters';
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
      const nextStepNumber = Math.min(currentStep + 1, totalSteps);
      setCurrentStep(nextStepNumber);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const continueToAccountCreation = () => {
    setShowAccountModal(false);
    setCurrentStep(5);
  };

  const continueToLogin = () => {
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
      const jobData = {
        title: formData.title,
        description: formData.description.trim(),
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code,
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

      const jobResponse = await jobsAPI.createJob(jobData);

      // Save question answers if there are any
      if (tradeQuestions.length > 0 && Object.keys(questionAnswers).length > 0) {
        try {
          const jobId = jobResponse.job_id || jobResponse.id;
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
            answers: tradeQuestions.map(question => ({
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
          // Don't fail the job posting if answers can't be saved
        }
      }

      const jobId = jobResponse.job_id || jobResponse.id;
      toast({
        title: "Job Submitted for Review!",
        description: `Your job has been submitted and is pending admin approval. Job ID: ${jobId}`,
      });

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to homepage instead of success page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

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
  const loadTradeQuestions = async (category) => {
    if (!category) {
      setTradeQuestions([]);
      setQuestionAnswers({});
      resetQuestionNavigation();
      return;
    }

    try {
      setLoadingQuestions(true);
      const response = await tradeCategoryQuestionsAPI.getJobPostingQuestions(category);
      setTradeQuestions(response.questions || []);
      
      // Initialize answers for required questions
      const initialAnswers = {};
      (response.questions || []).forEach(question => {
        if (question.question_type === 'yes_no') {
          initialAnswers[question.id] = false;
        } else if (question.question_type === 'multiple_choice_multiple') {
          initialAnswers[question.id] = [];
        } else if (question.question_type === 'file_upload') {
          initialAnswers[question.id] = [];
        } else {
          initialAnswers[question.id] = '';
        }
      });
      setQuestionAnswers(initialAnswers);
      
      // Reset to first question
      resetQuestionNavigation();
      
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
        newAnswers = { ...prev, [questionId]: value };
        if (value !== 'other') {
          setQuestionAnswersOtherText(prevOther => ({ ...prevOther, [questionId]: '' }));
        }
      }
      
      // After updating answers, check if current question index is still valid
      // This is important because conditional logic might hide/show questions
      setTimeout(() => {
        const visibleQuestions = getVisibleQuestions();
        if (currentQuestionIndex >= visibleQuestions.length && visibleQuestions.length > 0) {
          // Current index is out of bounds, reset to last visible question
          setCurrentQuestionIndex(visibleQuestions.length - 1);
        } else if (visibleQuestions.length === 0) {
          // No visible questions, reset to 0
          setCurrentQuestionIndex(0);
        }
        
        // Clear any validation errors for questions that are no longer visible
        const visibleQuestionIds = visibleQuestions.map(q => q.id);
        setErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          Object.keys(newErrors).forEach(errorKey => {
            if (errorKey.startsWith('question_')) {
              const questionId = errorKey.replace('question_', '');
              if (!visibleQuestionIds.includes(questionId)) {
                delete newErrors[errorKey];
              }
            }
          });
          return newErrors;
        });
      }, 10); // Small delay to ensure state has updated
      
      return newAnswers;
    });
  };

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
    if (nav && nav.enabled) {
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
          // Find next question after candidate in visible list, ignoring inline id
          const afterList = visibleQuestions.slice(currentQuestionIndex + 1).filter(q => String(q.id) !== String(inlineUploadQ.id));
          if (afterList.length > 0) {
            setNavHistory(prev => [...prev, currentQuestion.id]);
            setCurrentQuestionIndex(currentQuestionIndex + 1 + 0);
            return;
          }
          // If no more, fall through to unanswered/next logic below
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
    const maybeInline = (currentQuestion.question_type === 'yes_no' && answer === true) ? getInlineUploadForYes(currentQuestion) : null;
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

  const getVisibleQuestions = () => {
    if (!tradeQuestions || tradeQuestions.length === 0) {
      return [];
    }

    const byId = {};
    tradeQuestions.forEach(q => { byId[q.id] = q; });
    const ordered = tradeQuestions.slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let current = ordered[0] || null;
    const path = [];
    const visited = new Set();
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
        let key = '';
        const ans = questionAnswers[current.id];
        if (current.question_type === 'yes_no') key = normalize(ans);
        else if (current.question_type === 'multiple_choice_single') key = normalize(ans);
        const nextIdRaw = findMappedId(nav.next_question_map, key);
        const fallbackId = nav.default_next_question_id || null;
        const candidateId = nextIdRaw || fallbackId;
        if (candidateId === '__END__') break;
        nextId = candidateId;
      } else {
        const idx = ordered.findIndex(q => String(q.id) === String(current.id));
        nextId = ordered[idx + 1]?.id || null;
      }

      current = nextId ? byId[String(nextId)] : null;
    }

    return path;
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
  const findMappedId = (map, key) => {
    let match = null;
    for (const [mk, mv] of Object.entries(map || {})) {
      if (normalizeNavKey(mk) === key) { match = mv; break; }
    }
    if (!match && key === 'other') {
      for (const [mk, mv] of Object.entries(map || {})) {
        const nk = normalizeNavKey(mk);
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
    const visible = getVisibleQuestions();
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
          <div className="space-y-2">
            {question.options?.map((option, optIndex) => (
              <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option.value}
                  checked={questionAnswers[question.id] === option.value}
                  onChange={(e) => handleQuestionAnswer(question.id, e.target.value, question.question_type)}
                  className="text-green-600 focus:ring-green-500"
                  id={`field-question_${question.id}-${optIndex}`}
                />
                <span className="text-sm font-lato">{option.text}</span>
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
                    {Array.isArray(questionAnswers[inlineQ.id]) && questionAnswers[inlineQ.id].length > 0 && (
                      <div className="text-sm text-gray-600">Selected: {questionAnswers[inlineQ.id].filter(f => f instanceof File).map(f => f.name).join(', ')}</div>
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
          <div className="space-y-2">
            {question.options?.map((option, optIndex) => (
              <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={(questionAnswers[question.id] || []).includes(option.value)}
                onChange={(e) => handleQuestionAnswer(question.id, option.value, question.question_type)}
                className="text-green-600 focus:ring-green-500 rounded"
                name={`question_${question.id}`}
                id={`field-question_${question.id}-${optIndex}`}
              />
              <span className="text-sm font-lato">{option.text}</span>
            </label>
            ))}
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
                    {Array.isArray(questionAnswers[inlineQ.id]) && questionAnswers[inlineQ.id].length > 0 && (
                      <div className="text-sm text-gray-600">Selected: {questionAnswers[inlineQ.id].filter(f => f instanceof File).map(f => f.name).join(', ')}</div>
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
              <div className="text-sm text-gray-600">Selected: {questionAnswers[question.id].filter(f => f instanceof File).map(f => f.name).join(', ')}</div>
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
    
    // If user is authenticated, use the authenticated flow
    if (isUserAuthenticated()) {
      await handleJobSubmissionForAuthenticatedUser();
      return;
    }
    
    // For non-authenticated users, validate step 5 (account creation)
    if (!validateStep(5)) return;

    setSubmitting(true);

    try {
      // Build job payload
      const jobData = {
        title: formData.title,
        description: formData.description.trim(),
        category: formData.category,
        state: formData.state,
        lga: formData.lga,
        town: formData.town,
        zip_code: formData.zip_code,
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
      const payload = { job: jobData, password: formData.password };
      let jobResponse;
      try {
        jobResponse = await jobsAPI.registerAndPost(payload);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 403 && detail?.verification_required) {
          toast({
            title: "Verify your email",
            description: "We sent a verification link to your email. Please verify to post your job.",
          });
          // Keep user on step 5 and show guidance
          setCurrentStep(5);
          setSubmitting(false);
          return;
        }
        throw err;
      }

      if (jobResponse.access_token && jobResponse.user) {
        try { loginWithToken(jobResponse.access_token, jobResponse.user); } catch {}
      }

      // Save question answers if there are any
      if (tradeQuestions.length > 0 && Object.keys(questionAnswers).length > 0) {
        try {
          const jobId = jobResponse.job_id || jobResponse.id;
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
            answers: tradeQuestions.map(question => ({
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
          // Don't fail the job posting if answers can't be saved
        }
      }

      const jobId = jobResponse.job_id || jobResponse.id;
      toast({
        title: "Job Submitted!",
        description: `Your job has been submitted for admin review. Job ID: ${jobId}`,
      });

      if (onJobPosted) {
        onJobPosted(jobResponse);
      }

      // Redirect to homepage instead of success page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

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
        <span className="text-sm font-medium text-gray-600 font-lato">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-600 font-lato">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
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
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Tell us about your job
              </h2>
              <p className="text-gray-600 font-lato">
                Provide details about the work you need done
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Job Title *
              </label>
              <input
                type="text"
                id="field-title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="e.g., Fix leaky bathroom tap, Install kitchen cabinets"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Category *
              </label>
              <select
                id="field-category"
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {tradeCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            

            {/* Admin-Set Questions Section */}
            {formData.category && (
              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                    Job Details for {formData.category}
                  </h3>
                  
                </div>

                {loadingQuestions ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-10 bg-gray-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : tradeQuestions.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      const visibleQuestions = getVisibleQuestions();
                      
                      if (visibleQuestions.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-600">
                            <p>No questions to display based on your previous answers.</p>
                            <p className="text-sm mt-2">Please review your answers if this seems incorrect.</p>
                          </div>
                        );
                      }

                      return showQuestionsOneByOne ? (
                        // Show current question only
                        <div className="space-y-4">
                          {visibleQuestions.length > 0 && visibleQuestions[currentQuestionIndex] && (
                            <div className="bg-white border-2 border-green-200 rounded-lg p-6 shadow-sm">
                              <div className="space-y-4">
                                <label className="block text-lg font-medium font-lato" style={{color: '#121E3C'}}>
                                  {visibleQuestions[currentQuestionIndex].question_text}
                                  {visibleQuestions[currentQuestionIndex].is_required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                {visibleQuestions[currentQuestionIndex].help_text && (
                                  <p className="text-gray-500 text-sm font-lato">{visibleQuestions[currentQuestionIndex].help_text}</p>
                                )}

                                {/* Render the current question input */}
                                {renderQuestionInput(visibleQuestions[currentQuestionIndex])}

                                {/* Error message */}
                                {errors[`question_${visibleQuestions[currentQuestionIndex].id}`] && (
                                  <p className="text-red-500 text-sm font-lato mt-1">
                                    {errors[`question_${visibleQuestions[currentQuestionIndex].id}`]}
                                  </p>
                                )}
                              </div>
                              
                              {/* Navigation buttons */}
                              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
                                <Button
                                  type="button" 
                                  variant="outline"
                                  onClick={goToPreviousQuestion}
                                  disabled={currentQuestionIndex === 0}
                                  className="flex items-center space-x-2 w-full sm:w-auto"
                                >
                                  <ArrowLeft size={16} />
                                  <span>Previous</span>
                                </Button>
                                
                                {(() => {
                                  const currentQuestion = visibleQuestions[currentQuestionIndex];
                                  const finishHere = currentQuestion && isEndAfterThis(currentQuestion);
                                  return finishHere;
                                })() ? (
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      // Validate the current question before proceeding to next step
                                      const currentQuestion = visibleQuestions[currentQuestionIndex];
                                      const answer = questionAnswers[currentQuestion.id];
                                      
                                      let isAnswered = false;
                                      if (currentQuestion.question_type === 'multiple_choice_multiple') {
                                        isAnswered = Array.isArray(answer) && answer.length > 0;
                                      } else if (currentQuestion.question_type === 'yes_no') {
                                        isAnswered = answer === true || answer === false;
                                      } else {
                                        isAnswered = answer !== undefined && answer !== null && answer !== '';
                                      }
                                      
                                      if (!isAnswered && currentQuestion.is_required) {
                                        setErrors(prev => ({
                                          ...prev,
                                          [`question_${currentQuestion.id}`]: 'This question is required'
                                        }));
                                        return;
                                      }
                                      
                                      // Clear errors and proceed to next step
                                      setErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors[`question_${currentQuestion.id}`];
                                        return newErrors;
                                      });
                                      setEndAfterQuestionId(currentQuestion.id);
                                      setNavHistory(prev => [...prev, currentQuestion.id]);
                                      setShowReviewModal(true);
                                    }}
                                    className="flex items-center space-x-2 text-white w-full sm:w-auto"
                                    style={{backgroundColor: '#34D164'}}
                                  >
                                    <span>Continue to Next Step</span>
                                    <ArrowRight size={16} />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    onClick={goToNextQuestion}
                                    className="flex items-center space-x-2 text-white w-full sm:w-auto"
                                    style={{backgroundColor: '#34D164'}}
                                  >
                                    <span>Next Question</span>
                                    <ArrowRight size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          
                          

                          {/* Conditional Logic Debug Info (remove in production) */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                              <p><strong>Debug Info:</strong></p>
                              <p>Total Questions: {tradeQuestions.length}</p>
                              <p>Visible Questions: {visibleQuestions.length}</p>
                              <p>Current Index: {currentQuestionIndex + 1}</p>
                              {visibleQuestions[currentQuestionIndex]?.conditional_logic?.enabled && (
                                <p>Current Question has conditional logic: {visibleQuestions[currentQuestionIndex].conditional_logic.rules?.length || 0} rules</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show all visible questions (original view)
                        <div className="space-y-6">
                          {visibleQuestions.map((question, index) => (
                            <div key={question.id} className="space-y-2">
                              <label className="block text-sm font-medium font-lato" style={{color: '#121E3C'}}>
                                {question.question_text}
                                {question.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              
                              {question.help_text && (
                                <p className="text-gray-500 text-xs font-lato">{question.help_text}</p>
                              )}

                              {renderQuestionInput(question)}

                              {errors[`question_${question.id}`] && (
                                <p className="text-red-500 text-sm font-lato">
                                  {errors[`question_${question.id}`]}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800 font-lato">
                          No questions configured for {formData.category}
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700 font-lato">
                          An admin needs to set up specific questions for this trade category before jobs can be posted. 
                          Please contact support or try a different category.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Job Description field removed as requested */}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Location
              </h2>
              <p className="text-gray-600 font-lato">
                Where is the job located?
              </p>
            </div>

            {/* State and LGA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  State *
                </label>
              <select
                id="field-state"
                value={formData.state}
                onChange={(e) => updateFormData('state', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.state ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                  <option value="">Select your state</option>
                  {nigerianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Local Government Area (LGA) *
                </label>
              <select
                id="field-lga"
                value={formData.lga}
                onChange={(e) => updateFormData('lga', e.target.value)}
                disabled={!formData.state || loadingLGAs}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.lga ? 'border-red-500' : 'border-gray-300'
                } ${(!formData.state || loadingLGAs) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                  <option value="">
                    {loadingLGAs ? 'Loading LGAs...' : 'Select LGA'}
                  </option>
                  {availableLGAs.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
                {errors.lga && <p className="text-red-500 text-sm mt-1">{errors.lga}</p>}
                {!formData.state && (
                  <p className="text-gray-500 text-sm mt-1">Please select a state first</p>
                )}
              </div>
            </div>

            {/* Town and Zip Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Town/Area *
                </label>
              <input
                type="text"
                id="field-town"
                placeholder="e.g., Victoria Island, Ikeja, Warri"
                value={formData.town}
                onChange={(e) => updateFormData('town', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.town ? 'border-red-500' : 'border-gray-300'
                }`}
              />
                {errors.town && <p className="text-red-500 text-sm mt-1">{errors.town}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Zip Code *
                </label>
              <input
                type="text"
                id="field-zip_code"
                placeholder="e.g., 100001"
                value={formData.zip_code}
                onChange={(e) => updateFormData('zip_code', e.target.value)}
                maxLength={6}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                  errors.zip_code ? 'border-red-500' : 'border-gray-300'
                }`}
              />
                {errors.zip_code && <p className="text-red-500 text-sm mt-1">{errors.zip_code}</p>}
                <p className="text-gray-500 text-sm mt-1">Nigerian postal code (6 digits)</p>
              </div>
            </div>

            {/* Home Address */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Home Address *
              </label>
              <textarea
                rows={3}
                id="field-home_address"
                placeholder="Enter your full home address (street, building number, landmarks, etc.)"
                value={formData.home_address}
                onChange={(e) => updateFormData('home_address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato resize-none ${
                  errors.home_address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.home_address && <p className="text-red-500 text-sm mt-1">{errors.home_address}</p>}
              <div className="flex justify-between items-center mt-1">
                <p className="text-gray-500 text-sm">Minimum 10 characters</p>
                <p className="text-gray-500 text-sm">{formData.home_address.length}/500</p>
              </div>
            </div>

            {/* Map Location Picker */}
            <div>
              <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                Precise Location (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Pin the exact location on the map to help tradespeople find you easily
              </p>
              <LocationPicker
                height="300px"
                placeholder="Search for your exact address..."
                onLocationSelect={(location) => updateFormData('jobLocation', location)}
                initialLocation={formData.jobLocation}
                showCurrentLocation={true}
                showSearch={true}
                centerAddress={mapCenterAddress}
                centerZoom={mapCenterZoom}
              />
            </div>

            {/* Timeline removed from UI as requested */}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                What's your budget?
              </h2>
              <p className="text-gray-600 font-lato">
                This helps tradespeople understand your project scope
              </p>
            </div>

            {/* Budget Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => updateFormData('budgetType', 'range')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.budgetType === 'range'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <DollarSign size={20} className="mr-2" style={{color: '#34D164'}} />
                  <h3 className="font-semibold font-montserrat">Set Budget Range</h3>
                </div>
                <p className="text-sm text-gray-600 font-lato">
                  Specify your minimum and maximum budget
                </p>
              </div>

              <div
                onClick={() => updateFormData('budgetType', 'discussion')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.budgetType === 'discussion'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <User size={20} className="mr-2" style={{color: '#34D164'}} />
                  <h3 className="font-semibold font-montserrat">Discuss with Pros</h3>
                </div>
                <p className="text-sm text-gray-600 font-lato">
                  Get quotes and discuss pricing
                </p>
              </div>
            </div>

            {/* Budget Range Inputs */}
            {formData.budgetType === 'range' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Minimum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    id="field-budget_min"
                    placeholder="5,000"
                    value={formData.budget_min}
                    onChange={(e) => updateFormData('budget_min', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.budget_min ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.budget_min && <p className="text-red-500 text-sm mt-1">{errors.budget_min}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Maximum Budget (₦) *
                  </label>
                  <input
                    type="number"
                    id="field-budget_max"
                    placeholder="15,000"
                    value={formData.budget_max}
                    onChange={(e) => updateFormData('budget_max', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.budget_max ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.budget_max && <p className="text-red-500 text-sm mt-1">{errors.budget_max}</p>}
                </div>
              </div>
            )}

            {/* Budget Preview */}
            {formData.budgetType === 'range' && formData.budget_min && formData.budget_max && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold font-montserrat text-green-800 mb-2">Budget Summary</h4>
                <p className="text-green-700 font-lato">
                  You're willing to pay between {formatCurrency(formData.budget_min)} and {formatCurrency(formData.budget_max)} for this job.
                </p>
              </div>
            )}

            {formData.budgetType === 'discussion' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold font-montserrat text-blue-800 mb-2">Budget Discussion</h4>
                <p className="text-blue-700 font-lato">
                  Tradespeople will provide quotes based on your job requirements. You can then compare and choose the best option.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                {isAuthenticated() ? 'Review & Post Your Job' : 'Your Contact Information'}
              </h2>
              <p className="text-gray-600 font-lato">
                {isAuthenticated() 
                  ? 'Review your job details and post it to connect with tradespeople'
                  : 'How should tradespeople contact you about this job?'
                }
              </p>
            </div>

            {isAuthenticated() ? (
              // For authenticated users - show review summary
              <div className="space-y-4">
                {/* Contact Information */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Your Contact Information
                    </h3>
                    {isUserAuthenticated() && currentUser && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle size={16} className="mr-1" />
                        Auto-filled from your account
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 font-lato mb-6">
                    {isUserAuthenticated() 
                      ? "We've automatically filled in your details from your account. You can edit them if needed."
                      : "Tradespeople will use this information to contact you about your job."
                    }
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold font-montserrat text-green-800 mb-4">
                    Ready to Post Your Job
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Your Name:</span> {currentUser?.name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {currentUser?.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {currentUser?.phone}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {formData.town}, {formData.lga}, {formData.state}
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold font-montserrat mb-3" style={{color: '#121E3C'}}>
                    Job Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Title:</span> {formData.title}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {formData.category}
                    </div>
                    {formData.description && (
                      <div>
                        <span className="font-medium">Description:</span>
                        <p className="text-gray-700 mt-1">{formData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold font-montserrat text-blue-800 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-700 space-y-1 font-lato">
                    <li>• Your job will be visible to qualified tradespeople in your area</li>
                    <li>• Interested tradespeople will show interest in your job</li>
                    <li>• You'll receive notifications when someone shows interest</li>
                    <li>• You can review their profiles and choose who to contact</li>
                  </ul>
                </div>
              </div>
            ) : (
              // For non-authenticated users - show contact form
              <>
                {/* Contact Information */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Your Contact Information
                    </h3>
                    {isUserAuthenticated() && currentUser && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle size={16} className="mr-1" />
                        Auto-filled from your account
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 font-lato mb-6">
                    {isUserAuthenticated() 
                      ? "We've automatically filled in your details from your account. You can edit them if needed."
                      : "Tradespeople will use this information to contact you about your job."
                    }
                  </p>
                </div>
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      id="field-homeowner_name"
                      placeholder="Enter your full name"
                      value={formData.homeowner_name}
                      onChange={(e) => updateFormData('homeowner_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_name && <p className="text-red-500 text-sm mt-1">{errors.homeowner_name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      id="field-homeowner_email"
                      placeholder="your.email@example.com"
                      value={formData.homeowner_email}
                      onChange={(e) => updateFormData('homeowner_email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_email && <p className="text-red-500 text-sm mt-1">{errors.homeowner_email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      id="field-homeowner_phone"
                      placeholder="08012345678"
                      value={formData.homeowner_phone}
                      onChange={(e) => updateFormData('homeowner_phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                        errors.homeowner_phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.homeowner_phone && <p className="text-red-500 text-sm mt-1">{errors.homeowner_phone}</p>}
                </div>

                {/* Privacy Notice */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold font-montserrat text-gray-800 mb-2">Privacy & Communication</h4>
                  <ul className="text-sm text-gray-600 space-y-1 font-lato">
                    <li>• Your contact details will only be shared with tradespeople you choose</li>
                    <li>• You'll receive updates about your job via email and SMS</li>
                    <li>• You can manage your communication preferences anytime</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        );

      case 5:
        // Account creation step should only be shown for unauthenticated users
        if (isUserAuthenticated()) {
          return null; // Don't render account creation step for authenticated users
        }
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                Create Your Account
              </h2>
              <p className="text-gray-600 font-lato">
                Almost done! Create your account to post the job and manage your projects.
              </p>
            </div>

            {/* Account Benefits */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold font-montserrat text-green-800 mb-4 flex items-center">
                <Check className="mr-2" size={20} />
                Your ServiceHub Account Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Users className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Track Interested Tradespeople</h4>
                    <p className="text-xs text-green-700">See who's interested in your job</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Bell className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Get Notifications</h4>
                    <p className="text-xs text-green-700">Email & SMS updates on your jobs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Star className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Rate & Review</h4>
                    <p className="text-xs text-green-700">Share feedback on completed work</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Coins className="text-green-600 mt-1" size={16} />
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Manage Jobs</h4>
                    <p className="text-xs text-green-700">Full dashboard for all your projects</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Create Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="field-password"
                    placeholder="Enter a secure password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium font-lato mb-2" style={{color: '#121E3C'}}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="field-confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-lato ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <div className="text-xs text-gray-600 font-lato text-center">
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
                {loggingIn ? 'Signing In...' : 'Sign In & Post Job'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  return (
    <>
      <div className="max-w-2xl mx-auto p-6" ref={formTopRef} tabIndex={-1}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                Post a Job
              </CardTitle>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
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
              
              {/* Navigation Buttons - Hide when in one-by-one questions mode */}
              {!(currentStep === 1 && tradeQuestions.length > 0 && showQuestionsOneByOne && getVisibleQuestions().length > 0) && (
                <div className="flex flex-col sm:flex-row justify-between pt-8 border-t gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center font-lato w-full sm:w-auto"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Previous
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={currentStep === 1 ? proceedToNextStepWithReview : nextStep}
                      disabled={submitting}
                      className="flex items-center text-white font-lato w-full sm:w-auto"
                      style={{backgroundColor: '#34D164'}}
                    >
                      Next
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center text-white font-lato w-full sm:w-auto"
                      style={{backgroundColor: '#34D164'}}
                    >
                      {submitting ? 'Submitting...' : (isUserAuthenticated() ? 'Post Job' : 'Create Account & Post Job')}
                      <CheckCircle size={16} className="ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {accountCreationModal}
      {loginModal}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>Review your answers</h3>
              <p className="text-gray-600 text-sm font-lato">Please review your responses before continuing to the next step.</p>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-md p-4 mb-6">
              {getQuestionsForReview().map((q) => (
                <div key={q.id} className="mb-3">
                  <div className="text-sm font-medium font-lato" style={{color: '#121E3C'}}>{q.question_text}</div>
                  <div className="text-sm text-gray-700 font-lato">{formatAnswerText(q, questionAnswers[q.id]) || '—'}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="w-full font-lato" onClick={() => setShowReviewModal(false)}>Edit Answers</Button>
              <Button className="w-full text-white font-lato" style={{backgroundColor: '#34D164'}} onClick={() => { setShowReviewModal(false); nextStep(); }}>Confirm and Continue</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JobPostingForm;

