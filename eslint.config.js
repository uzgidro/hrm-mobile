// ESLint flat config (ESLint 9). eslint-config-expo/flat brings the Expo +
// React Native + TypeScript rule set. We keep it lean and add a boundary rule
// in a later wave once features/ exists.
const expoConfig = require('eslint-config-expo/flat');

// v3 «Tomchi × v2»: ranglar faqat useTheme() tokenlaridan. src/ui da xato,
// features/app da (eski ekranlar ko'chirilguncha) ogohlantirish.
const HEX_SELECTOR = 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]';
const HEX_MESSAGE = 'Hex rang literal — useTheme() tokenidan foydalaning (v3 dizayn tili).';

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
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/mascot/**'],
    rules: {
      'no-restricted-syntax': ['error', { selector: HEX_SELECTOR, message: HEX_MESSAGE }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['warn', { selector: HEX_SELECTOR, message: HEX_MESSAGE }],
      'no-restricted-imports': [
        'warn',
        { paths: [{ name: '@/constants', importNames: ['COLORS'], message: 'COLORS eskirgan — useTheme().' }] },
      ],
    },
  },
];
