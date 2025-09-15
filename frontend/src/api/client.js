import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

console.log('🔧 API Configuration:', { BACKEND_URL, API_BASE });

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and auth
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add auth token if available - check both regular token and admin token
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('admin_token');
    
    // Use admin token for admin endpoints, regular token for others
    if (config.url?.includes('/admin') && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      console.log('🔑 Using admin token for admin endpoint');
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Using regular token');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;