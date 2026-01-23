import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { Loader2, AlertCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';

// Simple in-memory cache for fetched object URLs to avoid re-downloading
const objectUrlCache = new Map();

const AuthenticatedImage = ({ src, alt, className, style }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const normalizeRequestUrl = (raw) => {
    if (!raw) return raw;
    // If it's a data URL, return it as-is (no normalization needed)
    if (raw.startsWith('data:')) return raw;
    // If it's an absolute URL, let axios use it as-is (it will ignore baseURL)
    if (/^https?:\/\//i.test(raw)) return raw;
    // Our apiClient has baseURL = '/api'. Many backend responses already include '/api/...'.
    // Avoid double-prefixing to '/api/api/...'
    if (raw.startsWith('/api/')) return raw.replace(/^\/api/, '');
    return raw;
  };

  useEffect(() => {
    let isMounted = true;
    
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    // Handle data URLs directly
    if (src.startsWith('data:')) {
      setImageSrc(src);
      setLoading(false);
      setError(false);
      return;
    }

    const fetchImage = async (attempt = 1) => {
      try {
        setLoading(true);
        setError(false);

        const requestUrl = normalizeRequestUrl(src);

        // Use cached object URL when available
        if (objectUrlCache.has(requestUrl)) {
          setImageSrc(objectUrlCache.get(requestUrl));
          return;
        }

        // Ensure we're using the admin token if it exists
        const adminToken = localStorage.getItem('admin_token');
        const headers = adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {};

        const response = await apiClient.get(requestUrl, {
          responseType: 'blob',
          headers: headers
        });

        if (isMounted) {
          const objectUrl = URL.createObjectURL(response.data);
          objectUrlCache.set(requestUrl, objectUrl);
          setImageSrc(objectUrl);
        }
      } catch (err) {
        console.error("Error loading authenticated image:", err);
        if (attempt < 2) {
          // one retry with small backoff
          setTimeout(() => fetchImage(attempt + 1), 250);
          return;
        }
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={style}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 ${className}`} style={style}>
        <AlertCircle className="w-6 h-6 mb-1" />
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative group cursor-pointer ${className}`} style={style} onClick={() => setViewerOpen(true)}>
        <img 
          src={imageSrc} 
          alt={alt} 
          className="w-full h-full object-cover" 
          onError={() => setError(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
        </div>
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none flex justify-center items-center">
          <div className="relative">
            <img 
              src={imageSrc} 
              alt={alt} 
              className="max-h-[90vh] max-w-full rounded-md shadow-2xl" 
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthenticatedImage;
