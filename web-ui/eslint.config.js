// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'stats.html',
      // Vendored by `msw init`, not our code.
      'public/mockServiceWorker.js',
    ],
  },

  js.configs.recommended,

  // strictTypeChecked rather than recommended: the type-aware rules
  // (no-floating-promises, no-misused-promises, await-thenable) are the point
  // for a UI that is mostly fetch calls.
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Interpolating a number into a string is unambiguous and pervasive in
      // this UI (percentages, millimetres, ports).
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },

  // The mocks pull in msw. Importing them from a component would grow the
  // bundle from ~16 kB to ~147 kB with a perfectly green build -- measured --
  // and that bundle is flashed onto a device with little room to spare. The
  // DEV guard in main.tsx only protects the one call site, so the boundary is
  // enforced here instead. Allowed importers are listed further down.
  {
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks', '**/mocks/*'],
              message:
                'mocks/ pulls in msw and must never reach the bundle. Only src/main.tsx (DEV-guarded) and tests/ may import it.',
            },
          ],
        },
      ],
    },
  },
  {
    // main.tsx imports it behind `import.meta.env.DEV`; tests and the mocks
    // themselves obviously need it.
    files: ['src/main.tsx', 'tests/**', 'mocks/**'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },

  // Preact, not React: hook rules apply, but the JSX pragma differs.
  // The flat-config variants live under `configs.flat`; the top-level ones are
  // still eslintrc-shaped and ESLint 10 rejects them.
  {
    ...reactHooks.configs.flat['recommended-latest'],
    settings: { react: { pragma: 'h', version: '18.0' } },
  },

  // Config and build files are plain Node modules and not part of the app's
  // type-checked project graph.
  {
    files: ['eslint.config.js', 'vite.config.ts', 'vitest.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Must stay last so it can switch off every formatting rule Prettier owns.
  prettier
)
