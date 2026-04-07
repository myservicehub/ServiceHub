import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Save, 
  Settings,
  Heart,
  Phone,
  Briefcase,
  DollarSign,
  Clock,
  ArrowLeft,
  Check,
  Info
} from 'lucide-react';
import { notificationsAPI, NotificationChannels, NotificationTypes } from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const NotificationPreferencesPage = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (notificationType, channel) => {
    setPreferences(prev => ({
      ...prev,
      [notificationType]: channel
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const updateData = {
        new_interest: preferences.new_interest,
        contact_shared: preferences.contact_shared,
        job_posted: preferences.job_posted,
        payment_confirmation: preferences.payment_confirmation,
        job_expiring: preferences.job_expiring,
        new_matching_job: preferences.new_matching_job
      };

      await notificationsAPI.updatePreferences(updateData);
      
      toast({
        title: "Saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const notificationTypeConfig = {
    [NotificationTypes.NEW_INTEREST]: {
      icon: Heart,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      title: 'New Interest Received',
      description: 'When a tradesperson shows interest in your job',
      userType: 'homeowner'
    },
    [NotificationTypes.CONTACT_SHARED]: {
      icon: Phone,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      title: 'Contact Details Shared',
      description: 'When homeowner shares contact details with you',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_POSTED]: {
      icon: Briefcase,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      title: 'Job Posted Successfully',
      description: 'Confirmation when your job is posted',
      userType: 'homeowner'
    },
    [NotificationTypes.PAYMENT_CONFIRMATION]: {
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      title: 'Payment Confirmed',
      description: 'When payment is processed for contact access',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_EXPIRING]: {
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
      title: 'Job Expiring Soon',
      description: 'Reminder when your job is about to expire',
      userType: 'homeowner'
    },
    [NotificationTypes.NEW_MATCHING_JOB]: {
      icon: Bell,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      title: 'New Matching Jobs',
      description: 'Jobs that match your skills and location',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_APPROVED]: {
      icon: Check,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      title: 'Job Approved',
      description: 'When your posted job is approved and goes live',
      userType: 'homeowner'
    },
    [NotificationTypes.JOB_REJECTED]: {
      icon: Info,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500',
      title: 'Job Requires Updates',
      description: 'When your posted job needs changes before approval',
      userType: 'homeowner'
    }
  };

  const channelOptions = [
    { value: NotificationChannels.EMAIL, label: 'Email', icon: Mail },
    { value: NotificationChannels.SMS, label: 'SMS', icon: MessageSquare },
    { value: NotificationChannels.BOTH, label: 'Both', icon: Bell }
  ];

  // Filter notification types based on user role
  const relevantNotifications = Object.entries(notificationTypeConfig).filter(([type, config]) => {
    if (!user?.role) return true;
    return config.userType === user.role || config.userType === 'both';
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#121E3C]">Notification Preferences</h1>
            <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#34D164] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#121E3C]">Notification Preferences</h1>
            <p className="text-sm text-gray-500 mt-0.5">Choose how you want to be notified</p>
          </div>
        </div>
        <Button
          onClick={handleSavePreferences}
          disabled={saving}
          className="bg-[#34D164] hover:bg-[#2ab854] text-white h-10 px-5"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#121E3C]/5 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#121E3C]/10 flex items-center justify-center flex-shrink-0">
          <Settings size={16} className="text-[#121E3C]" />
        </div>
        <div>
          <p className="text-sm text-[#121E3C] font-medium">How notifications work</p>
          <p className="text-xs text-gray-500 mt-0.5">
            <strong>Email</strong> for detailed information, <strong>SMS</strong> for quick alerts, or <strong>Both</strong> to never miss an update.
          </p>
        </div>
      </div>

      {/* Preferences List */}
      <div className="space-y-3">
        {relevantNotifications.map(([type, config]) => {
          const IconComponent = config.icon;
          const currentPreference = preferences?.[type] || NotificationChannels.BOTH;
          
          return (
            <div 
              key={type} 
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon & Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent size={20} className={config.iconColor} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#121E3C] truncate">
                      {config.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {config.description}
                    </p>
                  </div>
                </div>
                
                {/* Channel Options */}
                <div className="flex gap-2 flex-shrink-0">
                  {channelOptions.map((option) => {
                    const OptionIcon = option.icon;
                    const isSelected = currentPreference === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => handlePreferenceChange(type, option.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected 
                            ? 'bg-[#34D164] text-white shadow-sm' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <OptionIcon size={14} />
                        <span className="hidden sm:inline">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Info */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
        <div className="flex items-start gap-3">
          <Bell size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Important</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Critical notifications like security alerts will always be sent regardless of your preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
