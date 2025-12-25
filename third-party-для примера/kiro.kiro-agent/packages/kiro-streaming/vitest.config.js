import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/snapshots.ts'],
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
