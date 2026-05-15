// Big Boss Fitness — Palette "Atlas & Médina" (refonte marocaine, 2026-04)
// Source: DESIGN_REDESIGN_MOROCCAN.md section 3
export const Colors = {
  // Primary — Terre Marrakech (rouge terre cuite)
  primary: '#C84B31',
  primaryDark: '#A03A24',
  primaryLight: '#E66B4F',
  primaryDim: 'rgba(200, 75, 49, 0.10)',
  primaryDim20: 'rgba(200, 75, 49, 0.20)',

  // Secondary — Bleu Médina (Chefchaouen)
  secondary: '#2E5A87',
  secondaryDark: '#1F3F61',
  secondaryLight: '#4A7BA8',
  secondaryDim: 'rgba(46, 90, 135, 0.10)',

  // Accent — Vert Atlas (thé à la menthe)
  accent: '#4A7C59',
  accentDark: '#355C42',
  accentLight: '#6B9E7B',
  accentDim: 'rgba(74, 124, 89, 0.10)',

  // Gold — Safran (premium, achievements)
  gold: '#D4A24C',
  goldDark: '#B5872E',
  goldLight: '#E5BC73',
  goldDim: 'rgba(212, 162, 76, 0.10)',

  // Neutrals — Tadelakt (brun chaud, pas noir froid)
  dark: '#2C1810',
  darkGray: '#4A3829',
  medium: '#5A4838',
  gray: '#8B7B6E',
  light: '#A89788',
  lightGray: '#C4B7A8',
  border: '#E8DDD0',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  white: '#FFFFFF',

  // Semantic — alignés sur la palette chaleureuse
  success: '#4A7C59',
  successLight: 'rgba(74, 124, 89, 0.10)',
  info: '#2E5A87',
  infoLight: 'rgba(46, 90, 135, 0.10)',
  warning: '#D4A24C',
  warningLight: 'rgba(212, 162, 76, 0.10)',
  error: '#B5283A',
  errorLight: 'rgba(181, 40, 58, 0.10)',

  // Gradients (arrays pour LinearGradient)
  gradientPrimary: ['#C84B31', '#E66B4F'],
  gradientHero: ['#C84B31', '#D4A24C'], // "coucher de soleil sur la médina"
  gradientGold: ['#D4A24C', '#E5BC73'],
  gradientDark: ['#2C1810', '#4A3829'],

  // Shadows
  shadowSoft: 'rgba(44, 24, 16, 0.08)',
  shadowWarm: 'rgba(200, 75, 49, 0.15)',

  // Misc
  transparent: 'transparent',
  overlay: 'rgba(44, 24, 16, 0.5)',
  overlayLight: 'rgba(44, 24, 16, 0.3)',
} as const;

export type ColorName = keyof typeof Colors;
