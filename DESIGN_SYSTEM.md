# NVLP Design System

## Design Philosophy
Modern, professional fintech application with clean aesthetics, subtle animations, and premium feel. Inspired by leading fintech apps with a focus on clarity and trust.

## Core Principles
1. **Clarity Over Cleverness**: Information hierarchy is paramount
2. **Subtle Sophistication**: Refined animations and transitions
3. **Trust Through Design**: Professional, secure, reliable appearance
4. **Delight in Details**: Micro-interactions that feel premium
5. **Accessibility First**: High contrast, clear typography, intuitive navigation

---

## Color Palette

### Primary Colors (from Figma Export)
```javascript
const colors = {
  // Primary brand colors - Purple scale
  primary: {
    100: '#EAE8FF',
    200: '#D9D4FF',
    300: '#BCB1FF',
    400: '#9A85FF',
    500: '#7C56FE',
    600: '#6A31F6',  // Main primary
    700: '#5C1FE2',
    800: '#4C19BE',
    900: '#41179B',
    1000: '#260C69',
  },
  
  // Error colors - Red scale
  error: {
    100: '#FAE8E8',
    200: '#F8DCDC',
    300: '#F0B7B7',
    400: '#CD1616',
    500: '#B91414',  // Main error
    600: '#A41212',
    700: '#9A1111',
    800: '#7B0D0D',
    900: '#5C0A0A',
    1000: '#480808',
  },
  
  // Warning colors - Orange/Yellow scale
  warning: {
    100: '#FEF5EA',
    200: '#FEF0DF',
    300: '#FDE1BD',
    400: '#F89E2B',
    500: '#DF8E27',  // Main warning
    600: '#C67E22',
    700: '#BA7720',
    800: '#955F1A',
    900: '#704713',
    1000: '#57370F',
  },
  
  // Success colors - Green/Teal scale
  success: {
    100: '#E6F6F4',
    200: '#D9F2EF',
    300: '#B0E4DD',
    400: '#00A991',
    500: '#009883',  // Main success
    600: '#008774',
    700: '#007F6D',
    800: '#006557',
    900: '#004C41',
    1000: '#003B33',
  },
  
  // Neutral colors - Gray scale
  neutral: {
    100: '#F8F8F8',
    200: '#F5F5F7',
    300: '#E8E9ED',
    400: '#D7D9E0',
    500: '#C2C3CC',
    600: '#ADAEB8',
    700: '#7E808F',
    800: '#545666',
    900: '#383A47',
    1000: '#1F2029',
  },
  
  // Shades - Pure black and white
  shade: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  
  // Semantic colors for quick access
  semantic: {
    primary: '#6A31F6',     // Primary action color
    success: '#009883',     // Success, positive amounts
    warning: '#DF8E27',     // Warning, low balance
    error: '#B91414',       // Error, overspending
    info: '#6A31F6',        // Info (using primary)
  },
  
  // Background colors - Light Mode
  background: {
    primary: '#FFFFFF',      // Main background
    secondary: '#F8F8F8',    // Cards, sections (neutral.100)
    tertiary: '#F5F5F7',     // Subtle backgrounds (neutral.200)
    elevated: '#FFFFFF',     // Modals, overlays
    grouped: '#F5F5F7',      // Grouped content
  },
  
  // Background colors - Dark Mode
  darkBackground: {
    primary: '#000000',      // Pure black
    secondary: '#1F2029',    // Cards (neutral.1000)
    tertiary: '#383A47',     // Subtle backgrounds (neutral.900)
    elevated: '#383A47',     // Elevated surfaces
    grouped: '#1F2029',      // Grouped content
  },
  
  // Money-specific colors (semantic mappings)
  money: {
    positive: '#009883',     // Income, positive (success.500)
    negative: '#B91414',     // Expenses, negative (error.500)
    neutral: '#7E808F',      // Zero state (neutral.700)
    allocated: '#6A31F6',    // Allocated funds (primary.600)
    available: '#009883',    // Available funds (success.500)
    warning: '#DF8E27',      // Low balance (warning.500)
    danger: '#B91414',       // Overdrawn (error.500)
  },
  
  // UI utility colors
  ui: {
    divider: 'rgba(216, 217, 224, 0.5)',      // Light mode divider (neutral.400 @ 50%)
    dividerDark: 'rgba(84, 86, 102, 0.5)',    // Dark mode divider (neutral.800 @ 50%)
    text: '#1F2029',                          // Primary text (neutral.1000)
    textSecondary: '#7E808F',                 // Secondary text (neutral.700)
    textTertiary: '#ADAEB8',                  // Tertiary text (neutral.600)
    textInverse: '#FFFFFF',                   // Text on dark backgrounds
    link: '#6A31F6',                          // Links (primary.600)
    inactive: 'rgba(194, 195, 204, 0.5)',     // Inactive state (neutral.500 @ 50%)
  }
};
```

