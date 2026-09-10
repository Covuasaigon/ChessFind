import { build } from 'esbuild';
import { mkdirSync, cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)));

console.log('Building Backend standalone bundle (server.mjs)...');

await build({
  entryPoints: [resolve(root, 'server.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: resolve(root, 'server.mjs'),
  packages: 'external'
});

mkdirSync(resolve(root, 'uploads/banner'), { recursive: true });
mkdirSync(resolve(root, 'data'), { recursive: true });

console.log('Backend build completed successfully: server.mjs ready!');
