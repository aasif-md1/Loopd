/**
 * Loopd Design Tokens — Colors
 * Strictly follows the design spec for a premium dark music streaming UI.
 */
export const Colors = {
  // Backgrounds
  background: '#121212',
  surface: '#181818',
  card: '#1F1F1F',
  pressed: '#282828',
  highlight: '#2A2A2A',

  // Accent
  primary: '#1ED760',
  primaryPressed: '#1FDF64',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#6A6A6A',

  // Utility
  divider: 'rgba(255,255,255,0.1)',
  error: '#E91429',
  link: '#509BF5',

  // Tab bar
  tabBarBg: 'rgba(18,18,18,0.95)',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#B3B3B3',

  // Mini player
  miniPlayerBg: '#282828',

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
} as const;

export type ColorKey = keyof typeof Colors;
