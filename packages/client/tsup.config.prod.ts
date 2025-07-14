import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true, // Enable code splitting for better tree-shaking
  sourcemap: false, // No source maps in production
  clean: true,
  outDir: 'dist',
  minify: true, // Minify for production
  target: 'es2020',
  platform: 'neutral',
  treeshake: true,
  env: {
    NODE_ENV: 'production'
  },
  esbuildOptions(options) {
    // Ensure compatibility with both Node.js and browser environments
    options.platform = 'neutral'
    options.conditions = ['import', 'module', 'default']
    options.drop = ['console', 'debugger'] // Remove console logs in production
    options.legalComments = 'none' // Remove all comments
  },
  onSuccess: async () => {
    console.log('✅ @nvlp/client production build completed')
    // Could add bundle size reporting here
  }
})