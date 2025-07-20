/**
 * Theme System Exports
 * 
 * Central export point for the entire theme system
 */

// Colors and themes
export { palette, lightTheme, darkTheme, type Theme, type ThemeColors } from './colors';

// Typography
export { 
  fontFamily, 
  fontWeight, 
  fontSize, 
  lineHeight, 
  typography,
  type Typography 
} from './typography';

// Spacing and layout
export { 
  spacing, 
  borderRadius, 
  shadows, 
  layout,
  type Spacing,
  type BorderRadius,
  type Shadow 
} from './spacing';

// Theme context
export { ThemeProvider, useTheme, useThemedStyles } from './ThemeContext';