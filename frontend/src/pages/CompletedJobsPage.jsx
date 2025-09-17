import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  Clock,
  Briefcase,
  TrendingUp,
  Users,
  Star,
  Eye,
  User,
  Building,
  Trophy,
  Filter,
  SortDesc,
  ArrowUpDown
} from 'lucide-react';
import { interestsAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const CompletedJobsPage = () => {
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('completion_date');
  const [filterBy, setFilterBy] = useState('all');
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalEarnings: 0,
    avgRating: 0,
    thisMonth: 0
  });

  const { user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to view your completed jobs.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (!isTradesperson()) {
      toast({
        title: "Access Denied",
        description: "This page is only available for tradespeople.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    loadCompletedJobs();
  }, [sortBy, filterBy]);

  const loadCompletedJobs = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use the interests API and filter for completed jobs
      // In a real implementation, you'd have a dedicated completed jobs API
      const response = await interestsAPI.getMyInterests();
      
      // Filter for completed jobs only
      const completed = response.interests?.filter(interest => 
        interest.job_status === 'completed' || interest.status === 'completed'
      ) || [];
      
      // Sort the jobs based on sortBy
      const sortedJobs = sortCompletedJobs(completed, sortBy);
      
      // Apply filtering
      const filteredJobs = filterCompletedJobs(sortedJobs, filterBy);
      
      setCompletedJobs(filteredJobs);
      
      // Calculate stats
      calculateStats(completed);
      
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load completed jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sortCompletedJobs = (jobs, sortBy) => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'completion_date':
          return new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at);
        case 'earnings':
          return (b.job_budget_max || 0) - (a.job_budget_max || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'job_title':
          return (a.job_title || '').localeCompare(b.job_title || '');
        default:
          return 0;
      }
    });
  };

  const filterCompletedJobs = (jobs, filterBy) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    switch (filterBy) {
      case 'this_month':
        return jobs.filter(job => new Date(job.completed_at || job.updated_at) >= startOfMonth);
      case 'this_quarter':
        return jobs.filter(job => new Date(job.completed_at || job.updated_at) >= startOfQuarter);
      case 'this_year':
        return jobs.filter(job => new Date(job.completed_at || job.updated_at) >= startOfYear);
      case 'high_value':
        return jobs.filter(job => (job.job_budget_max || 0) >= 100000);
      default:
        return jobs;
    }
  };

  const calculateStats = (jobs) => {
    const totalCompleted = jobs.length;
    const totalEarnings = jobs.reduce((sum, job) => sum + (job.job_budget_max || 0), 0);
    const avgRating = jobs.length > 0 
      ? jobs.reduce((sum, job) => sum + (job.rating || 0), 0) / jobs.length 
      : 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = jobs.filter(job => 
      new Date(job.completed_at || job.updated_at) >= startOfMonth
    ).length;

    setStats({
      totalCompleted,
      totalEarnings,
      avgRating: Math.round(avgRating * 10) / 10,
      thisMonth
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₦0';
    return `₦${amount.toLocaleString()}`;
  };

  const getStatusBadge = (job) => {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle size={12} className="mr-1" />
        Completed
      </Badge>
    );
  };

  const getRatingStars = (rating) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm font-medium ml-1">{rating}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your completed jobs...</p>
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Completed Jobs</h1>
          <p className="text-gray-600">View and manage your completed projects</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCompleted}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgRating || 'N/A'}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="high_value">High Value (₦100k+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completion_date">Completion Date</SelectItem>
                      <SelectItem value="earnings">Earnings</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="job_title">Job Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Showing {completedJobs.length} completed jobs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Your Completed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedJobs.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed jobs found</h3>
                <p className="text-gray-600 mb-4">
                  {filterBy === 'all' 
                    ? "You haven't completed any jobs yet. Keep working on your current projects!"
                    : "No completed jobs found for the selected filter. Try adjusting your filter criteria."
                  }
                </p>
                <Button 
                  onClick={() => navigate('/my-interests')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View My Interests
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {completedJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                      {/* Job Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {job.job_title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {job.job_category}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.job_location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Completed {formatDate(job.completed_at || job.updated_at)}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(job)}
                        </div>

                        {/* Job Description */}
                        {job.job_description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {job.job_description}
                          </p>
                        )}

                        {/* Homeowner Info */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <User className="w-4 h-4" />
                          <span>Homeowner: {job.homeowner_name}</span>
                        </div>

                        {/* Job Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>Budget: {formatCurrency(job.job_budget_min)} - {formatCurrency(job.job_budget_max)}</span>
                          </div>
                          {job.rating && (
                            <div className="flex items-center gap-1">
                              <span>Rating:</span> 
                              {getRatingStars(job.rating)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to job details or review
                            toast({
                              title: "Job Details",
                              description: "Job details view coming soon.",
                            });
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default CompletedJobsPage;