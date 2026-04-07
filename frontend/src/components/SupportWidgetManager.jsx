import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SCRIPT_ID = 'ebanqo_widget';
const STYLE_ID = 'ebanqo-widget-hidden';
const EBANQO_URL = 'https://webchat.ebanqo.io/v2/servicehubltd';
const HIDE_SELECTORS = [
  'iframe[src*="ebanqo.io"]',
  '[id*="ebanqo"]',
  '[class*="ebanqo"]'
];

const removeWidgetArtifacts = () => {
  document.getElementById(SCRIPT_ID)?.remove();
  HIDE_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });
  delete window.ebanqo_widget;
  delete window['EBANQO-WIDGET'];
  delete window.__ebanqoWidgetLoaded;
};

const ensureWidgetScript = () => {
  if (window.__ebanqoWidgetLoaded && typeof window.ebanqo_widget === 'function') {
    window.ebanqo_widget('init', { url: EBANQO_URL });
    return;
  }

  if (!window.ebanqo_widget) {
    window['EBANQO-WIDGET'] = SCRIPT_ID;
    window.ebanqo_widget = function widgetProxy(...args) {
      window.ebanqo_widget.q = window.ebanqo_widget.q || [];
      window.ebanqo_widget.q.push(args);
    };
  }

  const existingScript = document.getElementById(SCRIPT_ID);
  if (existingScript) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = 'https://widget.ebanqo.io/app.js';
  script.async = true;
  script.onload = () => {
    window.__ebanqoWidgetLoaded = true;
    if (typeof window.ebanqo_widget === 'function') {
      window.ebanqo_widget('init', { url: EBANQO_URL });
    }
  };
  document.body.appendChild(script);
};

const ensureHideStyle = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    iframe[src*="ebanqo.io"],
    [id*="ebanqo"],
    [class*="ebanqo"] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
};

const SupportWidgetManager = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onDashboardRoute =
      location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/trades');
    const shouldHideWidget = isAuthenticated() && onDashboardRoute;

    if (shouldHideWidget) {
      ensureHideStyle();
      removeWidgetArtifacts();
      return undefined;
    }

    document.getElementById(STYLE_ID)?.remove();
    ensureWidgetScript();

    return undefined;
  }, [isAuthenticated, location.pathname]);

  return null;
};

export default SupportWidgetManager;
