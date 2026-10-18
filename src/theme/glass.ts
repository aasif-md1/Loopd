/**
 * Glass Tokens & Utilities — Loopd V2
 * Dark Glass design language per Section 3 of LOOPD_V2.md
 */
import { Platform } from 'react-native';

export const Glass = {
  // Surface tokens
  glassSurface: 'rgba(255, 255, 255, 0.07)',
  glassSurfaceStrong: 'rgba(255, 255, 255, 0.12)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  borderWidth: 1,
  
  // Highlight along top edge
  glassTopEdge: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },

  // Blur intensities
  blur: {
    tabBar: 55,
    miniPlayer: 65,
    bottomSheets: 75,
    dialogs: 80,
  },

  // Solid fallback for accessibility (reduce transparency) or older Android
  solidFallback: 'rgba(24, 24, 24, 0.94)',

  // Preset styles for glass surfaces
  panelStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
  },

  floatingTabBar: {
    backgroundColor: 'rgba(24, 24, 24, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 28,
  },

  miniPlayer: {
    backgroundColor: 'rgba(24, 24, 24, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 20,
  },
} as const;
