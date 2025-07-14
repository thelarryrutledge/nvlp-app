const path = require('path');

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/screens': path.resolve(__dirname, 'src/screens'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/constants': path.resolve(__dirname, 'src/constants'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/navigation': path.resolve(__dirname, 'src/navigation'),
      '@/context': path.resolve(__dirname, 'src/context'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/assets': path.resolve(__dirname, 'assets'),
    },
    // Enable monorepo support
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
  },
  server: {
    port: 8081,
  },
  watchFolders: [
    // Watch the app source
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'assets'),
    // Watch the workspace packages for hot reloading
    path.resolve(__dirname, '../../packages'),
    // Watch specific package dist folders for faster detection
    path.resolve(__dirname, '../../packages/types/dist'),
    path.resolve(__dirname, '../../packages/client/dist'),
    path.resolve(__dirname, '../../packages/types/src'),
    path.resolve(__dirname, '../../packages/client/src'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
