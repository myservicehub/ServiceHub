import { useEffect } from 'react';

const DEFAULT_TITLE = "ServiceHub | Nigeria's Premier Tradesperson Platform";
const DEFAULT_DESCRIPTION =
  "Nigeria's trusted platform for connecting homeowners with reliable local tradespeople. Find verified electricians, plumbers, carpenters, and more.";
const SITE_NAME = 'ServiceHub';
const BASE_URL = 'https://www.myservicehub.co';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets page-level SEO meta tags.
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {string} [opts.canonical] - path only, e.g. "/about"
 * @param {boolean} [opts.noindex] - set true for private/admin pages
 * @param {string} [opts.ogImage] - absolute URL to OG image
 */
export function useSEO({ title, description, canonical, noindex = false, ogImage } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : null;
    const image = ogImage || `${BASE_URL}/og-image.png`;

    document.title = fullTitle;

    // Robots
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Standard meta
    setMeta('description', desc);

    // Open Graph
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:type', 'website', 'property');
    if (canonicalUrl) setMeta('og:url', canonicalUrl, 'property');

    // Twitter card
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);
    setMeta('twitter:card', 'summary_large_image');

    // Canonical link
    if (canonicalUrl) setLink('canonical', canonicalUrl);

    return () => {
      // Reset to defaults on unmount so navigating away doesn't leave stale tags
      document.title = DEFAULT_TITLE;
      setMeta('robots', 'index, follow');
      setMeta('description', DEFAULT_DESCRIPTION);
      setMeta('og:title', DEFAULT_TITLE, 'property');
      setMeta('og:description', DEFAULT_DESCRIPTION, 'property');
    };
  }, [title, description, canonical, noindex, ogImage]);
}
