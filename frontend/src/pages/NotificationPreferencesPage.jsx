import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  ArrowLeft
} from 'lucide-react';
import { notificationsAPI, NotificationChannels, NotificationTypes, getChannelDisplayName, getChannelIcon } from '../api/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const NotificationPreferencesPage = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
      return;
    }
    loadPreferences();
  }, [isAuthenticated, navigate]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast({
        title: "Failed to load preferences",
        description: "There was an error loading your notification preferences.",
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
        title: "Preferences saved!",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Failed to save preferences",
        description: "There was an error saving your notification preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const notificationTypeConfig = {
    [NotificationTypes.NEW_INTEREST]: {
      icon: Heart,
      color: 'text-red-600',
      title: 'New Interest Received',
      description: 'When a tradesperson shows interest in your job',
      userType: 'homeowner'
    },
    [NotificationTypes.CONTACT_SHARED]: {
      icon: Phone,
      color: 'text-blue-600', 
      title: 'Contact Details Shared',
      description: 'When homeowner shares contact details with you',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_POSTED]: {
      icon: Briefcase,
      color: 'text-green-600',
      title: 'Job Posted Successfully',
      description: 'Confirmation when your job is posted',
      userType: 'homeowner'
    },
    [NotificationTypes.PAYMENT_CONFIRMATION]: {
      icon: DollarSign,
      color: 'text-green-600',
      title: 'Payment Confirmed',
      description: 'When payment is processed for contact access',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_EXPIRING]: {
      icon: Clock,
      color: 'text-yellow-600',
      title: 'Job Expiring Soon',
      description: 'Reminder when your job is about to expire',
      userType: 'homeowner'
    },
    [NotificationTypes.NEW_MATCHING_JOB]: {
      icon: Bell,
      color: 'text-purple-600',
      title: 'New Matching Jobs',
      description: 'Jobs that match your skills and location',
      userType: 'tradesperson'
    },
    [NotificationTypes.JOB_APPROVED]: {
      icon: Briefcase,
      color: 'text-green-600',
      title: 'Job Approved',
      description: 'When your posted job is approved and goes live',
      userType: 'homeowner'
    },
    [NotificationTypes.JOB_REJECTED]: {
      icon: Briefcase,
      color: 'text-red-600',
      title: 'Job Requires Updates',
      description: 'When your posted job needs changes before approval',
      userType: 'homeowner'
    }
  };

  const channelOptions = [
    { value: NotificationChannels.EMAIL, label: 'Email Only', icon: Mail },
    { value: NotificationChannels.SMS, label: 'SMS Only', icon: MessageSquare },
    { value: NotificationChannels.BOTH, label: 'Email & SMS', icon: Bell }
  ];

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
              Please sign in to manage your notification preferences.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#34D164'}}></div>
              <p className="text-gray-600 font-lato">Loading notification preferences...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Filter notification types based on user role
  const relevantNotifications = Object.entries(notificationTypeConfig).filter(([type, config]) => {
    if (!user?.role) return true; // Show all if role is unclear
    return config.userType === user.role || config.userType === 'both';
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
            
            <div className="flex items-center space-x-3 mb-2">
              <Settings size={28} style={{color: '#121E3C'}} />
              <h1 className="text-3xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                Notification Preferences
              </h1>
            </div>
            <p className="text-lg text-gray-600 font-lato">
              Choose how you want to receive notifications about your serviceHub activity.
            </p>
          </div>

          {/* Preferences Cards */}
          <div className="space-y-4 mb-6">
            {relevantNotifications.map(([type, config]) => {
              const IconComponent = config.icon;
              const currentPreference = preferences?.[type] || NotificationChannels.BOTH;
              
              return (
                <Card key={type} className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-3 rounded-full bg-gray-100 ${config.color}`}>
                          <IconComponent size={24} />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                            {config.title}
                          </h3>
                          <p className="text-gray-600 font-lato mb-4">
                            {config.description}
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700 font-lato">Current: </span>
                            <Badge variant="secondary" className="flex items-center space-x-1">
                              <span>{getChannelIcon(currentPreference)}</span>
                              <span>{getChannelDisplayName(currentPreference)}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 min-w-[120px]">
                        {channelOptions.map((option) => {
                          const OptionIcon = option.icon;
                          const isSelected = currentPreference === option.value;
                          
                          return (
                            <Button
                              key={option.value}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePreferenceChange(type, option.value)}
                              className={`justify-start font-lato ${
                                isSelected ? 'text-white' : ''
                              }`}
                              style={isSelected ? {backgroundColor: '#34D164'} : {}}
                            >
                              <OptionIcon size={14} className="mr-2" />
                              {option.value === NotificationChannels.BOTH ? 'Both' : 
                               option.value === NotificationChannels.EMAIL ? 'Email' : 'SMS'}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSavePreferences}
              disabled={saving}
              className="text-white font-lato px-8"
              style={{backgroundColor: '#34D164'}}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>

          {/* Info Card */}
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Bell size={20} className="text-blue-600 mt-1" />
                <div>
                  <h4 className="font-bold font-montserrat text-blue-900 mb-2">
                    About Notifications
                  </h4>
                  <ul className="text-sm text-blue-800 font-lato space-y-1">
                    <li>• <strong>Email</strong>: Detailed notifications with full information</li>
                    <li>• <strong>SMS</strong>: Quick alerts to your Nigerian phone number</li>
                    <li>• <strong>Both</strong>: Get notifications via email and SMS</li>
                    <li>• You can change these preferences anytime</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default NotificationPreferencesPage;
