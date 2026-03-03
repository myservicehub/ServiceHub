import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const LoadingSpinner = ({ 
  size = 'default', 
  className,
  text,
  fullScreen = false,
  overlay = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const spinner = (
    <div className={cn(
      'flex items-center justify-center',
      fullScreen && 'min-h-screen',
      className
    )}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Inline loading spinner for buttons
export const ButtonSpinner = ({ className }) => (
  <Loader2 className={cn('w-4 h-4 animate-spin', className)} />
);

// Loading skeleton for content
export const LoadingSkeleton = ({ className, lines = 3 }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'h-4 bg-muted rounded animate-pulse',
          i === lines - 1 && 'w-3/4' // Last line shorter
        )}
      />
    ))}
  </div>
);

// Loading card placeholder
export const LoadingCard = ({ className }) => (
  <div className={cn(
    'border rounded-lg p-4 space-y-3 animate-pulse',
    className
  )}>
    <div className="h-4 bg-muted rounded w-3/4" />
    <div className="h-4 bg-muted rounded w-1/2" />
    <div className="h-20 bg-muted rounded" />
  </div>
);

export default LoadingSpinner;