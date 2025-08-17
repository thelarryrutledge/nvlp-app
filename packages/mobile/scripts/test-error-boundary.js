#!/usr/bin/env node

/**
 * Test script to verify error boundary and error handling setup
 * This validates the error handling infrastructure is correctly configured
 */

const fs = require('fs');
const path = require('path');

function testErrorBoundarySetup() {
  console.log('🧪 Testing error boundary and error handling setup...\n');

  let allGood = true;

  // Check if ErrorBoundary component exists
  const errorBoundaryPath = path.join(__dirname, '..', 'src', 'components', 'ErrorBoundary.tsx');
  if (fs.existsSync(errorBoundaryPath)) {
    console.log('✅ ErrorBoundary component exists');
    
    // Check if it has the required methods
    const content = fs.readFileSync(errorBoundaryPath, 'utf8');
    if (content.includes('componentDidCatch') && content.includes('getDerivedStateFromError')) {
      console.log('✅ ErrorBoundary has required lifecycle methods');
    } else {
      console.log('❌ ErrorBoundary missing required lifecycle methods');
      allGood = false;
    }
    
    if (content.includes('ErrorHandlingService')) {
      console.log('✅ ErrorBoundary integrates with ErrorHandlingService');
    } else {
      console.log('❌ ErrorBoundary not integrated with ErrorHandlingService');
      allGood = false;
    }
  } else {
    console.log('❌ ErrorBoundary component not found');
    allGood = false;
  }

  // Check if useGlobalErrorHandler hook exists
  const hookPath = path.join(__dirname, '..', 'src', 'hooks', 'useGlobalErrorHandler.ts');
  if (fs.existsSync(hookPath)) {
    console.log('✅ useGlobalErrorHandler hook exists');
  } else {
    console.log('❌ useGlobalErrorHandler hook not found');
    allGood = false;
  }

  // Check if ErrorHandlingService exists
  const servicePath = path.join(__dirname, '..', 'src', 'services', 'errorHandlingService.ts');
  if (fs.existsSync(servicePath)) {
    console.log('✅ ErrorHandlingService exists');
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    if (serviceContent.includes('reportComponentError') && 
        serviceContent.includes('reportGlobalError') && 
        serviceContent.includes('getStoredErrors')) {
      console.log('✅ ErrorHandlingService has required methods');
    } else {
      console.log('❌ ErrorHandlingService missing required methods');
      allGood = false;
    }
  } else {
    console.log('❌ ErrorHandlingService not found');
    allGood = false;
  }

  // Check if ErrorTestComponent exists (dev only)
  const testComponentPath = path.join(__dirname, '..', 'src', 'components', 'ErrorTestComponent.tsx');
  if (fs.existsSync(testComponentPath)) {
    console.log('✅ ErrorTestComponent exists for testing');
  } else {
    console.log('❌ ErrorTestComponent not found');
    allGood = false;
  }

  // Check if App.tsx is wrapped with ErrorBoundary
  const appPath = path.join(__dirname, '..', 'App.tsx');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    if (appContent.includes('ErrorBoundary') && appContent.includes('useGlobalErrorHandler')) {
      console.log('✅ App.tsx properly configured with error handling');
    } else {
      console.log('❌ App.tsx not properly configured with error handling');
      allGood = false;
    }
  } else {
    console.log('❌ App.tsx not found');
    allGood = false;
  }

  // Check if HomeScreen includes ErrorTestComponent
  const homeScreenPath = path.join(__dirname, '..', 'src', 'screens', 'HomeScreen.tsx');
  if (fs.existsSync(homeScreenPath)) {
    const homeContent = fs.readFileSync(homeScreenPath, 'utf8');
    if (homeContent.includes('ErrorTestComponent')) {
      console.log('✅ HomeScreen includes ErrorTestComponent for testing');
    } else {
      console.log('⚠️  HomeScreen does not include ErrorTestComponent (optional)');
    }
  }

  console.log('\n📋 Error Handling Features:');
  console.log('  🛡️  React Error Boundary for component errors');
  console.log('  🌐 Global error handler for unhandled errors');
  console.log('  📊 Error reporting service with local storage');
  console.log('  🧪 Development testing component');
  console.log('  💾 Error persistence across app sessions');
  console.log('  📱 React Native specific error handling');

  if (allGood) {
    console.log('\n🎉 Error boundary and error handling setup is complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Test the error boundary in development using ErrorTestComponent');
    console.log('  2. Integrate with crash reporting service (Sentry, Bugsnag, etc.)');
    console.log('  3. Add custom error reporting for specific user actions');
    console.log('  4. Configure error notifications for production');
  } else {
    console.log('\n❌ Some error handling components are missing or incomplete');
  }

  return allGood;
}

if (require.main === module) {
  testErrorBoundarySetup();
}

module.exports = testErrorBoundarySetup;