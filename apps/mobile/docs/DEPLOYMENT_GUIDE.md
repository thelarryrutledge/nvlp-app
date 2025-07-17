# NVLP Mobile Deployment Guide

## Overview

This guide covers the complete deployment process for NVLP mobile applications on iOS and Android platforms from the monorepo structure.

## Prerequisites

### Development Environment
- **macOS** (required for iOS builds)
- **Xcode 15+** with iOS 15.0+ SDK
- **Android Studio** with Android SDK 35
- **Node.js 18+** and **pnpm**
- **React Native CLI** and development tools

### Accounts & Certificates
- **Apple Developer Account** (for iOS distribution)
- **Google Play Console Account** (for Android distribution)
- **Code signing certificates** configured

### Environment Setup
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Validate build configuration
pnpm run build:validate:ios     # iOS validation
pnpm run build:validate:android # Android validation
```

## Build Process

### 1. Pre-Build Validation

Before building for deployment, validate your configuration:

```bash
# From project root
cd apps/mobile

# Validate iOS configuration
pnpm run build:validate:ios

# Validate Android configuration  
pnpm run build:validate:android
```

**Expected output**: All validation checks should pass (✓)

### 2. Version Management

Versions are automatically synced from `package.json` during builds:

```bash
# Update version in package.json
npm version patch  # or minor/major

# Versions will be applied automatically:
# iOS: CFBundleShortVersionString + CFBundleVersion (build number from git)
# Android: versionName + versionCode (build number from git)
```

### 3. Production Builds

#### iOS Production Build

```bash
# From apps/mobile directory
pnpm run build:ios:prod
```

**Build process**:
1. Syncs version from package.json to Info.plist
2. Runs type checking and linting (if configured)
3. Creates Release archive with Xcode
4. Optimizes for distribution

**Output**: `ios/build/Release/NVLPMobile.xcarchive`

**Requirements**: 
- Xcode development team configured
- Code signing certificates available
- Provisioning profiles for distribution

#### Android Production Build

```bash
# From apps/mobile directory

# For APK (testing/sideloading)
pnpm run build:android

# For Play Store Bundle (recommended)
pnpm run build:android:bundle
```

**Build process**:
1. Syncs version from package.json to gradle
2. Runs type checking and linting (if configured)
3. Creates optimized release build
4. Applies ProGuard/R8 code shrinking

**Outputs**:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- Bundle: `android/app/build/outputs/bundle/release/app-release.aab`

## Deployment Platforms

### iOS App Store Deployment

#### 1. Archive and Export

```bash
# Build production archive
pnpm run build:ios:prod

# Open in Xcode for distribution
open ios/NVLPMobile.xcworkspace
```

#### 2. App Store Upload

**Via Xcode**:
1. Window → Organizer
2. Select your archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Follow upload wizard

**Via Command Line** (advanced):
```bash
# Export for App Store
xcodebuild -exportArchive \
  -archivePath ios/build/Release/NVLPMobile.xcarchive \
  -exportPath ios/build/Release \
  -exportOptionsPlist ios/ExportOptions.plist

# Upload with xcrun
xcrun altool --upload-app \
  --type ios \
  --file "ios/build/Release/NVLPMobile.ipa" \
  --username "your-apple-id" \
  --password "app-specific-password"
```

#### 3. App Store Connect

1. **Metadata Setup**:
   - App description and keywords
   - Screenshots for all device sizes
   - Privacy policy and support URLs

2. **Review Submission**:
   - Submit for review
   - Respond to review feedback
   - Release when approved

### Android Play Store Deployment

#### 1. Generate Signed Bundle

```bash
# Build signed bundle for Play Store
pnpm run build:android:bundle
```

#### 2. Play Console Upload

**Via Play Console Web Interface**:
1. Go to Play Console
2. Select your app
3. Production → Create new release
4. Upload `app-release.aab`
5. Add release notes
6. Review and rollout

**Via Command Line** (requires setup):
```bash
# Using fastlane (optional)
bundle exec fastlane android deploy

# Using gradle play publisher (optional)
./gradlew publishReleaseBundle
```

#### 3. Release Management

1. **Internal Testing**: Upload to internal track first
2. **Closed Testing**: Beta test with selected users
3. **Open Testing**: Public beta (optional)
4. **Production**: Full release to Play Store

## Build Configuration

### iOS Configuration

**Key files**:
- `ios/NVLPMobile.xcodeproj/project.pbxproj` - Project settings
- `ios/NVLPMobile/Info.plist` - App metadata
- `ios/scripts/sync-version.sh` - Version sync script

**Settings**:
- Bundle Identifier: `com.nvlp.mobile`
- Deployment Target: iOS 15.0
- New Architecture: Enabled
- Build Configuration: Release

### Android Configuration

**Key files**:
- `android/app/build.gradle` - Build configuration
- `android/app/src/main/AndroidManifest.xml` - App manifest
- `android/scripts/sync-version.sh` - Version sync script

**Settings**:
- Application ID: `com.nvlp.mobile`
- Compile SDK: 35
- Target SDK: 35
- Min SDK: 24 (Android 7.0)
- ProGuard: Enabled for release

## Environment Configuration

### Production Environment Variables

Create production-specific environment files:

```bash
# apps/mobile/.env.production
NODE_ENV=production
API_URL=https://your-production-api.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key

