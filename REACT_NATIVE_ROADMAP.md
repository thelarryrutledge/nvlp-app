# React Native App Development Roadmap (Pure React Native)

## Overview
Build a pure React Native mobile app for NVLP that provides a native mobile experience for iOS and Android, leveraging the existing API infrastructure without Expo dependencies.

## Tech Stack
- **Framework**: React Native (CLI - no Expo)
- **State Management**: Zustand (lightweight) or Redux Toolkit
- **Navigation**: React Navigation v6
- **UI Components**: React Native Elements + Custom native components
- **API Client**: @nvlp/client package (existing)
- **Authentication**: Supabase Auth with native secure storage
- **Forms**: React Hook Form + Zod validation
- **Styling**: StyleSheet + Themed design system
- **Storage**: react-native-keychain (secure), @react-native-async-storage/async-storage (general)

---

## Phase 1: Foundation & Setup (Week 1)

### 1.1 Project Initialization
- [x] Initialize React Native CLI project in monorepo (`npx react-native init`)
- [x] Configure TypeScript with shared types from @nvlp/types
- [x] Set up ESLint, Prettier with monorepo config
- [x] Configure Metro bundler for monorepo support
- [x] Set up iOS (CocoaPods) and Android (Gradle) configurations
- [x] Configure Flipper for debugging

### 1.2 Native Dependencies Setup
- [x] Install & link react-navigation and dependencies
- [x] Set up react-native-gesture-handler
- [x] Configure react-native-reanimated
- [x] Install react-native-safe-area-context
- [x] Set up react-native-screens for native navigation
- [x] Configure react-native-vector-icons

### 1.3 Core Infrastructure
- [x] Implement secure token storage (react-native-keychain)
- [x] Set up AsyncStorage for general data persistence
- [x] Create API client wrapper using @nvlp/client
- [x] Configure react-native-config for environment variables
- [x] Implement global error boundary
- [x] Set up Reactotron for development debugging

### 1.4 Authentication Foundation
- [x] ~~Install react-native-app-auth for OAuth flows~~ (replaced with magic link approach)
- [x] Configure deep linking (iOS Universal Links, Android App Links)
- [x] Set up magic link authentication with deep linking
- [x] Create DeepLinkService for URL parsing and handling
- [x] Implement useMagicLink hook for authentication state
- [x] Create MagicLinkTestPanel for development testing
- [x] Create auth state management with persistence

### 1.5 Enhanced Security Layer (PIN/Biometric) [SKIPPED - Post-MVP]
**Decision**: Skipped for MVP. Magic link + device management provides sufficient security for non-financial data. Can revisit if users request it or if we add bank account connections in the future.

- [ ] ~~Install react-native-biometrics for Face ID/Touch ID/Fingerprint~~
- [ ] ~~Install react-native-keychain for secure PIN storage~~
- [ ] ~~Create PIN setup flow (4-6 digit PIN)~~
- [ ] ~~Implement PIN entry screen with custom keypad~~
- [ ] ~~Add biometric authentication option~~
- [ ] ~~Create security settings screen (enable/disable PIN, biometric, change PIN)~~
- [ ] ~~Implement app lock on background/foreground transitions~~
- [ ] ~~Add auto-lock timer settings (immediate, 1 min, 5 min, etc.)~~
- [ ] ~~Create "forgot PIN" flow (requires new magic link)~~
- [ ] ~~Add failed attempt limiting with exponential backoff~~

### 1.6 Trusted Device Management
- [x] Install react-native-device-info for device fingerprinting
- [x] Install react-native-get-random-values for UUID generation
- [x] Create device utilities (generate device ID, fingerprint, device info)
- [x] Implement device registration on successful magic link auth
- [x] Add device ID to API client headers (X-Device-ID)
- [x] Handle SESSION_INVALIDATED error responses from API
- [x] Create device management hook (useDeviceManagement)
- [x] Build "Active Sessions" screen in security settings
- [x] Build device list component with swipe-to-delete
- [ ] Add "Sign out all other devices" functionality
- [ ] Add "Sign out this device" option
- [ ] Show device details (name, model, location, last seen)
- [ ] Handle new device notifications (in-app alerts)
- [ ] Add device name customization feature

---

## Phase 2: Core Budget Management (Week 2)

