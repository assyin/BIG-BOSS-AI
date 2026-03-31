export const Fonts = {
  // Font families
  family: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },

  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Typography presets
export const Typography = {
  h1: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: Fonts.size['4xl'] * Fonts.lineHeight.tight,
  },
  h2: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: Fonts.size['3xl'] * Fonts.lineHeight.tight,
  },
  h3: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.semiBold,
    lineHeight: Fonts.size['2xl'] * Fonts.lineHeight.tight,
  },
  h4: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.semiBold,
    lineHeight: Fonts.size.xl * Fonts.lineHeight.normal,
  },
  body: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.base * Fonts.lineHeight.normal,
  },
  bodyLarge: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.md * Fonts.lineHeight.normal,
  },
  caption: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.sm * Fonts.lineHeight.normal,
  },
  button: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    lineHeight: Fonts.size.md * Fonts.lineHeight.tight,
  },
} as const;
