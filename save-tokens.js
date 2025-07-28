#!/usr/bin/env node

/**
 * Script to save auth tokens from magic link verification
 * Usage: node save-tokens.js <access_token> <refresh_token>
 */

const fs = require('fs');
const path = require('path');

const [,, accessToken, refreshToken] = process.argv;

if (!accessToken || !refreshToken) {
  console.error('Usage: node save-tokens.js <access_token> <refresh_token>');
  process.exit(1);
}

const tokenData = {
  access_token: accessToken,
  refresh_token: refreshToken,
  saved_at: new Date().toISOString()
};

const tokenPath = path.join(__dirname, '.tokens.json');

try {
  fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
  console.log('✅ Tokens saved to .tokens.json');
  console.log('Access token:', accessToken.substring(0, 20) + '...');
  console.log('Refresh token:', refreshToken.substring(0, 20) + '...');
} catch (error) {
  console.error('❌ Error saving tokens:', error.message);
  process.exit(1);
}