---

## Typography

### Font Family
```javascript
const typography = {
  fontFamily: {
    primary: 'TAYWingman',         // Custom font for headers & amounts (maintained)
    secondary: 'SF Pro Display',   // iOS system font
    android: 'Inter',             // Cross-platform alternative
    mono: 'SF Mono',              // Monospace for numbers
  },
  
  // Font sizes - Updated from Figma
  fontSize: {
    // Large Title & Display
    largeTitle: 34,  // Main screen titles
    title1: 28,      // Section headers  
    title2: 22,      // Subsection headers
    title3: 20,      // Card headers
    
    // Body & Caption
    headline: 17,    // Emphasized body
    body: 17,        // Default body text
    callout: 16,     // Slightly smaller body
    subheadline: 15, // Supporting text
    footnote: 13,    // Secondary info
    caption1: 12,    // Small labels
    caption2: 11,    // Tiny labels
    
    // Special for money
    displayAmount: 48,    // Main balance display
    largeAmount: 34,      // Large money amounts
    mediumAmount: 28,     // Medium money amounts
    smallAmount: 20,      // Small money amounts
  },
  
  fontWeight: {
    ultraLight: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900',
  },
  
  lineHeight: {
    // Based on font size multipliers
    tight: 1.1,      // For large displays
    snug: 1.2,       // For titles
    normal: 1.4,     // For body text
    relaxed: 1.5,    // For readable body
    loose: 1.75,     // For small text
  },
  
  letterSpacing: {
    tightest: -0.5,
    tight: -0.3,
    normal: 0,
    wide: 0.3,
    wider: 0.5,
  }
};
```

### Text Styles
```javascript
const textStyles = {
  // Headers - Using TAYWingman
  largeTitle: {
    fontFamily: 'TAYWingman',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
    color: colors.ui.text,
  },
  
  title1: {
    fontFamily: 'TAYWingman',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.ui.text,
  },
  
  title2: {
    fontFamily: 'TAYWingman',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.ui.text,
  },
  
  title3: {
    fontFamily: 'TAYWingman',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.3,
    color: colors.ui.text,
  },
  
  // Body styles
  headline: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.3,
    color: colors.ui.text,
  },
  
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.ui.text,
  },
  
  callout: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 21,
    color: colors.ui.text,
  },
  
  subheadline: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.ui.textSecondary,
  },
  
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.ui.textTertiary,
  },
  
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.ui.textTertiary,
  },
  
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 13,
    letterSpacing: 0.3,
    color: colors.ui.textTertiary,
  },
  
  // Money displays - Using TAYWingman
  displayAmount: {
    fontFamily: 'TAYWingman',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -1,
    // Color changes based on positive/negative
  },
  
  largeAmount: {
    fontFamily: 'TAYWingman',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  
  mediumAmount: {
    fontFamily: 'TAYWingman',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  
  smallAmount: {
    fontFamily: 'SF Mono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.3,
  },
};
```

---

## Spacing & Layout

