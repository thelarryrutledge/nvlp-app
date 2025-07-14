import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: false, // No source maps in production
  clean: true,
  outDir: 'dist',
  minify: true, // Minify for production
  target: 'es2020',
  treeshake: true,
  env: {
    NODE_ENV: 'production'
  },
  esbuildOptions(options) {
    options.drop = ['console', 'debugger'] // Remove console logs in production
  },
  onSuccess: async () => {
    console.log('✅ @nvlp/types production build completed')
  }
})