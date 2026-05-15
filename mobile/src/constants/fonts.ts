// Big Boss Fitness — Typographie refonte marocaine
// Source: DESIGN_REDESIGN_MOROCCAN.md section 4
// Polices chargées dans app/_layout.tsx via @expo-google-fonts/{cairo,inter,tajawal}

export const Fonts = {
  family: {
    // Body / UI (Latin) — Inter
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',

    // Display / Titres — Cairo (caractère maghrébin moderne)
    displayRegular: 'Cairo_400Regular',
    displayMedium: 'Cairo_500Medium',
    displaySemiBold: 'Cairo_600SemiBold',
    displayBold: 'Cairo_700Bold',

    // Arabe / Darija — Tajawal
    arRegular: 'Tajawal_400Regular',
    arMedium: 'Tajawal_500Medium',
    arBold: 'Tajawal_700Bold',
  },

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

  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Hiérarchie typographique (spec section 4.2)
export const Typography = {
  display: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 48,
    lineHeight: 56,
  },
  h1: {
    fontFamily: Fonts.family.displayBold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 20,
    lineHeight: 28,
  },
  h4: {
    fontFamily: Fonts.family.displayMedium,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: Fonts.family.regular,
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: Fonts.family.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: Fonts.family.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.family.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: Fonts.family.displaySemiBold,
    fontSize: 16,
    lineHeight: 18,
  },
} as const;
