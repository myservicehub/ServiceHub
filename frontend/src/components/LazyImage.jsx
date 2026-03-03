import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ImageIcon, AlertCircle } from 'lucide-react';

const LazyImage = ({
  src,
  alt,
  className,
  placeholder,
  errorFallback,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.unobserve(img);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setIsError(true);
    onError?.(e);
  };

  const DefaultPlaceholder = () => (
    <div className={cn(
      'flex items-center justify-center bg-muted animate-pulse',
      className
    )}>
      <ImageIcon className="w-8 h-8 text-muted-foreground" />
    </div>
  );

  const DefaultErrorFallback = () => (
    <div className={cn(
      'flex items-center justify-center bg-muted border border-destructive/20',
      className
    )}>
      <div className="flex flex-col items-center space-y-2 p-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="text-sm text-muted-foreground">Failed to load image</span>
      </div>
    </div>
  );

  if (isError) {
    return errorFallback || <DefaultErrorFallback />;
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {/* Placeholder */}
      {!isLoaded && (placeholder || <DefaultPlaceholder />)}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
        />
      )}
    </div>
  );
};

// Progressive image component with blur-up effect
export const ProgressiveImage = ({
  src,
  placeholderSrc,
  alt,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || '');

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-all duration-500',
          !isLoaded && placeholderSrc && 'blur-sm scale-110',
          className
        )}
        {...props}
      />
    </div>
  );
};

// Avatar image with fallback
export const AvatarImage = ({
  src,
  alt,
  fallback,
  className,
  size = 'default',
  ...props
}) => {
  const [isError, setIsError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const handleError = () => {
    setIsError(true);
  };

  if (isError || !src) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted rounded-full',
        sizeClasses[size],
        className
      )}>
        {fallback || (
          <span className="text-sm font-medium text-muted-foreground">
            {alt?.charAt(0)?.toUpperCase() || '?'}
          </span>
        )}
      </div>
    );
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      onError={handleError}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      placeholder={
        <div className={cn(
          'flex items-center justify-center bg-muted rounded-full animate-pulse',
          sizeClasses[size]
        )}>
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      }
      {...props}
    />
  );
};

export default LazyImage;