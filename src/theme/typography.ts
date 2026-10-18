/**
 * Loopd Design Tokens — Typography
 * Geometric sans (Figtree) with defined weight/size scale.
 */
export const Typography = {
  fonts: {
    regular: 'Figtree_400Regular',
    medium: 'Figtree_500Medium',
    semiBold: 'Figtree_600SemiBold',
    bold: 'Figtree_700Bold',
    extraBold: 'Figtree_800ExtraBold',
  },
  sizes: {
    headlineLarge: 32,
    headlineMedium: 28,
    headlineSmall: 22,
    titleLarge: 20,
    titleMedium: 16,
    bodyLarge: 16,
    bodyMedium: 14,
    bodySmall: 12,
    caption: 12,
    screenTitle: 28,
    sectionHeader: 22,
    trackTitle: 16,
    subtitle: 14,
    miniPlayerTitle: 14,
    body: 15,
    small: 13,
    xs: 11,
    tabLabel: 10,
  },
} as const;

export type TypographySize = keyof typeof Typography.sizes;
