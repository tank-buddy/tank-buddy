// @ts-check
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

/**
 * The rules web-ui and installer agree on, as a function rather than an array
 * for two reasons.
 *
 * `tsconfigRootDir` has to resolve to the *consuming* package: `import.meta.dirname`
 * evaluated in this file would point here, where no tsconfig lives, and the
 * type-aware rules would silently find no project.
 *
 * And `prettier` must stay last, because it works by switching off every
 * formatting rule the earlier configs turned on. Taking package-specific blocks
 * as a parameter and appending prettier afterwards makes that ordering
 * structural instead of a comment someone has to obey.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir Pass `import.meta.dirname`.
 * @param {string[]} [options.ignores] Added to the shared ignore list.
 * @param {import('typescript-eslint').ConfigArray} [options.extra]
 *   Package-specific blocks, applied after the shared rules and before prettier.
 */
export const tankBuddyConfig = ({
  tsconfigRootDir,
  ignores = [],
  extra = [],
}) =>
  tseslint.config(
    { ignores: ['dist', 'coverage', 'node_modules', 'stats.html', ...ignores] },

    js.configs.recommended,

    // strictTypeChecked rather than recommended: the type-aware rules
    // (no-floating-promises, no-misused-promises, await-thenable) are the point
    // for pages that are mostly fetch calls.
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        // Interpolating a number into a string is unambiguous and pervasive
        // here (percentages, millimetres, ports, board counts).
        '@typescript-eslint/restrict-template-expressions': [
          'error',
          { allowNumber: true },
        ],
      },
    },

    ...extra,

    // Always last; see above.
    prettier
  )
