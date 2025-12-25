import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [],
    setupFiles: ['vitest.global-setup.js'],
  },
});
