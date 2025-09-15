// Authentication helper functions

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Get current user from localStorage or context
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Check if current user is a homeowner
export const isHomeowner = () => {
  const user = getCurrentUser();
  return user?.role === 'homeowner';
};

// Check if current user is a tradesperson
export const isTradesperson = () => {
  const user = getCurrentUser();
  return user?.role === 'tradesperson';
};

// Check if current user is active
export const isActive = () => {
  const user = getCurrentUser();
  return user?.status === 'active';
};

// Get user token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Set user data in localStorage
export const setUserData = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Check if user has specific role
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user?.role === role;
};

// Get user ID
export const getUserId = () => {
  const user = getCurrentUser();
  return user?.id;
};

// Get user name
export const getUserName = () => {
  const user = getCurrentUser();
  return user?.name || user?.full_name;
};

// Get user email
export const getUserEmail = () => {
  const user = getCurrentUser();
  return user?.email;
};