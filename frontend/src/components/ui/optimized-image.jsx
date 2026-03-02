import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

/**
 * OptimizedImage - A performant image component for Vite/React
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur placeholder effect during load
 * - Responsive sizing with srcSet support
 * - Smooth fade-in animation on load
 * - Error handling with fallback
 * - Optional priority loading for above-the-fold images
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
  quality = 75,
  sizes = '100vw',
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  fill = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Generate a simple blur placeholder color based on image path
  const generatePlaceholderColor = (imagePath) => {
    const colors = [
      'bg-gray-200',
      'bg-slate-200', 
      'bg-zinc-200',
      'bg-neutral-200'
    ];
    const hash = imagePath?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  // Generate srcSet for responsive images (if supported)
  const generateSrcSet = (baseSrc) => {
    if (!baseSrc || baseSrc.startsWith('http')) return undefined;
    
    // For local images, we can't generate srcSet without build-time processing
    // Return undefined and use single src
    return undefined;
  };

  const placeholderClass = generatePlaceholderColor(src);

  // Styles for different modes
  const containerStyles = fill
    ? 'absolute inset-0'
    : width && height
    ? { width, height }
    : {};

  const imageStyles = {
    objectFit,
    objectPosition,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        fill ? 'absolute inset-0' : 'inline-block',
        containerClassName
      )}
      style={!fill ? containerStyles : undefined}
    >
      {/* Placeholder / Skeleton */}
      {placeholder === 'blur' && !isLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            placeholderClass,
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurDataURL ? 'blur(20px)' : undefined,
            transform: blurDataURL ? 'scale(1.1)' : undefined,
          }}
        />
      )}

      {/* Shimmer effect while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      {/* Actual Image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchpriority={priority ? 'high' : 'auto'}
          srcSet={generateSrcSet(src)}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-500 ease-out',
            fill && 'absolute inset-0 w-full h-full',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={imageStyles}
          {...props}
        />
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * BackgroundImage - Optimized background image with lazy loading
 * Use this for hero sections and large background images
 */
export const BackgroundImage = ({
  src,
  alt = '',
  className,
  children,
  overlay,
  overlayClassName,
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px 0px', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)} {...props}>
      {/* Placeholder */}
      <div
        className={cn(
          'absolute inset-0 bg-gray-200 transition-opacity duration-700',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Background Image */}
      {isInView && (
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${src})` }}
          role="img"
          aria-label={alt}
        />
      )}

      {/* Optional Overlay */}
      {overlay && (
        <div className={cn('absolute inset-0', overlayClassName)}>
          {overlay}
        </div>
      )}

      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};

export default OptimizedImage;
