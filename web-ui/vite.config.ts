import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
    },
  },
  build: {
    minify: 'esbuild',
    cssMinify: 'lightningcss',
    sourcemap: false,
    target: 'esnext',
    modulePreload: {
      polyfill: false,
    },
  },
  plugins: [
    preact(),
    tailwindcss(),
    compression({ algorithms: ['gzip'], deleteOriginalAssets: true }),
    ...[process.env.ANALYZE ? visualizer({ open: true, gzipSize: true }) : []],
  ],
})