### Grid System
```javascript
const spacing = {
  // 4pt grid system - consistent with iOS/Figma
  none: 0,
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
  
  // Component-specific
  screenPadding: 16,
  cardPadding: 16,
  listItemPadding: 16,
  buttonPadding: {
    vertical: 14,
    horizontal: 20,
  },
  inputPadding: {
    vertical: 12,
    horizontal: 16,
  },
};

const layout = {
  borderRadius: {
    none: 0,
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
    
    // Component specific
    button: 12,
    card: 16,
    input: 12,
    modal: 20,
    bottomSheet: 24,
  },
  
  shadow: {
    // Shadows from Figma design system
    shadow1: {
      // Small shadow - cards, buttons
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
      // CSS equivalent: 0px 4px 4px rgba(0, 0, 0, 0.25)
    },
    shadow2: {
      // Medium shadow - elevated cards
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 4,
      // CSS equivalent: 0px 4px 20px rgba(0, 0, 0, 0.25)
    },
    shadow3: {
      // Large shadow - modals, overlays
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
      elevation: 8,
      // CSS equivalent: 0px 4px 40px rgba(0, 0, 0, 0.25)
    },
    shadow4: {
      // Soft medium shadow - hover states
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 30,
      elevation: 6,
      // CSS equivalent: 0px 4px 30px rgba(0, 0, 0, 0.15)
    },
    shadow5: {
      // Extra soft large shadow - floating elements
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 50,
      elevation: 10,
      // CSS equivalent: 0px 4px 50px rgba(0, 0, 0, 0.1)
    },
    shadow6: {
      // Ambient shadow - subtle depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.10,
      shadowRadius: 60,
      elevation: 12,
      // CSS equivalent: 0px 0px 60px rgba(0, 0, 0, 0.1)
    },
    
    // Semantic shadow naming for easier use
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      // Use shadow1
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      // Use shadow2
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 4,
    },
    lg: {
      // Use shadow3
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
      elevation: 8,
    },
    xl: {
      // Use shadow5
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 50,
      elevation: 10,
    },
  },
  
  // Layout constants
  maxWidth: {
    phone: 428,      // iPhone 14 Pro Max width
    tablet: 768,
    desktop: 1024,
  },
  
  safeArea: {
    top: 44,        // Standard iOS status bar
    bottom: 34,     // iPhone X+ home indicator
  }
};
```

---

## Component Patterns

### Bottom Sheets
```javascript
const bottomSheetStyles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    paddingTop: spacing.xs,
    ...layout.shadow.lg,
    
    // Safe area padding for bottom
    paddingBottom: 34, // iPhone X+ safe area
  },
  
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: layout.borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    maxHeight: '90%', // Prevents full screen takeover
  },
  
  // Animation settings
  animation: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
    overshootClamping: false,
  },
  
  // Different heights for different content
  heights: {
    auto: 'auto',           // Fits content
    half: '50%',           // Half screen
    threeQuarter: '75%',   // Most of screen
    full: '90%',           // Nearly full (leaves top visible)
  }
};

// Usage patterns
const bottomSheetUsage = {
  // Forms and inputs
  forms: {
    'Add Transaction': 'bottom-sheet',
    'Edit Envelope': 'bottom-sheet',
    'Create Budget': 'bottom-sheet',
    'Add Category': 'bottom-sheet',
    'Filter Options': 'bottom-sheet',
    'Date Picker': 'bottom-sheet',
    'Calculator': 'bottom-sheet',
  },
  
  // Selection lists
  selections: {
    'Select Envelope': 'bottom-sheet',
    'Select Category': 'bottom-sheet',
    'Select Payee': 'bottom-sheet',
    'Select Period': 'bottom-sheet',
  },
  
  // Keep as traditional modals
  modals: {
    'Confirm Delete': 'center-modal',
    'Success Message': 'center-modal',
    'Error Alert': 'center-modal',
    'Info Dialog': 'center-modal',
    'Logout Confirmation': 'center-modal',
  }
};
```

