import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../api/wallet';

// Session timeout manager: logs out users after inactivity.
// Configurable via REACT_APP_IDLE_TIMEOUT_MINUTES (default: 30 minutes)
const SessionTimeoutManager = () => {
  const { logout } = useAuth();
  const timerRef = useRef(null);
  const idleMinutes = parseInt(process.env.REACT_APP_IDLE_TIMEOUT_MINUTES || '30', 10);
  const idleMs = Math.max(1, idleMinutes) * 60 * 1000;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onTimeout = async () => {
    // Prevent multiple timeouts
    clearTimer();

    const hasAdminToken = !!localStorage.getItem('admin_token');
    const hasUserToken = !!localStorage.getItem('token') || !!localStorage.getItem('refresh_token');

    // Admin logout first (separate auth domain and redirect to /admin)
    if (hasAdminToken) {
      try {
        await adminAPI.logout();
      } catch (e) {
        // Ignore network errors; we clear tokens regardless in adminAPI.logout
      } finally {
        try {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_info');
        } catch (e) {}
        if (typeof window !== 'undefined') {
          window.location.replace('/admin');
        }
      }
    }

    // Regular user logout and redirect to join page
    if (hasUserToken) {
      try {
        logout();
      } finally {
        if (typeof window !== 'undefined') {
          // If currently on admin page and admin token was already handled, keep admin route
          const onAdmin = window.location.pathname === '/admin';
          if (!onAdmin) {
            window.location.replace('/join-for-free');
          }
        }
      }
    }
  };

  const resetTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(onTimeout, idleMs);
  };

  useEffect(() => {
    // Start timer on mount
    resetTimer();

    // Activity events
    const events = ['mousemove', 'keydown', 'wheel', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    // Visibility changes: if tab becomes visible, reset timer to avoid immediate logout after return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Cleanup
    return () => {
      clearTimer();
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line
  }, [idleMs]);

  return null; // No UI
};

export default SessionTimeoutManager;