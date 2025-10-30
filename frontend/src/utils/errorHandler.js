import { toast } from '../hooks/use-toast';

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION', 
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  UNKNOWN: 'UNKNOWN'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Categorizes error based on status code and response
 */
export const categorizeError = (error) => {
  if (!error.response) {
    return ERROR_TYPES.NETWORK;
  }

  const status = error.response.status;
  
  if (status === 401) return ERROR_TYPES.AUTHENTICATION;
  if (status === 403) return ERROR_TYPES.AUTHORIZATION;
  if (status === 404) return ERROR_TYPES.NOT_FOUND;
  if (status >= 400 && status < 500) return ERROR_TYPES.VALIDATION;
  if (status >= 500) return ERROR_TYPES.SERVER;
  
  return ERROR_TYPES.UNKNOWN;
};

/**
 * Determines error severity based on type and context
 */
export const getErrorSeverity = (errorType, context = {}) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.AUTHENTICATION:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_TYPES.AUTHORIZATION:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_TYPES.SERVER:
      return ERROR_SEVERITY.HIGH;
    case ERROR_TYPES.VALIDATION:
      return ERROR_SEVERITY.LOW;
    case ERROR_TYPES.NOT_FOUND:
      return context.critical ? ERROR_SEVERITY.MEDIUM : ERROR_SEVERITY.LOW;
    default:
      return ERROR_SEVERITY.MEDIUM;
  }
};

/**
 * Extracts user-friendly error message from error response
 */
export const extractErrorMessage = (error, fallbackMessage = 'An unexpected error occurred') => {
  // Network errors
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return error.message || fallbackMessage;
  }

  const { data, status } = error.response;

  // Handle different response formats
  if (data?.detail) {
    // Handle validation errors (array format)
    if (Array.isArray(data.detail)) {
      return data.detail
        .map(err => err.msg || err.message || 'Validation error')
        .join(', ');
    }
    
    // Handle object format
    if (typeof data.detail === 'object') {
      return data.detail.msg || data.detail.message || fallbackMessage;
    }
    
    // Handle string format
    return data.detail;
  }

  // Handle other common formats
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.msg) return data.msg;

  // Status-based fallbacks
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Please log in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'Please check your input and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return fallbackMessage;
  }
};

/**
 * Logs error for debugging and monitoring
 */
export const logError = (error, context = {}) => {
  const errorType = categorizeError(error);
  const severity = getErrorSeverity(errorType, context);
  
  const logData = {
    timestamp: new Date().toISOString(),
    type: errorType,
    severity,
    message: error.message,
    status: error.response?.status,
    url: error.config?.url,
    method: error.config?.method,
    context,
    stack: error.stack
  };

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error [${severity}] - ${errorType}`);
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Log Data:', logData);
    console.groupEnd();
  }

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `${errorType}: ${error.message}`,
        fatal: severity === ERROR_SEVERITY.CRITICAL
      });
    }

    // Custom monitoring service (if available)
    if (window.errorMonitoring) {
      window.errorMonitoring.log(logData);
    }
  }

  return logData;
};

/**
 * Shows appropriate user feedback based on error
 */
export const showErrorFeedback = (error, options = {}) => {
  const {
    title,
    fallbackMessage = 'An unexpected error occurred',
    showToast = true,
    context = {}
  } = options;

  const errorMessage = extractErrorMessage(error, fallbackMessage);
  const errorType = categorizeError(error);
  
  // Log the error
  logError(error, context);


  if (showToast) {
    const toastTitle = title || getDefaultErrorTitle(errorType);
    
    toast({
      title: toastTitle,
      description: errorMessage,
      variant: 'destructive',
      duration: getToastDuration(errorType)
    });
  }

  return {
    type: errorType,
    message: errorMessage,
    severity: getErrorSeverity(errorType, context)
  };
};

/**
 * Gets default error title based on error type
 */
const getDefaultErrorTitle = (errorType) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return 'Connection Error';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Authentication Required';
    case ERROR_TYPES.AUTHORIZATION:
      return 'Access Denied';
    case ERROR_TYPES.NOT_FOUND:
      return 'Not Found';
    case ERROR_TYPES.VALIDATION:
      return 'Validation Error';
    case ERROR_TYPES.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
};

/**
 * Gets toast duration based on error type
 */
const getToastDuration = (errorType) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.SERVER:
      return 8000; // Longer for serious errors
    case ERROR_TYPES.VALIDATION:
      return 4000; // Shorter for validation errors
    default:
      return 6000; // Default duration
  }
};

/**
 * Handles API errors with consistent behavior
 */
export const handleApiError = (error, options = {}) => {
  const result = showErrorFeedback(error, options);
  
  // Handle specific error types
  switch (result.type) {
    case ERROR_TYPES.AUTHENTICATION:
      // Redirect to login if needed
      if (options.redirectOnAuth !== false) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      break;
      
    case ERROR_TYPES.NETWORK:
      // Could trigger offline mode or retry logic
      if (options.onNetworkError) {
        options.onNetworkError(error);
      }
      break;
  }

  return result;
};

/**
 * Retry wrapper for API calls
 */
export const withRetry = async (apiCall, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error) => {
      const status = error.response?.status;
      return !status || status >= 500 || status === 429;
    }
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
};

/**
 * Global error handler for unhandled promise rejections
 */
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    logError(event.reason, { 
      type: 'unhandledrejection',
      promise: event.promise 
    });
    
    // Prevent default browser behavior
    event.preventDefault();
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global JavaScript error:', event.error);
    
    logError(event.error, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
};

export default {
  categorizeError,
  extractErrorMessage,
  logError,
  showErrorFeedback,
  handleApiError,
  withRetry,
  setupGlobalErrorHandling,
  ERROR_TYPES,
  ERROR_SEVERITY
};