### Modals (Info/Confirm only)
```javascript
const modalStyles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  container: {
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    maxWidth: 340,
    ...layout.shadow.lg,
  },
  
  title: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.semibold,
    color: colors.ui.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  message: {
    fontSize: typography.fontSize.body1,
    color: colors.ui.textTertiary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  
  // Modal types
  types: {
    confirm: {
      icon: 'help-circle-outline',
      iconColor: colors.semantic.info,
    },
    success: {
      icon: 'checkmark-circle-outline',
      iconColor: colors.semantic.success,
    },
    error: {
      icon: 'close-circle-outline',
      iconColor: colors.semantic.error,
    },
    warning: {
      icon: 'alert-circle-outline',
      iconColor: colors.semantic.warning,
    },
  }
};
```

### Cards
```javascript
const cardStyles = {
  // Base card
  base: {
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  
  // Variants
  flat: {
    backgroundColor: colors.background.secondary,
    ...layout.shadow.none,
  },
  
  elevated: {
    backgroundColor: colors.background.elevated,
    ...layout.shadow.sm,
  },
  
  outlined: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.ui.divider,
    ...layout.shadow.none,
  },
  
  // Special cards
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.card,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.xs,
  },
  
  statsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: layout.borderRadius.card,
    padding: spacing.lg,
    ...layout.shadow.sm,
  },
  
  // Interactive states
  interactive: {
    activeOpacity: 0.7,
    pressedScale: 0.98,
  }
};
```

### Input Fields
```javascript
const inputStyles = {
  // Base input
  base: {
    height: 48,
    borderRadius: layout.borderRadius.input,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.body,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  // States
  focused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.background.elevated,
  },
  
  error: {
    borderColor: colors.semantic.error,
    backgroundColor: colors.background.elevated,
  },
  
  disabled: {
    backgroundColor: colors.neutral[200],
    opacity: 0.6,
  },
  
  // Label
  label: {
    fontSize: typography.fontSize.footnote,
    fontWeight: typography.fontWeight.medium,
    color: colors.ui.textSecondary,
    marginBottom: spacing.xs,
  },
  
  // Helper text
  helperText: {
    fontSize: typography.fontSize.caption1,
    color: colors.ui.textTertiary,
    marginTop: spacing.xxs,
  },
  
  errorText: {
    fontSize: typography.fontSize.caption1,
    color: colors.semantic.error,
    marginTop: spacing.xxs,
  },
  
  // Special inputs
  amountInput: {
    fontFamily: 'SF Mono',
    fontSize: typography.fontSize.largeAmount,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    height: 64,
  }
};
```

### Buttons
```javascript
const buttonStyles = {
  // Sizes
  sizes: {
    large: {
      height: 56,
      paddingHorizontal: 24,
      fontSize: 17,
      borderRadius: 14,
    },
    medium: {
      height: 48,
      paddingHorizontal: 20,
      fontSize: 17,
      borderRadius: 12,
    },
    small: {
      height: 36,
      paddingHorizontal: 16,
      fontSize: 15,
      borderRadius: 10,
    },
  },
  
  // Variants
  primary: {
    backgroundColor: colors.primary[600],
    borderWidth: 0,
  },
  
  secondary: {
    backgroundColor: colors.neutral[200],
    borderWidth: 0,
  },
  
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  
  destructive: {
    backgroundColor: colors.semantic.error,
    borderWidth: 0,
  },
  
  // Text styles
  text: {
    primary: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    secondary: {
      color: colors.ui.text,
      fontWeight: '600',
    },
    outline: {
      color: colors.ui.text,
      fontWeight: '600',
    },
    ghost: {
      color: colors.primary[600],
      fontWeight: '600',
    },
    destructive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  },
  
  // States
  states: {
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  }
};
```

