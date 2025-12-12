import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
  Briefcase
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

  const formatNotificationContent = (content) => {
    if (!content) return '';
    if (content.length <= 120) return content;
    return content.substring(0, 120) + '...';
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
        n.title?.toLowerCase().includes(term) ||
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
      <div className="min-h-screen bg-gray-50">
        <Header />
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mr-4 p-2"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                  Notifications
                </h1>
                <p className="text-gray-600 font-lato mt-1">
                  {user?.role === 'homeowner' ? 'Job updates and tradesperson activity' : 'New job opportunities and updates'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNotifications}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/notifications/preferences')}
                className="flex items-center space-x-2"
              >
                <Settings size={16} />
                <span>Settings</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unread</p>
                    <p className="text-2xl font-bold text-red-600">{pagination.unread}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <BellRing className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Read</p>
                    <p className="text-2xl font-bold text-green-600">{pagination.total - pagination.unread}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div className="flex flex-wrap items-center space-x-2 space-y-2 md:space-y-0">
                  <Button
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={actionLoading.has('mark-all') || pagination.unread === 0}
                    className="flex items-center space-x-2"
                    style={{backgroundColor: '#34D164'}}
                  >
                    {actionLoading.has('mark-all') ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCheck size={16} />
                    )}
                    <span>Mark All Read</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">All Notifications</option>
                      <option value="unread">Unread Only</option>
                      <option value="read">Read Only</option>
                      <option value="new_interest">New Interest</option>
                      <option value="contact_shared">Contact Shared</option>
                      <option value="job_posted">Job Posted</option>
                      <option value="payment_confirmation">Payment Confirmation</option>
                      <option value="job_expiring">Job Expiring</option>
                      <option value="new_matching_job">Matching Jobs</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-lato">Loading notifications...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold font-montserrat mb-2">
                    {notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}
                  </h3>
                  <p className="text-gray-600 font-lato">
                    {notifications.length === 0 
                      ? "You'll receive notifications here when there's activity on your account."
                      : "Try adjusting your filters or search terms."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  id={`notification-${notification.id}`}
                  className={`transition-all duration-200 hover:shadow-md ${
                    notification.status !== 'read' 
                      ? 'border-l-4 border-l-blue-500 bg-blue-50/30' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Notification Icon */}
                        <div className={`p-2 rounded-full text-2xl ${
                          notification.status !== 'read' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className={`font-semibold font-montserrat ${
                              notification.status !== 'read' 
                                ? 'text-gray-900' 
                                : 'text-gray-700'
                            }`}>
                              {notification.title || 'Notification'}
                            </h3>
                            
                            {notification.status !== 'read' && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>

                          <p className="text-gray-600 font-lato mb-3">
                            {expandedNotifications.has(notification.id) 
                              ? notification.content 
                              : formatNotificationContent(notification.content)
                            }
                          </p>

                          {notification.content && notification.content.length > 120 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleNotificationExpansion(notification.id)}
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
                            >
                              {expandedNotifications.has(notification.id) ? 'Show less' : 'Show more'}
                            </Button>
                          )}

                          <div className="flex flex-wrap items-center space-x-3 mt-3">
                            <Badge variant="outline" className={getStatusBadgeColor(notification.status)}>
                              {notification.status || 'unknown'}
                            </Badge>
                            
                            {notification.channel && (
                              <Badge variant="outline" className={getChannelBadgeColor(notification.channel)}>
                                {getChannelIcon(notification.channel)} {notification.channel}
                              </Badge>
                            )}

                            <span className="text-sm text-gray-500 font-lato flex items-center">
                              <Clock size={14} className="mr-1" />
                              {formatNotificationDate(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {notification.status !== 'read' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            disabled={actionLoading.has(notification.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="mt-8">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 font-lato">
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} notifications
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    
                    <span className="px-3 py-1 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default NotificationsPage;
