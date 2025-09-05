import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  History, 
  Bell, 
  Mail, 
  MessageSquare, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Trash2,
  Eye
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

const NotificationHistoryPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, unread: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());
  
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
      return;
    }
    loadNotifications();
  }, [isAuthenticated, navigate, currentPage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const data = await notificationsAPI.getHistory({ limit, offset });
      
      setNotifications(data.notifications || []);
      setPagination({
        total: data.total || 0,
        unread: data.unread || 0
      });
    } catch (error) {
      console.error('Failed to load notification history:', error);
      toast({
        title: "Failed to load notifications",
        description: "There was an error loading your notification history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const getStatusBadgeColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'sent': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getChannelBadgeColor = (channel) => {
    const colors = {
      [NotificationChannels.EMAIL]: 'bg-blue-100 text-blue-800',
      [NotificationChannels.SMS]: 'bg-green-100 text-green-800',
      [NotificationChannels.BOTH]: 'bg-purple-100 text-purple-800'
    };
    return colors[channel] || 'bg-gray-100 text-gray-800';
  };

  const formatNotificationContent = (content) => {
    if (content.length <= 150) return content;
    return content.substring(0, 150) + '...';
  };

  const totalPages = Math.ceil(pagination.total / limit);

  if (!isAuthenticated) {
    return null;
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#2F8140'}}></div>
              <p className="text-gray-600 font-lato">Loading notification history...</p>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="mb-4 font-lato"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History size={28} style={{color: '#121E3C'}} />
                <div>
                  <h1 className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                    Notification History
                  </h1>
                  <p className="text-lg text-gray-600 font-lato">
                    View all your serviceHub notifications
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 font-lato">Total Notifications</div>
                  <div className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                    {pagination.total}
                  </div>
                </div>
                {pagination.unread > 0 && (
                  <Badge className="bg-red-500 text-white font-lato">
                    {pagination.unread} unread
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                  {pagination.total}
                </div>
                <div className="text-sm text-gray-600 font-lato">Total Notifications</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-montserrat text-blue-600">
                  {notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length}
                </div>
                <div className="text-sm text-gray-600 font-lato">Successfully Sent</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-montserrat text-red-600">
                  {pagination.unread}
                </div>
                <div className="text-sm text-gray-600 font-lato">Unread</div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold font-montserrat text-gray-900 mb-2">
                  No notifications yet
                </h3>
                <p className="text-gray-600 font-lato">
                  Your notification history will appear here when you receive notifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const isExpanded = expandedNotifications.has(notification.id);
                const notificationIcon = getNotificationIcon(notification.type);
                const notificationColor = getNotificationColor(notification.type);
                
                return (
                  <Card key={notification.id} className={`hover:shadow-lg transition-shadow duration-300 ${
                    notification.status === 'sent' ? 'border-l-4 border-l-blue-500' : 
                    notification.status === 'delivered' ? 'border-l-4 border-l-green-500' :
                    notification.status === 'failed' ? 'border-l-4 border-l-red-500' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className={`text-2xl ${notificationColor}`}>
                            {notificationIcon}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-bold font-montserrat" style={{color: '#121E3C'}}>
                                {notification.subject}
                              </h3>
                              <div className="flex items-center space-x-2 ml-4">
                                <Badge className={getStatusBadgeColor(notification.status)}>
                                  {notification.status}
                                </Badge>
                                <Badge className={getChannelBadgeColor(notification.channel)}>
                                  {getChannelIcon(notification.channel)} {notification.channel}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 font-lato mb-3">
                              {isExpanded ? notification.content : formatNotificationContent(notification.content)}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm text-gray-500 font-lato">
                                <span>{formatNotificationDate(notification.created_at)}</span>
                                {notification.sent_at && (
                                  <span>• Sent {formatNotificationDate(notification.sent_at)}</span>
                                )}
                                {notification.delivered_at && (
                                  <span>• Delivered {formatNotificationDate(notification.delivered_at)}</span>
                                )}
                              </div>
                              
                              {notification.content.length > 150 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleNotificationExpansion(notification.id)}
                                  className="font-lato"
                                >
                                  <Eye size={14} className="mr-1" />
                                  {isExpanded ? 'Show Less' : 'Show More'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-gray-600 font-lato">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} notifications
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="font-lato"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="font-lato"
                        style={currentPage === page ? {backgroundColor: '#2F8140'} : {}}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="font-lato"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default NotificationHistoryPage;