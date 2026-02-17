import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { jobsAPI } from '../../../api/jobs';
import {
  Briefcase,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
  ArrowRight,
  Plus,
  Search,
  Star,
  MessageSquare,
  Calendar,
  MapPin,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    pendingApproval: 0,
    totalInterests: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getMyJobs({ limit: 50 });
      const jobs = response?.jobs || [];

      // Calculate stats
      const activeJobs = jobs.filter(j => j.status === 'active').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const pendingApproval = jobs.filter(j => j.status === 'pending_approval').length;
      const totalInterests = jobs.reduce((sum, j) => sum + (j.interests_count || 0), 0);

      setStats({
        totalJobs: jobs.length,
        activeJobs,
        completedJobs,
        pendingApproval,
        totalInterests,
      });

      // Get recent jobs (max 5)
      setRecentJobs(jobs.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      icon: Plus,
      label: 'Post a New Job',
      description: 'Create a job listing',
      href: '/dashboard/post-job',
      primary: true,
    },
    {
      icon: Search,
      label: 'Find Tradespeople',
      description: 'Browse professionals',
      href: '/browse-tradespeople',
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      description: 'Check conversations',
      href: '/dashboard/messages',
    },
    {
      icon: Star,
      label: 'My Reviews',
      description: 'Manage reviews',
      href: '/dashboard/reviews',
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#34D164]">{getGreeting()}</p>
          <h1 className="text-xl sm:text-3xl font-bold text-[#121E3C] mt-1 truncate">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Here's an overview of your activity
          </p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/post-job')}
          className="bg-[#34D164] hover:bg-[#2FBD59] text-white font-medium px-5 shadow-md shadow-[#34D164]/20 hover:shadow-lg hover:shadow-[#34D164]/30 transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Post a Job
        </Button>
      </div>

      {/* Stats Grid */}
      {!loading && stats.totalJobs === 0 ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#34D164]/10 rounded-xl">
              <Briefcase className="w-6 h-6 text-[#34D164]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#121E3C] text-lg">Get started with your first job</h3>
              <p className="text-gray-500 mt-1 text-sm">
                Post a job to start receiving interest from qualified tradespeople in your area.
              </p>
              <Button
                onClick={() => navigate('/dashboard/post-job')}
                className="mt-3 bg-[#34D164] hover:bg-[#2FBD59] text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Post Your First Job
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Briefcase}
            label="Active Jobs"
            value={stats.activeJobs}
            subtitle={stats.activeJobs > 0 ? 'Currently live' : null}
            color="green"
            loading={loading}
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats.pendingApproval}
            subtitle={stats.pendingApproval > 0 ? 'Awaiting review' : null}
            color="amber"
            loading={loading}
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={stats.completedJobs}
            subtitle={stats.completedJobs > 0 ? 'Jobs done' : null}
            color="navy"
            loading={loading}
          />
          <StatCard
            icon={Users}
            label="Total Leads"
            value={stats.totalInterests}
            subtitle={stats.totalInterests > 0 ? 'Interested pros' : null}
            color="purple"
            loading={loading}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Jobs - 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-[#121E3C]">Recent Jobs</h2>
              <button
                onClick={() => navigate('/dashboard/jobs')}
                className="text-sm font-medium text-[#34D164] hover:text-[#2FBD59] flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
              ) : recentJobs.length > 0 ? (
                recentJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - 1 column */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#121E3C]">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <QuickActionCard key={action.label} action={action} />
            ))}
          </div>

          {/* Tips Card */}
          <div className="p-5 bg-[#121E3C] rounded-2xl text-white">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#34D164]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Pro Tip</h3>
                <p className="text-sm text-white/70 mt-1 leading-relaxed">
                  Add detailed descriptions and photos to your jobs to attract more qualified tradespeople.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, subtitle, color, loading }) => {
  const colorConfig = {
    green: {
      iconBg: 'bg-[#34D164]/10',
      iconColor: 'text-[#34D164]',
      accent: 'border-b-[#34D164]',
    },
    amber: {
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      accent: 'border-b-amber-400',
    },
    navy: {
      iconBg: 'bg-[#121E3C]/10',
      iconColor: 'text-[#121E3C]',
      accent: 'border-b-[#121E3C]',
    },
    purple: {
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      accent: 'border-b-purple-400',
    },
  };

  const colors = colorConfig[color] || colorConfig.green;

  return (
    <div className={cn(
      "bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group border-b-2 overflow-hidden",
      colors.accent
    )}>
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl", colors.iconBg)}>
          <Icon className={cn("w-5 h-5", colors.iconColor)} />
        </div>
      </div>
      <div className="mt-3 sm:mt-4">
        {loading ? (
          <div className="h-7 sm:h-8 w-12 sm:w-16 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">
            {value}
          </p>
        )}
        <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const JobCard = ({ job }) => {
  const navigate = useNavigate();

  const statusConfig = {
    active: { label: 'Active', className: 'bg-[#34D164]/10 text-[#34D164]' },
    pending_approval: { label: 'Pending', className: 'bg-amber-50 text-amber-600' },
    completed: { label: 'Completed', className: 'bg-[#121E3C]/10 text-[#121E3C]' },
    in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-600' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-500' },
  };

  const status = statusConfig[job.status] || statusConfig.active;

  return (
    <div
      onClick={() => navigate(`/dashboard/jobs`)}
      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group"
    >
      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-[#121E3C]/5 rounded-xl flex items-center justify-center">
        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-[#121E3C]/60" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#121E3C] truncate group-hover:text-[#34D164] transition-colors">
          {job.title}
        </h3>
        <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{job.location || job.state || 'Location'}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3" />
            {job.interests_count || 0}
          </span>
        </div>
      </div>
      <span className={cn("flex-shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap", status.className)}>
        {status.label}
      </span>
      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#34D164] transition-colors flex-shrink-0 hidden sm:block" />
    </div>
  );
};

const QuickActionCard = ({ action }) => {
  const navigate = useNavigate();
  const Icon = action.icon;

  return (
    <button
      onClick={() => navigate(action.href)}
      className={cn(
        "w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-300 text-left group",
        action.primary
          ? "bg-[#34D164] border-[#34D164] text-white shadow-md shadow-[#34D164]/20 hover:shadow-lg hover:shadow-[#34D164]/30 hover:bg-[#2FBD59]"
          : "bg-white border-gray-100 hover:border-[#34D164]/30 hover:shadow-sm"
      )}
    >
      <div className={cn(
        "flex-shrink-0 p-2.5 rounded-xl",
        action.primary ? "bg-white/20" : "bg-[#121E3C]/5"
      )}>
        <Icon className={cn("w-5 h-5", action.primary ? "text-white" : "text-[#121E3C]")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold truncate",
          action.primary ? "text-white" : "text-[#121E3C]"
        )}>
          {action.label}
        </p>
        <p className={cn(
          "text-xs truncate mt-0.5",
          action.primary ? "text-white/70" : "text-gray-400"
        )}>
          {action.description}
        </p>
      </div>
      <ArrowRight className={cn(
        "w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-0.5",
        action.primary ? "text-white/60" : "text-gray-300"
      )} />
    </button>
  );
};

const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 py-12 text-center">
      <div className="w-14 h-14 mx-auto bg-[#121E3C]/5 rounded-2xl flex items-center justify-center mb-4">
        <Briefcase className="w-7 h-7 text-[#121E3C]/40" />
      </div>
      <h3 className="text-base font-semibold text-[#121E3C] mb-1">No jobs yet</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto">
        Post your first job to start receiving quotes from qualified tradespeople.
      </p>
      <Button
        onClick={() => navigate('/dashboard/post-job')}
        className="bg-[#34D164] hover:bg-[#2FBD59] text-white"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Post Your First Job
      </Button>
    </div>
  );
};

export default DashboardOverview;
