import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  minify: false,
  target: 'es2020',
  platform: 'neutral',
  esbuildOptions(options) {
    // Ensure compatibility with both Node.js and browser environments
    options.platform = 'neutral'
    options.conditions = ['import', 'module', 'default']
  },
  onSuccess: async () => {
    console.log('✅ @nvlp/client build completed successfully')
    console.log('🔄 Dependent packages (mobile, api) should auto-reload')
  }
})