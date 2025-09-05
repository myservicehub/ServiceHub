import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Search,
  Filter,
  Briefcase,
  HandHeart,
  Heart
} from 'lucide-react';
import { jobsAPI, interestsAPI } from '../api/services';
import { walletAPI } from '../api/wallet';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const BrowseJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showingInterest, setShowingInterest] = useState(null);
  const [pagination, setPagination] = useState(null);

  const { user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated() || !isTradesperson()) {
      return;
    }
    loadAvailableJobs();
  }, []);

  const loadAvailableJobs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await jobsAPI.getJobs({ page, limit: 10 });
      setJobs(response.jobs || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast({
        title: "Failed to load jobs",
        description: "There was an error loading available jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowInterest = async (job) => {
    if (!isAuthenticated()) {
      toast({
        title: "Sign in required",
        description: "Please sign in to show interest in jobs.",
        variant: "destructive",
      });
      return;
    }

    if (!isTradesperson()) {
      toast({
        title: "Tradesperson account required",
        description: "Only tradespeople can show interest in jobs.",
        variant: "destructive",
      });
      return;
    }

    try {
      setShowingInterest(job.id);
      await interestsAPI.showInterest(job.id);
      
      toast({
        title: "Interest registered!",
        description: "The homeowner will review your profile and may share their contact details.",
      });

    } catch (error) {
      console.error('Failed to show interest:', error);
      toast({
        title: "Failed to show interest",
        description: error.response?.data?.detail || "There was an error showing interest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowingInterest(null);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
              Please sign in to browse available jobs and submit quotes.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="text-white font-lato"
              style={{backgroundColor: '#2F8140'}}
            >
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isTradesperson()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Tradesperson Access Only
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              This page is only available to registered tradespeople.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Page Header */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Available Jobs
            </h1>
            <p className="text-lg text-gray-600 font-lato">
              Browse jobs that match your skills and show your interest to homeowners.
            </p>
            
            {/* User skills display */}
            {user?.trade_categories && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 font-lato mb-2">Your Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {user.trade_categories.map((category, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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
                    No available jobs right now
                  </h3>
                  <p className="text-gray-600 font-lato mb-6">
                    {user?.trade_categories?.length 
                      ? "There are no jobs matching your skills at the moment. Check back later!"
                      : "Complete your profile with your trade categories to see relevant jobs."
                    }
                  </p>
                  <Button 
                    onClick={() => loadAvailableJobs()}
                    className="text-white font-lato"
                    style={{backgroundColor: '#2F8140'}}
                  >
                    Refresh Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {jobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                              {job.title}
                            </CardTitle>
                            <Badge className="bg-blue-100 text-blue-800">
                              {job.category}
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
                        <p className="text-gray-700 font-lato line-clamp-3">
                          {job.description}
                        </p>
                      </div>

                      {/* Job Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Clock size={14} className="mr-2" />
                          <span className="font-lato">Timeline: {job.timeline || 'Flexible'}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <User size={14} className="mr-2" />
                          <span className="font-lato">By: {job.homeowner?.name}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar size={14} className="mr-2" />
                          <span className="font-lato">
                            Expires: {formatDate(job.expires_at)}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Heart size={14} className="mr-2" />
                          <span className="font-lato">{job.interests_count || 0} interested</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-gray-500 font-lato">
                          Match: {user?.trade_categories?.includes(job.category) ? '✅ Your skill' : '⚠️ Different category'}
                        </div>
                        
                        <Button
                          onClick={() => handleShowInterest(job)}
                          disabled={showingInterest === job.id}
                          className="text-white font-lato"
                          style={{backgroundColor: '#2F8140'}}
                        >
                          <HandHeart size={16} className="mr-2" />
                          {showingInterest === job.id ? 'Showing Interest...' : 'Show Interest'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center space-x-2 mt-8">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={page === pagination.page ? "default" : "outline"}
                        onClick={() => loadAvailableJobs(page)}
                        className="font-lato"
                        style={page === pagination.page ? {backgroundColor: '#2F8140', color: 'white'} : {}}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BrowseJobsPage;