# Platform-specific variables
BUNDLE_ID=com.nvlp.mobile
PACKAGE_NAME=com.nvlp.mobile
```

### Code Signing Setup

#### iOS Code Signing

1. **Development Team**:
   ```bash
   # Set in Xcode project settings
   # Or via command line
   xcodebuild -project ios/NVLPMobile.xcodeproj \
     -target NVLPMobile \
     -configuration Release \
     DEVELOPMENT_TEAM="your-team-id"
   ```

2. **Provisioning Profiles**:
   - Distribution certificate
   - App Store provisioning profile
   - Push notification certificates (if needed)

#### Android Code Signing

1. **Generate Keystore**:
   ```bash
   keytool -genkey -v \
     -keystore android/app/upload-keystore.jks \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -alias upload
   ```

2. **Configure Signing**:
   ```bash
   # android/gradle.properties
   MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks
   MYAPP_UPLOAD_KEY_ALIAS=upload
   MYAPP_UPLOAD_STORE_PASSWORD=***
   MYAPP_UPLOAD_KEY_PASSWORD=***
   ```

## Continuous Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/mobile-deployment.yml
name: Mobile Deployment

on:
  push:
    tags:
      - 'v*'

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build iOS
        run: |
          cd apps/mobile
          pnpm run build:ios:prod
        env:
          DEVELOPMENT_TEAM: ${{ secrets.IOS_TEAM_ID }}
      
      - name: Upload to App Store
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.ASC_API_KEY }}
        run: # Upload logic

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - uses: pnpm/action-setup@v2
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build Android Bundle
        run: |
          cd apps/mobile
          pnpm run build:android:bundle
        env:
          MYAPP_UPLOAD_STORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          MYAPP_UPLOAD_KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT }}
          packageName: com.nvlp.mobile
          releaseFiles: apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
          track: production
```

## Testing Before Deployment

### Build Validation

```bash
# Validate both platforms
pnpm run build:validate:ios
pnpm run build:validate:android

# Test development builds
pnpm run ios     # Test iOS simulator
pnpm run android # Test Android emulator
```

### Production Build Testing

```bash
# Test production builds locally
pnpm run build:ios:prod     # iOS archive
pnpm run build:android      # Android APK for testing
pnpm run build:android:bundle # Android bundle for Play Store
```

### Quality Checks

```bash
# Run before deployment
pnpm run type-check  # TypeScript validation
pnpm run lint        # Code linting
pnpm run test        # Test suite
```

## Deployment Checklist

### Pre-Deployment
- [ ] Update version in `package.json`
- [ ] Run build validation for both platforms
- [ ] Test builds on device/simulator
- [ ] Update release notes and changelog
- [ ] Verify environment variables
- [ ] Check code signing certificates

### iOS Deployment
- [ ] Build production archive successfully
- [ ] Export IPA for App Store distribution
- [ ] Upload to App Store Connect
- [ ] Submit app metadata and screenshots
- [ ] Submit for App Store review
- [ ] Monitor review status

### Android Deployment
- [ ] Build signed Android App Bundle
- [ ] Test bundle on device
- [ ] Upload to Play Console
- [ ] Configure release details
- [ ] Submit for review (if required)
- [ ] Release to production

### Post-Deployment
- [ ] Monitor crash reports and analytics
- [ ] Verify app store listing
- [ ] Test download and installation
- [ ] Update documentation
- [ ] Prepare hotfix process if needed

## Troubleshooting

### Common iOS Issues

**Build Failures**:
```bash
# Clean build folder
rm -rf ios/build
cd ios && xcodebuild clean

# Reset pods
cd ios && rm -rf Pods Podfile.lock
pod install
```

**Signing Issues**:
- Verify development team in Xcode
- Check provisioning profiles
- Update certificates if expired

### Common Android Issues

**Build Failures**:
```bash
# Clean gradle
cd android && ./gradlew clean

# Reset gradle cache
rm -rf ~/.gradle/caches
```

**Signing Issues**:
- Verify keystore paths and passwords
- Check gradle.properties configuration
- Ensure upload keystore is properly configured

### Bundle Size Optimization

```bash
# Analyze bundle size
pnpm run build:analyze

# Enable Hermes (Android)
# Already enabled in android/app/build.gradle

# Enable ProGuard (Android)
# Already enabled for release builds
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys
2. **Code Signing**: Secure keystore and certificate storage
3. **API Keys**: Use production keys for production builds
4. **Obfuscation**: Enable ProGuard/R8 for Android
5. **HTTPS**: Ensure all API calls use HTTPS
6. **Code Review**: Review all code before deployment

## Monitoring and Analytics

### Crash Reporting
- Configure Flipper or Sentry for crash reporting
- Monitor app store reviews
- Set up automated alerts

### Performance Monitoring
- Bundle size tracking
- App launch time metrics
- Memory usage monitoring

### User Analytics
- Track key user flows
- Monitor feature adoption
- A/B testing for new features

## Support and Maintenance

### Update Process
1. Bug fixes: Patch version (1.0.1)
2. New features: Minor version (1.1.0)
3. Breaking changes: Major version (2.0.0)

### Hotfix Process
1. Create hotfix branch from production tag
2. Apply minimal fix
3. Build and test
4. Fast-track through app store review
5. Deploy emergency update

---

**Next Steps**: This deployment documentation is ready for Phase 9.3 completion and Phase 10 documentation updates.