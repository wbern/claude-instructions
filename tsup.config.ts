import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'scripts/bin.ts' },
  format: ['esm'],
  outDir: 'bin',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
