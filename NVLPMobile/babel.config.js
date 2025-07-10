module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/utils': './src/utils',
          '@/services': './src/services',
          '@/types': './src/types',
          '@/constants': './src/constants',
          '@/hooks': './src/hooks',
          '@/navigation': './src/navigation',
          '@/context': './src/context',
          '@/config': './src/config',
          '@/assets': './assets',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts', '.native.js'],
      },
    ],
  ],
};
