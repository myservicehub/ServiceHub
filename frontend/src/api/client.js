import axios from 'axios';

// Resolve backend URL with robust localhost safeguards and optional runtime override
const getBackendUrl = () => {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const buildEnvUrl =
    (import.meta && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) ||
    '';
  const runtimeOverride = isBrowser
    ? (window.BACKEND_URL_OVERRIDE || localStorage.getItem('BACKEND_URL_OVERRIDE') || '')
    : '';
  let url = runtimeOverride || buildEnvUrl;
  if (!url && isLocalhost) {
    url = '';
  }
  // If no BACKEND_URL is configured, prefer a relative API base ("/api").
  // Previously we mapped vercel.app hosts to an external preview backend which
  // caused production deployments to call the wrong origin and intermittently
  // time out. Leave `url` empty so API calls use the same origin by default
  // unless a build/runtime override is explicitly provided.
  return url;
};

const BACKEND_URL = getBackendUrl();
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

if (import.meta && import.meta.env && import.meta.env.DEV) {
  console.log('🔧 API Configuration:', { BACKEND_URL, API_BASE });
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // Increased from 30s to 60s for slow endpoints like job listing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client for refresh to avoid interceptor loops
const refreshClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Refresh coordination
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

const forceLogout = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined') {
    // Redirect to login/join page
    const loginPath = '/join-for-free';
    if (window.location.pathname !== loginPath) {
      window.location.replace(loginPath);
    }
  }
};

// Add admin-specific logout handler
const forceAdminLogout = () => {
  try {
    localStorage.removeItem('admin_token');
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined') {
    const adminLoginPath = '/admin';
    if (window.location.pathname !== adminLoginPath) {
      window.location.replace(adminLoginPath);
    }
  }
};

// Request interceptor for logging and auth
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Skip Authorization header for refresh endpoint
    const isRefreshEndpoint = config.url?.includes('/auth/refresh');
    
    // Add auth token if available - check both regular token and admin token
    const token = isRefreshEndpoint ? null : localStorage.getItem('token');
    const adminToken = localStorage.getItem('admin_token');
    
    // Determine if this request targets admin areas
    const isAdminPath = (config.url?.includes('/admin') || config.url?.includes('/admin-management') || (adminToken && config.url?.includes('/jobs/trade-questions/file/')));
    
    // Use admin token for admin endpoints, regular token for others
    if (isAdminPath && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.log('🔑 Using admin token for admin endpoint');
      }
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.log('🔑 Using regular token');
      }
    }
    
    return config;
  },
  (error) => {
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.error('❌ API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling + auto-refresh
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    const { response, config } = error;
    if (!response) {
      // Network or CORS error
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.error('❌ API Response Error:', error.message);
      }
      return Promise.reject(error);
    }

    const status = response.status;
    const originalRequest = config;
    const hasToken = !!localStorage.getItem('token');
    const detail = response.data?.detail;
    const isAuthLike403 = status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('not authenticated');

    // Do not try to refresh for auth endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                           originalRequest.url?.includes('/auth/register') ||
                           originalRequest.url?.includes('/auth/refresh');

  // Admin endpoints: only force logout on 401 (invalid/expired token). Keep session on 403 (permission denied).
  const isAdminEndpoint = originalRequest.url?.includes('/admin') || originalRequest.url?.includes('/admin-management');
  if (isAdminEndpoint && status === 401) {
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      console.warn('🔒 Admin token invalid/expired. Clearing admin token and redirecting to admin login.');
    }
    if (localStorage.getItem('admin_token')) {
      forceAdminLogout();
    }
    return Promise.reject(error);
  }

    // Treat certain 403 responses from backend as authentication errors (similar to 401)
    if (!(status === 401 || isAuthLike403) || isAuthEndpoint) {
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.error('❌ API Response Error:', response.data || response.statusText);
      }
      return Promise.reject(error);
    }

    // Prevent infinite loop
    if (originalRequest._retry) {
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.error('⚠️ Request already retried and still unauthorized.');
      }
      if (hasToken) {
        if (import.meta && import.meta.env && import.meta.env.DEV) {
          console.warn('Forcing logout due to repeated auth failure.');
        }
        forceLogout();
      }
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (!storedRefreshToken) {
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        console.error('⚠️ No refresh token available.');
      }
      if (hasToken) {
        if (import.meta && import.meta.env && import.meta.env.DEV) {
          console.warn('User token present but refresh missing. Forcing logout.');
        }
        forceLogout();
      } else {
        if (import.meta && import.meta.env && import.meta.env.DEV) {
          console.warn('No user token stored; skipping forced logout.');
        }
      }
      return Promise.reject(error);
    }

    // Queue requests while refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          // Update Authorization and retry
          originalRequest._retry = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    // Start refresh flow
    isRefreshing = true;
    return new Promise((resolve, reject) => {
      refreshClient.post('/auth/refresh', { refresh_token: storedRefreshToken })
        .then((refreshResponse) => {
          const data = refreshResponse.data || refreshResponse;
          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token;

          if (!newAccessToken) {
            throw new Error('Refresh succeeded but no access_token provided');
          }

          // Persist tokens
          localStorage.setItem('token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Notify queued requests
          onRefreshed(newAccessToken);

          // Retry original request
          originalRequest._retry = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          resolve(apiClient(originalRequest));
        })
        .catch((refreshError) => {
          if (import.meta && import.meta.env && import.meta.env.DEV) {
            console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
          }
          forceLogout();
          reject(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

export default apiClient;
