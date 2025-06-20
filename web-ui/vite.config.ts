import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        if_return: true,
        join_vars: true,
        sequences: true,
        evaluate: true,
        unused: true,
        comparisons: true,
        typeofs: true,
      },
      format: {
        comments: false,
      },
      mangle: true,
      module: true,
      toplevel: true,
    },
    sourcemap: false,
    target: 'es2015',
  },
  plugins: [
    preact(),
    tailwindcss(),
    compression({ deleteOriginalAssets: true }),
    visualizer({ open: true }),
  ],
})
