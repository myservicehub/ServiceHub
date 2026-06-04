import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonLayout from '../layouts/TradespersonLayout';
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
import { reviewsAPI } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

const CompletedJobsPage = () => {
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('completion_date');
  const [filterBy, setFilterBy] = useState('all');
  const [stats, setStats] = useState({
    totalCompleted: 0,
    avgRating: 0,
    thisMonth: 0
  });

  const { user, isAuthenticated, isTradesperson } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're inside the dashboard route
  const isInDashboard = location.pathname.startsWith('/trades');

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
      
      // Use the dedicated completed jobs endpoint and review summary
      const [completedJobsData, reviewSummary] = await Promise.all([
        interestsAPI.getCompletedJobs(),
        user?.id ? reviewsAPI.getReviewSummary(user.id).catch(() => null) : null,
      ]);
      
      // Sort the jobs based on sortBy
      const sortedJobs = sortCompletedJobs(completedJobsData, sortBy);
      
      // Apply filtering
      const filteredJobs = filterCompletedJobs(sortedJobs, filterBy);
      
      setCompletedJobs(filteredJobs);
      
      // Calculate stats
      calculateStats(completedJobsData, reviewSummary);
      
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

  const calculateStats = (jobs, reviewSummary) => {
    const totalCompleted = jobs.length;
    const avgRating = reviewSummary?.average_rating || 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = jobs.filter(job => 
      new Date(job.completed_at || job.updated_at) >= startOfMonth
    ).length;

    setStats({
      totalCompleted,
      avgRating: Math.round(avgRating * 10) / 10,
      thisMonth
    });
  };

  const sortJobs = (jobs, sortBy) => {
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
    const loadingContent = (
      <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your completed jobs...</p>
            </div>
          </div>
        </div>
      </div>
    );
    
    if (isInDashboard) return loadingContent;
    return <TradespersonLayout>{loadingContent}</TradespersonLayout>;
  }

  const pageContent = (
    <div className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
      
      <div className={isInDashboard ? "" : "container mx-auto px-4 py-8"}>
        {/* Header - Simplified */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-[#121E3C]">
              Completed Jobs
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {completedJobs.length} project{completedJobs.length !== 1 ? 's' : ''} completed
            </p>
          </div>
        </div>

        {/* Stats Row - Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-green-200 p-5 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-[#121E3C] mb-1">{stats.totalCompleted}</p>
            <p className="text-sm text-gray-500">Total Completed</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 p-5 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-[#121E3C] mb-1">{stats.avgRating ? `${stats.avgRating}★` : '-'}</p>
            <p className="text-sm text-gray-500">Average Rating</p>
          </div>
          <div className="bg-white rounded-2xl border border-purple-200 p-5 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-[#121E3C] mb-1">{stats.thisMonth}</p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
        </div>

        {/* Filters - Compact */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-[140px] text-sm border-gray-200 rounded-xl">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="high_value">High Value</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] text-sm border-gray-200 rounded-xl">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion_date">Date</SelectItem>
                  <SelectItem value="earnings">Earnings</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="job_title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-gray-500">{completedJobs.length} jobs</span>
          </div>
        </div>

        {/* Jobs List */}
        {completedJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No completed jobs</h3>
            <p className="text-gray-500 text-sm mb-4">
              {filterBy === 'all' 
                ? "Complete your first job to see it here."
                : "No jobs match this filter."
              }
            </p>
            <Button 
              onClick={() => navigate('/trades/interests')}
              className="bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl"
            >
              View My Interests
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortJobs(filterCompletedJobs(completedJobs, filterBy), sortBy).map((job, index) => (
              <div key={job.id || index} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-green-200 transition-all duration-300">
                {/* Card Header */}
                <div className="relative h-24 bg-gradient-to-br from-green-500 to-green-600 p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                      <CheckCircle size={12} className="text-white" />
                      <span className="text-xs text-white font-medium">Completed</span>
                    </div>
                    {job.rating && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-400 rounded-full">
                        <Star size={10} className="text-white fill-white" />
                        <span className="text-xs text-white font-bold">{job.rating}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-lg leading-tight line-clamp-1">
                    {job.job_title || 'Completed Job'}
                  </h3>
                </div>
                
                {/* Card Body */}
                <div className="p-4">
                  {/* Location */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <MapPin size={14} className="text-gray-500" />
                    </div>
                    <p className="text-sm text-[#121E3C] font-medium truncate flex-1">{job.job_location || 'Location'}</p>
                  </div>
                  
                  {/* Homeowner */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <User size={14} className="text-gray-500" />
                    </div>
                    <span className="text-sm text-[#121E3C] font-medium truncate flex-1">{job.homeowner_name || 'Homeowner'}</span>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(job.completed_at || job.updated_at)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg border-gray-200 hover:border-[#34D164] hover:text-[#34D164]"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trades/browsejobs?job=${job.job_id || job.id}`);
                      }}
                    >
                      <Eye size={12} className="mr-1" />
                      More Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // If inside dashboard, return content directly without TradespersonLayout wrapper
  if (isInDashboard) {
    return pageContent;
  }

  // Otherwise wrap in TradespersonLayout for standalone page
  return (
    <TradespersonLayout>
      {pageContent}
    </TradespersonLayout>
  );
};

export default CompletedJobsPage;