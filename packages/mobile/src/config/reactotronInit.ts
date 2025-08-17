/**
 * Reactotron Initialization
 * 
 * This file should be imported as early as possible in the app lifecycle
 * to ensure Reactotron is configured before any other code runs.
 * 
 * Import this in index.js before importing App.tsx
 */

import { env } from './env';

// Only import and configure Reactotron in development
if (env.NODE_ENV === 'development') {
  // Import Reactotron configuration
  require('./reactotron');
  
  console.log('🔧 Reactotron initialization complete');
}