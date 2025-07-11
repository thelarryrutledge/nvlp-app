# Android Development Environment Setup

## Current Status

❌ **Java/JDK**: Not installed  
❌ **Android SDK**: Not installed  
❌ **Android Studio**: Not installed

## Prerequisites

### 1. Install Java Development Kit (JDK)

React Native requires JDK 17 or newer. Install via Homebrew:

```bash
# Install OpenJDK 17 (recommended)
brew install openjdk@17

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
java -version
javac -version
```

### 2. Install Android Studio

Download from: https://developer.android.com/studio

1. Download Android Studio
2. Run the installer
3. During setup, ensure these are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### 3. Install Android SDK Components

After Android Studio installation, open it and:

**For macOS:**
1. Open Android Studio → **Settings** (or **Android Studio** → **Preferences** from menu bar)
2. Navigate to **Languages & Frameworks** → **Android SDK**
   - Alternative: Search for "Android SDK" in the settings search bar

**For the SDK Manager:**
1. You can also access it from the Welcome screen: **More Actions** → **SDK Manager**
2. Or from an open project: **Tools** → **SDK Manager**

**SDK Platforms tab:**
- Select **Android 14 (API 34)** - Recommended for React Native 0.80.1
- Select **Android 13 (API 33)** as fallback

**SDK Tools tab:**
- Android SDK Build-Tools 34.0.0
- Android Emulator
- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)
- For Intel Macs: Intel x86 Emulator Accelerator (HAXM)
- For Apple Silicon: No HAXM needed (uses built-in virtualization)

Click "Apply" to download and install selected components

### 4. Configure Environment Variables

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
```

Then reload your shell:
```bash
source ~/.zshrc
```

### 5. Create Android Virtual Device (AVD)

1. Open Android Studio
2. Click **Tools** → **AVD Manager**
3. Click **Create Virtual Device**
4. Select a device (e.g., Pixel 6)
5. Select system image (API 34 recommended)
6. Finish setup

## Project Configuration

### Android Gradle Configuration

The project's `android/build.gradle` is configured for:
- React Native 0.80.1
- Minimum SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Kotlin support

### Native Dependencies
- **react-native-config**: Environment variables (auto-linked)
- React Native core dependencies

## Verification Steps

After installation, verify your setup:

```bash
# Check Java
java -version
# Should show: openjdk version "17.x.x"

# Check Android SDK
echo $ANDROID_HOME
# Should show: /Users/[username]/Library/Android/sdk

# Check Android tools
adb --version
# Should show: Android Debug Bridge version x.x.x

# List available emulators
emulator -list-avds
```

## Build and Run

Once everything is installed:

```bash
# From NVLPMobile directory

# Start Metro bundler
npx react-native start

# In another terminal, run Android app
npx react-native run-android
# or
npm run android
```

## Troubleshooting

### Common Issues

1. **"SDK location not found"**
   - Ensure `ANDROID_HOME` is set correctly
   - Create `local.properties` in `android/` with:
     ```
     sdk.dir=/Users/[username]/Library/Android/sdk
     ```

2. **"JAVA_HOME is not set"**
   - Ensure Java is installed and `JAVA_HOME` is exported
   - Verify with `echo $JAVA_HOME`

3. **Build fails with "Could not determine java version"**
   - Install JDK 17 specifically (not 11 or 20+)
   - Update `JAVA_HOME` to point to JDK 17

4. **Emulator won't start**
   - For M1/M2 Macs: Ensure you're using ARM64 system images
   - Enable virtualization in BIOS (Intel Macs)
   - Try cold boot: `emulator -avd [avd_name] -no-snapshot-load`

### Clean Build

If you encounter issues:

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Reset Cache

```bash
# Clear all caches
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
rm -rf node_modules
npm install
```

## Performance Tips

1. **Use Physical Device**: Faster than emulators for development
   - Enable Developer Mode on Android device
   - Enable USB Debugging
   - Connect via USB and run `adb devices`

2. **Emulator Performance**:
   - Allocate more RAM in AVD settings
   - Use hardware acceleration
   - Close unnecessary apps

3. **Gradle Daemon**:
   ```bash
   # Speed up builds
   echo "org.gradle.daemon=true" >> ~/.gradle/gradle.properties
   echo "org.gradle.parallel=true" >> ~/.gradle/gradle.properties
   ```

## Next Steps

1. Install JDK 17 via Homebrew
2. Download and install Android Studio
3. Configure SDK components
4. Set environment variables
5. Create an AVD
6. Test with `npm run android`

## Useful Commands

```bash
# List connected devices
adb devices

# Install APK on device
adb install app-debug.apk

# View device logs
adb logcat

# Open React Native dev menu
adb shell input keyevent 82

# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```