### Envelope Cards
```javascript
const envelopeCard = {
  container: {
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.card,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
    ...layout.shadow.sm,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  
  icon: {
    size: 20,
    color: colors.primary[600],
  },
  
  contentContainer: {
    flex: 1,
  },
  
  name: {
    fontFamily: 'TAYWingman',
    fontSize: typography.fontSize.headline,
    fontWeight: typography.fontWeight.semibold,
    color: colors.ui.text,
  },
  
  category: {
    fontSize: typography.fontSize.caption1,
    color: colors.ui.textTertiary,
    marginTop: 2,
  },
  
  balanceContainer: {
    alignItems: 'flex-end',
  },
  
  balance: {
    fontFamily: 'TAYWingman',
    fontSize: typography.fontSize.title3,
    fontWeight: typography.fontWeight.bold,
    // Color based on amount
  },
  
  available: {
    fontSize: typography.fontSize.caption1,
    color: colors.ui.textTertiary,
    marginTop: 2,
  },
  
  progressSection: {
    marginTop: spacing.sm,
  },
  
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral[300],
    borderRadius: layout.borderRadius.full,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    borderRadius: layout.borderRadius.full,
    // backgroundColor changes based on fill percentage
    // 0-25%: colors.money.danger
    // 25-50%: colors.money.warning
    // 50-75%: colors.primary[500]
    // 75-100%: colors.money.positive
  },
  
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  
  progressText: {
    fontSize: typography.fontSize.caption2,
    color: colors.neutral[500],
  },
  
  // Variants
  compact: {
    padding: spacing.sm,
    progressBar: {
      height: 4,
    },
  },
  
  expanded: {
    padding: spacing.lg,
    progressBar: {
      height: 8,
    },
  }
};
```

---

## Icons Usage

### Icon Categories
```javascript
const iconMap = {
  // Navigation
  dashboard: 'speedometer-outline',
  envelopes: 'wallet-outline',
  transactions: 'list-outline',
  reports: 'stats-chart-outline',
  settings: 'settings-outline',
  
  // Transaction types
  income: 'trending-up-outline',
  expense: 'trending-down-outline',
  transfer: 'swap-horizontal-outline',
  allocation: 'arrow-down-circle-outline',
  
  // Actions
  add: 'add-circle-outline',
  edit: 'create-outline',
  delete: 'trash-outline',
  search: 'search-outline',
  filter: 'filter-outline',
  sort: 'swap-vertical-outline',
  
  // Status
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
  info: 'information-circle-outline',
  
  // Money
  available: 'cash-outline',
  allocated: 'wallet-outline',
  spent: 'receipt-outline',
  
  // Common envelope icons (from your list)
  defaultEnvelope: 'wallet-outline',
  housing: 'home-outline',
  food: 'restaurant-outline',
  transport: 'car-outline',
  shopping: 'cart-outline',
  utilities: 'flash-outline',
  health: 'medical-outline',
  // ... etc
};

const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,  // Default
  lg: 32,
  xl: 40,
};
```

---

## Animation Patterns

### Timing
```javascript
const animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  easing: {
    // React Native Easing curves
    standard: 'ease-in-out',
    decelerate: 'ease-out',
    accelerate: 'ease-in',
    spring: {
      tension: 40,
      friction: 7,
    }
  },
  
  // Common animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 200,
  },
  
  slideUp: {
    from: { translateY: 20, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: 300,
  },
  
  scale: {
    pressed: { scale: 0.98 },
    duration: 100,
  }
};
```

---

## Screen Examples

