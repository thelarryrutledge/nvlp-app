# iOS Development Environment Setup

## Current Status

✅ **CocoaPods Installed**: Version 1.16.2 via Homebrew  
⚠️ **Xcode Required**: Only Command Line Tools currently installed  
⚠️ **iOS SDK Missing**: Full Xcode needed for iOS development

## Prerequisites

### 1. Install Xcode
Download and install Xcode from the Mac App Store or Apple Developer portal:
- **Xcode 14.0+** recommended for React Native 0.80.1
- **iOS SDK 16.0+** included with Xcode
- **Command Line Tools** (already installed)

### 2. Verify Installation
After installing Xcode, verify the setup:

```bash
# Check Xcode path
xcode-select --print-path
# Should show: /Applications/Xcode.app/Contents/Developer

# Check iOS SDK
xcrun --show-sdk-path --sdk iphoneos
# Should show iOS SDK path

# Check available simulators
xcrun simctl list devices
```

### 3. Install Dependencies
CocoaPods is already installed and configured:

```bash
# Verify CocoaPods
pod --version
# Version: 1.16.2

# Install iOS dependencies (run after Xcode is installed)
cd ios
pod install
```

## Post-Xcode Installation Steps

Once Xcode is installed, complete the iOS setup:

1. **Switch to Xcode Developer Tools**:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   ```

2. **Accept Xcode License**:
   ```bash
   sudo xcodebuild -license accept
   ```

3. **Install iOS Dependencies**:
   ```bash
   cd NVLPMobile/ios
   pod install
   ```

4. **Test iOS Build**:
   ```bash
   # From NVLPMobile directory
   npx react-native run-ios
   ```

## Project Configuration

### Podfile
The project's `ios/Podfile` is already configured for:
- React Native 0.80.1
- New Architecture support
- Auto-linking for `react-native-config`

### Native Dependencies
- **react-native-config**: Environment variable support (auto-linked)
- **React Native core pods**: Fabric, TurboModules, Hermes

## Troubleshooting

### Common Issues

1. **"tool 'xcodebuild' requires Xcode"**
   - Install full Xcode from App Store
   - Run `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

2. **"SDK 'iphoneos' cannot be located"**
   - Ensure full Xcode is installed (not just Command Line Tools)
   - Verify with `xcrun --show-sdk-path --sdk iphoneos`

3. **Pod install fails**
   - Ensure Xcode is properly installed and licensed
   - Try `pod repo update` if dependency issues occur
   - Run `pod install --repo-update` for cache refresh

### Build Issues

1. **Clean Build**:
   ```bash
   cd ios
   rm -rf build/
   rm -rf Pods/
   rm Podfile.lock
   pod install
   ```

2. **Reset Metro Cache**:
   ```bash
   npx react-native start --reset-cache
   ```

## Development Workflow

Once setup is complete:

1. **Start Metro bundler**:
   ```bash
   npx react-native start
   ```

2. **Run iOS app**:
   ```bash
   npx react-native run-ios
   ```

3. **Specific simulator**:
   ```bash
   npx react-native run-ios --simulator="iPhone 15"
   ```

4. **Release build**:
   ```bash
   npx react-native run-ios --configuration Release
   ```

## Next Steps

1. Install Xcode from Mac App Store
2. Run post-installation commands
3. Test iOS build with `npx react-native run-ios`
4. Configure iOS simulators and devices
5. Set up certificates for device testing (if needed)