import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { authAPI, jobsAPI } from '../api/services';
import { DEFAULT_TRAVEL_DISTANCE_KM } from '../utils/locationCoordinates';

const LocationConfirmationBanner = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!user?.location_needs_confirmation) return null;

  const confirmWithGPS = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location services unavailable',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await jobsAPI.apiClient.put('/auth/profile/location', null, {
            params: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              travel_distance_km: user?.travel_distance_km || DEFAULT_TRAVEL_DISTANCE_KM,
              source: 'gps',
            },
          });

          const refreshedUser = await authAPI.getCurrentUser();
          updateUser(refreshedUser);

          toast({
            title: 'Location confirmed',
            description: 'We will now match you to nearby jobs more accurately.',
          });
        } catch (error) {
          toast({
            title: 'Unable to save location',
            description: error?.response?.data?.detail || 'Please try again.',
            variant: 'destructive',
          });
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        toast({
          title: 'Location permission needed',
          description: 'Please allow GPS access to confirm your location.',
          variant: 'destructive',
        });
        setSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  };

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900">
            Your saved coordinates look like an older approximate location. Confirm your precise location to improve nearby job matching.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={confirmWithGPS}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-[#34D164] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2fbb59] disabled:opacity-60"
          >
            <Navigation className="h-3.5 w-3.5" />
            {submitting ? 'Confirming...' : 'Confirm with GPS'}
          </button>

          {user?.role === 'homeowner' && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/post-job')}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <MapPin className="h-3.5 w-3.5" />
              Confirm on Map
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationConfirmationBanner;
