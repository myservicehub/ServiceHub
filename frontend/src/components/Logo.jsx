import React from 'react';

const Logo = ({ size = 'medium', variant = 'light' }) => {
  const sizes = {
    small: { container: 'px-2 py-1', iconBox: 'w-7 h-7', iconPx: 24, text: 'text-sm' },
    medium: { container: 'px-3 py-2', iconBox: 'w-9 h-9', iconPx: 28, text: 'text-lg' },
    large: { container: 'px-4 py-3', iconBox: 'w-11 h-11', iconPx: 32, text: 'text-xl' }
  };

  const currentSize = sizes[size] || sizes.medium;

  // Allow overriding via env var; default to your requested PNG in public, fallback to SVG
  const logoSrc = process.env.REACT_APP_LOGO_URL || '/Logo-Icon-Green.png';

  return (
    <div
      className={`flex items-center rounded-lg ${currentSize.container}`}
      style={{ backgroundColor: variant === 'dark' ? '#121E3C' : 'transparent' }}
    >
      {/* Brand mark image with graceful fallback */}
      <div className={`flex items-center justify-center ${currentSize.iconBox} mr-2`}>
        <img
          src={logoSrc}
          alt="ServiceHub logo"
          width={currentSize.iconPx}
          height={currentSize.iconPx}
          onError={(e) => {
            // Fallback: try SVG in public; if that fails, show a simple green dot
            const img = e.target;
            if (img.src.endsWith('/brand-logo.svg')) {
              img.outerHTML = `<span style=\"display:inline-block;width:${currentSize.iconPx}px;height:${currentSize.iconPx}px;background:#2F8140;border-radius:9999px\"></span>`;
            } else {
              img.src = '/brand-logo.svg';
            }
          }}
        />
      </div>
      {/* Wordmark */}
      <div className="flex items-center">
        <span
          className={`${currentSize.text} font-bold font-montserrat`}
          style={{ color: variant === 'dark' ? 'white' : '#121E3C' }}
        >
          Service
        </span>
        <span className={`${currentSize.text} font-bold font-montserrat`} style={{ color: '#2F8140' }}>
          Hub
        </span>
      </div>
    </div>
  );
};

export default Logo;