import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Crosshair, Search } from 'lucide-react';

const LocationPicker = ({ 
  onLocationSelect, 
  initialLocation = null, 
  height = '400px',
  placeholder = "Search for an address...",
  showCurrentLocation = true,
  showSearch = true 
}) => {
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);

  // Lagos, Nigeria as default center
  const defaultCenter = { lat: 6.5244, lng: 3.3792 };

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      const loader = new Loader({
        apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
        libraries: ['places', 'geometry']
      });

      const google = await loader.load();
      
      // Create map
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: initialLocation || defaultCenter,
        zoom: initialLocation ? 15 : 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      setMap(mapInstance);

      // Create marker
      const markerInstance = new google.maps.Marker({
        map: mapInstance,
        draggable: true,
        position: initialLocation || defaultCenter,
        title: 'Drag to select location'
      });

      setMarker(markerInstance);

      // Set initial location if provided
      if (initialLocation) {
        setSelectedLocation(initialLocation);
        if (onLocationSelect) {
          onLocationSelect(initialLocation);
        }
      }

      // Add click listener to map
      mapInstance.addListener('click', (event) => {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        
        markerInstance.setPosition(location);
        setSelectedLocation(location);
        
        // Reverse geocode to get address
        reverseGeocode(google, location);
        
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      });

      // Add drag listener to marker
      markerInstance.addListener('dragend', (event) => {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        
        setSelectedLocation(location);
        reverseGeocode(google, location);
        
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      });

      // Initialize search box if search is enabled
      if (showSearch && searchInputRef.current) {
        const searchBoxInstance = new google.maps.places.SearchBox(searchInputRef.current);
        setSearchBox(searchBoxInstance);

        // Bias search results to map bounds
        mapInstance.addListener('bounds_changed', () => {
          searchBoxInstance.setBounds(mapInstance.getBounds());
        });

        // Listen for place selection
        searchBoxInstance.addListener('places_changed', () => {
          const places = searchBoxInstance.getPlaces();
          
          if (places.length === 0) return;

          const place = places[0];
          
          if (!place.geometry || !place.geometry.location) return;

          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };

          // Update map and marker
          mapInstance.setCenter(location);
          mapInstance.setZoom(15);
          markerInstance.setPosition(location);
          
          setSelectedLocation(location);
          
          if (onLocationSelect) {
            onLocationSelect({
              ...location,
              address: place.formatted_address,
              placeId: place.place_id
            });
          }
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map. Please check your internet connection.');
      setLoading(false);
    }
  };

  const reverseGeocode = async (google, location) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location });
      
      if (response.results && response.results.length > 0) {
        const address = response.results[0].formatted_address;
        setSelectedLocation(prev => ({ ...prev, address }));
        
        if (onLocationSelect) {
          onLocationSelect({
            ...location,
            address
          });
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        if (map && marker) {
          map.setCenter(location);
          map.setZoom(15);
          marker.setPosition(location);
          
          setSelectedLocation(location);
          
          // Reverse geocode current location
          if (window.google) {
            reverseGeocode(window.google.maps, location);
          }
          
          if (onLocationSelect) {
            onLocationSelect(location);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error getting current location:', error);
        alert('Unable to get your current location. Please select manually on the map.');
        setLoading(false);
      }
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border">
        <div className="text-center">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex space-x-2">
        {showSearch && (
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        
        {showCurrentLocation && (
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg flex items-center space-x-2"
            title="Use current location"
          >
            <Crosshair size={16} />
            <span className="hidden sm:inline">Current Location</span>
          </button>
        )}
      </div>

      {/* Map Container */}
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
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-start space-x-3">
            <MapPin size={20} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-800">Selected Location</p>
              {selectedLocation.address ? (
                <p className="text-sm text-gray-600">{selectedLocation.address}</p>
              ) : (
                <p className="text-sm text-gray-600">
                  Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500">
        💡 Click on the map or drag the marker to select a location. Use the search box to find specific addresses.
      </div>
    </div>
  );
};

export default LocationPicker;