import js from '@eslint/js'
import tseslint from 'typescript-eslint'
export default tseslint.config(
  // Build output and measurement copies are generated, never linted: `dist-measure` is the
  // Lighthouse staging copy (see scripts/stage-lighthouse-dist.mjs).
  { ignores: ['dist/**', 'dist-measure/**', 'lhci-reports/**', 'test-results/**', 'node_modules/**', 'src/app/components/ui/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Lighthouse CI config + puppeteer hooks are CommonJS; the hook body runs in the page.
    files: ['**/*.cjs'],
    languageOptions: {
      globals: { module: 'writable', require: 'readonly', process: 'readonly', console: 'readonly', window: 'readonly' },
    },
  },
  {
    // Node CLI helpers under scripts/ (plain ESM, not part of the bundled app):
    // they talk to stdout, strip ANSI colour codes from Playwright output, and resolve paths with
    // the WHATWG `URL` global (Node ≥ 10) — all standard in Node, none of them bundled code.
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', URL: 'readonly' } },
    rules: { 'no-control-regex': 'off' },
  },
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
  {
    // Rule 1 + §3.2: no 3D runtime anywhere, and scenes only mount through <TierScene>.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'three', message: 'No 3D runtime: the visual layer is canvas/SVG. Use <TierScene> scenes.' },
          ],
          patterns: [
            { group: ['three/*', '@react-three/*'], message: 'No 3D runtime in this project (rule 1, §3.3).' },
            { group: ['@/visuals/scenes/*', '**/visuals/scenes/*'], message: 'Scenes must be rendered through <TierScene> so tier, DPR, fallback and pause-offscreen are enforced.' },
          ],
        },
      ],
    },
  },
  {
    // The wrapper itself (and the registry) are the only modules allowed to know scene paths.
    files: ['src/visuals/TierScene.tsx', 'src/visuals/registry.ts', 'src/visuals/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
)
