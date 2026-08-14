import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, type Plugin } from 'vite'
import { compression } from 'vite-plugin-compression2'

const MSW_WORKER = 'mockServiceWorker.js'

/**
 * Keeps MSW's service worker out of the firmware image.
 *
 * `msw init` puts the worker in public/, and Vite copies public/ verbatim into
 * the build. At 9.6 kB raw (~3.2 kB gzipped) that would be over 15% of the
 * payload flashed onto a device that never mocks anything.
 *
 * Two layers, deliberately: the compression plugin is told to skip the file so
 * no .gz is ever produced, and this plugin removes the original. The final
 * assertion throws rather than warns, because a silent regression here would
 * pass CI and only show up as lost flash on the device.
 */
const excludeMockWorker = (): Plugin => ({
  name: 'exclude-msw-worker',
  apply: 'build',
  closeBundle: {
    order: 'post',
    handler() {
      const outDir = 'dist'

      for (const entry of readdirSync(outDir)) {
        if (entry.startsWith(MSW_WORKER)) {
          rmSync(join(outDir, entry))
        }
      }

      const leftovers = readdirSync(outDir).filter((entry) =>
        entry.startsWith(MSW_WORKER)
      )

      if (leftovers.length > 0) {
        throw new Error(
          `${MSW_WORKER} must not ship to the device, but found: ${leftovers.join(', ')}`
        )
      }
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
    },
  },
  build: {
    // Vite 8 minifies with Oxc and uses Lightning CSS for CSS by default, so
    // neither `minify` nor `cssMinify` needs to be set any more.
    sourcemap: false,
    target: 'esnext',
    modulePreload: {
      polyfill: false,
    },
  },
  plugins: [
    preact(),
    tailwindcss(),
    // Load-bearing, not an optimisation: src/api/api.py serves ONLY
    // /www/<path>.gz, so the build must emit gzip and drop the originals.
    compression({
      algorithms: ['gzip'],
      deleteOriginalAssets: true,
      // The plugin default omits .webmanifest, which would leave the home-screen
      // manifest as the only text asset without a .gz. apple-touch-icon.png is
      // deliberately not listed: gzip cannot shrink a PNG, so the plugin's
      // skipIfLargerOrEqual would drop the output anyway -- api.py serves that
      // one from its uncompressed path.
      include: /\.(html|xml|css|json|webmanifest|js|mjs|svg|yaml|yml|toml)$/,
      // Skipped here so no .gz is created regardless of plugin ordering;
      // excludeMockWorker then removes the uncompressed original.
      exclude: [new RegExp(`${MSW_WORKER.replace('.', '\\.')}$`)],
    }),
    excludeMockWorker(),
    process.env.ANALYZE ? visualizer({ open: true, gzipSize: true }) : null,
  ],
})