### 2.1 Navigation Structure
- [ ] Implement bottom tab navigator with native feel
- [ ] Create stack navigators for each tab
- [ ] Set up modal navigation for transactions
- [ ] Configure header styles per platform
- [ ] Implement navigation state persistence

### 2.2 Budget Core Features
- [ ] Budget selector with native picker
- [ ] Budget list screen with FlatList optimization
- [ ] Create/edit budget forms
- [ ] Native action sheets for budget options (react-native-action-sheet)
- [ ] Swipe actions using react-native-swipe-list-view

### 2.3 Dashboard Implementation
- [ ] Main dashboard layout with ScrollView
- [ ] Available amount display with animations
- [ ] Native pull-to-refresh (RefreshControl)
- [ ] Recent transactions with optimized FlatList
- [ ] Quick action buttons with haptic feedback

---

## Phase 3: Envelope System (Week 3)

### 3.1 Envelope Display
- [ ] SectionList for category-grouped envelopes
- [ ] Custom envelope card component
- [ ] Progress bars using react-native-svg
- [ ] Animated balance updates (react-native-reanimated)
- [ ] Search implementation with native TextInput

### 3.2 Envelope Management
- [ ] Envelope CRUD operations
- [ ] Native modal for envelope editing
- [ ] Amount input with custom number pad
- [ ] Category picker with hierarchical display
- [ ] Target date picker (react-native-date-picker)

### 3.3 Envelope Interactions
- [ ] Drag-to-reorder (react-native-draggable-flatlist)
- [ ] Swipe actions for quick operations
- [ ] Long press context menus
- [ ] Batch selection mode
- [ ] Transfer flow between envelopes

---

## Phase 4: Transaction Management (Week 4)

### 4.1 Transaction Input
- [ ] Custom transaction form with type switching
- [ ] Native amount keypad component
- [ ] Autocomplete for payees/sources (custom implementation)
- [ ] Date picker integration
- [ ] Camera integration for receipts (react-native-camera/react-native-vision-camera)
- [ ] Image storage strategy

### 4.2 Transaction Display
- [ ] Optimized transaction list (FlashList or optimized FlatList)
- [ ] Transaction filtering with native controls
- [ ] Group headers for date grouping
- [ ] Transaction detail modal
- [ ] Edit/delete capabilities with confirmation

### 4.3 Performance Optimization
- [ ] Implement virtualization properly
- [ ] Use InteractionManager for heavy operations
- [ ] Optimize re-renders with React.memo
- [ ] Implement pagination for large datasets
- [ ] Cache transaction data locally

---

## Phase 5: Money Flow Features (Week 5)

### 5.1 Income & Allocation
- [ ] Income source management screens
- [ ] Allocation flow with visual feedback
- [ ] Income tracking and history
- [ ] Expected vs actual comparisons
- [ ] Quick allocation templates

### 5.2 Expense Tracking
- [ ] Payee management interface
- [ ] Expense categorization
- [ ] Quick expense entry
- [ ] Favorite payees for quick access
- [ ] Location-based payee suggestions (react-native-geolocation)

### 5.3 Advanced Transactions
- [ ] Transfer between envelopes UI
- [ ] Debt payment tracking
- [ ] Split transaction support
- [ ] Transaction templates
- [ ] Recurring transaction setup

---

## Phase 6: Data Visualization (Week 6)

### 6.1 Charts Implementation
- [ ] Install react-native-svg-charts or victory-native
- [ ] Spending by category pie chart
- [ ] Monthly trends line graph
- [ ] Income vs expenses bar chart
- [ ] Envelope fill rates visualization
- [ ] Custom chart animations

### 6.2 Reports & Analytics
- [ ] Report screen layouts
- [ ] Period selection controls
- [ ] Native share functionality (react-native-share)
- [ ] PDF generation (react-native-pdf)
- [ ] CSV export capability

### 6.3 Insights
- [ ] Spending pattern analysis
- [ ] Budget health indicators
- [ ] Predictive balance projections
- [ ] Anomaly detection alerts
- [ ] Goal tracking visualizations

---

## Phase 7: Offline & Sync (Week 7)

