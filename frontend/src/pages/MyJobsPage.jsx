import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu';
import { 
  Calendar, MapPin, Clock, Users, Heart, TrendingUp, 
  Edit3, X, RotateCcw, AlertCircle, CheckCircle, Star, Briefcase,
  User, DollarSign, MessageSquare, ChevronDown, ChevronUp, MessageCircle, MoreHorizontal 
} from 'lucide-react';
import ChatModal from '../components/ChatModal';
import JobEditModal from '../components/JobEditModal';
import JobCloseModal from '../components/JobCloseModal';
import ReviewForm from '../components/reviews/ReviewForm';
import { jobsAPI } from '../api/jobs';
import { interestsAPI } from '../api/interests';
import { reviewsAPI } from '../api/reviews';
import { messagesAPI } from '../api/messages';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MyJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [interestedTradespeople, setInterestedTradespeople] = useState([]);
  const [activeJobStatus, setActiveJobStatus] = useState('all'); // Added state for job status filter
  const [expandedJobs, setExpandedJobs] = useState(new Set());

  const toggleJobExpanded = (jobId) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };
  const [loading, setLoading] = useState(true);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [jobToClose, setJobToClose] = useState(null);
  const [reopeningJobId, setReopeningJobId] = useState(null);
  const [completingJobId, setCompletingJobId] = useState(null);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [completedJob, setCompletedJob] = useState(null);
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [jobToReview, setJobToReview] = useState(null);
  const [tradespersonToReview, setTradespersonToReview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [jobReviews, setJobReviews] = useState({});
  const [showTradespersonSelectionModal, setShowTradespersonSelectionModal] = useState(false);
  const [availableTradespeoplePorReview, setAvailableTradespeoplePorReview] = useState([]);
  const [resolvingReviewJobId, setResolvingReviewJobId] = useState(null);
  const [jobHiringStatuses, setJobHiringStatuses] = useState({});
  const [pendingReviewJobs, setPendingReviewJobs] = useState(new Set());
  const REVIEW_PENDING_MS = 1500; // brief pending duration before marking completed

  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Helper function to get job status display text
  const getJobStatusDisplayText = (statusValue) => {
    switch (statusValue) {
      case 'all':
        return 'All Jobs';
      case 'active':
        return 'Active';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'pending_approval':
        return 'Pending Approval';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'All Jobs';
    }
  };

  // Get available job status options
  const getJobStatusOptions = () => [
    { value: 'all', label: 'All Jobs', icon: Briefcase },
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'in_progress', label: 'In Progress', icon: TrendingUp },
    { value: 'completed', label: 'Completed', icon: CheckCircle },
    { value: 'pending_approval', label: 'Pending Approval', icon: AlertCircle },
    { value: 'cancelled', label: 'Cancelled', icon: X }
  ];

  // Filter jobs based on selected status
  const getFilteredJobs = () => {
    // First filter out any null or undefined jobs
    const validJobs = jobs.filter(job => job && job.id);
    
    if (activeJobStatus === 'all') {
      return validJobs;
    }
    return validJobs.filter(job => job.status === activeJobStatus);
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'homeowner') {
      loadMyJobs();
    }
  }, [isAuthenticated, user]);

  // Load my jobs and hiring status data
  const loadMyJobs = async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getMyJobs({ limit: 50 });
      console.log('🔍 Jobs API Response:', response);
      if (response?.jobs) {
        console.log('🔍 Total jobs loaded:', response.jobs.length);
        console.log('🔍 Jobs by status:', response.jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {}));
        console.log('🔍 Completed jobs:', response.jobs.filter(job => job.status === 'completed'));
        setJobs(response.jobs);
        // Load hiring status for each job
        await loadHiringStatuses(response.jobs);
      } else {
        console.log('🔍 No jobs in response:', response);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.data?.detail === "Not authenticated") {
        toast({
          title: "Sign in required",
          description: "Please sign in to view your jobs.",
          variant: "destructive",
        });
        // Optionally redirect to login or homepage
        navigate('/');
      } else {
        // Suppress generic failure toast to avoid disruptive red notifications.
        // Intentionally not showing a toast here.
      }
    } finally {
      setLoading(false);
    }
  };

  // Load hiring status data for jobs
  const loadHiringStatuses = async (jobsList) => {
    try {
      // For each job, check if there's hiring status data
      const statusPromises = jobsList.map(async (job) => {
        try {
          const statusResponse = await messagesAPI.getHiringStatus(job.id);
          return {
            jobId: job.id,
            hasAnswered: true,
            hired: statusResponse.hired,
            jobStatus: statusResponse.job_status
          };
        } catch (error) {
          // If no hiring status found, return default
          return {
            jobId: job.id,
            hasAnswered: false,
            hired: false,
            jobStatus: null
          };
        }
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(status => {
        statusMap[status.jobId] = status;
      });
      setJobHiringStatuses(statusMap);
    } catch (error) {
      console.error('Error loading hiring statuses:', error);
    }
  };

  const loadJobInterests = async (jobId) => {
    try {
      setInterestsLoading(true);
      const response = await interestsAPI.getJobInterestedTradespeople(jobId);
      setInterestedTradespeople(response.interested_tradespeople || []);
    } catch (error) {
      console.error('Failed to load interested tradespeople:', error);
      toast({
        title: "Failed to load interested tradespeople",
        description: "There was an error loading interested tradespeople for this job.",
        variant: "destructive",
      });
    } finally {
      setInterestsLoading(false);
    }
  };

  const handleViewInterestedTradespeople = (job) => {
    // Navigate to the dedicated interested tradespeople page
    navigate(`/dashboard/jobs/${job.id}/interested`);
  };

  const handleCloseInterestedModal = () => {
    setShowInterestedModal(false);
    setSelectedJob(null);
    setInterestedTradespeople([]);
  };

  const handleShareContact = async (interestId) => {
    try {
      await interestsAPI.shareContactDetails(interestId);
      toast({
        title: "Contact details shared!",
        description: "The tradesperson will be notified and can now pay to access your contact details.",
      });
      // Reload interests to update status
      if (selectedJob) {
        loadJobInterests(selectedJob.id);
      }
    } catch (error) {
      console.error('Failed to share contact details:', error);
      toast({
        title: "Failed to share contact details",
        description: error.response?.data?.detail || "There was an error sharing contact details.",
        variant: "destructive",
      });
    }
  };

  const handleViewQuotes = (job) => {
    setSelectedJob(job);
    setShowInterestedModal(false);
  };

  const handleEditJob = (job) => {
    console.log('🔧 handleEditJob called with job:', job);
    console.log('🔧 Current showEditModal state:', showEditModal);
    console.log('🔧 Current jobToEdit state:', jobToEdit);
    
    try {
      setJobToEdit(job);
      setShowEditModal(true);
      console.log('✅ Edit job state updated successfully');
    } catch (error) {
      console.error('❌ Error in handleEditJob:', error);
    }
  };

  const handleJobUpdated = (updatedJob) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === updatedJob.id ? updatedJob : job
      )
    );
  };

  const handleCloseJob = (job) => {
    setJobToClose(job);
    setShowCloseModal(true);
  };

  const handleJobClosed = async (jobId) => {
    // Refresh jobs list to show updated status
    await loadMyJobs();
  };

  const handleCompleteJob = async (jobId) => {
    try {
      setCompletingJobId(jobId);
      const updatedJob = await jobsAPI.completeJob(jobId);
      
      toast({
        title: "Job Completed",
        description: "Your job has been marked as completed successfully.",
      });
      
      // Refresh jobs list
      await loadMyJobs();
      
      // Show review prompt after a short delay
      setTimeout(() => {
        setCompletedJob(updatedJob);
        setShowReviewPrompt(true);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to complete job:', error);
      toast({
        title: "Failed to Complete Job",
        description: error.response?.data?.detail || "There was an error marking the job as completed.",
        variant: "destructive",
      });
    } finally {
      setCompletingJobId(null);
    }
  };

  const handleReopenJob = async (jobId) => {
    try {
      setReopeningJobId(jobId);
      await jobsAPI.reopenJob(jobId);
      
      toast({
        title: "Job Reopened",
        description: "Your job has been reopened and is now active.",
      });
      
      // Refresh jobs list
      await loadMyJobs();
      
    } catch (error) {
      console.error('Failed to reopen job:', error);
      toast({
        title: "Failed to Reopen Job",
        description: error.response?.data?.detail || "There was an error reopening the job.",
        variant: "destructive",
      });
    } finally {
      setReopeningJobId(null);
    }
  };

  // Handle starting a chat with tradespeople
  const handleStartQuickChat = (job) => {
    try {
      console.log('🚀 Starting quick chat for job:', job.id);
      
      toast({
        title: "Opening Chat...",
        description: "Starting chat with interested tradespeople",
        variant: "default",
      });

      // Navigate to the interested tradespeople page where full chat functionality is available
      navigate(`/dashboard/jobs/${job.id}/interested`);
      
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Review handling functions
  const handleLeaveReview = async (job, tradesperson = null) => {
    if (!job?.id) return;
    setResolvingReviewJobId(job.id);
    setJobToReview(job);
    
    if (tradesperson) {
      // If tradesperson is explicitly provided, use it
      setTradespersonToReview(tradesperson);
      setShowReviewModal(true);
      setResolvingReviewJobId(null);
    } else {
      // If no tradesperson provided, resolve review candidates from multiple sources
      try {
        const dedupeById = (items) => {
          const map = new Map();
          items.forEach((item) => {
            if (!item?.id) return;
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        };

        const normalizeCandidate = (personLike) => {
          const id = personLike?.id || personLike?.tradesperson_id;
          if (!id) return null;
          return {
            id,
            name: personLike?.name || personLike?.tradesperson_name || personLike?.business_name || 'Tradesperson',
            business_name: personLike?.business_name || '',
            source_status: personLike?.status || null,
          };
        };

        let candidates = [];

        // 1) Primary source: explicit hiring status records
        const hiredTradespeople = await getHiredTradespeopleForJob(job.id);
        candidates.push(...hiredTradespeople.map(normalizeCandidate).filter(Boolean));

        // 2) Fallback source: completed job payload may include selected tradesperson
        if (job?.hired_tradesperson?.id) {
          candidates.push(normalizeCandidate(job.hired_tradesperson));
        }
        if (job?.assigned_tradesperson_id) {
          candidates.push(normalizeCandidate({
            id: job.assigned_tradesperson_id,
            name: job?.hired_tradesperson?.name || 'Selected Tradesperson'
          }));
        }

        // 3) Backward-compat fallback: interested tradespeople with shared contact/paid access
        if (candidates.length === 0) {
          const interestsResponse = await interestsAPI.getJobInterestedTradespeople(job.id);
          const interested = interestsResponse?.interested_tradespeople || [];
          const reviewEligibleStatuses = new Set(['contact_shared', 'paid_access']);
          const eligible = interested.filter((p) => reviewEligibleStatuses.has((p?.status || '').toLowerCase()));
          candidates.push(...eligible.map(normalizeCandidate).filter(Boolean));
        }

        candidates = dedupeById(candidates);

        // Verify review eligibility against backend rule, but fail open if check endpoint errors.
        try {
          const checks = await Promise.all(
            candidates.map(async (candidate) => {
              const eligibility = await reviewsAPI.canReviewUser(candidate.id, job.id);
              return eligibility?.can_review ? candidate : null;
            })
          );
          const eligibleCandidates = checks.filter(Boolean);
          if (eligibleCandidates.length > 0) {
            candidates = eligibleCandidates;
          }
        } catch {
          // Keep candidates resolved from local/known sources.
        }

        if (candidates.length === 1) {
          // If only one review candidate, review directly
          setTradespersonToReview(candidates[0]);
          setShowReviewModal(true);
        } else if (candidates.length > 1) {
          // If multiple candidates, ask user to choose who to review
          setAvailableTradespeoplePorReview(candidates);
          setShowTradespersonSelectionModal(true);
        } else {
          // If no candidates found, show error
          toast({
            title: "Cannot Leave Review",
            description: "No reviewable tradesperson found for this job yet. Please confirm who worked on this job from Messages first.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error getting hired tradespeople:', error);
        toast({
          title: "Error",
          description: "Failed to load tradesperson information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setResolvingReviewJobId(null);
      }
    }
  };

  // Get hired tradespeople for a job
  const getHiredTradespeopleForJob = async (jobId) => {
    try {
      const response = await messagesAPI.getHiredTradespeopleForJob(jobId);
      return response.tradespeople || [];
    } catch (error) {
      console.error('Error getting hired tradespeople:', error);
      return [];
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      setSubmittingReview(true);

      const resolvedRevieweeId = tradespersonToReview?.id || reviewData?.reviewee_id;
      if (!resolvedRevieweeId) {
        toast({
          title: "Cannot Submit Review",
          description: "No tradesperson selected for this review.",
          variant: "destructive",
        });
        return;
      }
      
      const reviewPayload = {
        job_id: jobToReview.id,
        reviewee_id: resolvedRevieweeId,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        category_ratings: reviewData.category_ratings || reviewData.categoryRatings || {},
        photos: reviewData.photos || [],
        would_recommend: (typeof reviewData.would_recommend === 'boolean')
          ? reviewData.would_recommend
          : (typeof reviewData.wouldRecommend === 'boolean' ? reviewData.wouldRecommend : true)
      };

      await reviewsAPI.createReview(reviewPayload);
      // Mark this job's review as pending immediately after submission
      setPendingReviewJobs(prev => new Set([...prev, jobToReview.id]));
      // Auto-clear pending shortly to reflect quick completion
      setTimeout(() => {
        setPendingReviewJobs(prev => {
          const next = new Set([...prev]);
          next.delete(jobToReview.id);
          return next;
        });
      }, REVIEW_PENDING_MS);
      
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback! Your review has been submitted successfully.",
      });
      
      setShowReviewModal(false);
      setJobToReview(null);
      setTradespersonToReview(null);
      
      // Optionally refresh reviews for this job
      await loadJobReviews(jobToReview.id);
      
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast({
        title: "Failed to Submit Review",
        description: error.response?.data?.detail || "There was an error submitting your review.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const loadJobReviews = async (jobId) => {
    try {
      const reviews = await reviewsAPI.getJobReviews(jobId);
      setJobReviews(prev => ({
        ...prev,
        [jobId]: reviews
      }));

      // Sync pending state based on latest review status for current user
      const myReview = Array.isArray(reviews) ? reviews.find(r => r?.reviewer_id === user?.id) : null;
      const statusRaw = (myReview?.status || myReview?.state || myReview?.review_status || '').toString().toLowerCase();
      const isPending = statusRaw.includes('pending') || statusRaw.includes('under');
      setPendingReviewJobs(prev => {
        const next = new Set([...prev]);
        if (isPending) {
          next.add(jobId);
        } else {
          next.delete(jobId);
        }
        return next;
      });
    } catch (error) {
      console.error('Failed to load job reviews:', error);
    }
  };

  const canLeaveReview = (job) => {
    // Can leave review if job is completed and user hasn't already reviewed
    return job.status === 'completed' && !jobReviews[job.id]?.some(review => 
      review.reviewer_id === user?.id
    );
  };

  const hasMyReview = (job) => {
    return jobReviews[job.id]?.some(review => review.reviewer_id === user?.id);
  };

  const handleCompleteAndReview = async (jobId) => {
    // Implementation will be added here
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const TIMELINE_PLACEHOLDERS = new Set(['', 'flexible', 'not specified', 'n/a', 'na', 'none']);
  const timelineKeywords = [
    'urgent',
    'timeline',
    'when do you need',
    'how soon',
    'when do you want',
    'when should',
    'job done',
    'start date'
  ];

  const deriveTimelineFromAnswers = (answersDoc) => {
    const answers = Array.isArray(answersDoc?.answers) ? answersDoc.answers : [];
    for (const ans of answers) {
      const questionText = String(ans?.question_text || ans?.question || '').toLowerCase();
      if (!timelineKeywords.some((key) => questionText.includes(key))) continue;
      const rawValue = ans?.answer_text ?? ans?.answer_value;
      if (Array.isArray(rawValue)) {
        const joined = rawValue.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
        if (joined) return joined;
        continue;
      }
      const value = String(rawValue || '').trim();
      if (value) return value;
    }
    return '';
  };

  const resolveTimelineDisplay = (job, fallback = 'Not specified') => {
    const raw = String(job?.timeline || '').trim();
    if (raw && !TIMELINE_PLACEHOLDERS.has(raw.toLowerCase())) return raw;
    const derived = deriveTimelineFromAnswers(job?.question_answers);
    if (derived) return derived;
    return raw || fallback;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-[#34D164]/10 text-[#34D164]';
      case 'in_progress':
        return 'bg-amber-50 text-amber-600';
      case 'completed':
        return 'bg-[#121E3C]/10 text-[#121E3C]';
      case 'pending_approval':
        return 'bg-yellow-50 text-yellow-600';
      case 'cancelled':
        return 'bg-red-50 text-red-500';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Human-friendly label for job status badges
  const getJobStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending_approval':
        return 'Pending Approval';
      case 'cancelled':
        return 'Cancelled';
      default:
        return (status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  // Show a lightweight loading state while auth context resolves user
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
            Sign In Required
          </h1>
          <p className="text-gray-600 font-lato mb-6">
            Please sign in to view your jobs and manage quotes.
          </p>
        </div>
      </div>
    );
  }

  // Only gate once user data is available
  if (!authLoading && user?.role !== 'homeowner') {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
            Homeowner Access Only
          </h1>
          <p className="text-gray-600 font-lato mb-6">
            This page is only available to homeowners.
          </p>
        </div>
      </div>
    );
  }

  // Show interested tradespeople modal
  if (showInterestedModal && selectedJob) {
    return (
      <div className="space-y-6 min-w-0">
        {/* Back Button */}
        <button
          onClick={handleCloseInterestedModal}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#121E3C] font-lato transition-colors"
        >
          <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
          Back to My Jobs
        </button>

        {/* Job Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-lg sm:text-xl font-bold font-montserrat text-[#121E3C] truncate">
                  {selectedJob.title}
                </h1>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                  {getJobStatusLabel(selectedJob.status)}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-lato">
                <span className="flex items-center gap-1">
                  <MapPin size={14} className="text-gray-400" />
                  {selectedJob.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  Posted {formatDate(selectedJob.created_at)}
                </span>
              </div>
            </div>
            {selectedJob.budget_min && selectedJob.budget_max && (
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold font-montserrat text-[#34D164]">
                  {formatCurrency(selectedJob.budget_min)} - {formatCurrency(selectedJob.budget_max)}
                </div>
                <div className="text-xs text-gray-400 font-lato">Your Budget</div>
              </div>
            )}
          </div>
        </div>

        {/* Interested Tradespeople Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-[#121E3C] font-montserrat">
              Interested Tradespeople
            </h2>
            <span className="px-2.5 py-1 bg-[#34D164]/10 text-[#34D164] rounded-lg text-xs font-medium">
              {interestedTradespeople.length} total
            </span>
          </div>
          
          {interestsLoading ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-2 border-[#34D164] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 font-lato">Loading interested tradespeople...</p>
            </div>
          ) : interestedTradespeople.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 mx-auto bg-[#121E3C]/5 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-[#121E3C]/40" />
              </div>
              <h3 className="text-base font-semibold text-[#121E3C] mb-1 font-montserrat">
                No interested tradespeople yet
              </h3>
              <p className="text-sm text-gray-400 font-lato max-w-xs mx-auto">
                When tradespeople show interest in your job, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {interestedTradespeople.map((person) => (
                <div key={person.interest_id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-[#121E3C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <User size={20} className="text-[#121E3C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#121E3C] font-montserrat truncate">
                            {person.tradesperson_name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                            person.status === 'contact_shared' 
                              ? 'bg-[#34D164]/10 text-[#34D164]' 
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {person.status === 'contact_shared' ? 'Contact Shared' : 'Interested'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-lato mt-0.5">{person.tradesperson_email}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 font-lato">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-gray-400" />
                            {person.experience_years} years exp.
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            {formatDate(person.created_at)}
                          </span>
                        </div>
                        
                        {person.trade_categories?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {person.trade_categories.slice(0, 3).map((category, index) => (
                              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium">
                                {category}
                              </span>
                            ))}
                            {person.trade_categories.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px]">
                                +{person.trade_categories.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 sm:ml-4">
                      {person.status === 'interested' ? (
                        <Button
                          onClick={() => handleShareContact(person.interest_id)}
                          size="sm"
                          className="bg-[#34D164] hover:bg-[#2FBD59] text-white font-lato text-xs w-full sm:w-auto"
                        >
                          Share Contact
                        </Button>
                      ) : (
                        <Button
                          disabled
                          variant="outline"
                          size="sm"
                          className="font-lato text-xs w-full sm:w-auto"
                        >
                          <CheckCircle size={14} className="mr-1.5 text-[#34D164]" />
                          Shared
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show jobs list
  return (
    <div>
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C]">
          My Jobs
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your posted jobs and review interested tradespeople.
        </p>
      </div>

      {/* Jobs List */}
      <div>
            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-5 bg-gray-100 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-[#121E3C]/5 rounded-2xl flex items-center justify-center mb-5">
                  <Briefcase className="h-8 w-8 text-[#121E3C]/40" />
                </div>
                <h3 className="text-lg font-semibold text-[#121E3C] mb-2">
                  No jobs posted yet
                </h3>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  Once you post your first job, you'll be able to track its progress and see completed jobs here.
                </p>
                <Button 
                  onClick={() => window.location.href = '/post-job'}
                  className="bg-[#34D164] hover:bg-[#2FBD59] text-white shadow-md shadow-[#34D164]/20"
                >
                  Post Your First Job
                </Button>
              </div>
            ) : (
              <>
                {/* Jobs Summary Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#121E3C] overflow-hidden">
                    <div className="p-2 bg-[#121E3C]/10 rounded-xl w-fit mb-3">
                      <Briefcase className="h-5 w-5 text-[#121E3C]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{jobs.length}</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Total Jobs</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#34D164] overflow-hidden">
                    <div className="p-2 bg-[#34D164]/10 rounded-xl w-fit mb-3">
                      <CheckCircle className="h-5 w-5 text-[#34D164]" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{jobs.filter(job => job.status === 'completed').length}</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Completed</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-amber-400 overflow-hidden">
                    <div className="p-2 bg-amber-50 rounded-xl w-fit mb-3">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{jobs.filter(job => job.status === 'active').length}</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Active</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-purple-400 overflow-hidden">
                    <div className="p-2 bg-purple-50 rounded-xl w-fit mb-3">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{jobs.filter(job => job.status === 'in_progress').length}</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">In Progress</p>
                  </div>
                </div>

                {/* Job Status Filter Dropdown */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                  <h2 className="text-base font-semibold text-[#121E3C] font-montserrat">My Posted Jobs</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 px-4 py-2 rounded-xl border-gray-200 hover:border-[#34D164]/30 hover:bg-gray-50 transition-all font-lato text-sm">
                        <span className="text-[#121E3C]">{getJobStatusDisplayText(activeJobStatus)}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-gray-100 shadow-lg p-1">
                      {getJobStatusOptions().map((option) => (
                        <DropdownMenuItem 
                          key={option.value}
                          onClick={() => setActiveJobStatus(option.value)}
                          className={`cursor-pointer rounded-lg text-sm font-lato ${activeJobStatus === option.value ? 'bg-[#34D164]/10 text-[#34D164]' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <option.icon size={14} />
                            <span>{option.label}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Jobs List */}
                <div className="space-y-6">
                  {getFilteredJobs().length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                      <div className="w-12 h-12 mx-auto bg-[#121E3C]/5 rounded-xl flex items-center justify-center mb-3">
                        <Briefcase className="h-6 w-6 text-[#121E3C]/40" />
                      </div>
                      <h3 className="text-base font-semibold text-[#121E3C] mb-1">
                        No {getJobStatusDisplayText(activeJobStatus).toLowerCase()} found
                      </h3>
                      <p className="text-sm text-gray-400">
                        {activeJobStatus === 'all' 
                          ? "You haven't posted any jobs yet." 
                          : `You don't have any ${getJobStatusDisplayText(activeJobStatus).toLowerCase()} jobs.`}
                      </p>
                    </div>
                  ) : (
                    getFilteredJobs()
                      .filter(job => job && job.id) // Additional safety check
                      .map((job) => (
                        <div key={job.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                          <div className="p-4 sm:p-5 pb-3">
                            <div className="space-y-2">
                              {/* Title & Status Row */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <h3 className="text-sm sm:text-base font-semibold text-[#121E3C] truncate">
                                    {job.title}
                                  </h3>
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-mono">
                                    #{job.id}
                                  </span>
                                  <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap ${getStatusColor(job.status)}`}>
                                    {getJobStatusLabel(job.status)}
                                  </span>
                                </div>
                                {job.budget_min && job.budget_max && (
                                  <div className="flex-shrink-0">
                                    <div className="text-xs sm:text-sm font-bold text-[#34D164]">
                                      {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Key meta - compact row */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                <span className="flex items-center truncate">
                                  <MapPin size={12} className="mr-1 flex-shrink-0" />
                                  <span className="truncate">{job.location}</span>
                                </span>
                                <span className="flex items-center flex-shrink-0">
                                  <Calendar size={12} className="mr-1" />
                                  {formatDate(job.created_at)}
                                </span>
                                {(job.interests_count || 0) > 0 && (
                                  <span className="flex items-center text-[#34D164] font-medium flex-shrink-0">
                                    <Users size={12} className="mr-1" />
                                    {job.interests_count} interested
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                            {/* Description - truncated */}
                            {job.description && (
                              <p className="text-sm text-gray-600 font-lato line-clamp-2 mb-3">
                                {job.description}
                              </p>
                            )}

                            {/* Expandable details */}
                            {expandedJobs.has(job.id) && (
                              <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2 text-sm animate-in fade-in duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-600">
                                  {resolveTimelineDisplay(job, '') && (
                                    <div className="flex items-center">
                                      <Clock size={13} className="mr-1.5 text-gray-400" />
                                      <span className="font-lato">{resolveTimelineDisplay(job)}</span>
                                    </div>
                                  )}
                                  {job.category && (
                                    <div className="flex items-center">
                                      <Briefcase size={13} className="mr-1.5 text-gray-400" />
                                      <span className="font-lato">{job.category}</span>
                                    </div>
                                  )}
                                  {job.expires_at && (
                                    <div className="flex items-center">
                                      <TrendingUp size={13} className="mr-1.5 text-gray-400" />
                                      <span className="font-lato">Expires {formatDate(job.expires_at)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Completed Job Details - Only for completed jobs */}
                                {job.status === 'completed' && (
                                  <div className="bg-green-50 p-3 rounded-lg space-y-2 mt-2">
                                    <div className="flex items-center text-green-700">
                                      <CheckCircle size={14} className="mr-1.5" />
                                      <span className="font-semibold text-sm font-montserrat">Job Completed</span>
                                    </div>
                                    {job.completed_at && (
                                      <div className="flex items-center text-xs text-gray-600 font-lato">
                                        <Calendar size={12} className="mr-1.5" />
                                        <span>Completed on: {new Date(job.completed_at).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {job.hired_tradesperson && (
                                      <div className="flex items-center text-xs text-gray-600 font-lato">
                                        <User size={12} className="mr-1.5" />
                                        <span>Hired: {job.hired_tradesperson.name || 'Tradesperson'}</span>
                                        {job.hired_tradesperson.rating && (
                                          <div className="flex items-center ml-2">
                                            <Star size={11} className="text-yellow-400 fill-yellow-400" />
                                            <span className="ml-0.5">{job.hired_tradesperson.rating}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {job.final_cost && (
                                      <div className="flex items-center text-xs text-gray-600 font-lato">
                                        <DollarSign size={12} className="mr-1.5" />
                                        <span>Final Cost: ₦{job.final_cost.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center text-xs pt-1">
                                      {pendingReviewJobs.has(job.id) ? (
                                        <span className="flex items-center text-amber-600"><Clock size={12} className="mr-1" />Review pending</span>
                                      ) : (hasMyReview(job) || job.review_given) ? (
                                        <span className="flex items-center text-green-600"><CheckCircle size={12} className="mr-1" />Review completed</span>
                                      ) : canLeaveReview(job) ? (
                                        <span className="flex items-center text-amber-600"><Clock size={12} className="mr-1" />Review pending</span>
                                      ) : (
                                        <span className="flex items-center text-gray-500"><MessageSquare size={12} className="mr-1" />Review not available</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action Row - clean layout */}
                            <div className="pt-3 border-t flex items-center justify-between gap-2">
                              {/* Left: expand toggle */}
                              <button
                                onClick={() => toggleJobExpanded(job.id)}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-lato transition-colors"
                              >
                                {expandedJobs.has(job.id) ? (
                                  <><ChevronUp size={16} /> Less details</>
                                ) : (
                                  <><ChevronDown size={16} /> More details</>
                                )}
                              </button>

                              {/* Right: action buttons */}
                              <div className="flex items-center gap-2">
                                {/* Primary CTA */}
                                {job.status === 'completed' && canLeaveReview(job) && (
                                  <Button
                                    onClick={() => handleLeaveReview(job)}
                                    size="sm"
                                    className="font-lato text-white text-sm"
                                    style={{backgroundColor: '#34D164'}}
                                    disabled={pendingReviewJobs.has(job.id) || hasMyReview(job) || resolvingReviewJobId === job.id}
                                  >
                                    {resolvingReviewJobId === job.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
                                        Loading...
                                      </>
                                    ) : (
                                      <>
                                        <Star size={14} className="mr-1.5" />
                                        Leave Review
                                      </>
                                    )}
                                  </Button>
                                )}

                                {(job.interests_count || 0) > 0 && job.status !== 'completed' && (
                                  <Button
                                    onClick={() => handleViewInterestedTradespeople(job)}
                                    size="sm"
                                    className="text-white font-lato text-sm"
                                    style={{backgroundColor: '#34D164'}}
                                  >
                                    <Users size={14} className="mr-1.5" />
                                    View Interested ({job.interests_count})
                                  </Button>
                                )}

                                {(job.status === 'active' || job.status === 'in_progress') && 
                                 jobHiringStatuses[job.id]?.hasAnswered && (
                                  <Button
                                    onClick={() => handleCompleteJob(job.id)}
                                    size="sm"
                                    className="font-lato text-white text-sm"
                                    style={{backgroundColor: '#34D164'}}
                                    disabled={completingJobId === job.id}
                                  >
                                    {completingJobId === job.id ? 'Completing...' : (
                                      <><CheckCircle size={14} className="mr-1.5" />Complete</>
                                    )}
                                  </Button>
                                )}

                                {/* Secondary actions in overflow menu */}
                                {(job.status === 'active' || job.status === 'cancelled') && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="px-2 rounded-lg border-gray-200 hover:border-gray-300 hover:bg-gray-50">
                                        <MoreHorizontal size={16} className="text-gray-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-100 shadow-lg p-1">
                                      {job.status === 'active' && (
                                        <>
                                          <DropdownMenuItem onClick={() => handleEditJob(job)} className="cursor-pointer rounded-lg text-sm font-lato text-gray-600 hover:bg-gray-50">
                                            <Edit3 size={14} className="mr-2" /> Edit Job
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStartQuickChat(job)} className="cursor-pointer rounded-lg text-sm font-lato text-gray-600 hover:bg-gray-50">
                                            <MessageCircle size={14} className="mr-2" /> Chat
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCloseJob(job)} className="cursor-pointer rounded-lg text-sm font-lato text-red-500 hover:bg-red-50">
                                            <X size={14} className="mr-2" /> Close Job
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {job.status === 'cancelled' && (
                                        <DropdownMenuItem
                                          onClick={() => handleReopenJob(job.id)}
                                          disabled={reopeningJobId === job.id}
                                          className="cursor-pointer rounded-lg text-sm font-lato text-[#34D164] hover:bg-[#34D164]/10"
                                        >
                                          <RotateCcw size={14} className="mr-2" />
                                          {reopeningJobId === job.id ? 'Reopening...' : 'Reopen Job'}
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
      </div>

      {/* Job Edit Modal */}
      <JobEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setJobToEdit(null);
        }}
        job={jobToEdit}
        onJobUpdated={handleJobUpdated}
      />

      {/* Job Close Modal */}
      <JobCloseModal
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setJobToClose(null);
        }}
        job={jobToClose}
        onJobClosed={handleJobClosed}
      />

      {/* Review Prompt Modal */}
      {showReviewPrompt && completedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Success Header */}
            <div className="bg-[#34D164] px-6 py-8 text-center">
              <div className="relative inline-block">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mt-4 font-montserrat">Job Completed! 🎉</h2>
              <p className="text-white/80 mt-2 text-sm font-lato">
                "{completedJob.title}" has been marked as completed.
              </p>
            </div>

            <div className="p-6">
              {/* Review Prompt Card */}
              <div className="bg-[#121E3C]/5 border border-[#121E3C]/10 p-4 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#34D164]/10 rounded-lg">
                    <Star className="w-5 h-5 text-[#34D164]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#121E3C] text-sm font-montserrat">Share Your Experience</h3>
                    <p className="text-xs text-gray-500 mt-1 font-lato">
                      Help other homeowners by leaving a review for the tradesperson.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowReviewPrompt(false);
                    handleLeaveReview(completedJob);
                  }}
                  className="w-full bg-[#34D164] hover:bg-[#2FBD59] text-white font-medium py-3 rounded-xl shadow-md shadow-[#34D164]/20 font-lato"
                  disabled={resolvingReviewJobId === completedJob?.id}
                >
                  {resolvingReviewJobId === completedJob?.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Leave Review Now
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    setShowReviewPrompt(false);
                    setPendingReviewJobs(prev => new Set([...prev, completedJob.id]));
                    setCompletedJob(null);
                    toast({
                      title: "Review Reminder Set",
                      description: "We'll remind you to leave a review later.",
                    });
                  }}
                  variant="outline"
                  className="w-full font-medium py-3 rounded-xl border-gray-200 hover:bg-gray-50 font-lato"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Maybe Later
                </Button>
              </div>
              
              <button
                onClick={() => {
                  setShowReviewPrompt(false);
                  setCompletedJob(null);
                }}
                className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 font-lato transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tradesperson Selection Modal (for jobs with multiple review candidates) */}
      {showTradespersonSelectionModal && jobToReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[#121E3C] font-montserrat">Select Tradesperson</h3>
              <p className="text-sm text-gray-500 mt-1">Choose who you want to review for this completed job.</p>
            </div>
            <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
              {availableTradespeoplePorReview.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setTradespersonToReview(person);
                    setShowTradespersonSelectionModal(false);
                    setShowReviewModal(true);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-[#34D164]/50 hover:bg-[#34D164]/5 transition-colors"
                >
                  <div className="font-medium text-[#121E3C]">{person.name || 'Tradesperson'}</div>
                  {person.business_name ? (
                    <div className="text-xs text-gray-500 mt-0.5">{person.business_name}</div>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowTradespersonSelectionModal(false);
                  setAvailableTradespeoplePorReview([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && jobToReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[1000] p-3 sm:p-4 pt-4 sm:pt-6 pb-[max(5.5rem,env(safe-area-inset-bottom))]">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain">
            <ReviewForm
              jobId={jobToReview.id}
              revieweeId={tradespersonToReview?.id || 'placeholder-tradesperson-id'}
              revieweeName={tradespersonToReview?.name || 'Selected Tradesperson'}
              jobTitle={jobToReview.title}
              loading={submittingReview}
              onSubmit={handleSubmitReview}
              onCancel={() => {
                setShowReviewModal(false);
                setJobToReview(null);
                setTradespersonToReview(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobsPage;
