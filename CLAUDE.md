# CLAUDE.md - Project Context and Preferences

## Project Overview: NVLP (Virtual Envelope Budgeting App)
**App Type**: Personal finance management with virtual envelope budgeting methodology
**Platforms**: React Native mobile app (iOS/Android) + future web app
**Backend**: Supabase (PostgreSQL + Edge Functions) with hybrid API architecture
**Current Focus**: Mobile app development (React Native roadmap phases 3-12)

## Current Status: MONOREPO SETUP COMPLETE ✅
**Migration Progress**: Successfully completed all phases and merged to main branch
**Date Completed**: July 16, 2025
**Next Phase**: Mobile app implementation following react-native-roadmap.md

## Important Development Notes

### Supabase Configuration
- **Remote-only Supabase** - NO local Docker/containers
- Edge functions developed locally, deployed to remote
- Testing against remote Supabase instance only
- Use `supabase functions deploy` for deployment

### Project Structure (Monorepo)
- `/apps/mobile` - React Native app with workspace deps
- `/apps/api` - Supabase Edge Functions (remote deployment)
- `/packages/types` - Shared TypeScript types (@nvlp/types)
- `/packages/client` - API client library (@nvlp/client)
- `/packages/config` - Shared configurations (@nvlp/config)

### Commands to Remember
- `pnpm build:packages` - Build shared packages first
- `pnpm dev` - Start all development servers
- `pnpm test`, `pnpm lint`, `pnpm type-check` - Quality checks
- `pnpm clean` - Clean build artifacts
- `pnpm deploy:api` - Deploy Edge Functions

## Architecture Decisions
- **Hybrid API**: PostgREST for fast CRUD (<50ms) + Edge Functions for complex logic
- **Remote-only Supabase**: No local containers, test against production instance
- **Monorepo structure**: Shared packages for types, client, config across mobile/web
- **Performance focus**: PostgREST avoids Edge Function cold starts (2-10s delay)

## Key Technical Details

### Workspace Configuration
- **pnpm workspaces** with `workspace:*` protocol
- **Metro bundler** configured for monorepo with watchFolders
- **TypeScript** strict mode with cross-package type checking
- **Build order**: types → client → apps (dependency-aware)

### Mobile App Configuration
- **iOS**: Bundle ID `com.nvlp.mobile`, deployment target iOS 15.0
- **Android**: App ID `com.nvlp.mobile`, SDK 35, ProGuard enabled
- **Version sync**: Automatic from package.json to platform configs
- **New Architecture**: Enabled, Hermes JS engine

### CI/CD Features
- **Multi-layer caching**: pnpm, Turbo, TypeScript, ESLint
- **Matrix builds**: Ubuntu/macOS, Node 18/20
- **Change detection**: Selective CI runs for monorepo optimization
- **Build validation**: Mobile bundle validation, Edge Functions linting

## Error Fixes Applied (Reference)
- JWT parsing null checks in token-manager.ts
- TypeScript strict mode compatibility (null vs undefined)
- ESLint config renamed to .cjs for CommonJS
- Types package exports fixed for ESM/CJS dual mode
- Metro config updated for workspace package resolution
- Android build issues: gradle plugin path, codegen dependency, package structure

## Core App Info
- **Supabase project**: qnpatlosomopoimtsmsr
- **Test user**: larryjrutledge@gmail.com / Test1234!
- **App purpose**: Virtual envelope budgeting system for personal finance management
- **Core features**: Budget creation, envelope allocation, transaction tracking, financial insights
- **API architecture**: Hybrid PostgREST (fast CRUD) + Edge Functions (complex logic)