### 7.1 Offline Architecture
- [ ] Implement Redux Persist or custom persistence
- [ ] Queue system for offline transactions
- [ ] Conflict resolution strategy
- [ ] Background sync (react-native-background-task)
- [ ] Network state monitoring (NetInfo)

### 7.2 Data Caching
- [ ] Implement strategic caching layers
- [ ] Cache invalidation logic
- [ ] Optimistic UI updates
- [ ] Sync status indicators
- [ ] Error recovery mechanisms

### 7.3 Performance
- [ ] Implement react-native-mmkv for fast storage
- [ ] Optimize bundle size with Hermes
- [ ] Code splitting strategies
- [ ] Native module optimization
- [ ] Memory management improvements

---

## Phase 8: Security Integration (Week 8)

### 8.1 Device Management Implementation
- [ ] Create device utilities module (`src/utils/device.ts`)
  ```typescript
  export const getDeviceId = () => string
  export const getDeviceFingerprint = () => Promise<string>
  export const getDeviceInfo = () => Promise<DeviceInfo>
  ```
- [ ] Create device management service wrapper (`src/services/deviceService.ts`)
- [ ] Add device registration to authentication flow
- [ ] Update API client to include device ID in headers
- [ ] Implement session invalidation error handling

### 8.1.1 API Integration (completed endpoints available)
- [ ] Integrate with `/functions/v1/device-management` endpoints:
  - POST `/register` - Device registration with email notifications
  - GET `/list` - Get user's active devices with details
  - DELETE `/:deviceId` - Sign out specific device
  - POST `/signout-all` - Sign out all other devices
- [ ] Integrate with enhanced auth system:
  - POST `/functions/v1/auth-magic-link` - Enhanced magic link with beautiful emails
  - Handle rate limiting and security headers from all endpoints
- [ ] Implement @nvlp/client package integration:
  - Use DeviceService class from client package
  - Handle SessionInvalidatedError responses
  - Implement event-driven session management

### 8.2 Security Settings UI
- [ ] Create SecuritySettingsScreen component
- [ ] Build ActiveSessionsScreen with FlatList
- [ ] Create DeviceCard component with device info display
- [ ] Add swipe-to-delete for device removal
- [ ] Build SignOutConfirmationModal
- [ ] Create DeviceDetailsBottomSheet
- [ ] Add device name editing capability

### 8.3 Session Management
- [ ] Create useSessionManagement hook
- [ ] Implement global session invalidation handler
- [ ] Add "Sign out all devices" button with confirmation
- [ ] Handle forced logout scenarios
- [ ] Clear sensitive data on session invalidation
- [ ] Add session status indicators

### 8.4 Security UX Enhancements
- [ ] Show "New device registered" notifications
- [ ] Add security alerts for suspicious activity
- [ ] Create device trust indicators in UI
- [ ] Add last login information display
- [ ] Implement security tips/recommendations screen

### 8.5 Enhanced Email Integration (from completed API)
- [ ] Handle enhanced email template system
- [ ] Display device registration email confirmations
- [ ] Show email notification preferences in settings
- [ ] Handle magic link authentication with enhanced templates
- [ ] Add email delivery status indicators

### 8.6 Advanced Session Management (from completed API)
- [ ] Implement session invalidation event handling (SESSION_INVALIDATED)
- [ ] Add automatic session refresh with device validation
- [ ] Handle rate limiting responses from auth endpoints
- [ ] Implement device cleanup notifications (180+ day inactive devices)
- [ ] Add session security analytics (login patterns, device changes)

### 8.7 Device Security Analytics
- [ ] Show device security score/status
- [ ] Display login history with location and device details
- [ ] Add suspicious activity alerts (multiple failed logins, new locations)
- [ ] Implement device trust scoring (new vs trusted devices)
- [ ] Show security recommendations based on device usage patterns

## Phase 9: Native Platform Features (Week 9)

### 8.1 iOS Specific
- [ ] iOS Widget Extension (WidgetKit)
- [ ] Siri Shortcuts integration
- [ ] 3D Touch quick actions
- [ ] Apple Pay integration (future)
- [ ] iOS-specific UI refinements

### 8.2 Android Specific
- [ ] Android Widget development
- [ ] Google Assistant actions
- [ ] Material Design compliance
- [ ] Android-specific permissions handling
- [ ] Adaptive icons and splash screens

