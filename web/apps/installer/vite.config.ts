import { basePlugins } from '@tank-buddy/vite-config'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset URLs. This is a project Pages site, served from
  // https://tank-buddy.github.io/tank-buddy/ rather than the domain root, and
  // Vite's default of '/' would point every script, stylesheet and lazily
  // loaded esp-web-tools chunk at the wrong path.
  base: './',
  plugins: basePlugins(),
  build: {
    // Vite warns past 500 kB and esp-web-tools' flash dialog is 308 kB before
    // the chip stubs. The limit exists to flag accidental bloat; here the bulk
    // is the point, and a warning on every build hides the real ones.
    chunkSizeWarningLimit: 1500,
  },
})