## Mobile App Development Status
**Roadmap**: 12-phase React Native implementation plan
**Current Phase**: Phase 5.2 Envelope Management (IN PROGRESS - 3/6 subtasks complete)  
**Latest Completed**: Envelope creation/edit form (Phase 5.2.3 COMPLETE ✅)
**Phase 4.1 Status**: Budget list screen complete ✅, authentication fixed ✅, budget creation form complete ✅, budget editing functionality complete ✅, budget switching mechanism complete ✅, budget settings screen complete ✅, budget deletion with confirmation complete ✅
**Phase 4.2 Status**: Dashboard Screen complete ✅, quick action buttons complete ✅
**Phase 4.3 Status**: Income sources list screen complete ✅, income source form complete ✅, frequency picker dropdown complete ✅, rounding error database fixes complete ✅, income calendar view complete ✅, income tracking notifications complete ✅, income history screen complete ✅
**Phase 5.1 Status**: Categories list screen complete ✅, category creation/edit form complete ✅, category icon picker complete ✅, category color picker complete ✅, category reordering functionality complete ✅, category deletion complete ✅
**Progress**: Project setup ✅, Core dependencies ✅, State management ✅, API client integration ✅, Navigation architecture ✅, Auth screens ✅, Design system ✅, Onboarding flow ✅, Token management ✅, Budget management ✅, Dashboard screen ✅, Income Management ✅, Category Management ✅
**Tech Stack**: React Native 0.80, TypeScript, React Navigation 6, Reanimated 3, @nvlp/client, React Native Biometrics, React Native Image Picker, React Native Draggable FlatList
**Next Subtask**: Phase 5.2.4 Envelope Funding Interface

### Recent Completed Tasks (Phase 5.2):
**Envelope List Screen Implementation (Phase 5.2.1):**
- ✅ Created comprehensive envelope list screen with balance display and envelope type grouping
- ✅ Implemented envelope visualization with custom icons, colors, and type-specific badges
- ✅ Added envelope balance display with positive/negative indication and currency formatting
- ✅ Built envelope type grouping (Regular, Savings, Debt) with section headers and counts
- ✅ Integrated active/inactive envelope filtering with visual distinction
- ✅ Added debt-specific information display (debt balance, minimum payments)
- ✅ Implemented savings goal progress bars with visual completion indicators  
- ✅ Created notification indicators for envelopes with alerts enabled
- ✅ Added comprehensive summary statistics (total balance, active count, total debt)
- ✅ Integrated with budget context for automatic budget-based filtering
- ✅ Implemented navigation placeholders for envelope detail and form screens
- ✅ Added proper error handling, loading states, and empty state messaging
- ✅ Replaced MainTabs placeholder screen with fully functional EnvelopeListScreen

**Envelope Detail Screen Implementation (Phase 5.2.2):**
- ✅ Created comprehensive envelope detail screen with complete envelope information display
- ✅ Implemented envelope header with large icon, name, description, and status indicators
- ✅ Added prominent balance display with negative balance warnings and currency formatting
- ✅ Built savings goal progress visualization with completion percentage and remaining amount
- ✅ Created debt information section with debt balance, minimum payments, and due dates
- ✅ Implemented notification settings display showing alert thresholds and status
- ✅ Added recent transactions placeholder section (ready for Phase 6 integration)
- ✅ Created envelope metadata display with creation date, last updated, and sort order
- ✅ Implemented comprehensive action buttons for Fund, Transfer, Edit, and Delete operations
- ✅ Added proper navigation integration with MainStack and route parameter handling
- ✅ Integrated envelope type-specific features (savings goals, debt management, regular envelopes)
- ✅ Added proper error handling, loading states, and retry functionality
- ✅ Implemented pull-to-refresh functionality for real-time data updates

**Envelope Creation/Edit Form Implementation (Phase 5.2.3):**
- ✅ Created comprehensive envelope form with creation and editing capabilities
- ✅ Implemented envelope type selection with Regular, Savings, and Debt options
- ✅ Built category integration with category picker and visual indicators
- ✅ Added comprehensive form validation with real-time error feedback
- ✅ Implemented envelope customization with color and icon pickers
- ✅ Built debt-specific fields (debt balance, minimum payment, due date)
- ✅ Created notification settings with savings goal and alert threshold configuration
- ✅ Added envelope status management (active/inactive toggle)
- ✅ Implemented type-specific field visibility and validation logic
- ✅ Built modal-based pickers for envelope type, category, color, and icon selection
- ✅ Added proper form state management with change detection
- ✅ Integrated with envelope service API for create and update operations
- ✅ Added proper navigation integration with MainStack as modal presentation
- ✅ Implemented comprehensive loading states and error handling

