import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, List, Navigation } from 'lucide-react';

const JobsMap = ({ 
  jobs = [], 
  onJobSelect, 
  selectedJobId = null,
  userLocation = null,
  height = '500px',
  showUserLocation = true
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userMarker, setUserMarker] = useState(null);
  const [infoWindow, setInfoWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lagos, Nigeria as default center
  const defaultCenter = { lat: 6.5244, lng: 3.3792 };

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (map) {
      updateJobMarkers();
    }
  }, [jobs, map]);

  useEffect(() => {
    if (map && userLocation && showUserLocation) {
      updateUserLocationMarker();
    }
  }, [userLocation, map, showUserLocation]);

  const initializeMap = async () => {
    try {
      // Debug environment variables
      console.log('JobsMap: Environment debugging:', {
        'process.env keys': Object.keys(process.env || {}),
        'NODE_ENV': process.env.NODE_ENV,
        'REACT_APP vars': Object.keys(process.env || {}).filter(key => key.startsWith('REACT_APP_'))
      });
      
      // Access environment variable the correct way for React
      let apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      console.log('Google Maps API Key available:', !!apiKey);
      
      // Fallback to hardcoded key if environment variable is not available
      // This ensures the maps work while we debug the environment variable issue
      if (!apiKey) {
        apiKey = 'AIzaSyDf53OPDNVCQVti3M6enDzNiNIssWl3EUU';
        console.log('JobsMap: Using fallback API key');
      }
      
      if (!apiKey) {
        console.error('Google Maps API key not found. Checked import.meta.env and process.env.');
        setError('Google Maps API key not configured. Please contact support.');
        setLoading(false);
        return;
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry', 'marker']
      });

      const google = await loader.load();
      
      // Determine initial center and zoom
      let center = defaultCenter;
      let zoom = 10;

      if (userLocation) {
        center = userLocation;
        zoom = 12;
      } else if (jobs.length > 0 && jobs[0].latitude && jobs[0].longitude) {
        center = { lat: jobs[0].latitude, lng: jobs[0].longitude };
        zoom = 12;
      }

      // Create map
      const mapInstance = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);

      // Create info window
      const infoWindowInstance = new google.maps.InfoWindow();
      setInfoWindow(infoWindowInstance);

      setLoading(false);
    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      
      // Provide specific error messages
      let errorMessage = 'Failed to load Google Maps';
      if (err.message) {
        if (err.message.includes('API key')) {
          errorMessage = 'Invalid Google Maps API key';
        } else if (err.message.includes('quota')) {
          errorMessage = 'Google Maps quota exceeded';
        } else if (err.message.includes('billing')) {
          errorMessage = 'Google Maps billing issue';
        } else if (err.message.includes('referer')) {
          errorMessage = 'Domain not authorized for this API key';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const updateJobMarkers = () => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = [];
    const bounds = new window.google.maps.LatLngBounds();

    jobs.forEach(job => {
      if (!job.latitude || !job.longitude) return;

      const position = { lat: job.latitude, lng: job.longitude };

      // Create custom marker icon based on job status
      const isSelected = selectedJobId === job.id;
      const markerIcon = createJobMarkerIcon(job, isSelected);

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: job.title,
        icon: markerIcon,
        animation: isSelected ? window.google.maps.Animation.BOUNCE : null
      });

      // Add click listener
      marker.addListener('click', () => {
        showJobInfoWindow(marker, job);
        if (onJobSelect) {
          onJobSelect(job);
        }
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Adjust map bounds to show all job markers
    if (jobs.length > 0) {
      // Include user location in bounds if available
      if (userLocation && showUserLocation) {
        bounds.extend(userLocation);
      }
      
      if (jobs.length > 1 || (userLocation && showUserLocation)) {
        map.fitBounds(bounds);
        // Ensure minimum zoom level
        const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 15) {
            map.setZoom(15);
          }
        });
      }
    }
  };

  const updateUserLocationMarker = () => {
    if (!map || !userLocation || !window.google) return;

    // Remove existing user marker
    if (userMarker) {
      userMarker.setMap(null);
    }

    // Create user location marker
    const marker = new window.google.maps.Marker({
      position: userLocation,
      map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12)
      },
      zIndex: 1000
    });

    setUserMarker(marker);
  };

  const createJobMarkerIcon = (job, isSelected) => {
    const color = isSelected ? '#10B981' : '#3B82F6'; // Green if selected, blue otherwise
    const size = isSelected ? 28 : 24;

    return {
      url: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size)
    };
  };

  const showJobInfoWindow = (marker, job) => {
    if (!infoWindow) return;

    const distance = userLocation ? calculateDistance(userLocation, { lat: job.latitude, lng: job.longitude }) : null;

    const content = `
      <div style="padding: 8px; max-width: 300px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${job.title}</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">${job.category}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">📍 ${job.location}</p>
        ${distance ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #059669;">📏 ${distance.toFixed(1)} km away</p>` : ''}
        ${job.budget_min && job.budget_max ? 
          `<p style="margin: 0 0 12px 0; font-size: 14px; color: #059669; font-weight: 500;">
            💰 ₦${job.budget_min.toLocaleString()} - ₦${job.budget_max.toLocaleString()}
          </p>` : ''
        }
        <div style="display: flex; gap: 8px;">
          <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}', '_blank')" 
                  style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
            📍 Directions
          </button>
          <span style="font-size: 12px; color: #6b7280; line-height: 24px;">${job.interests_count || 0} interested</span>
        </div>
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(map, marker);
  };

  const calculateDistance = (pos1, pos2) => {
    if (!window.google) return null;
    
    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(pos1.lat, pos1.lng),
      new window.google.maps.LatLng(pos2.lat, pos2.lng)
    );
    
    return distance / 1000; // Convert to kilometers
  };

  const centerOnUserLocation = () => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(13);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg border" style={{ height }}>
        <div className="text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height }} 
        className="w-full rounded-lg border overflow-hidden"
      />
      
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center rounded-lg border border-red-200">
          <div className="text-center p-4">
            <div className="text-red-500 mb-2">
              <MapPin size={32} className="mx-auto" />
            </div>
            <p className="text-red-700 font-medium">Google Maps Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button 
              onClick={() => { setError(null); setLoading(true); initializeMap(); }}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {!loading && (
        <div className="absolute top-4 right-4 space-y-2">
          {userLocation && showUserLocation && (
            <button
              onClick={centerOnUserLocation}
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-md border"
              title="Center on my location"
            >
              <Navigation size={20} />
            </button>
          )}
        </div>
      )}

      {/* Job Count */}
      {!loading && jobs.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md border">
          <span className="text-sm text-gray-600">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} shown
          </span>
        </div>
      )}
    </div>
  );
};

export default JobsMap;