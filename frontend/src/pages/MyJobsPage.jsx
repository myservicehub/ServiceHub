import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Calendar, MapPin, Clock, Users, Heart, TrendingUp, 
  Edit3, X, RotateCcw, AlertCircle, CheckCircle, Star 
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import JobEditModal from '../components/JobEditModal';
import JobCloseModal from '../components/JobCloseModal';
import ReviewForm from '../components/reviews/ReviewForm';
import { jobsAPI } from '../api/jobs';
import { interestsAPI } from '../api/interests';
import { reviewsAPI } from '../api/reviews';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

const MyJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [interestedTradespeople, setInterestedTradespeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [jobToClose, setJobToClose] = useState(null);
  const [reopeningJobId, setReopeningJobId] = useState(null);
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [jobToReview, setJobToReview] = useState(null);
  const [tradespersonToReview, setTradespersonToReview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [jobReviews, setJobReviews] = useState({});

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'homeowner') {
      loadMyJobs();
    }
  }, [isAuthenticated, user]);

  const loadMyJobs = async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getMyJobs({ limit: 50 });
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast({
        title: "Failed to load jobs",
        description: "There was an error loading your jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    setJobToEdit(job);
    setShowEditModal(true);
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

  // Review handling functions
  const handleLeaveReview = (job, tradesperson = null) => {
    setJobToReview(job);
    setTradespersonToReview(tradesperson);
    setShowReviewModal(true);
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
    } catch (error) {
      console.error('Failed to load job reviews:', error);
    }
  };

  const canLeaveReview = (job) => {
    // Can leave review if job is completed and user hasn't already reviewed
    return job.status === 'completed' && !jobReviews[job.id]?.some(review => 
      review.reviewer_id === currentUser?.id
    );
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
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated()) {
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

  if (!isHomeowner()) {
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
                        {selectedJob.status}
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
                      <div className="text-xl font-bold font-montserrat" style={{color: '#2F8140'}}>
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
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
                                style={{backgroundColor: '#2F8140'}}
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
              <Card>
                <CardContent className="text-center py-16">
                  <Briefcase size={64} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold font-montserrat text-gray-900 mb-2">
                    No jobs posted yet
                  </h3>
                  <p className="text-gray-600 font-lato mb-6">
                    Start by posting your first job to connect with qualified tradespeople.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/post-job'}
                    className="text-white font-lato"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All Jobs</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>

                {['all', 'active', 'in_progress', 'completed', 'cancelled'].map(status => (
                  <TabsContent key={status} value={status} className="space-y-6">
                    {jobs
                      .filter(job => status === 'all' || job.status === status)
                      .map((job) => (
                        <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <CardTitle className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                                    {job.title}
                                  </CardTitle>
                                  <Badge className={getStatusColor(job.status)}>
                                    {job.status}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato">
                                  <span className="flex items-center">
                                    <MapPin size={14} className="mr-1" />
                                    {job.location}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar size={14} className="mr-1" />
                                    Posted {formatDate(job.created_at)}
                                  </span>
                                  <span className="flex items-center">
                                    <Heart size={14} className="mr-1" />
                                    {job.interests_count || 0} interested
                                  </span>
                                </div>
                              </div>

                              {/* Budget & Access Fee Display */}
                              <div className="text-right space-y-2">
                                {job.budget_min && job.budget_max ? (
                                  <div>
                                    <div className="text-lg font-bold font-montserrat" style={{color: '#2F8140'}}>
                                      {formatCurrency(job.budget_min)} - {formatCurrency(job.budget_max)}
                                    </div>
                                    <div className="text-sm text-gray-500 font-lato">Budget Range</div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 font-lato">Budget not specified</div>
                                )}
                                
                                {/* Access Fee - Hidden from homeowners, only shown to tradespeople */}
                                {/* Note: This section is intentionally removed from homeowner view */}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent>
                            {/* Job Description */}
                            <div className="mb-4">
                              <p className="text-gray-700 font-lato line-clamp-2">
                                {job.description}
                              </p>
                            </div>

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

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t">
                              <div className="text-sm text-gray-500 font-lato">
                                {job.interests_count > 0 
                                  ? `${job.interests_count} tradesperson${job.interests_count > 1 ? 's' : ''} interested`
                                  : 'No interested tradespeople yet'
                                }
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {/* View Interested Button */}
                                <Button
                                  onClick={() => handleViewInterestedTradespeople(job)}
                                  className="text-white font-lato"
                                  style={{backgroundColor: '#2F8140'}}
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

                                {/* Leave Review Button - Only for completed jobs */}
                                {job.status === 'completed' && canLeaveReview(job) && (
                                  <Button
                                    onClick={() => handleLeaveReview(job)}
                                    className="font-lato text-white"
                                    style={{backgroundColor: '#2F8140'}}
                                  >
                                    <Star size={16} className="mr-2" />
                                    Leave Review
                                  </Button>
                                )}

                                {/* Close/Reopen Button */}
                                {job.status === 'active' ? (
                                  <Button
                                    onClick={() => handleCloseJob(job)}
                                    variant="outline"
                                    className="font-lato text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <X size={16} className="mr-2" />
                                    Close Job
                                  </Button>
                                ) : job.status === 'cancelled' ? (
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
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </TabsContent>
                ))}
              </Tabs>
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