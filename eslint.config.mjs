import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import { importX } from 'eslint-plugin-import-x';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eslint.config.mjs', '.vite', 'out', '.vscode', '.claude'] },

  js.configs.recommended,
  tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  prettierRecommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/prop-types': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}', 'electron/**/*.ts', 'bridge/**/*.ts'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // src/ may import itself, node_modules, and the neutral bridge/ folder -- never electron/.
            {
              target: './src',
              from: '.',
              except: ['./src', './bridge', './node_modules'],
            },
            // electron/ may import itself, node_modules, and bridge/ -- never src/.
            {
              target: './electron',
              from: '.',
              except: ['./electron', './bridge', './node_modules'],
            },
            // bridge/ must stay neutral: it may only import itself and node_modules, so it never
            // becomes a backdoor between src/ and electron/.
            {
              target: './bridge',
              from: '.',
              except: ['./bridge', './node_modules'],
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/theme/themes/*.ts', 'src/theme/variables/globals.ts'],
    rules: {
      'prettier/prettier': 'off',
    },
  },
);
