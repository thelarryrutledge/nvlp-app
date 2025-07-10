// App constants and configuration
export const APP_CONFIG = {
  NAME: 'NVLP Mobile',
  VERSION: '1.0.0',
  DESCRIPTION: 'Virtual Envelope Budget App',
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://api.nvlp.app',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Theme constants
export const COLORS = {
  PRIMARY: '#3498db',
  SECONDARY: '#2c3e50',
  SUCCESS: '#27ae60',
  WARNING: '#f39c12',
  ERROR: '#e74c3c',
  BACKGROUND: '#f8f9fa',
  TEXT: '#2c3e50',
  LIGHT_GRAY: '#ecf0f1',
  DARK_GRAY: '#95a5a6',
};

// Spacing constants
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
};

// Screen dimensions
export const SCREEN = {
  PADDING: SPACING.MD,
  HEADER_HEIGHT: 60,
  TAB_HEIGHT: 50,
};// Placeholder export to make this a proper module
export const placeholder = src/constants/index.ts;
