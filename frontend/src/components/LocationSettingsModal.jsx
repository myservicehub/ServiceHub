import React, { useState } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';
import LocationPicker from './maps/LocationPicker';

const LocationSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentLocation = null, 
  currentTravelDistance = 25 
}) => {
  const kmToMiles = (km) => Math.round(km * 0.621371);
  const [location, setLocation] = useState(currentLocation);
  const [travelDistance, setTravelDistance] = useState(currentTravelDistance);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!location) {
      alert('Please select a location first');
      return;
    }

    setLoading(true);
    try {
      await onSave(location.lat, location.lng, travelDistance);
    } catch (error) {
      console.error('Error saving location settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Location Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Current Settings Display */}
            {currentLocation && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Current Settings</h3>
                <div className="text-sm text-blue-700">
                  <p>📍 Location: {currentLocation.address || 'Custom location set'}</p>
                  <p>🚗 Travel distance: {currentTravelDistance}km (≈ {kmToMiles(currentTravelDistance)}mi)</p>
                </div>
              </div>
            )}

            {/* Home Base Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Home Base Location
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Set your primary work location. We'll show you jobs within your travel distance from here.
              </p>
              <LocationPicker
                height="300px"
                placeholder="Search for your home base location..."
                onLocationSelect={setLocation}
                initialLocation={currentLocation}
                showCurrentLocation={true}
                showSearch={true}
              />
            </div>

            {/* Travel Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Travel Distance
              </label>
              <p className="text-sm text-gray-600 mb-3">
                How far are you willing to travel for work?
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={travelDistance}
                    onChange={(e) => setTravelDistance(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="bg-gray-100 px-3 py-2 rounded-lg min-w-[120px] text-center">
                    <span className="font-semibold text-gray-800">{travelDistance}km</span>
                    <div className="text-xs text-gray-600">≈ {kmToMiles(travelDistance)}mi</div>
                  </div>
                </div>

                {/* Distance Reference */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Distance Guide:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>5-10km:</span>
                      <span className="text-green-600">Local area</span>
                    </div>
                    <div className="flex justify-between">
                      <span>25km:</span>
                      <span className="text-blue-600">Same city</span>
                    </div>
                    <div className="flex justify-between">
                      <span>50km:</span>
                      <span className="text-orange-600">Nearby cities</span>
                    </div>
                    <div className="flex justify-between">
                      <span>100km+:</span>
                      <span className="text-red-600">Wide coverage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Tips:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Set a realistic travel distance based on your transport method</li>
                <li>• Consider traffic and travel time in Nigeria's major cities</li>
                <li>• You can always adjust these settings later</li>
                <li>• Smaller radius = more relevant but fewer jobs</li>
                <li>• Larger radius = more opportunities but more travel</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !location}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSettingsModal;