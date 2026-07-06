// ESLint flat config (ESLint 9). eslint-config-expo/flat brings the Expo +
// React Native + TypeScript rule set. We keep it lean and add a boundary rule
// in a later wave once features/ exists.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'android/**',
      'ios/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Uzbek UI copy uses apostrophes heavily (so'rov, ta'til) — this rule
      // fires on every one of them and adds no value here.
      'react/no-unescaped-entities': 'off',
      // Real code-quality signals, but the fixes belong to the god-file
      // decomposition and auth-rewrite waves — surface as warnings, not blockers.
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
