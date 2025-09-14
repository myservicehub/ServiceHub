// Simple test file to debug Google Maps loading issue
import { Loader } from '@googlemaps/js-api-loader';

const testGoogleMapsLoader = async () => {
  console.log('=== Google Maps Debug Test ===');
  
  // Test environment variable access
  console.log('Testing environment variable access:');
  
  let apiKey = null;
  
  try {
    apiKey = import.meta?.env?.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log('import.meta.env method:', !!apiKey, apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
  } catch (e) {
    console.log('import.meta.env error:', e.message);
  }
  
  if (!apiKey) {
    try {
      apiKey = process?.env?.REACT_APP_GOOGLE_MAPS_API_KEY;
      console.log('process.env method:', !!apiKey, apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    } catch (e) {
      console.log('process.env error:', e.message);
    }
  }
  
  // Hardcoded fallback for testing
  if (!apiKey) {
    apiKey = 'AIzaSyDf53OPDNVCQVti3M6enDzNiNIssWl3EUU';
    console.log('Using hardcoded API key for test');
  }
  
  console.log('Final API key available:', !!apiKey);
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  // Test Google Maps Loader
  try {
    console.log('Creating Google Maps Loader...');
    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry', 'marker']
    });
    
    console.log('Loader created successfully, attempting to load...');
    
    const google = await loader.load();
    console.log('✅ Google Maps loaded successfully!');
    console.log('Google object available:', !!google);
    console.log('Google Maps available:', !!google?.maps);
    console.log('Google Maps API version:', google?.maps?.version);
    
    // Test creating a simple map element
    const testDiv = document.createElement('div');
    testDiv.style.width = '100px';
    testDiv.style.height = '100px';
    document.body.appendChild(testDiv);
    
    const map = new google.maps.Map(testDiv, {
      center: { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria
      zoom: 10
    });
    
    if (map) {
      console.log('✅ Test map created successfully!');
      document.body.removeChild(testDiv);
    }
    
  } catch (error) {
    console.error('❌ Google Maps loading failed:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }
};

// Export for use
window.testGoogleMapsLoader = testGoogleMapsLoader;

// Auto-run the test
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, running Google Maps test...');
    testGoogleMapsLoader();
  });
}

export default testGoogleMapsLoader;