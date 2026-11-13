import { defineConfig } from 'vitest/config'

const INTEGRATION_SETUP_TIMEOUT_MS = 30_000

export default defineConfig({
  test: {
    hookTimeout: INTEGRATION_SETUP_TIMEOUT_MS,
  },
})
