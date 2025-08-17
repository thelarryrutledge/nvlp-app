#!/usr/bin/env node

/**
 * Test script to verify react-native-config is working
 * This runs in Node.js context to validate the setup
 */

const fs = require('fs');
const path = require('path');

function testEnvConfig() {
  console.log('🧪 Testing react-native-config setup...\n');

  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
  } else {
    console.log('❌ .env file not found');
    return false;
  }

  // Check if .env.example exists
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(envExamplePath)) {
    console.log('✅ .env.example file exists');
  } else {
    console.log('❌ .env.example file not found');
  }

  // Check if react-native-config is installed
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies['react-native-config']) {
    console.log('✅ react-native-config is installed');
  } else {
    console.log('❌ react-native-config not found in dependencies');
    return false;
  }

  // Check if Android configuration is present
  const androidBuildPath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  if (fs.existsSync(androidBuildPath)) {
    const buildContent = fs.readFileSync(androidBuildPath, 'utf8');
    if (buildContent.includes('react-native-config')) {
      console.log('✅ Android build.gradle configured for react-native-config');
    } else {
      console.log('❌ Android build.gradle not configured for react-native-config');
    }
  }

  // Check if TypeScript types exist
  const typesPath = path.join(__dirname, '..', 'src', 'types', 'react-native-config.d.ts');
  if (fs.existsSync(typesPath)) {
    console.log('✅ TypeScript types for react-native-config exist');
  } else {
    console.log('❌ TypeScript types for react-native-config not found');
  }

  // Check if env config module exists
  const envConfigPath = path.join(__dirname, '..', 'src', 'config', 'env.ts');
  if (fs.existsSync(envConfigPath)) {
    console.log('✅ Environment configuration module exists');
  } else {
    console.log('❌ Environment configuration module not found');
  }

  console.log('\n🎉 react-native-config setup test completed!');
  return true;
}

if (require.main === module) {
  testEnvConfig();
}

module.exports = testEnvConfig;