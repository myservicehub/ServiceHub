import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const OfflineIndicator = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show brief "back online" message
        setShowOfflineAlert(true);
        setTimeout(() => setShowOfflineAlert(false), 3000);
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const handleRetry = () => {
    // Force a network check by trying to fetch a small resource
    fetch('/favicon.ico', { 
      method: 'HEAD',
      cache: 'no-cache'
    })
    .then(() => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      setWasOffline(false);
    })
    .catch(() => {
      // Still offline
      setIsOnline(false);
    });
  };

  if (!showOfflineAlert) {
    return null;
  }

  return (
    <div className={cn(
      'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4',
      className
    )}>
      <Alert 
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          'shadow-lg border-2 transition-all duration-300',
          isOnline 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="font-medium">
              {isOnline 
                ? 'Connection restored!' 
                : 'No internet connection'
              }
            </AlertDescription>
          </div>
          
          {!isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-2 h-8 px-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
        
        {!isOnline && (
          <div className="mt-2 text-sm text-muted-foreground">
            Some features may not work properly. Please check your connection.
          </div>
        )}
      </Alert>
    </div>
  );
};

// Hook to use online status in components
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default OfflineIndicator;