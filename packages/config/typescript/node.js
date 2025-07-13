// TypeScript configuration for Node.js/API packages
export default {
  compilerOptions: {
    target: 'ES2020',
    lib: ['ES2020'],
    module: 'ESNext',
    moduleResolution: 'node',
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
    // Node.js specific
    types: ['node'],
    // Enhanced type safety
    exactOptionalPropertyTypes: true,
    noImplicitReturns: true,
    noPropertyAccessFromIndexSignature: true,
    noUncheckedIndexedAccess: true,
  },
  include: ['src/**/*', 'supabase/functions/**/*'],
  exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
};