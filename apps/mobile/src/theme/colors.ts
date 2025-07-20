/**
 * Color Palette and Theme System
 * 
 * Supports light/dark mode with semantic color tokens
 */

// Base color palette
export const palette = {
  // Primary - Sophisticated financial emerald (high-tech finance inspired)
  emerald50: '#ECFEF5',
  emerald100: '#D1FAE5',
  emerald200: '#A7F3D0',
  emerald300: '#6EE7B7',
  emerald400: '#34D399',
  emerald500: '#10B981', // Primary brand color - sophisticated financial green
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
  emerald900: '#064E3B',

  // Accent - Premium teal for depth and sophistication
  teal50: '#F0FDFA',
  teal100: '#CCFBF1',
  teal200: '#99F6E4',
  teal300: '#5EEAD4',
  teal400: '#2DD4BF',
  teal500: '#14B8A6',
  teal600: '#0D9488',
  teal700: '#0F766E',
  teal800: '#115E59',
  teal900: '#134E4A',

  // Success - Financial positive green (brighter than primary)
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green200: '#BBF7D0',
  green300: '#86EFAC',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',
  green800: '#166534',
  green900: '#14532D',

  // Warning - Budget warning amber
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',

  // Error - Over budget red
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red200: '#FECACA',
  red300: '#FCA5A5',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',
  red900: '#7F1D1D',

  // Neutral colors - Premium, sophisticated with subtle warmth
  white: '#FFFFFF',
  gray50: '#FAFBFC',
  gray100: '#F4F6F8', 
  gray200: '#E8EAED',
  gray300: '#DADCE0',
  gray400: '#9AA0A6',
  gray500: '#5F6368',
  gray600: '#3C4043',
  gray700: '#202124',
  gray800: '#171717',
  gray900: '#0D0D0D',
  black: '#000000',

  // Premium background colors with noticeable emerald hints
  offWhite: '#F8FFFC',           // Soft white with visible green tint
  warmGray50: '#F3F9F6',         // Warm gray with clear green undertone  
  coolGray50: '#E8F5EF',         // Cool gray with obvious green hint (main light bg)
  charcoal: '#1E2826',           // Sophisticated dark with clear green undertone
  darkSlate: '#141A18',          // Premium dark background with noticeable emerald hint (main dark bg)
} as const;

// Light theme
export const lightTheme = {
  // Semantic colors
  primary: palette.emerald600,
  primaryLight: palette.emerald500,
  primaryDark: palette.emerald700,
  
  secondary: palette.teal700,
  secondaryLight: palette.teal600,
  secondaryDark: palette.teal800,

  // State colors
  success: palette.green600,
  successLight: palette.green500,
  successDark: palette.green700,
  
  warning: palette.amber500,
  warningLight: palette.amber400,
  warningDark: palette.amber600,
  
  error: palette.red600,
  errorLight: palette.red500,
  errorDark: palette.red700,

  // Background colors
  background: palette.coolGray50,
  backgroundSecondary: palette.warmGray50,
  backgroundTertiary: palette.gray100,
  
  // Surface colors (cards, sheets, etc.)
  surface: palette.offWhite,
  surfaceSecondary: palette.warmGray50,
  surfaceTertiary: palette.gray100,

  // Text colors
  textPrimary: palette.gray900,
  textSecondary: palette.gray700,
  textTertiary: palette.gray500,
  textDisabled: palette.gray400,
  textOnPrimary: palette.white,
  textOnSurface: palette.gray900,

  // Border colors
  border: palette.gray200,
  borderSecondary: palette.gray300,
  borderFocus: palette.emerald500,

  // Interactive colors
  interactive: palette.emerald600,
  interactiveHover: palette.emerald700,
  interactivePressed: palette.emerald800,
  interactiveDisabled: palette.gray300,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Gradients
  primaryGradient: ['#059669', '#10B981'],
  successGradient: ['#16A34A', '#22C55E'],
  surfaceGradient: [palette.offWhite, palette.coolGray50],
} as const;

// Dark theme
export const darkTheme = {
  // Semantic colors
  primary: palette.emerald500,
  primaryLight: palette.emerald400,
  primaryDark: palette.emerald600,
  
  secondary: palette.teal400,
  secondaryLight: palette.teal300,
  secondaryDark: palette.teal500,

  // State colors
  success: palette.green500,
  successLight: palette.green400,
  successDark: palette.green600,
  
  warning: palette.amber400,
  warningLight: palette.amber300,
  warningDark: palette.amber500,
  
  error: palette.red500,
  errorLight: palette.red400,
  errorDark: palette.red600,

  // Background colors
  background: palette.darkSlate,
  backgroundSecondary: palette.charcoal,
  backgroundTertiary: palette.gray800,
  
  // Surface colors (cards, sheets, etc.)
  surface: palette.charcoal,
  surfaceSecondary: palette.gray800,
  surfaceTertiary: palette.gray700,

  // Text colors
  textPrimary: palette.gray100,
  textSecondary: palette.gray300,
  textTertiary: palette.gray400,
  textDisabled: palette.gray500,
  textOnPrimary: palette.white,
  textOnSurface: palette.gray100,

  // Border colors
  border: palette.gray700,
  borderSecondary: palette.gray600,
  borderFocus: palette.emerald400,

  // Interactive colors
  interactive: palette.emerald500,
  interactiveHover: palette.emerald400,
  interactivePressed: palette.emerald300,
  interactiveDisabled: palette.gray600,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  
  // Gradients
  primaryGradient: ['#10B981', '#34D399'],
  successGradient: ['#22C55E', '#4ADE80'],
  surfaceGradient: [palette.darkSlate, palette.charcoal],
} as const;

export type Theme = typeof lightTheme;
export type ThemeColors = keyof Theme;