### Dashboard Layout
```
┌─────────────────────────┐
│ Good morning, Larry     │ <- Greeting (TAYWingman, 20pt)
│                         │
│ Available to Budget     │ <- Label (gray.500, 12pt)
│ $2,458.32              │ <- Amount (TAYWingman, 48pt, money.available)
│                         │
│ ┌─────────────────────┐ │
│ │ Quick Actions       │ │ <- Section header
│ ├─────────────────────┤ │
│ │ [+Income] [Allocate]│ │ <- Action buttons
│ │ [Expense] [Transfer]│ │
│ └─────────────────────┘ │
│                         │
│ Recent Transactions     │ <- Section header
│ ┌─────────────────────┐ │
│ │ 🛒 Grocery Store    │ │ <- Transaction list
│ │ -$45.23  Groceries  │ │
│ ├─────────────────────┤ │
│ │ 💰 Paycheck         │ │
│ │ +$2,500.00  Income  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Envelope Card
```
┌───────────────────────────────┐
│ [🏠] Housing           $850.00│ <- Icon, name, balance
│      Monthly Rent             │ <- Description
│      ████████░░░░  85% filled │ <- Progress bar
│      Target: $1,000 by Feb 1  │ <- Target info
└───────────────────────────────┘
```

---

## Implementation Notes

### React Native Specifics
```javascript
// Custom hook for responsive design
const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  return {
    isSmall: width < 375,
    isMedium: width >= 375 && width < 414,
    isLarge: width >= 414,
    isTablet: width >= 768,
  };
};

