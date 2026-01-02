const noLocalhostUrls = require('./eslint/rules/no-localhost-urls.cjs');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ["dist/**"],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
            jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'no-localhost-urls': { rules: { 'no-localhost-urls': noLocalhostUrls } }
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-localhost-urls/no-localhost-urls': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-localhost-urls/no-localhost-urls': 'error'
    },
    plugins: {
      'no-localhost-urls': { rules: { 'no-localhost-urls': noLocalhostUrls } }
    }
  }
];
