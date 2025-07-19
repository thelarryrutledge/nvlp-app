#!/bin/bash

echo "🔧 Rebuilding iOS app with new native modules..."

# Navigate to iOS directory
cd ios

# Clean build folder
echo "🧹 Cleaning build folders..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf build/

# Pod install
echo "📦 Installing CocoaPods dependencies..."
pod install

echo "✅ iOS rebuild complete!"
echo ""
echo "📱 Now run the app with:"
echo "   cd .. && pnpm ios"
echo ""
echo "Or open Xcode and run from there:"
echo "   open ios/NVLPMobile.xcworkspace"