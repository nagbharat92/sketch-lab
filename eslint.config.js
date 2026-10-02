import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),

  // Application source — browser TypeScript + React
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
      // DX-only Fast Refresh hint. shadcn/ui files and the folder-tree context
      // module intentionally export helpers/variants alongside components.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Vendored shadcn/ui primitives — relax rules their conventions intentionally trip
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },

  // Build & tooling files — Node context (vite.config.js, plugins, this file)
  {
    files: ['*.js', 'plugins/**/*.js', 'tests/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
])
