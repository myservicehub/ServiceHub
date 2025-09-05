import React, { useState, useEffect, useRef } from 'react';
import { Bell, Settings, History, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  notificationsAPI, 
  formatNotificationDate, 
  getNotificationIcon, 
  getNotificationColor,
  getChannelIcon 
} from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';

const NotificationIndicator = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      loadNotificationData();
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(loadNotificationData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotificationData = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getHistory({ limit: 5, offset: 0 });
      setUnreadCount(data.unread || 0);
      setRecentNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleViewAllNotifications = () => {
    setShowDropdown(false);
    navigate('/notifications/history');
  };

  const handleNotificationSettings = () => {
    setShowDropdown(false);
    navigate('/notifications/preferences');
  };

  const handleNotificationClick = (notification) => {
    setShowDropdown(false);
    // Navigate based on notification type
    if (notification.type === 'new_interest' || notification.type === 'job_posted') {
      navigate('/my-jobs');
    } else if (notification.type === 'contact_shared' || notification.type === 'payment_confirmation') {
      navigate('/my-interests');
    }
  };

  const formatNotificationContent = (content) => {
    if (content.length <= 80) return content;
    return content.substring(0, 80) + '...';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBellClick}
        className="relative hover:bg-gray-100"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full p-0">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {showDropdown && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 z-50 shadow-lg border">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold font-montserrat" style={{color: '#121E3C'}}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2" style={{borderColor: '#2F8140'}}></div>
                  <p className="text-sm text-gray-600 font-lato">Loading...</p>
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-4 text-center">
                  <Bell size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-lato">No notifications yet</p>
                </div>
              ) : (
                recentNotifications.map((notification) => {
                  const notificationIcon = getNotificationIcon(notification.type);
                  const notificationColor = getNotificationColor(notification.type);
                  const isUnread = notification.status === 'sent';
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        isUnread ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`text-lg ${notificationColor} mt-1`}>
                          {notificationIcon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className={`text-sm font-medium font-montserrat ${
                              isUnread ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.subject}
                            </h4>
                            {isUnread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-600 font-lato mb-1">
                            {formatNotificationContent(notification.content)}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-lato">
                              {formatNotificationDate(notification.created_at)}
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              {getChannelIcon(notification.channel)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllNotifications}
                className="text-xs font-lato"
              >
                <History size={14} className="mr-1" />
                View All
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotificationSettings}
                className="text-xs font-lato"
              >
                <Settings size={14} className="mr-1" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationIndicator;