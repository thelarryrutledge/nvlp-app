# Device Testing Setup

## Overview

This guide covers testing the React Native app on both iOS simulators and physical devices for comprehensive development and testing.

## iOS Testing

### Available Simulators

Check available iOS simulators:

```bash
# List all available simulators
xcrun simctl list devices

# List only booted simulators
xcrun simctl list devices | grep Booted
```

**Currently Available iOS Simulators:**
- iPhone 16 Pro (iOS 18.5) ✅
- iPhone 16 Pro Max (iOS 18.5)
- iPhone 16 (iOS 18.5)
- iPhone 16 Plus (iOS 18.5)
- iPad Pro 11-inch (M4) (iOS 18.5)
- iPad Pro 13-inch (M4) (iOS 18.5)
- iPad Air 11-inch (M3) (iOS 18.5)
- iPad Air 13-inch (M3) (iOS 18.5)

### Running on Specific Simulators

```bash
# Default simulator (iPhone 16 Pro)
npm run ios

# Specific iPhone models
npx react-native run-ios --simulator="iPhone 16"
npx react-native run-ios --simulator="iPhone 16 Pro Max"

# iPad testing
npx react-native run-ios --simulator="iPad Pro 11-inch (M4)"
npx react-native run-ios --simulator="iPad Air 11-inch (M3)"

# Release build testing
npx react-native run-ios --configuration Release
```

### Simulator Management

**Open Simulator App:**
```bash
# Open Simulator.app
open -a Simulator

# Boot specific device
xcrun simctl boot "iPhone 16"
```

**Device Operations:**
- **Hardware Menu**: Device → Hardware
  - **Home Button**: Hardware → Home
  - **Lock Screen**: Hardware → Lock
  - **Shake**: Hardware → Shake Gesture
  - **Rotate**: Hardware → Rotate Left/Right

- **Dev Menu**: **Cmd+D** or Hardware → Shake Gesture

### Physical Device Testing (iOS)

#### Prerequisites for Physical Device

1. **Apple Developer Account** (Free or Paid)
2. **Device registered** in Apple Developer Portal
3. **Provisioning Profile** configured
4. **Code Signing** set up in Xcode

#### Setup Steps

1. **Connect Device via USB**
2. **Trust Computer** on device when prompted
3. **Open Xcode** and verify device appears in destination list
4. **Run from Xcode** for first-time setup:
   ```bash
   open ios/NVLPMobile.xcworkspace
   ```
5. **Select your device** in Xcode destination
6. **Click Run** to build and install

#### React Native CLI with Physical Device

```bash
# List connected devices
xcrun xctrace list devices

# Run on specific device (use device name from list)
npx react-native run-ios --device "Your iPhone Name"

# Run on any connected device
npx react-native run-ios --device
```

#### Troubleshooting Physical Device

**Common Issues:**

1. **"No devices found"**:
   - Ensure device is unlocked and trusted
   - Check USB connection
   - Verify device in Xcode destinations

2. **Code signing errors**:
   - Open Xcode → Project → Signing & Capabilities
   - Select your development team
   - Enable "Automatically manage signing"

3. **App won't install**:
   - Check device storage space
   - Verify iOS version compatibility
   - Trust developer profile in Settings → General → VPN & Device Management

## Android Testing

### Emulator Testing

**List available AVDs:**
```bash
# List all Android Virtual Devices
emulator -list-avds

# Start specific emulator
emulator -avd "AVD_Name"

# Start emulator in background
emulator -avd "AVD_Name" -no-window &
```

**Run on Emulator:**
```bash
# Start emulator and run app
npm run android

# Run on specific emulator
npx react-native run-android --device "emulator-5554"

# Release build
npx react-native run-android --variant=release
```

### Physical Device Testing (Android)

#### Prerequisites

1. **USB Debugging enabled** on device
2. **ADB installed** (comes with Android SDK)
3. **Device drivers** installed (if Windows)

#### Setup Steps

1. **Enable Developer Options**:
   - Settings → About Phone → Tap "Build number" 7 times

2. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging

3. **Connect Device**:
   - Connect via USB
   - Allow USB debugging when prompted

