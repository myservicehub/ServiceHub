import apiClient from './client';

// Notifications API endpoints
export const notificationsAPI = {
  // Get user notification preferences
  getPreferences: async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  // Update user notification preferences
  updatePreferences: async (preferences) => {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  },

  // Get notification history with pagination
  getHistory: async (params = {}) => {
    const { limit = 20, offset = 0 } = params;
    const response = await apiClient.get('/notifications/history', {
      params: { limit, offset }
    });
    return response.data;
  },

  // Send test notification
  sendTestNotification: async (notificationType) => {
    const response = await apiClient.post(`/notifications/test/${notificationType}`);
    return response.data;
  },

  // Get notification statistics (admin only)
  getStats: async () => {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  },

  // Send notification (admin/system use)
  sendNotification: async (notificationData) => {
    const response = await apiClient.post('/notifications/send', notificationData);
    return response.data;
  },

  // Mark specific notification as read
  markAsRead: async (notificationId) => {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/mark-all-read');
    return response.data;
  },

  // Delete specific notification
  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};

// Notification types enum for frontend use
export const NotificationTypes = {
  NEW_INTEREST: 'new_interest',
  CONTACT_SHARED: 'contact_shared', 
  JOB_POSTED: 'job_posted',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  JOB_EXPIRING: 'job_expiring',
  NEW_MATCHING_JOB: 'new_matching_job'
};

// Notification channels enum
export const NotificationChannels = {
  EMAIL: 'email',
  SMS: 'sms', 
  BOTH: 'both'
};

// Helper functions for notification formatting
export const formatNotificationDate = (dateString) => {
  if (!dateString) return 'Just now';
  const hasTZ = typeof dateString === 'string' && /([zZ]|[+-]\d{2}:\d{2})$/.test(dateString);
  const normalized = hasTZ ? dateString : `${dateString}Z`;
  const date = new Date(normalized);
  if (isNaN(date)) return 'Just now';
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInHours * 60);
    return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 168) { // 7 days
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

export const getNotificationIcon = (type) => {
  const icons = {
    [NotificationTypes.NEW_INTEREST]: '❤️',
    [NotificationTypes.CONTACT_SHARED]: '📞',
    [NotificationTypes.JOB_POSTED]: '📋',
    [NotificationTypes.PAYMENT_CONFIRMATION]: '💰',
    [NotificationTypes.JOB_EXPIRING]: '⏰',
    [NotificationTypes.NEW_MATCHING_JOB]: '🔔'
  };
  return icons[type] || '📢';
};

export const getNotificationColor = (type) => {
  const colors = {
    [NotificationTypes.NEW_INTEREST]: 'text-red-600',
    [NotificationTypes.CONTACT_SHARED]: 'text-blue-600', 
    [NotificationTypes.JOB_POSTED]: 'text-green-600',
    [NotificationTypes.PAYMENT_CONFIRMATION]: 'text-green-600',
    [NotificationTypes.JOB_EXPIRING]: 'text-yellow-600',
    [NotificationTypes.NEW_MATCHING_JOB]: 'text-purple-600'
  };
  return colors[type] || 'text-gray-600';
};

export const getChannelDisplayName = (channel) => {
  const names = {
    [NotificationChannels.EMAIL]: 'Email Only',
    [NotificationChannels.SMS]: 'SMS Only',
    [NotificationChannels.BOTH]: 'Email & SMS'
  };
  return names[channel] || channel;
};

export const getChannelIcon = (channel) => {
  const icons = {
    [NotificationChannels.EMAIL]: '📧',
    [NotificationChannels.SMS]: '📱',
    [NotificationChannels.BOTH]: '📧📱'
  };
  return icons[channel] || '📢';
};