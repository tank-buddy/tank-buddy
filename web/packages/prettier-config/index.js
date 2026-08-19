import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * `plugins` holds a resolved path rather than a bare name on purpose. Prettier
 * resolves plugin names relative to the process that loads the config, which is
 * the workspace root -- and under pnpm the plugin lives in this package's own
 * node_modules, so a bare name fails with "Cannot find package
 * 'prettier-plugin-organize-imports'". Resolving it here, where it is declared,
 * works from every package.
 */
export default {
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  trailingComma: 'es5',
  useTabs: false,
  tabWidth: 2,
  printWidth: 80,
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  // Import sorting is Prettier's job here, not an ESLint rule.
  plugins: [require.resolve('prettier-plugin-organize-imports')],
}
