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
**Current Phase**: Phase 4.1 Budget Management (IN PROGRESS)  
**Latest Completed**: Authentication token management fix (budget list authentication error resolved)
**Phase 4.1 Status**: Budget list screen complete ✅, authentication fixed ✅, budget creation form pending
**Progress**: Project setup ✅, Core dependencies ✅, State management ✅, API client integration ✅, Navigation architecture ✅, Auth screens ✅, Design system ✅, Onboarding flow ✅, Token management ✅
**Tech Stack**: React Native 0.80, TypeScript, React Navigation 6, Reanimated 3, @nvlp/client, React Native Biometrics, React Native Image Picker
**Next Phase**: Complete Phase 4.1 Budget Management → Phase 4.2 Dashboard Screen

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