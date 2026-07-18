import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: [
      'apps/**/*.ts',
      'apps/**/*.tsx',
      'layers/**/*.ts',
      'layers/**/*.tsx',
      'packages/**/*.ts',
      'packages/**/*.tsx',
      'tests/**/*.ts',
      'scripts/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'warn',
    },
  },
);