### 8.3 Push Notifications
- [ ] Install react-native-push-notification
- [ ] Configure Firebase Cloud Messaging (Android)
- [ ] Configure Apple Push Notifications (iOS)
- [ ] Local notifications for reminders
- [ ] Notification preferences screen

---

## Phase 9: Polish & UX (Week 9)

### 9.1 Animations & Feedback
- [ ] Screen transition animations
- [ ] Micro-interactions with Reanimated 2
- [ ] Haptic feedback (react-native-haptic-feedback)
- [ ] Loading states with Lottie (lottie-react-native)
- [ ] Pull-to-refresh animations

### 9.2 Accessibility
- [ ] Screen reader support testing
- [ ] AccessibilityInfo implementation
- [ ] Dynamic font scaling support
- [ ] High contrast mode support
- [ ] Voice control compatibility

### 9.3 User Preferences
- [ ] Theme system (dark/light mode)
- [ ] Currency and locale settings
- [ ] Notification preferences
- [ ] Security settings (biometric, auto-lock)
- [ ] Data & privacy controls

---

## Phase 10: Testing & Release (Week 10)

### 10.1 Testing Strategy
- [ ] Unit tests with Jest
- [ ] Component tests with @testing-library/react-native
- [ ] Integration tests for API calls
- [ ] E2E tests with Detox
- [ ] Manual testing checklist

### 10.1.1 Device Management Testing (infrastructure available)
- [ ] Use existing email testing scripts (`scripts/test-email-templates.sh`)
- [ ] Test device registration with notification verification
- [ ] Test session invalidation scenarios
- [ ] Verify enhanced email templates render correctly on devices
- [ ] Use existing cleanup job testing for data validation
- [ ] Integration testing with @nvlp/client package SessionInvalidatedError handling

### 10.2 Build & Deploy
- [ ] Configure production builds
- [ ] Set up code signing (iOS)
- [ ] Configure ProGuard (Android)
- [ ] Implement CodePush for OTA updates
- [ ] Set up CI/CD with Fastlane

### 10.3 Store Submission
- [ ] App Store Connect configuration
- [ ] Google Play Console setup
- [ ] Privacy policy and terms
- [ ] App store optimization (ASO)
- [ ] Beta testing with TestFlight/Play Console

---

## Native Module Requirements

### Required Native Modules
```
Core:
- react-native-keychain (secure storage)
- @react-native-async-storage/async-storage
- react-native-config (env variables)
- @react-native-community/netinfo

Security:
- react-native-biometrics (Face ID/Touch ID/Fingerprint)
- react-native-device-info (device fingerprinting)
- react-native-get-random-values (UUID generation)

Navigation:
- @react-navigation/native + dependencies
- react-native-gesture-handler
- react-native-reanimated
- react-native-screens
- react-native-safe-area-context

UI/UX:
- react-native-vector-icons
- react-native-svg
- react-native-linear-gradient
- react-native-haptic-feedback
- lottie-react-native

Data Input:
- react-native-date-picker
- react-native-camera or react-native-vision-camera
- react-native-image-picker

Platform:
- react-native-push-notification
- react-native-share
- react-native-biometrics
```

### Platform-Specific Setup

#### iOS Setup
```bash
# Install pods
cd ios && pod install

# Required iOS configurations:
- Info.plist permissions (Camera, Biometrics)
- Universal Links configuration
- Push notification entitlements
- Keychain sharing capability
```

#### Android Setup
```gradle
// android/app/build.gradle
- Configure signing configs
- Set up ProGuard rules
- Add required permissions
- Configure intent filters for deep linking
```

---

## Security Architecture

### Authentication Flow
```
1. First-time Setup:
   Magic Link → Email Verification → Set PIN → Enable Biometric (optional)

2. Returning User (same device):
   Open App → PIN/Biometric → Access Granted

3. New Device or PIN Reset:
   Magic Link → Email Verification → Set PIN → Enable Biometric (optional)

4. Session Management:
   - Supabase JWT tokens (1 hour default, auto-refresh)
   - PIN/Biometric for app access (not API calls)
   - Background/foreground lock based on timer
```

