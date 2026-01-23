import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { walletAPI, adminAPI } from '../../api/wallet';
import { Dialog, DialogContent } from '../ui/dialog';

// Simple in-memory cache for base64 payloads to avoid refetching the same image
const base64Cache = new Map();

const PaymentProofImage = ({ filename, isAdmin = false, className = '', alt = 'Payment proof' }) => {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setSrc('');
    setError('');

    if (!filename) {
      setError('No file provided');
      return;
    }

    // First attempt: use direct image URL (this lets the browser stream/cache the image).
    // For admin images the direct URL may require authentication and thus fail; in that
    // case we'll fallback to fetching the base64 endpoint using apiClient (which sends
    // Authorization headers).
    const directUrl = isAdmin
      ? adminAPI.getPaymentProofUrl(filename)
      : walletAPI.getPaymentProofUrl(filename);

    // If a cached base64 exists for this filename, use it immediately
    if (base64Cache.has(filename)) {
      setSrc(base64Cache.get(filename));
      return () => { isMounted = false; };
    }

    // Try setting the direct URL first so the browser can fetch it normally
    setSrc(directUrl);

    // Also kick off a background fetch for the base64 (used as a fallback on error
    // or if the direct URL is blocked by auth). We perform up to one retry to
    // reduce transient failures.
    const base64Url = isAdmin
      ? adminAPI.getPaymentProofBase64Url(filename)
      : walletAPI.getPaymentProofBase64Url(filename);

    const fetchBase64 = async (attempt = 1) => {
      try {
        const resp = await apiClient.get(base64Url);
        const b64 = resp?.data?.image_base64;
        if (!b64) throw new Error('Base64 not returned');
        const dataUri = `data:image/jpeg;base64,${b64}`;
        base64Cache.set(filename, dataUri);
        if (isMounted) setSrc(dataUri);
      } catch (e) {
        if (attempt < 2) {
          // small backoff then retry once
          setTimeout(() => fetchBase64(attempt + 1), 250);
          return;
        }
        if (isMounted) setError('Failed to load image');
        console.warn('PaymentProofImage error:', e?.response?.data || e?.message);
      }
    };

    // Fire-and-forget background fetch
    fetchBase64();

    return () => { isMounted = false; };
  }, [filename, isAdmin]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-500 border rounded ${className}`} style={{height: '5rem'}}>
        Payment proof unavailable
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`animate-pulse bg-gray-100 border rounded ${className}`} style={{height: '5rem'}} />
    );
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={() => setViewerOpen(true)}
      />
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <img
            src={src}
            alt={alt}
            className="max-h-[80vh] w-auto mx-auto object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentProofImage;