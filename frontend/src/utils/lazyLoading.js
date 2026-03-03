import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// Higher-order component for lazy loading with custom loading component
export const withLazyLoading = (
  importFunc, 
  LoadingComponent = LoadingSpinner,
  errorFallback = null
) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense 
      fallback={
        <LoadingComponent 
          text="Loading..." 
          size="lg" 
          className="min-h-[200px]" 
        />
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Preload a lazy component
export const preloadComponent = (importFunc) => {
  const componentImport = importFunc();
  return componentImport;
};

// Image lazy loading hook
export const useImageLazyLoading = () => {
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  return { loadImage };
};

// Intersection Observer for lazy loading elements
export const useLazyLoad = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, defaultOptions);

  const observe = (element) => {
    if (element) observer.observe(element);
  };

  const unobserve = (element) => {
    if (element) observer.unobserve(element);
  };

  const disconnect = () => observer.disconnect();

  return { observe, unobserve, disconnect };
};

// Lazy load images with intersection observer
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    this.observer = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        this.options
      );
    }
  }

  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.classList.remove('lazy');
          img.classList.add('loaded');
          this.observer.unobserve(img);
        }
      }
    });
  }

  observe(img) {
    if (this.observer && img) {
      this.observer.observe(img);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Route-based code splitting helpers
export const createLazyRoute = (importFunc, fallback) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback || <LoadingSpinner fullScreen text="Loading page..." />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Preload routes on hover or focus
export const preloadRoute = (routeImport) => {
  let preloadPromise = null;
  
  const preload = () => {
    if (!preloadPromise) {
      preloadPromise = routeImport();
    }
    return preloadPromise;
  };

  return {
    preload,
    onMouseEnter: preload,
    onFocus: preload
  };
};

export default {
  withLazyLoading,
  preloadComponent,
  useImageLazyLoading,
  useLazyLoad,
  LazyImageLoader,
  createLazyRoute,
  preloadRoute
};