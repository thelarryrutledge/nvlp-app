const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@nvlp/types': path.resolve(workspaceRoot, 'packages/types'),
      '@nvlp/api': path.resolve(workspaceRoot, 'packages/api'),
      '@nvlp/client': path.resolve(workspaceRoot, 'packages/client'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
