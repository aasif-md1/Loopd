/**
 * Loopd Design Tokens — Spacing & Shape
 * 8pt grid system with defined radii and layout dimensions.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screenPadding: 16,
} as const;

export const Shape = {
  radiusSm: 4,     // album art, cards
  radiusMd: 8,     // mini player, buttons
  radiusLg: 12,    // bottom sheets
  radiusXl: 16,
  radiusFull: 999, // pills, artist images
  cardRadius: 4,
  artistRadius: 999,
  buttonRadius: 999,
  bottomSheetRadius: 12,
} as const;

export const Layout = {
  tabBarHeight: 64,
  miniPlayerHeight: 56,
  miniPlayerArt: 40,
  iconSize: 24,
  touchTarget: 44,
  headerGradientHeight: 300,
  artworkLarge: 300,
  artworkMedium: 160,
  artworkSmall: 56,
  artworkTiny: 48,
} as const;
