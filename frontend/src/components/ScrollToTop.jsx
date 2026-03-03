import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scroll to top on route changes. Helps when navigating from footer links
// so new content is visible without manual scrolling.
export default function ScrollToTop({ smooth = true }) {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.hash) return;
    const behavior = smooth ? 'smooth' : 'auto';
    const scroll = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        window.scrollTo(0, 0);
      }
    };
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}