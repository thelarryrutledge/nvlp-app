import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: false, // Disable sourcemaps for production
  minify: true, // Enable minification for production
  treeshake: true, // Enable tree shaking
  target: 'es2020',
  outDir: 'dist',
  env: {
    NODE_ENV: 'production'
  },
  onSuccess: 'echo "✅ @nvlp/types production build completed"'
})