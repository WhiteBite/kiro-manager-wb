import { context } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Main function - runs the esbuild compiler.
 */
async function main() {
  const context_ = await context({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: 'linked',
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/index.js',
    external: ['vscode', 'esbuild'],
    logLevel: 'silent',
    plugins: [],
    supported: { 'dynamic-import': false },
  });
  if (watch) {
    await context_.watch();
  } else {
    await context_.rebuild();
    await context_.dispose();
  }
}

try {
  await main();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_error) {
  process.exit(1);
}
