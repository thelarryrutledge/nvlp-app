#!/usr/bin/env node

/**
 * Test script to verify Reactotron setup
 * This validates the Reactotron debugging infrastructure is correctly configured
 */

const fs = require('fs');
const path = require('path');

function testReactotronSetup() {
  console.log('🧪 Testing Reactotron setup...\n');

  let allGood = true;

  // Check if reactotron-react-native is installed
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.devDependencies && packageJson.devDependencies['reactotron-react-native']) {
    console.log('✅ reactotron-react-native package is installed');
  } else {
    console.log('❌ reactotron-react-native package not found in devDependencies');
    allGood = false;
  }

  // Check if Reactotron configuration exists
  const reactotronConfigPath = path.join(__dirname, '..', 'src', 'config', 'reactotron.ts');
  if (fs.existsSync(reactotronConfigPath)) {
    console.log('✅ Reactotron configuration file exists');
    
    const configContent = fs.readFileSync(reactotronConfigPath, 'utf8');
    if (configContent.includes('ReactotronService') && 
        configContent.includes('configure') && 
        configContent.includes('useReactNative')) {
      console.log('✅ Reactotron configuration has required methods');
    } else {
      console.log('❌ Reactotron configuration missing required methods');
      allGood = false;
    }
  } else {
    console.log('❌ Reactotron configuration file not found');
    allGood = false;
  }

  // Check if Reactotron initialization exists
  const reactotronInitPath = path.join(__dirname, '..', 'src', 'config', 'reactotronInit.ts');
  if (fs.existsSync(reactotronInitPath)) {
    console.log('✅ Reactotron initialization file exists');
  } else {
    console.log('❌ Reactotron initialization file not found');
    allGood = false;
  }

  // Check if index.js imports Reactotron early
  const indexPath = path.join(__dirname, '..', 'index.js');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (indexContent.includes('reactotronInit')) {
      console.log('✅ index.js imports Reactotron initialization');
    } else {
      console.log('❌ index.js does not import Reactotron initialization');
      allGood = false;
    }
  } else {
    console.log('❌ index.js not found');
    allGood = false;
  }

  // Check if ReactotronDevPanel exists
  const devPanelPath = path.join(__dirname, '..', 'src', 'components', 'ReactotronDevPanel.tsx');
  if (fs.existsSync(devPanelPath)) {
    console.log('✅ ReactotronDevPanel component exists');
  } else {
    console.log('❌ ReactotronDevPanel component not found');
    allGood = false;
  }

  // Check if services integrate with Reactotron
  const errorServicePath = path.join(__dirname, '..', 'src', 'services', 'errorHandlingService.ts');
  if (fs.existsSync(errorServicePath)) {
    const errorServiceContent = fs.readFileSync(errorServicePath, 'utf8');
    if (errorServiceContent.includes('reactotron')) {
      console.log('✅ ErrorHandlingService integrates with Reactotron');
    } else {
      console.log('⚠️  ErrorHandlingService does not integrate with Reactotron (optional)');
    }
  }

  const apiServicePath = path.join(__dirname, '..', 'src', 'services', 'apiClient.ts');
  if (fs.existsSync(apiServicePath)) {
    const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');
    if (apiServiceContent.includes('reactotron')) {
      console.log('✅ ApiClientService integrates with Reactotron');
    } else {
      console.log('⚠️  ApiClientService does not integrate with Reactotron (optional)');
    }
  }

  // Check if HomeScreen includes ReactotronDevPanel
  const homeScreenPath = path.join(__dirname, '..', 'src', 'screens', 'HomeScreen.tsx');
  if (fs.existsSync(homeScreenPath)) {
    const homeContent = fs.readFileSync(homeScreenPath, 'utf8');
    if (homeContent.includes('ReactotronDevPanel')) {
      console.log('✅ HomeScreen includes ReactotronDevPanel for testing');
    } else {
      console.log('⚠️  HomeScreen does not include ReactotronDevPanel (optional)');
    }
  }

  console.log('\n📋 Reactotron Features:');
  console.log('  🔧 Development debugging interface');
  console.log('  📊 State inspection and modification');
  console.log('  🌐 Network request/response monitoring');
  console.log('  📱 AsyncStorage and SecureStorage inspection');
  console.log('  🐛 Error reporting and display');
  console.log('  ⚡ Performance benchmarking');
  console.log('  🎛️ Custom commands for debugging');
  console.log('  📝 Custom logging and data display');

  console.log('\n📱 Usage Instructions:');
  console.log('  1. Download and install Reactotron desktop app');
  console.log('  2. Start Reactotron and configure to listen on port 9090');
  console.log('  3. Start the React Native app in development mode');
  console.log('  4. App should auto-connect to Reactotron');
  console.log('  5. Use the dev panel in the app for quick testing');
  console.log('  6. Use custom commands in Reactotron for advanced debugging');

  if (allGood) {
    console.log('\n🎉 Reactotron setup is complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Download Reactotron desktop app if not already installed');
    console.log('  2. Test the connection by running the React Native app');
    console.log('  3. Use the ReactotronDevPanel for in-app debugging');
    console.log('  4. Explore custom commands for storage and error management');
  } else {
    console.log('\n❌ Some Reactotron components are missing or incomplete');
  }

  return allGood;
}

if (require.main === module) {
  testReactotronSetup();
}

module.exports = testReactotronSetup;