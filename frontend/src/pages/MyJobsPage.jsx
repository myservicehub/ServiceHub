import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QuotesList from '../components/quotes/QuotesList';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  MessageSquare,
  Eye,
  Clock,
  Briefcase,
  TrendingUp
} from 'lucide-react';
import { jobsAPI, quotesAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const MyJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [quoteSummary, setQuoteSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const { user, isAuthenticated, isHomeowner } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated() || !isHomeowner()) {
      return;
    }
    loadMyJobs();
  }, []);

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

  const loadJobQuotes = async (jobId) => {
    try {
      setQuotesLoading(true);
      const [quotesResponse, summaryResponse] = await Promise.all([
        quotesAPI.getJobQuotes(jobId),
        quotesAPI.getQuoteSummary(jobId)
      ]);
      
      setQuotes(quotesResponse.quotes || []);
      setQuoteSummary(summaryResponse);
    } catch (error) {
      console.error('Failed to load quotes:', error);
      toast({
        title: "Failed to load quotes",
        description: "There was an error loading quotes for this job.",
        variant: "destructive",
      });
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleViewQuotes = (job) => {
    setSelectedJob(job);
    loadJobQuotes(job.id);
  };

  const handleBackToJobs = () => {
    setSelectedJob(null);
    setQuotes([]);
    setQuoteSummary(null);
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

  // Show quotes view
  if (selectedJob) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Back button and job info */}
            <div className="mb-6">
              <Button
                onClick={handleBackToJobs}
                variant="outline"
                className="mb-4 font-lato"
              >
                ← Back to My Jobs
              </Button>
              
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                        {selectedJob.title}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 font-lato">
                        <span className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {selectedJob.location}
                        </span>
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          Posted {formatDate(selectedJob.created_at)}
                        </span>
                        <Badge className={getStatusColor(selectedJob.status)}>
                          {selectedJob.status}
                        </Badge>
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

              {/* Quote Summary */}
              {quoteSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                        {quoteSummary.total_quotes}
                      </div>
                      <div className="text-sm text-gray-600 font-lato">Total Quotes</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold font-montserrat text-yellow-600">
                        {quoteSummary.pending_quotes}
                      </div>
                      <div className="text-sm text-gray-600 font-lato">Pending</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold font-montserrat text-green-600">
                        {quoteSummary.accepted_quotes}
                      </div>
                      <div className="text-sm text-gray-600 font-lato">Accepted</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-lg font-bold font-montserrat" style={{color: '#121E3C'}}>
                        {quoteSummary.average_price > 0 ? formatCurrency(quoteSummary.average_price) : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 font-lato">Avg. Quote</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Quotes List */}
            {quotesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
                <p className="text-gray-600 font-lato">Loading quotes...</p>
              </div>
            ) : (
              <QuotesList 
                jobId={selectedJob.id} 
                quotes={quotes} 
                onQuoteUpdate={() => loadJobQuotes(selectedJob.id)}
              />
            )}
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
              Manage your posted jobs and review quotes from tradespeople.
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All Jobs</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                {['all', 'active', 'in_progress', 'completed'].map(status => (
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
                                    <MessageSquare size={14} className="mr-1" />
                                    {job.quotes_count || 0} quotes received
                                  </span>
                                </div>
                              </div>

                              {/* Budget Display */}
                              <div className="text-right">
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
                                {job.quotes_count > 0 
                                  ? `${job.quotes_count} quote${job.quotes_count > 1 ? 's' : ''} received`
                                  : 'No quotes yet'
                                }
                              </div>
                              
                              <Button
                                onClick={() => handleViewQuotes(job)}
                                className="text-white font-lato"
                                style={{backgroundColor: '#2F8140'}}
                              >
                                <Eye size={16} className="mr-2" />
                                View Quotes
                              </Button>
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
    </div>
  );
};

export default MyJobsPage;