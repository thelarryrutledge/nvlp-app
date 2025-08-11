# NVLP Design System

## Design Philosophy
Modern, professional fintech application with clean aesthetics, subtle animations, and premium feel. Inspired by apps like Revolut, N26, and Copilot Money.

## Core Principles
1. **Clarity Over Cleverness**: Information hierarchy is paramount
2. **Subtle Sophistication**: Refined animations and transitions
3. **Trust Through Design**: Professional, secure, reliable appearance
4. **Delight in Details**: Micro-interactions that feel premium
5. **Accessibility First**: High contrast, clear typography, intuitive navigation

---

## Color Palette

### Primary Colors
```javascript
const colors = {
  // Brand colors
  primary: {
    50:  '#E3F2FD',  // Lightest blue tint
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Primary brand blue
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',  // Darkest blue
  },
  
  // Semantic colors
  semantic: {
    success: '#4CAF50',     // Green - positive amounts, income
    warning: '#FF9800',     // Orange - low balance warnings
    error: '#F44336',       // Red - overspending, errors
    info: '#2196F3',        // Blue - informational
  },
  
  // Neutral grays
  gray: {
    50:  '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Special purpose
  background: {
    primary: '#FFFFFF',      // Main background
    secondary: '#F8F9FA',    // Cards, sections
    elevated: '#FFFFFF',     // Modals, overlays
    inverse: '#1A1A1A',      // Dark mode primary
  },
  
  // Money-specific colors
  money: {
    positive: '#00C853',     // Income, positive balance
    negative: '#FF3D00',     // Expenses, negative
    neutral: '#616161',      // Zero, neutral state
    allocated: '#2196F3',    // Allocated funds
    available: '#4CAF50',    // Available funds
    warning: '#FFA726',      // Low balance
    danger: '#EF5350',       // Overdrawn
  }
};
```

### Dark Mode Palette
```javascript
const darkColors = {
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    elevated: '#2C2C2C',
  },
  // Adjusted colors for dark mode contrast
  primary: {
    500: '#64B5F6',  // Lighter blue for dark backgrounds
  },
  gray: {
    50:  '#303030',
    100: '#424242',
    // ... inverted scale
    900: '#F5F5F5',
  }
};
```

---

## Typography

### Font Family
```javascript
const typography = {
  fontFamily: {
    primary: 'TAYWingman',         // Custom font for headers & amounts
    secondary: 'SF Pro Display',   // iOS system font
    android: 'Roboto',            // Android system font
    mono: 'SF Mono',              // Monospace for numbers
  },
  
  // Font sizes follow 4pt grid
  fontSize: {
    // Display
    display1: 48,  // Main balance display
    display2: 36,  // Large headers
    display3: 28,  // Section headers
    
    // Text
    h1: 24,        // Screen titles
    h2: 20,        // Section titles
    h3: 18,        // Card titles
    body1: 16,     // Default body text
    body2: 14,     // Secondary text
    caption: 12,   // Small text, labels
    micro: 10,     // Tiny labels
    
    // Special
    amount: 32,    // Money amounts
    button: 16,    // Button text
  },
  
  fontWeight: {
    thin: '100',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
};
```

### Text Styles
```javascript
const textStyles = {
  // Headers
  screenTitle: {
    fontFamily: 'TAYWingman',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.gray[900],
  },
  
  sectionHeader: {
    fontFamily: 'TAYWingman',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.gray[800],
    textTransform: 'uppercase',
  },
  
  // Money displays
  balanceLarge: {
    fontFamily: 'TAYWingman',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    // Color changes based on amount
  },
  
  balanceSmall: {
    fontFamily: 'SF Mono',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.gray[700],
  },
  
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.gray[500],
    letterSpacing: 0.4,
  }
};
```

---

## Spacing & Layout

### Grid System
```javascript
const spacing = {
  // 4pt grid system
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Component-specific
  screenPadding: 16,
  cardPadding: 16,
  listItemPadding: 12,
  buttonPadding: 12,
};

const layout = {
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 8,
    },
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
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  message: {
    fontSize: typography.fontSize.body1,
    color: colors.gray[600],
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
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...layout.shadow.sm,
  },
  
  elevated: {
    backgroundColor: colors.background.elevated,
    ...layout.shadow.md,
  },
  
  interactive: {
    // Adds press state
    activeOpacity: 0.7,
  }
};
```

### Buttons
```javascript
const buttonStyles = {
  primary: {
    backgroundColor: colors.primary[500],
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  
  text: {
    fontSize: typography.fontSize.button,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  
  pressed: {
    transform: [{ scale: 0.98 }],
  }
};
```

### Envelope Cards
```javascript
const envelopeCard = {
  container: {
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...layout.shadow.sm,
  },
  
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  
  contentContainer: {
    flex: 1,
  },
  
  balanceContainer: {
    alignItems: 'flex-end',
  },
  
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[200],
    borderRadius: layout.borderRadius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    // backgroundColor changes based on fill percentage
    // 0-25%: colors.money.danger
    // 25-50%: colors.money.warning
    // 50-100%: colors.money.available
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
  envelope: envelopeCard,
};
```