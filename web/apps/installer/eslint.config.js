// @ts-check
import { tankBuddyConfig } from '@tank-buddy/eslint-config'
import tseslint from 'typescript-eslint'

export default tankBuddyConfig({
  tsconfigRootDir: import.meta.dirname,
  extra: [
    // Config and build files are plain Node modules and not part of the app's
    // type-checked project graph.
    {
      files: ['eslint.config.js', 'vite.config.ts'],
      ...tseslint.configs.disableTypeChecked,
    },
  ],
})
