// TypeScript configuration for browser/client packages
export default {
  compilerOptions: {
    target: 'ES2020',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'bundler',
    allowJs: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    noFallthroughCasesInSwitch: true,
    resolveJsonModule: true,
    isolatedModules: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true,
    outDir: './dist',
    rootDir: './src',
    // Enhanced type safety
    exactOptionalPropertyTypes: true,
    noImplicitReturns: true,
    noPropertyAccessFromIndexSignature: true,
    noUncheckedIndexedAccess: false, // More lenient for browser APIs
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts', '**/*.stories.ts'],
};