// Configure custom image icons for trade/category slugs here.
// Icons detected under `src/assets/`:
// - building.png
// - plumbing.png
// - electrical-repairs.png
// - painting.png
// - plastering-pop.png
// - generator-services.png

import buildingIcon from '../assets/building.png';
import plumbingIcon from '../assets/plumbing.png';
import electricalRepairsIcon from '../assets/electrical-repairs.png';
import paintingIcon from '../assets/painting.png';
import plasteringPopIcon from '../assets/plastering-pop.png';
import generatorServicesIcon from '../assets/generator-services.png';

export const IMAGE_ICONS = {
  // Building & Construction
  'building': buildingIcon,
  'building-construction': buildingIcon,

  // Plumbing & Water Works
  'plumbing': plumbingIcon,
  'plumbing-water-works': plumbingIcon,
  // Alias for common variant spelling
  'plumbering': plumbingIcon,

  // Electrical Installation/Repairs
  'electrical-repairs': electricalRepairsIcon,
  'electrical-installation': electricalRepairsIcon,

  // Painting & Decorating
  'painting': paintingIcon,
  'painting-decorating': paintingIcon,

  // POP & Ceiling Works / Plastering/POP
  'plastering-pop': plasteringPopIcon,
  'pop-ceiling-works': plasteringPopIcon,

  // Generator Services / Installation
  'generator-services': generatorServicesIcon,
  'generator-installation': generatorServicesIcon,
};