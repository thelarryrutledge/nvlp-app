# NVLP - Development Setup & Design System Guide

This comprehensive guide covers both development environment setup and the complete design system for NVLP.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Design System](#design-system)
3. [IDE Configuration](#ide-configuration)
4. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

#### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   # macOS with Homebrew
   brew install node
   
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **pnpm** (v8 or higher)
   ```bash
   # Via corepack (recommended)
   corepack enable
   corepack prepare pnpm@latest --activate
   
   # Or via npm
   npm install -g pnpm
   ```

3. **Supabase CLI**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # npm/pnpm
   pnpm add -g supabase
   ```

#### Recommended Tools
- **VS Code** with ESLint, Prettier, TypeScript extensions
- **Git GUI client** (optional): GitHub Desktop, SourceTree, or GitKraken

### Project Setup

#### 1. Clone and Install
```bash
git clone https://github.com/[your-org]/nvlp-app.git
cd nvlp-app
pnpm install
```

#### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
# Required
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# API Configuration
API_URL=http://localhost:3000
NODE_ENV=development

# Mobile Deep Link Configuration
DEEP_LINK_SCHEME=nvlp
DEEP_LINK_DOMAIN=nvlp.app
```

#### 3. Build and Verify
```bash
pnpm build
pnpm type-check
```

### Development Workflow

```bash
# Start all packages in development
pnpm dev

# Package-specific commands
pnpm --filter @nvlp/api dev
pnpm --filter @nvlp/types build

# Testing and verification
pnpm type-check
pnpm clean
```

---

## Design System

### Design Philosophy

Modern, professional fintech application with clean aesthetics, subtle animations, and premium feel. Core principles:

1. **Clarity Over Cleverness** - Information hierarchy is paramount
2. **Subtle Sophistication** - Refined animations and transitions
3. **Trust Through Design** - Professional, secure, reliable appearance
4. **Delight in Details** - Micro-interactions that feel premium
5. **Accessibility First** - High contrast, clear typography, intuitive navigation

### Color Palette

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
  
  // Semantic colors for quick access
  semantic: {
    primary: '#6A31F6',     // Primary action color
    success: '#009883',     // Success, positive amounts
    warning: '#DF8E27',     // Warning, low balance
    error: '#B91414',       // Error, overspending
    info: '#6A31F6',        // Info (using primary)
  },
  
  // Money-specific colors
  money: {
    positive: '#009883',     // Income, positive (success.500)
    negative: '#B91414',     // Expenses, negative (error.500)
    neutral: '#7E808F',      // Zero state (neutral.700)
    allocated: '#6A31F6',    // Allocated funds (primary.600)
    available: '#009883',    // Available funds (success.500)
    warning: '#DF8E27',      // Low balance (warning.500)
    danger: '#B91414',       // Overdrawn (error.500)
  },
};
```

### Typography

```javascript
const typography = {
  fontFamily: {
    primary: 'TAYWingman',         // Custom font for headers & amounts
    secondary: 'SF Pro Display',   // iOS system font
    android: 'Inter',             // Cross-platform alternative
    mono: 'SF Mono',              // Monospace for numbers
  },
  
  fontSize: {
    // Headers
    largeTitle: 34,  // Main screen titles
    title1: 28,      // Section headers  
    title2: 22,      // Subsection headers
    title3: 20,      // Card headers
    
    // Body
    headline: 17,    // Emphasized body
    body: 17,        // Default body text
    callout: 16,     // Slightly smaller body
    subheadline: 15, // Supporting text
    footnote: 13,    // Secondary info
    caption1: 12,    // Small labels
    caption2: 11,    // Tiny labels
    
    // Money amounts
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
};
```

### Spacing & Layout

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
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 40,
      elevation: 8,
    },
  },
};
```

### Component Patterns

#### Button Styles
```javascript
const buttonStyles = {
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
  
  variants: {
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
  },
};
```

#### Card Styles
```javascript
const cardStyles = {
  base: {
    backgroundColor: colors.background.elevated,
    borderRadius: layout.borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
};
```

#### Bottom Sheets
```javascript
const bottomSheetStyles = {
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
    paddingBottom: 34, // iPhone X+ safe area
  },
  
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: layout.borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  
  // Usage patterns
  usage: {
    forms: ['Add Transaction', 'Edit Envelope', 'Create Budget'],
    selections: ['Select Envelope', 'Select Category', 'Select Payee'],
    modals: ['Confirm Delete', 'Success Message', 'Error Alert'],
  },
};
```

### Transaction List Items (from Figma)
```javascript
const transactionItemStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 20,
    gap: 12,
    height: 68,
    borderRadius: 9999, // Full rounded
    backgroundColor: '#F4F2FF', // Light purple tint
  },
  
  avatar: {
    container: {
      width: 52,
      height: 52,
      borderRadius: 9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    profile: {
      backgroundColor: '#EFB100', // Gold background
    },
    
    icon: {
      backgroundColor: '#1E2939', // Dark gray background
      iconSize: 31.2,
    },
  },
  
  content: {
    name: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      color: '#1E2939',
    },
    
    timestamp: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#6A7282',
    },
    
    amount: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
      textAlign: 'right',
      color: '#1E2939',
    },
  },
  
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
    
    positive: {
      backgroundColor: '#00BC7D', // Green
    },
    
    negative: {
      backgroundColor: '#FB2C36', // Red
    },
  },
};
```

### Icons & Assets

#### Core Icons
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
  
  // Status
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  error: 'close-circle-outline',
  info: 'information-circle-outline',
};

const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,  // Default
  lg: 32,
  xl: 40,
};
```

#### Logo Assets
- `/assets/logo/FullLogo_Transparent_NoBuffer.png` - Full logo (recommended)
- `/assets/logo/IconOnly_Transparent_NoBuffer.png` - Icon only
- `/assets/fonts/TAYWingman.otf` - Custom font file

### Animation Patterns

```javascript
const animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  easing: {
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

## IDE Configuration

### VS Code Setup

#### Settings (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

#### Debug Configuration (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/packages/api/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/packages/api/dist/**/*.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

1. **pnpm install fails**
   - Clear cache: `pnpm store prune`
   - Delete `node_modules` and `pnpm-lock.yaml`, then reinstall

2. **TypeScript errors**
   - Ensure all packages are built: `pnpm build`
   - Check VS Code is using workspace TypeScript version

3. **Supabase connection errors**
   - Verify `.env` file exists and has correct values
   - Check Supabase project is active (not paused)
   - For local dev, ensure `supabase start` is running

4. **Port conflicts**
   - API defaults to port 3000
   - Change in environment variables if needed

### Verification Steps

```bash
# Check versions
node --version  # Should be v18+
pnpm --version  # Should be v8+

# Check project health
pnpm type-check # Should complete without errors
pnpm build      # Should build all packages

# Test API connection (if configured)
curl http://localhost:3000/health
```

### Getting Help

- Check `/docs/` directory for comprehensive documentation
- Review `CLAUDE.md` for AI assistant guidance
- Consult `REACT_NATIVE_ROADMAP.md` for development phases

---

## Design System Export

```javascript
// Complete theme export for React Native
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
  bottomSheet: bottomSheetStyles,
  transactionItem: transactionItemStyles,
  icons: iconMap,
};
```

This consolidated guide provides everything needed to set up development and implement the NVLP design system consistently across all platforms.