// Platform-specific styles
const platformStyles = {
  ios: {
    fontFamily: 'SF Pro Display',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    fontFamily: 'Roboto',
    elevation: 4,
  }
};
```

### Accessibility
- Minimum touch target: 44x44pt (iOS) / 48x48dp (Android)
- Color contrast ratio: 4.5:1 minimum
- All interactive elements have accessible labels
- Support for screen readers
- Respect system font scaling

### Performance
- Use `react-native-fast-image` for optimized image loading
- Implement `FlashList` for large lists
- Lazy load heavy components
- Optimize re-renders with `React.memo`
- Use native driver for animations

---

## Additional Component Patterns

### Navigation Bar
```javascript
const navigationStyles = {
  tabBar: {
    backgroundColor: colors.background.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.ui.divider,
    height: 83, // Including safe area
    paddingBottom: layout.safeArea.bottom,
  },
  
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  
  tabIcon: {
    size: 24,
    colorActive: colors.primary[500],
    colorInactive: colors.gray[500],
  },
  
  tabLabel: {
    fontSize: typography.fontSize.caption2,
    marginTop: spacing.xxs,
    colorActive: colors.primary[500],
    colorInactive: colors.gray[500],
  },
  
  // Header
  header: {
    backgroundColor: colors.background.primary,
    height: 44 + layout.safeArea.top,
    paddingTop: layout.safeArea.top,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  }
};
```

### Transaction List Items (from Figma Component)
```javascript
const transactionItemStyles = {
  // Main container - pill-shaped transaction row
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 20,
    gap: 12,
    height: 68,
    borderRadius: 9999, // Full rounded
    
    // Light mode
    light: {
      backgroundColor: '#F4F2FF', // Light purple tint
    },
    // Dark mode
    dark: {
      backgroundColor: '#101828', // Dark background
    },
  },
  
  // Avatar/Icon section (52x52)
  avatar: {
    container: {
      width: 52,
      height: 52,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Profile photo variant
    profile: {
      backgroundColor: '#EFB100', // Gold background
      // Image fills the container
    },
    
    // Icon variant
    icon: {
      backgroundColor: '#1E2939', // Dark gray background
      iconSize: 31.2,
    },
  },
  
  // Middle content section
  content: {
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    
    // Left side - name and date
    details: {
      flex: 1,
      gap: 2,
    },
    
    name: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      // Light mode
      light: {
        color: '#1E2939',
      },
      // Dark mode
      dark: {
        color: '#FFFFFF',
      },
    },
    
    timestamp: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#6A7282', // Gray for both modes
    },
    
    // Right side - amount and indicator
    amountSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    
    amount: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      textAlign: 'right',
      // Light mode
      light: {
        color: '#1E2939',
      },
      // Dark mode
      dark: {
        color: '#FFFFFF',
      },
    },
  },
  
  // Transaction state indicator (small pill)
  indicator: {
    container: {
      width: 28,
      height: 24,
      borderRadius: 9999,
      paddingHorizontal: 6,
      paddingVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Positive state (income/credit)
    positive: {
      backgroundColor: '#00BC7D', // Green
    },
    
    // Negative state (expense/debit)
    negative: {
      backgroundColor: '#FB2C36', // Red
    },
    
    icon: {
      width: 16,
      height: 16,
      color: '#FFFFFF',
    },
  },
  
  // Usage colors mapping
  colors: {
    // Transaction-specific colors not in main palette
    positiveGreen: '#00BC7D',
    negativeRed: '#FB2C36',
    avatarGold: '#EFB100',
    darkBackground: '#101828',
    lightBackground: '#F4F2FF',
    darkGray: '#1E2939',
    textGray: '#6A7282',
  },
};
```

### List Items (Generic)
```javascript
const listItemStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },
  
  icon: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  
  content: {
    flex: 1,
  },
  
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.ui.text,
  },
  
  subtitle: {
    fontSize: typography.fontSize.footnote,
    color: colors.ui.textTertiary,
    marginTop: 2,
  },
  
  trailing: {
    alignItems: 'flex-end',
  },
  
  amount: {
    fontFamily: 'SF Mono',
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
  },
  
  chevron: {
    size: 20,
    color: colors.neutral[400],
    marginLeft: spacing.xs,
  }
};
```

### Badges & Pills
```javascript
const badgeStyles = {
  container: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
    alignSelf: 'flex-start',
  },
  
  text: {
    fontSize: typography.fontSize.caption2,
    fontWeight: typography.fontWeight.semibold,
  },
  
  // Variants
  success: {
    backgroundColor: colors.semantic.success + '20',
    textColor: colors.semantic.success,
  },
  
  warning: {
    backgroundColor: colors.semantic.warning + '20',
    textColor: colors.semantic.warning,
  },
  
  error: {
    backgroundColor: colors.semantic.error + '20',
    textColor: colors.semantic.error,
  },
  
  info: {
    backgroundColor: colors.primary[500] + '20',
    textColor: colors.primary[500],
  },
  
  neutral: {
    backgroundColor: colors.neutral[200],
    textColor: colors.gray[700],
  }
};
```

### Floating Action Button
```javascript
const fabStyles = {
  container: {
    position: 'absolute',
    bottom: layout.safeArea.bottom + spacing.md,
    right: spacing.screenPadding,
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...layout.shadow.lg,
  },
  
  icon: {
    size: 24,
    color: '#FFFFFF',
  },
  
  // Mini variant
  mini: {
    width: 40,
    height: 40,
    icon: {
      size: 20,
    }
  },
  
  // Extended variant
  extended: {
    width: 'auto',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
  },
  
  label: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.callout,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  }
};
```

### Segmented Control
```javascript
const segmentedControlStyles = {
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: layout.borderRadius.md,
    padding: 2,
    marginHorizontal: spacing.screenPadding,
  },
  
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.sm,
  },
  
  selectedSegment: {
    backgroundColor: colors.background.elevated,
    ...layout.shadow.sm,
  },
  
  text: {
    fontSize: typography.fontSize.footnote,
    fontWeight: typography.fontWeight.medium,
    color: colors.ui.textSecondary,
  },
  
  selectedText: {
    color: colors.ui.text,
    fontWeight: typography.fontWeight.semibold,
  }
};
```

## Design Tokens Export
```javascript
// Export for use in React Native
export const theme = {
  colors,
  typography,
  spacing,
  layout,
  animation,
  // Component-specific styles
  card: cardStyles,
  button: buttonStyles,
  input: inputStyles,
  envelope: envelopeCard,
  bottomSheet: bottomSheetStyles,
  modal: modalStyles,
  navigation: navigationStyles,
  listItem: listItemStyles,
  badge: badgeStyles,
  fab: fabStyles,
  segmentedControl: segmentedControlStyles,
};
```