### Security Layers
```
Layer 1: Magic Link (Something you have)
- Email access required
- Token expires in 15 minutes (configurable)
- Single-use token

Layer 2: PIN/Biometric (Something you know/are)  
- 4-6 digit PIN stored in Keychain/Keystore
- Biometric as convenience alternative to PIN
- Required on every app open (configurable)
- Failed attempt limiting

Layer 3: Device Trust
- Device fingerprinting on first login
- Email notification for new device sign-ins
- Trusted device list management
- Remote device sign-out capability

Layer 4: Session Security
- Server-side session tracking
- Auto-lock on background
- Session invalidation system
- "Sign out all devices" functionality
```

### Device Management Architecture
```sql
-- Database schema for device tracking
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- App-generated unique ID
  device_fingerprint TEXT NOT NULL, -- Model + OS + unique identifiers
  device_name TEXT, -- "iPhone 15 Pro" or user-set name
  device_type TEXT, -- 'ios', 'android'
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  location_country TEXT,
  location_city TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  is_revoked BOOLEAN DEFAULT FALSE,
  push_token TEXT, -- For remote sign-out notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, device_id)
);

-- Session invalidation table
CREATE TABLE invalidated_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT, -- NULL means all devices
  invalidated_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT -- 'user_signout', 'security_breach', 'device_revoked'
);
```

### Sign-Out Implementation Strategy
Since JWT tokens can't be expired early, we use server-side session validation:

1. **Client-side**: Clear local tokens and data
2. **Server-side**: Add entry to invalidated_sessions table  
3. **API Middleware**: Check token against invalidated_sessions on each request
4. **If invalidated**: Return 401, force re-authentication

```javascript
// Middleware pseudocode
const validateSession = async (req, res, next) => {
  const token = extractToken(req);
  const { user_id, device_id } = decodeToken(token);
  
  // Check if session is invalidated
  const invalidated = await checkInvalidatedSession(user_id, device_id);
  if (invalidated) {
    return res.status(401).json({ error: 'Session invalidated' });
  }
  
  next();
};
```

## Architecture Decisions

### State Management
```
Global State (Zustand/Redux):
├── Auth State
├── Budget & Envelopes
├── Transactions Cache
├── User Preferences
└── Offline Queue

Local State:
├── Form State
├── UI State
├── Navigation State
└── Component State
```

### Folder Structure
```
/packages/mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API and native services
│   ├── store/          # State management
│   ├── utils/          # Utilities
│   ├── hooks/          # Custom hooks
│   ├── native/         # Native module wrappers
│   └── theme/          # Design system
├── ios/                # iOS native code
├── android/            # Android native code
└── __tests__/          # Test files
```

---

## Performance Targets

- Cold start: < 2 seconds
- Navigation transitions: 60 FPS
- List scrolling: 60 FPS
- API response handling: < 300ms
- Offline-to-online sync: < 5 seconds
- Bundle size: < 30MB (Android), < 50MB (iOS)
- Memory usage: < 150MB average
- Battery impact: < 2% per hour active use

---

## MVP Definition

### Core Features (Week 1-4)
- Authentication (magic link)
- View budgets and envelopes
- Add all transaction types
- View transaction history
- Basic offline support

### Enhanced Features (Week 5-7)
- Full CRUD operations
- Data visualization
- Advanced offline sync
- Push notifications

### Premium Features (Week 8-10)
- Widgets
- Advanced analytics
- Voice integration
- Recurring transactions

---

## Development Tools

### Essential Tools
- Flipper: Debugging
- Reactotron: State inspection
- React DevTools: Component debugging
- Charles/Proxyman: Network debugging
- Xcode Instruments: iOS profiling
- Android Studio Profiler: Android profiling

### CI/CD Pipeline
- GitHub Actions or CircleCI
- Fastlane for automation
- CodePush for OTA updates
- Sentry for crash reporting
- Firebase Analytics/Crashlytics

---

## Risk Mitigation

### Technical Risks
- **Native module compatibility**: Maintain compatibility matrix
- **Performance on low-end devices**: Test on variety of devices
- **Platform differences**: Abstract platform-specific code
- **Third-party dependencies**: Minimize and audit regularly

### Mitigation Strategies
- Regular dependency updates
- Comprehensive error boundaries
- Graceful degradation
- Feature flags for gradual rollout
- A/B testing framework
- Rollback capability with CodePush