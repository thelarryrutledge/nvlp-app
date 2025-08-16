const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Find all packages in the monorepo
const packages = fs
  .readdirSync(path.resolve(workspaceRoot, 'packages'))
  .filter(p => fs.statSync(path.resolve(workspaceRoot, 'packages', p)).isDirectory());

// Create node_modules paths for all packages
const nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...packages.map(p => path.resolve(workspaceRoot, 'packages', p, 'node_modules')),
];

// Create extraNodeModules for all @nvlp packages
const extraNodeModules = packages.reduce((acc, packageName) => {
  acc[`@nvlp/${packageName}`] = path.resolve(workspaceRoot, 'packages', packageName);
  return acc;
}, {});

/**
 * Metro configuration for monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths,
    extraNodeModules,
    // Ensure we can resolve .ts and .tsx files
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
    // Block list for files we don't want to bundle
    blockList: [
      // Exclude test files
      /.*\/__tests__\/.*/,
      /.*\.test\.(js|jsx|ts|tsx)$/,
      /.*\.spec\.(js|jsx|ts|tsx)$/,
      // Exclude example files
      /.*\/examples?\/.*/,
    ],
    // Ensure proper resolution of package.json exports
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'browser', 'require', 'import'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  // Cache configuration for better performance
  cacheVersion: '1.0',
  resetCache: false,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
