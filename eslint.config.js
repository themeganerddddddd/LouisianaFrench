// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.scratch/**', 'tmp/**', 'supabase/functions/**']
  },
  {
    files: ['jest.setup.js', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: globals.jest
    }
  }
]);