4. **Verify Connection**:
   ```bash
   adb devices
   # Should show your device
   ```

5. **Run App**:
   ```bash
   npm run android
   ```

#### Troubleshooting Android Device

**Common Issues:**

1. **Device not detected**:
   ```bash
   # Restart ADB server
   adb kill-server
   adb start-server
   adb devices
   ```

2. **Installation failed**:
   - Check device storage
   - Try uninstalling previous version
   - Verify app permissions

3. **App crashes**:
   - Check device logs: `adb logcat`
   - Verify minimum SDK requirements

## Testing Workflow

### Development Testing Routine

1. **Primary Development**: iOS Simulator (iPhone 16 Pro)
   ```bash
   npm run ios
   ```

2. **Cross-Platform Testing**: Android Emulator
   ```bash
   npm run android
   ```

3. **Performance Testing**: Physical devices
   - iOS: Real iPhone
   - Android: Real Android device

4. **Screen Size Testing**: 
   - iPhone 16 (6.1")
   - iPhone 16 Pro Max (6.9")
   - iPad Pro (12.9")

### Testing Checklist

**Basic Functionality:**
- [ ] App launches successfully
- [ ] Navigation works smoothly
- [ ] Touch interactions responsive
- [ ] Text renders correctly
- [ ] Images load properly

**Performance Testing:**
- [ ] Smooth 60fps animations
- [ ] Fast startup time
- [ ] Responsive UI interactions
- [ ] Memory usage reasonable

**Platform-Specific:**
- [ ] iOS: Respects safe areas
- [ ] iOS: Proper status bar handling
- [ ] Android: Back button behavior
- [ ] Android: Proper notifications

**Screen Sizes:**
- [ ] Works on small screens (iPhone 16)
- [ ] Works on large screens (iPhone 16 Pro Max)
- [ ] Tablet layouts (iPad)
- [ ] Different aspect ratios

## Device-Specific Testing Commands

### Batch Testing Script

Create a test script for multiple devices:

```bash
#!/bin/bash
# test-devices.sh

echo "Testing on iPhone 16..."
npx react-native run-ios --simulator="iPhone 16"
sleep 10

echo "Testing on iPhone 16 Pro Max..."
npx react-native run-ios --simulator="iPhone 16 Pro Max"
sleep 10

echo "Testing on iPad Pro..."
npx react-native run-ios --simulator="iPad Pro 11-inch (M4)"
sleep 10

echo "Testing on Android..."
npm run android
```

### Performance Monitoring

**iOS Performance:**
```bash
# Memory usage
instruments -t "Allocations" -D trace.trace -l 10000 YourApp.app

# CPU usage during testing
top -pid $(pgrep -f "YourApp")
```

**Android Performance:**
```bash
# Memory info
adb shell dumpsys meminfo com.nvlpmobile

# CPU usage
adb shell top -p $(adb shell pidof com.nvlpmobile)
```

## Continuous Testing

### Automated Device Testing

For CI/CD pipelines:

```yaml
# .github/workflows/test.yml (example)
- name: Test iOS
  run: |
    npx react-native run-ios --simulator="iPhone 16"
    
- name: Test Android
  run: |
    npx react-native run-android
```

### Debug Configuration

**iOS Debug on Device:**
```bash
# Enable network debugging
npx react-native run-ios --device --configuration Debug
```

**Android Debug on Device:**
```bash
# Enable remote debugging
adb shell input keyevent 82  # Open dev menu
# Select "Debug JS Remotely"
```

## Next Steps

1. ✅ **Simulator Testing**: iOS and Android emulators configured
2. 🔄 **Physical Device Setup**: Configure development certificates
3. 🔄 **Performance Baseline**: Establish performance metrics
4. 🔄 **Automated Testing**: Set up device testing in CI/CD

## Current Status

- **iOS Simulators**: ✅ Multiple devices available and tested
- **Android Emulators**: ✅ Working with development environment
- **Physical iOS Device**: ⚠️ Requires Apple Developer setup
- **Physical Android Device**: ⚠️ Requires USB debugging setup
- **Performance Testing**: ✅ Commands documented and ready

Device testing infrastructure is now ready for comprehensive React Native development and quality assurance.