### Recent Completed Tasks (Phase 5.1):
**Category Management (Phase 5.1):**
- ✅ Created comprehensive category list screen with type-based filtering (expense/income/transfer)
- ✅ Built full-featured category creation/edit form with real-time validation
- ✅ Implemented professional icon picker with 38 Ionicons line-style icons
- ✅ Added color picker with 10 carefully selected financial app colors
- ✅ Created drag-and-drop category reordering functionality using react-native-draggable-flatlist
- ✅ Fixed scrolling issues with nested ScrollView containing DraggableFlatList
- ✅ Implemented category deletion with confirmation for user categories
- ✅ Added system vs custom category separation with appropriate restrictions
- ✅ Created comprehensive category visual preview with icon and color
- ✅ Integrated professional line icons replacing emoji-based icons
- ✅ Added proper TypeScript error handling for form validation

**Recent Completed Tasks (Phase 4.2 & 4.3):**
**Dashboard Screen (Phase 4.2):**
- ✅ Built comprehensive dashboard with financial overview display
- ✅ Added budget balance visualization with spending insights
- ✅ Integrated envelope summary cards showing allocation status
- ✅ Created quick action buttons in header for easy navigation
- ✅ Fixed budget loading after login with proper auth state handling
- ✅ Added API routing fixes with custom domain Edge Functions

**Income Source Management (Phase 4.3):**
- ✅ Created income sources list screen with active/inactive grouping
- ✅ Built comprehensive income source form with frequency-specific configuration
- ✅ Implemented clean dropdown frequency picker (replaced cluttered radio group)
- ✅ Added support for all income frequencies: weekly, bi-weekly, twice monthly (15th/last day), monthly, annually, custom, one-time
- ✅ Fixed database schema mismatch between TypeScript types and actual columns
- ✅ Implemented "Last Day of Month" option for monthly schedules using -1 convention
- ✅ Added dynamic amount labels that change based on selected frequency
- ✅ Created proper validation for frequency-specific fields
- ✅ Fixed Budget Settings screen icon (cash-outline for Income Sources)

