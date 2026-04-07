import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Check,
  CheckCheck,
  X,
  Settings,
  Archive,
  RefreshCw,
  BellRing,
  Clock,
  User,
  Home,
  Briefcase,
  Heart,
  Phone,
  ClipboardList,
  Wallet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Megaphone
} from 'lucide-react';
import { 
  notificationsAPI, 
  formatNotificationDate, 
  getNotificationIcon, 
  getNotificationColor,
  getChannelIcon,
  NotificationChannels 
} from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

// SVG icon mapping for notification types (replaces emojis)
const getNotificationSvgIcon = (type) => {
  const iconMap = {
    'new_interest': Heart,
    'contact_shared': Phone,
    'job_posted': ClipboardList,
    'payment_confirmation': Wallet,
    'job_expiring': AlertTriangle,
    'new_matching_job': BellRing,
    'job_approved': CheckCircle,
    'job_rejected': XCircle,
  };
  return iconMap[type] || Megaphone;
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, unread: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(new Set());
  
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
      return;
    }
    loadNotifications();
  }, [isAuthenticated, navigate, currentPage, filterType]);

  // When navigated with ?focus=<id>, auto-expand and mark as read
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusId = params.get('focus');
    if (!focusId || notifications.length === 0) return;

    // Expand targeted notification
    setExpandedNotifications(prev => new Set([...prev, focusId]));

    // If not read, mark it read
    const target = notifications.find(n => String(n.id) === String(focusId));
    if (target && target.status !== 'read') {
      markAsRead(target.id);
    }
  }, [location.search, notifications]);

  const loadNotifications = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const offset = (currentPage - 1) * limit;
      const data = await notificationsAPI.getHistory({ limit, offset });
      
      setNotifications(data.notifications || []);
      setPagination({
        total: data.total || 0,
        unread: data.unread || 0
      });
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: "Failed to load notifications",
        description: "There was an error loading your notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    await loadNotifications(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      setActionLoading(prev => new Set([...prev, notificationId]));
      await notificationsAPI.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read', read_at: new Date().toISOString() }
            : n
        )
      );
      
      setPagination(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));

      toast({
        title: "Notification marked as read",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: "Failed to mark as read",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      setActionLoading(prev => new Set([...prev, 'mark-all']));
      const result = await notificationsAPI.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read', read_at: new Date().toISOString() }))
      );
      
      setPagination(prev => ({ ...prev, unread: 0 }));

      toast({
        title: "All notifications marked as read",
        description: `${result.marked_count} notifications updated.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: "Failed to mark all as read",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete('mark-all');
        return newSet;
      });
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setActionLoading(prev => new Set([...prev, notificationId]));
      await notificationsAPI.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      setPagination(prev => ({
        total: prev.total - 1,
        unread: deletedNotification?.status !== 'read' ? Math.max(0, prev.unread - 1) : prev.unread
      }));

      toast({
        title: "Notification deleted",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: "Failed to delete notification",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const toggleNotificationExpansion = (notificationId) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'sent': 'bg-blue-100 text-blue-800 border-blue-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'read': 'bg-gray-100 text-gray-800 border-gray-200',
      'failed': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getChannelBadgeColor = (channel) => {
    const colors = {
      [NotificationChannels.EMAIL]: 'bg-blue-100 text-blue-800 border-blue-200',
      [NotificationChannels.SMS]: 'bg-green-100 text-green-800 border-green-200',
      [NotificationChannels.BOTH]: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[channel] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const stripHtml = (html) => {
    if (!html) return '';
    if (typeof html !== 'string') return html;
    
    let result = html;
    
    // Remove HTML tags if present
    if (html.includes('<') && html.includes('>')) {
      result = result
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<[^>]+>/g, ' ');
    }
    
    // Remove URLs (http, https, and www links)
    result = result
      .replace(/https?:\/\/[^\s<>"']+/gi, '')
      .replace(/www\.[^\s<>"']+/gi, '')
      .replace(/myservicehub\.co[^\s<>"']*/gi, '');
    
    // Clean up whitespace and HTML entities
    return result
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  const formatNotificationContent = (content) => {
    if (!content) return '';
    const cleanContent = stripHtml(content);
    if (cleanContent.length <= 120) return cleanContent;
    return cleanContent.substring(0, 120) + '...';
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => n.status !== 'read');
      } else if (filterType === 'read') {
        filtered = filtered.filter(n => n.status === 'read');
      } else {
        filtered = filtered.filter(n => n.type === filterType);
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        (n.subject || n.title)?.toLowerCase().includes(term) ||
        n.content?.toLowerCase().includes(term) ||
        n.type?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const totalPages = Math.ceil(pagination.total / limit);

  if (!isAuthenticated()) {
    return (
      <div>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Sign In Required
            </h1>
            <p className="text-gray-600 font-lato mb-6">
              Please sign in to view your notifications.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="text-white font-lato"
              style={{backgroundColor: '#34D164'}}
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C]">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {user?.role === 'homeowner' ? 'Job updates and tradesperson activity' : 'New job opportunities and updates'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('preferences')}
            className="flex items-center gap-1.5"
          >
            <Settings size={14} />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#121E3C] overflow-hidden">
          <div className="p-2 bg-[#121E3C]/10 rounded-xl w-fit mb-3">
            <Bell className="w-5 h-5 text-[#121E3C]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{pagination.total}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Total</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-amber-400 overflow-hidden">
          <div className="p-2 bg-amber-50 rounded-xl w-fit mb-3">
            <BellRing className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{pagination.unread}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Unread</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm border-b-2 border-b-[#34D164] overflow-hidden">
          <div className="p-2 bg-[#34D164]/10 rounded-xl w-fit mb-3">
            <CheckCheck className="w-5 h-5 text-[#34D164]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#121E3C]">{pagination.total - pagination.unread}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 truncate">Read</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={markAllAsRead}
              disabled={actionLoading.has('mark-all') || pagination.unread === 0}
              className="bg-[#34D164] hover:bg-[#2FBD59] text-white flex items-center gap-1.5"
            >
              {actionLoading.has('mark-all') ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              <span>Mark All Read</span>
            </Button>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164]"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
                <option value="new_interest">New Interest</option>
                <option value="contact_shared">Contact Shared</option>
                <option value="job_posted">Job Posted</option>
                <option value="job_expiring">Job Expiring</option>
                <option value="new_matching_job">Matching Jobs</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34D164]/30 focus:border-[#34D164] w-full md:w-56"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#34D164] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 mx-auto bg-[#121E3C]/5 rounded-2xl flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-[#121E3C]/40" />
          </div>
          <h3 className="text-base font-semibold text-[#121E3C] mb-1">
            {notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}
          </h3>
          <p className="text-sm text-gray-400">
            {notifications.length === 0 
              ? "You'll receive notifications here when there's activity on your account."
              : "Try adjusting your filters or search terms."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div 
              key={notification.id}
              id={`notification-${notification.id}`}
              className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md ${
                notification.status !== 'read' 
                  ? 'border-l-4 border-l-[#34D164] border-gray-100' 
                  : 'border-gray-100'
              }`}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Notification Icon */}
                    {(() => {
                      const IconComponent = getNotificationSvgIcon(notification.type);
                      return (
                        <div className={`p-2.5 rounded-xl ${
                          notification.status !== 'read' ? 'bg-[#34D164]/10' : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            notification.status !== 'read' ? 'text-[#34D164]' : 'text-gray-400'
                          }`} />
                        </div>
                      );
                    })()}

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`text-sm font-semibold truncate ${
                          notification.status !== 'read' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.subject || notification.title || 'Notification'}
                        </h3>
                        {notification.status !== 'read' && (
                          <div className="w-2 h-2 bg-[#34D164] rounded-full"></div>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">
                        {expandedNotifications.has(notification.id) 
                          ? stripHtml(notification.content) 
                          : formatNotificationContent(notification.content)
                        }
                      </div>

                      {notification.content && notification.content.length > 120 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNotificationExpansion(notification.id)}
                          className="text-[#34D164] hover:text-[#2FBD59] p-0 h-auto font-normal text-xs"
                        >
                          {expandedNotifications.has(notification.id) ? 'Show less' : 'Show more'}
                        </Button>
                      )}

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock size={12} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{formatNotificationDate(notification.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {notification.status !== 'read' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={actionLoading.has(notification.id)}
                        className="text-[#34D164] hover:text-[#2FBD59] hover:bg-[#34D164]/10"
                        title="Mark as read"
                      >
                        {actionLoading.has(notification.id) ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      disabled={actionLoading.has(notification.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      title="Delete notification"
                    >
                      {actionLoading.has(notification.id) ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              
              <span className="px-3 py-1 text-xs font-medium text-[#121E3C]">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
