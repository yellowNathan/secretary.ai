import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Vendored and generated files are not the agent's to fix. Their old lint
  // errors cost a first run 4 minutes of investigation.
  globalIgnores(['dist', 'src/components/ui', 'src/db.generated.ts', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // A TanStack route file exports `Route` next to its component by design.
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
