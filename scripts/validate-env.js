#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Production environment variables that must be set
const requiredEnvVars = {
  // Supabase
  'SUPABASE_URL': 'Supabase project URL',
  'SUPABASE_ANON_KEY': 'Supabase anonymous key',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key (for deployments)',
  
  // Mobile app
  'API_URL': 'API endpoint URL for mobile app',
  
  // Build configuration
  'NODE_ENV': 'Node environment (should be "production")',
};

// Optional but recommended
const optionalEnvVars = {
  'SENTRY_DSN': 'Sentry error tracking DSN',
  'ANALYTICS_KEY': 'Analytics tracking key',
  'PUSH_NOTIFICATION_KEY': 'Push notification service key',
};

console.log('🔍 Validating production environment variables...\n');

let hasErrors = false;
const warnings = [];

// Check required variables
console.log('Required Environment Variables:');
Object.entries(requiredEnvVars).forEach(([key, description]) => {
  if (process.env[key]) {
    console.log(`✅ ${key} - ${description}`);
  } else {
    console.log(`❌ ${key} - ${description} (MISSING)`);
    hasErrors = true;
  }
});

console.log('\nOptional Environment Variables:');
Object.entries(optionalEnvVars).forEach(([key, description]) => {
  if (process.env[key]) {
    console.log(`✅ ${key} - ${description}`);
  } else {
    console.log(`⚠️  ${key} - ${description} (not set)`);
    warnings.push(`${key} is not set. ${description}`);
  }
});

// Check NODE_ENV specifically
if (process.env.NODE_ENV !== 'production') {
  console.log(`\n⚠️  NODE_ENV is "${process.env.NODE_ENV}", expected "production"`);
  warnings.push('NODE_ENV should be set to "production" for production builds');
}

// Check for .env.example files
console.log('\n📋 Environment Template Files:');
const envExampleFiles = [
  '.env.example',
  'apps/api/.env.example',
  'apps/mobile/.env.example'
];

envExampleFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`⚠️  ${file} missing - create it to document required env vars`);
  }
});

// Summary
console.log('\n📊 Summary:');
if (hasErrors) {
  console.log('❌ Required environment variables are missing!');
  console.log('   Please set all required variables before building for production.');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set!');
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  warnings.forEach(warning => console.log(`   - ${warning}`));
}

console.log('\n✨ Environment validation complete!');
process.exit(0);