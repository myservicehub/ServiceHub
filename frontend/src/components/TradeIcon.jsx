import React from 'react';
import { IMAGE_ICONS } from '../config/tradeIcons';
import {
  Building2,
  Wrench,
  Zap,
  Paintbrush,
  Home,
  Cog,
  Hammer
} from 'lucide-react';

const toSlug = (str) => {
  return String(str || '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

const ICONS = {
  'building': Building2,
  'building-construction': Building2,
  'plumbing': Wrench,
  'plumbing-water-works': Wrench,
  'electrical-repairs': Zap,
  'electrical-installation': Zap,
  'painting': Paintbrush,
  'painting-decorating': Paintbrush,
  'plastering-pop': Home,
  'pop-ceiling-works': Home,
  'generator-services': Cog,
  'generator-installation': Cog,
};

const TradeIcon = ({ name, size = 28, className = '' }) => {
  const slug = toSlug(name);

  // If an image asset is configured for this slug, render it
  const imgSrc = IMAGE_ICONS[slug];
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        className={`object-contain ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        loading="lazy"
        draggable={false}
      />
    );
  }

  // Otherwise, fall back to lucide icon component
  const IconComp = ICONS[slug] || Hammer;
  return <IconComp size={size} className={className} />;
};

export default TradeIcon;