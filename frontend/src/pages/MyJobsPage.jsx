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
  User, DollarSign, MessageSquare, ChevronDown, MessageCircle 
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
  const [jobHiringStatuses, setJobHiringStatuses] = useState({});
  const [pendingReviewJobs, setPendingReviewJobs] = useState(new Set());
  const REVIEW_PENDING_MS = 1500; // brief pending duration before marking completed

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
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
    navigate(`/job/${job.id}/interested-tradespeople`);
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
      navigate(`/job/${job.id}/interested-tradespeople`);
      
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
    setJobToReview(job);
    
    if (tradesperson) {
      // If tradesperson is explicitly provided, use it
      setTradespersonToReview(tradesperson);
      setShowReviewModal(true);
    } else {
      // If no tradesperson provided, try to get hired tradespeople from hiring status
      try {
        const hiredTradespeople = await getHiredTradespeopleForJob(job.id);
        
        if (hiredTradespeople.length === 1) {
          // If only one hired tradesperson, review them directly
          setTradespersonToReview(hiredTradespeople[0]);
          setShowReviewModal(true);
        } else if (hiredTradespeople.length > 1) {
          // If multiple hired tradespeople, show selection modal
          setAvailableTradespeoplePorReview(hiredTradespeople);
          setShowTradespersonSelectionModal(true);
        } else {
          // If no hired tradespeople found, show error
          toast({
            title: "Cannot Leave Review",
            description: "No hired tradespeople found for this job. Please use the chat to indicate who you hired first.",
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
      
      const reviewPayload = {
        job_id: jobToReview.id,
        reviewee_id: tradespersonToReview?.id || 'placeholder-tradesperson-id', // This would come from selected tradesperson
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        category_ratings: reviewData.categoryRatings,
        photos: reviewData.photos || [],
        would_recommend: reviewData.wouldRecommend
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  if (user?.role !== 'homeowner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  // Show interested tradespeople modal
  if (showInterestedModal && selectedJob) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={handleCloseInterestedModal}
              className="mb-6 font-lato"
            >
              ← Back to My Jobs
            </Button>

            {/* Job Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                        {selectedJob.title}
                      </CardTitle>
                      <Badge className={getStatusColor(selectedJob.status)}>
                        {getJobStatusLabel(selectedJob.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato mb-2">
                      <span className="flex items-center">
                        <MapPin size={14} className="mr-1" />
                        {selectedJob.location}
                      </span>
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        Posted {formatDate(selectedJob.created_at)}
                      </span>
                    </div>
                  </div>
                  {selectedJob.budget_min && selectedJob.budget_max && (
                    <div className="text-right">
                      <div className="text-xl font-bold font-montserrat" style={{color: '#34D164'}}>
                        {formatCurrency(selectedJob.budget_min)} - {formatCurrency(selectedJob.budget_max)}
                      </div>
                      <div className="text-sm text-gray-500 font-lato">Your Budget</div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Interested Tradespeople */}
            <div className="mb-6">
              <h2 className="text-xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Interested Tradespeople ({interestedTradespeople.length})
              </h2>
              
              {interestsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#34D164'}}></div>
                  <p className="text-gray-600 font-lato">Loading interested tradespeople...</p>
                </div>
              ) : interestedTradespeople.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
                      No interested tradespeople yet
                    </h3>
                    <p className="text-gray-600 font-lato">
                      When tradespeople show interest in your job, they'll appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {interestedTradespeople.map((person) => (
                    <Card key={person.interest_id} className="hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <Users size={20} className="text-gray-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold font-montserrat" style={{color: '#121E3C'}}>
                                  {person.tradesperson_name}
                                </h3>
                                <p className="text-sm text-gray-600 font-lato">{person.tradesperson_email}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700 font-lato">Experience:</p>
                                <p className="text-sm text-gray-600">{person.experience_years} years</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 font-lato">Specialties:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {person.trade_categories?.map((category, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Interested {formatDate(person.created_at)}</span>
                              <Badge className={person.status === 'contact_shared' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                {person.status === 'contact_shared' ? 'Contact Shared' : 'Interested'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="ml-6">
                            {person.status === 'interested' ? (
                              <Button
                                onClick={() => handleShareContact(person.interest_id)}
                                className="text-white font-lato"
                                style={{backgroundColor: '#34D164'}}
                              >
                                Share Contact Details
                              </Button>
                            ) : (
                              <Button
                                disabled
                                variant="outline"
                                className="font-lato"
                              >
                                Contact Shared ✓
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  // Show jobs list
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              My Jobs
            </h1>
            <p className="text-lg text-gray-600 font-lato">
              Manage your posted jobs and review interested tradespeople.
            </p>
          </div>
        </div>
      </section>

      {/* Jobs List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                  No jobs posted yet
                </h3>
                <p className="text-gray-600 font-lato mb-6 max-w-md mx-auto">
                  Once you post your first job, you'll be able to track its progress and see completed jobs here.
                </p>
                
                {/* Development/Testing Button */}
                <div className="space-y-4">
                  <Button 
                    onClick={() => window.location.href = '/post-job'}
                    className="bg-[#34D164] hover:bg-[#245a32] text-white font-montserrat"
                  >
                    Post Your First Job
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Jobs Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 font-lato">Total Jobs</p>
                          <p className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                            {jobs.length}
                          </p>
                        </div>
                        <Briefcase className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 font-lato">Completed</p>
                          <p className="text-2xl font-bold font-montserrat text-green-600">
                            {jobs.filter(job => job.status === 'completed').length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 font-lato">Active</p>
                          <p className="text-2xl font-bold font-montserrat text-blue-600">
                            {jobs.filter(job => job.status === 'active').length}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 font-lato">In Progress</p>
                          <p className="text-2xl font-bold font-montserrat text-orange-600">
                            {jobs.filter(job => job.status === 'in_progress').length}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Job Status Filter Dropdown */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold font-montserrat text-gray-900">My Posted Jobs</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center space-x-2 px-4 py-2">
                        <span>{getJobStatusDisplayText(activeJobStatus)}</span>
                        <ChevronDown size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {getJobStatusOptions().map((option) => (
                        <DropdownMenuItem 
                          key={option.value}
                          onClick={() => setActiveJobStatus(option.value)}
                          className={`cursor-pointer ${activeJobStatus === option.value ? 'bg-gray-100' : ''}`}
                        >
                          <div className="flex items-center space-x-2">
                            <option.icon size={16} />
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
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          No {getJobStatusDisplayText(activeJobStatus).toLowerCase()} found
                        </h3>
                        <p className="text-gray-500">
                          {activeJobStatus === 'all' 
                            ? "You haven't posted any jobs yet." 
                            : `You don't have any ${getJobStatusDisplayText(activeJobStatus).toLowerCase()} jobs.`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    getFilteredJobs()
                      .filter(job => job && job.id) // Additional safety check
                      .map((job) => (
                        <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                          <CardHeader>
                            <div className="space-y-3">
                              {/* Title & Status */}
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                                  {job.title}
                                </CardTitle>
                                <Badge className={getStatusColor(job.status)}>
                                  {getJobStatusLabel(job.status)}
                                </Badge>
                              </div>

                              {/* Meta info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 font-lato">
                                <div className="flex items-center">
                                  <MapPin size={14} className="mr-1" />
                                  {job.location}
                                </div>
                                <div className="flex items-center sm:justify-end">
                                  <Calendar size={14} className="mr-1" />
                                  <span>Posted {formatDate(job.created_at)}</span>
                                </div>
                                <div className="flex items-center">
                                  <Heart size={14} className="mr-1" />
                                  <span>{job.interests_count || 0} interested</span>
                                </div>
                                <div className="flex items-center sm:justify-end">
                                  <span>Job ID: {job.id}</span>
                                </div>

                                {/* Budget (separate row for mobile, aligned right on larger screens) */}
                                <div className="sm:col-span-2 flex items-center sm:justify-between">
                                  {job.budget_min && job.budget_max ? (
                                    <div className="flex items-baseline gap-2">
                                      <div className="text-lg font-bold font-montserrat" style={{color: '#34D164'}}>
                                        {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                                      </div>
                                      <div className="text-sm text-gray-500 font-lato">Budget Range</div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 font-lato">Budget not specified</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent>
                            {/* Job Description */}
                            {job.description && (
                              <div className="mb-4">
                                <p className="text-gray-700 font-lato line-clamp-2">
                                  {job.description}
                                </p>
                              </div>
                            )}

                            {/* Job Details */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Clock size={14} className="mr-2" />
                                <span className="font-lato">Timeline: {job.timeline}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Calendar size={14} className="mr-2" />
                                <span className="font-lato">Category: {job.category}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <TrendingUp size={14} className="mr-2" />
                                <span className="font-lato">
                                  Expires: {formatDate(job.expires_at)}
                                </span>
                              </div>
                            </div>

                            {/* Action Area */}
                            <div className="pt-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-sm text-gray-500 font-lato">
                                {job.interests_count > 0 
                                  ? `${job.interests_count} tradesperson${job.interests_count > 1 ? 's' : ''} interested`
                                  : 'No interested tradespeople yet'
                                }
                              </div>

                              {/* View Interested Button */}
                              <Button
                                onClick={() => handleViewInterestedTradespeople(job)}
                                className="w-full sm:w-auto text-white font-lato"
                                style={{backgroundColor: '#34D164'}}
                                disabled={!job.interests_count || job.interests_count === 0}
                              >
                                <Users size={16} className="mr-2" />
                                View Interested ({job.interests_count || 0})
                              </Button>
                              
                              {/* Edit Button - Only for active jobs */}
                              {job.status === 'active' && (
                                <Button
                                  onClick={() => handleEditJob(job)}
                                  variant="outline"
                                  className="font-lato"
                                >
                                  <Edit3 size={16} className="mr-2" />
                                  Edit
                                </Button>
                              )}

                                {/* Completed Job Details - Only for completed jobs */}
                                {job.status === 'completed' && (
                                  <div className="bg-green-50 p-4 rounded-lg space-y-3">
                                    <div className="flex items-center text-green-700">
                                      <CheckCircle size={16} className="mr-2" />
                                      <span className="font-semibold font-montserrat">Job Completed Successfully</span>
                                    </div>
                                    
                                    {job.completed_at && (
                                      <div className="flex items-center text-sm text-gray-600 font-lato">
                                        <Calendar size={14} className="mr-2" />
                                        <span>Completed on: {new Date(job.completed_at).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    
                                    {job.hired_tradesperson && (
                                      <div className="flex items-center text-sm text-gray-600 font-lato">
                                        <User size={14} className="mr-2" />
                                        <span>Hired: {job.hired_tradesperson.name || 'Tradesperson'}</span>
                                        {job.hired_tradesperson.rating && (
                                          <div className="flex items-center ml-2">
                                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                            <span className="ml-1">{job.hired_tradesperson.rating}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {job.final_cost && (
                                      <div className="flex items-center text-sm text-gray-600 font-lato">
                                        <DollarSign size={14} className="mr-2" />
                                        <span>Final Cost: ₦{job.final_cost.toLocaleString()}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                                      <div className="flex items-center text-sm">
                                        {pendingReviewJobs.has(job.id) ? (
                                          <div className="flex items-center text-amber-600">
                                            <Clock size={14} className="mr-1" />
                                            <span>Review pending</span>
                                          </div>
                                        ) : (hasMyReview(job) || job.review_given) ? (
                                          <div className="flex items-center text-green-600">
                                            <CheckCircle size={14} className="mr-1" />
                                            <span>Review completed</span>
                                          </div>
                                        ) : canLeaveReview(job) ? (
                                          <div className="flex items-center text-amber-600">
                                            <Clock size={14} className="mr-1" />
                                            <span>Review pending</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center text-gray-500">
                                            <MessageSquare size={14} className="mr-1" />
                                            <span>Review not available</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {job.hired_tradesperson && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs font-lato"
                                          onClick={() => {/* Handle view tradesperson profile */}}
                                        >
                                          View Profile
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Leave Review Button - For completed jobs (disabled when pending or already reviewed) */}
                                {job.status === 'completed' && (
                                  <div className="flex flex-col space-y-2">
                                    <Button
                                      onClick={() => handleLeaveReview(job)}
                                      className="font-lato text-white"
                                      style={{backgroundColor: '#34D164'}}
                                      disabled={pendingReviewJobs.has(job.id) || hasMyReview(job) || !canLeaveReview(job)}
                                    >
                                      <Star size={16} className="mr-2" />
                                      Leave Review
                                    </Button>
                                    {pendingReviewJobs.has(job.id) && (
                                      <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                        <Clock size={12} className="mr-1" />
                                        Review pending
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Mark as Completed Button - Only show after hiring status answered */}
                                {(job.status === 'active' || job.status === 'in_progress') && 
                                 jobHiringStatuses[job.id]?.hasAnswered && (
                                  <Button
                                    onClick={() => handleCompleteJob(job.id)}
                                    className="font-lato text-white"
                                    style={{backgroundColor: '#34D164'}}
                                    disabled={completingJobId === job.id}
                                  >
                                    {completingJobId === job.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Completing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Mark as Completed
                                      </>
                                    )}
                                  </Button>
                                )}

                                {/* Close Job Button - Only for active jobs */}
                                {job.status === 'active' && (
                                  <Button
                                    onClick={() => handleCloseJob(job)}
                                    variant="outline"
                                    className="font-lato text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <X size={16} className="mr-2" />
                                    Close Job
                                  </Button>
                                )}

                                {/* Reopen Button - Only for cancelled jobs */}
                                {job.status === 'cancelled' && (
                                  <Button
                                    onClick={() => handleReopenJob(job.id)}
                                    variant="outline"
                                    className="font-lato text-green-600 border-green-200 hover:bg-green-50"
                                    disabled={reopeningJobId === job.id}
                                  >
                                    {reopeningJobId === job.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                        Reopening...
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw size={16} className="mr-2" />
                                        Reopen Job
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
      
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="relative">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto animate-ping">
                    <CheckCircle className="w-16 h-16 text-green-300 opacity-75" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Job Completed! 🎉</h2>
                <p className="text-gray-600 mb-6">
                  Great! Your job "<strong>{completedJob.title}</strong>" has been marked as completed.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <Star className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-900 mb-2">Leave a Review</h3>
                  <p className="text-sm text-blue-700">
                    Help other homeowners by sharing your experience. Your review helps build trust in our community.
                  </p>
                </div>
                <p className="text-gray-600 mb-6">
                  Would you like to leave a review now, or save it for later?
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button
                  onClick={() => {
                    setShowReviewPrompt(false);
                    handleLeaveReview(completedJob);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                >
                  <Star className="w-5 h-5 mr-2" />
                  Leave Review Now
                </Button>
                
                <Button
                  onClick={() => {
                    setShowReviewPrompt(false);
                    // Add to pending review jobs
                    setPendingReviewJobs(prev => new Set([...prev, completedJob.id]));
                    setCompletedJob(null);
                    toast({
                      title: "Review Reminder Set",
                      description: "We'll remind you to leave a review later. You can also find completed jobs in the 'Completed' tab.",
                    });
                  }}
                  variant="outline"
                  className="w-full font-semibold py-3"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Maybe Later
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowReviewPrompt(false);
                    setCompletedJob(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && jobToReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
