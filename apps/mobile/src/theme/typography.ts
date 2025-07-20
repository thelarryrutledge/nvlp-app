/**
 * Typography System
 * 
 * Consistent font sizes, weights, and line heights
 */

import { Platform } from 'react-native';

// Font families - Enhanced for financial applications
export const fontFamily = {
  regular: Platform.select({
    ios: '-apple-system',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: '-apple-system',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semibold: Platform.select({
    ios: '-apple-system',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: '-apple-system',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  // Monospace for financial numbers
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// Font weights - Enhanced range for better hierarchy
export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Line heights (as multipliers)
export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

// Typography presets - Enhanced hierarchy and financial-specific styles
export const typography = {
  // Display text - Hero numbers and titles
  display: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.extrabold,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    letterSpacing: -0.5,
  },
  
  // Headings with better hierarchy
  h1: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.xl * lineHeight.normal,
    letterSpacing: -0.1,
  },
  h4: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: 0,
  },
  h5: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0.1,
  },
  
  // Body text with better readability
  bodyLarge: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.lg * lineHeight.relaxed,
    letterSpacing: 0,
  },
  body: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.1,
  },
  bodyMedium: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0,
  },
  
  // Labels and captions
  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: 0.2,
  },
  
  // Button text with better weight
  button: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.4,
  },
  buttonLarge: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: 0.2,
  },
  
  // Financial numbers - Enhanced for money display
  currency: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.lg * lineHeight.normal,
    letterSpacing: -0.1,
  },
  currencyLarge: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    letterSpacing: -0.2,
  },
  currencySmall: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.base * lineHeight.normal,
    letterSpacing: 0,
  },
  
  // Financial data display
  balance: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.mono,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    letterSpacing: -0.3,
  },
  
  // Status text
  statusPositive: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.2,
  },
  statusNegative: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.2,
  },
  
  // Navigation and UI elements
  tabLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: 0.5,
  },
  
  // Error and success messages
  error: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.1,
  },
  success: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: 0.1,
  },
} as const;

export type Typography = keyof typeof typography;