### Recent Completed Tasks (Phase 3.1 & 3.2):
**Authentication & Core Screens:**
- ✅ Set up authentication flow with stack navigator
- ✅ Created main app navigation with tab navigation
- ✅ Implemented navigation guards for protected routes
- ✅ Set up navigation state persistence with AsyncStorage
- ✅ Implemented deep linking support for email verification (nvlp://)
- ✅ Built login screen with email/password and visibility toggle
- ✅ Created registration screen with validation and email confirmation
- ✅ Implemented forgot password flow with email reset
- ✅ Created loading/splash screen for auth state transitions
- ✅ Implemented biometric authentication (TouchID/FaceID/Fingerprint) with react-native-biometrics

**Design System & Theme (Professional Financial Green):**
- ✅ Transitioned from blue to sophisticated financial emerald green theme
- ✅ Implemented premium background colors: light mode `#E8F5EF`, dark mode `#141A18`
- ✅ Updated all navigation headers to use green theme instead of blue
- ✅ Fixed hardcoded background colors across all screens to use theme
- ✅ Created Color Test screen for theme validation and comparison
- ✅ Cleaned up unused legacy ProfileScreen component

**Enhanced Profile & Onboarding:**
- ✅ Created InitialBudgetSetupScreen with 2-step wizard (name, income, envelope allocation)
- ✅ Enhanced ProfileScreen with comprehensive settings sections
- ✅ Integrated ProfileImagePicker with camera/photo library support
- ✅ Added iOS permissions for camera and photo library access
- ✅ Implemented biometric authentication toggle in profile settings
- ✅ Added theme preferences (light/dark/system) with persistence

**Permission System (Phase 3.2 Final):**
- ✅ Built simplified permission service using React Native built-in APIs (removed react-native-permissions dependency)
- ✅ Created PermissionRequestScreen for onboarding flow with status tracking
- ✅ Implemented native permission handling for camera, photo library, and notifications
- ✅ Connected ProfileImagePicker to request permissions when accessing camera/photos
- ✅ Added permission toggle functionality in Profile settings with proper error handling
- ✅ Integrated permission navigation and testing tools in Developer section

### Technical Implementation Details:
- **Token Management**: Keychain secure storage with biometric protection, automatic refresh, JWT parsing, expiration monitoring, AsyncStorage migration support
- **Error Handling**: Comprehensive error types with user-friendly messages and logging
- **Interceptors**: Modular system for requests/responses with auth, retry, logging, and offline interceptors
- **API Services**: Domain-specific services (auth, budget, envelope, user) with centralized client
- **React Integration**: Context providers, hooks, and HOCs for authentication state
- **Offline Support**: Queue system with persistence, priority handling, automatic retry, and React hooks for monitoring
- **Retry Manager**: Configurable retry logic with exponential backoff, abort support, and retry status monitoring
- **Biometric Authentication**: Secure credential storage with react-native-keychain, proper iOS/Android permissions, vector icons integration

### Authentication Token Management Fix (July 20, 2025):
- **Issue**: Budget list authentication errors caused by stale tokens persisting in iOS Keychain after logout
- **Root Cause**: `Keychain.resetInternetCredentials()` silently failing to clear credentials properly
- **Solution**: Implemented aggressive keychain clearing with verification and fallback methods in `tokenManager.ts`
- **Fix Details**: 
  - Standard reset attempt with post-clear verification
  - Alternative clearing method (empty credentials + reset) if standard fails
  - Proper token clearing from all storage locations (AsyncStorage + Keychain)
  - Fixed logout flow to completely clear authentication state
- **Result**: Budget authentication errors resolved, proper logout behavior restored

### Budget Creation Form Implementation (July 20, 2025):
- **Feature**: Complete budget creation form with validation, business rules, and smart defaults
- **UI Components**: Modal presentation with form sections, toggle switches, character counters
- **Validation**: Real-time validation for name (required, 3-50 chars) and description (optional, max 200 chars)
- **Business Rules**: Only active budgets can be set as default, automatic default switching
- **Smart Behavior**: 
  - Auto-refresh budget list on form close
  - Default toggle disables when Active is turned off
  - Two-step creation (create + update) to handle default switching properly
  - Database triggers handle automatic default budget management
- **Database Fixes**: Fixed envelope creation trigger and default budget constraint handling
- **Type System**: Updated CreateBudgetInput to include is_active and is_default fields

### Budget Editing Functionality Implementation (July 20, 2025):
- **Feature**: Complete budget editing screen with change detection and pre-populated data
- **Navigation**: Edit button in budget list navigates to modal edit screen with budget ID parameter
- **Data Loading**: Automatic budget data fetching on screen mount with error handling and retry
- **Form UI**: Identical design to creation form with all fields pre-populated from existing budget
- **Change Detection**: Only saves when actual changes are detected, prevents unnecessary API calls
- **Validation**: Same business rules as creation (active-only defaults, field validation)
- **Error Handling**: Comprehensive error states for data loading failures and update errors
- **UX Features**:
  - Loading states for data fetch and form submission
  - Cancel confirmation if changes exist
  - Success feedback with automatic navigation back
  - Real-time character counters and field validation
- **API Integration**: Uses UpdateBudgetInput type with selective field updates

### Budget Switching Mechanism Implementation (July 20, 2025):
- **Feature**: Global budget selection with context-based state management and header integration
- **BudgetContext**: Complete state management for budget selection, loading, and error handling
- **BudgetSwitcher Component**: Dropdown modal with active/inactive budget sections and visual indicators
- **Navigation Integration**: Header-mounted switcher across Dashboard, Envelopes, and Transactions screens
- **State Management**: 
  - Auto-selects default budget or first active budget on app load
  - Provides global budget state via React context
  - Integrated with existing budget list screen for unified data management
- **UI Features**:
  - Header variant for compact navigation display
  - Modal picker with search-friendly layout
  - Visual badges for default budgets
  - Disabled state for inactive budgets
  - Empty state handling for no budgets
- **Integration**: 
  - BudgetProvider wraps entire app for global access
  - Updated BudgetListScreen to use shared context instead of local state
  - Header integration across multiple tab screens
  - Consistent sorting (default first, active, then inactive)

### Budget Settings Screen Implementation (July 20, 2025):
- **Feature**: Comprehensive budget configuration and management screen
- **Navigation**: Accessible from Settings button on budget cards in budget list
- **UI Sections**: 
  - Budget Information header with name, description, and status badges
  - Budget Information section with Edit Details navigation
  - Budget Status section with Active/Default toggles
  - Actions section with Duplicate and Delete options
- **Smart Behaviors**:
  - Auto-handles budget selection when deactivating currently selected budget
  - Prevents deletion of last remaining budget with helpful message
  - Duplicate budget creates copy with "(Copy)" suffix as active, non-default
  - Real-time status badge updates (Default, Current, Active/Inactive)
- **Business Logic**:
  - Only active budgets can be set as default (disabled toggle with explanation)
  - Deleting selected budget auto-selects next available active budget
  - Comprehensive confirmation dialogs for destructive actions
  - Integrated with budget context for immediate state updates
- **Error Handling**:
  - Graceful loading states and error recovery
  - Detailed error messages for all operations
  - Retry mechanisms for data loading failures
- **Integration**: Full integration with BudgetContext and navigation stack

### Dashboard Screen Implementation (July 20, 2025):
- **Feature**: Complete dashboard with comprehensive financial overview and data visualization
- **Data Source**: Integrated with existing dashboard Edge Function endpoint providing cached data
- **Dashboard Components**:
  - Budget Overview: Available amount, allocated amount, total budget with visual emphasis
  - Income vs Expenses: 30-day summary with net flow calculation and color coding
  - Top Envelopes: Ranked list of envelope balances with category information
  - Spending by Category: Breakdown of expenses by category for insight
  - Recent Transactions: Latest 8 transactions with payee, date, and amount formatting
- **Technical Implementation**:
  - Created DashboardData types and service layer for API integration
  - Service uses existing dashboard endpoint with budget_id parameter
  - Comprehensive error handling and loading states
  - Pull-to-refresh functionality for real-time data updates
  - Budget context integration for automatic data refresh on budget changes
- **UX Features**:
  - Currency formatting with proper locale support
  - Date formatting for better readability
  - Color-coded positive/negative amounts (green/red)
  - Empty states for no data scenarios
  - Loading and error states with user-friendly messages
  - Responsive layout adapting to different data sets
- **Data Integration**: 
  - Real-time budget switching updates dashboard automatically
  - Cached data from Edge Function (5-minute TTL) for performance
  - Handles missing data gracefully with empty state messaging
  - Integrated with budget context for seamless budget selection

### Biometric Authentication Implementation (Phase 3.1 Complete):
- **iOS Setup**: NSFaceIDUsageDescription in Info.plist required for Face ID
- **Android Setup**: USE_BIOMETRIC + USE_FINGERPRINT permissions in AndroidManifest.xml
- **Keychain Integration**: Fixed react-native-keychain API usage with proper type checking
- **Vector Icons**: VectorIconsPackage integration + font assets copying for Android
- **Error Handling**: Enhanced logging for credential storage/retrieval debugging
- **Security**: Credentials stored securely in device keychain, removed on auth failure
- **UX Flow**: Profile toggle → password verification → credential storage → biometric login option

## Development Workflow
1. Install: `pnpm install`
2. Build packages: `pnpm build:packages`
3. Start development: `pnpm dev`
4. Mobile: `cd apps/mobile && pnpm start && pnpm ios/android`
5. Quality checks: `pnpm type-check && pnpm lint && pnpm test`
6. Deploy API: `pnpm deploy:api`

## Key References
- `apps/mobile/docs/react-native-roadmap.md` - 12-phase mobile development plan
- `packages/types/` - Shared TypeScript definitions (@nvlp/types)
- `packages/client/` - API client library (@nvlp/client)
- Supabase dashboard: https://supabase.com/dashboard/project/qnpatlosomopoimtsmsr

## Important Notes for Development
- Always run `pnpm build:packages` before starting development
- Mobile app follows strict roadmap phases - check react-native-roadmap.md
- Use workspace dependencies with `workspace:*` protocol
- Test against remote Supabase only (no local setup)
- Edge Functions deploy with `supabase functions deploy`