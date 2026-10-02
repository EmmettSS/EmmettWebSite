import js from '@eslint/js'
import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/app/components/ui/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node CLI helpers under scripts/ (plain ESM, not part of the bundled app):
    // they talk to stdout and strip ANSI colour codes from Playwright output.
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
    rules: { 'no-control-regex': 'off' },
  },
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
)
