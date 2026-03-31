export const Colors = {
  // Primary
  primary: '#FF6B2B',
  primaryDark: '#E55A1F',
  primaryLight: '#FF8F5A',
  primaryDim: 'rgba(255, 107, 43, 0.10)',
  primaryDim20: 'rgba(255, 107, 43, 0.20)',

  // Neutrals
  dark: '#1A1A1A',
  darkGray: '#2D2D2D',
  medium: '#3D3D3D',
  gray: '#6B6B6B',
  light: '#888888',
  lightGray: '#B3B3B3',
  border: '#E5E3DE',
  background: '#F4F4F5',
  white: '#FFFFFF',
  surface: '#FFFFFF',

  // Semantic
  success: '#00A878',
  successLight: 'rgba(0, 168, 120, 0.10)',
  info: '#0066CC',
  infoLight: 'rgba(0, 102, 204, 0.10)',
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.10)',
  error: '#E02020',
  errorLight: 'rgba(224, 32, 32, 0.10)',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#FF6B2B', '#FF8F5A'],
  gradientDark: ['#1A1A1A', '#2D2D2D'],

  // Transparent
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorName = keyof typeof Colors;
