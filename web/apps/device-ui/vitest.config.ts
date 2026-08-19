import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Pre-bundling vitest-browser-preact detaches it from the Vitest runner
    // context, which fails with "Vitest failed to find the runner".
    optimizeDeps: {
      exclude: ['vitest-browser-preact'],
    },
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
      browser: {
        enabled: true,
        headless: true,
        // One real Chromium rather than a DOM simulation: the app depends on a
        // service worker (MSW) and on real layout, neither of which happy-dom
        // or jsdom provide.
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
      coverage: {
        provider: 'v8',
        // Only src/ ships, so mocks/ and tests/ are outside coverage by
        // construction rather than by an exclude list.
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/types.ts', 'src/vite-env.d.ts'],
      },
    },
  })
)
