/**
 * Spacing System
 * 
 * Consistent spacing scale for margins, padding, and layout
 */

// Base spacing unit (4px)
const BASE_UNIT = 4;

// Spacing scale (based on 4px grid)
export const spacing = {
  none: 0,
  xs: BASE_UNIT,        // 4px
  sm: BASE_UNIT * 2,    // 8px
  md: BASE_UNIT * 3,    // 12px
  lg: BASE_UNIT * 4,    // 16px
  xl: BASE_UNIT * 5,    // 20px
  '2xl': BASE_UNIT * 6, // 24px
  '3xl': BASE_UNIT * 8, // 32px
  '4xl': BASE_UNIT * 10, // 40px
  '5xl': BASE_UNIT * 12, // 48px
  '6xl': BASE_UNIT * 16, // 64px
} as const;

// Border radius - More refined, modern curves
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 28,
  full: 9999,
} as const;

// Shadows - More sophisticated, layered shadows
export const shadows = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 12,
  },
  financial: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// Layout constants
export const layout = {
  // Screen padding
  screenPaddingHorizontal: spacing.lg,
  screenPaddingVertical: spacing.lg,
  
  // Content max width for tablets
  contentMaxWidth: 768,
  
  // Common heights
  buttonHeight: 52,
  buttonHeightSmall: 40,
  inputHeight: 52,
  tabBarHeight: 84,
  headerHeight: 56,
  
  // Common widths
  iconSize: 24,
  iconSizeSmall: 20,
  iconSizeLarge: 32,
  
  // Hit slop for touchable areas
  hitSlop: {
    top: spacing.sm,
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
  },
  
  // Minimum touch target size (accessibility)
  minTouchTarget: 44,
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;