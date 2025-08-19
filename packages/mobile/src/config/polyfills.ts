/**
 * React Native Polyfills
 * 
 * This file contains polyfills needed for React Native compatibility
 * with various libraries like Supabase and Reactotron.
 * 
 * Import this file as early as possible to prevent conflicts.
 */

// Import URL polyfill first - this should fix the protocol getter issue
import 'react-native-url-polyfill/auto';

// Import crypto polyfill for UUID generation
import 'react-native-get-random-values';

// Additional polyfills for compatibility
if (typeof global !== 'undefined') {
  // Ensure btoa/atob are available for base64 operations
  if (!global.btoa) {
    global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  }
  if (!global.atob) {
    global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
  }

  // TextEncoder/TextDecoder polyfills if needed
  if (!global.TextEncoder) {
    try {
      const util = require('util');
      global.TextEncoder = util.TextEncoder;
      global.TextDecoder = util.TextDecoder;
    } catch (error) {
      // Fallback if util is not available
      console.warn('TextEncoder/TextDecoder not available');
    }
  }
}

export {};