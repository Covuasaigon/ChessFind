import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

console.log('Building Vercel Production Output for ma-nguon...');

const r = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.portable.config.ts'], {
  cwd: root,
  stdio: 'inherit'
});

if (r.status !== 0) {
  process.exit(r.status || 1);
}

// Ensure dist/ contains index.html & assets directly for Vercel static serving
mkdirSync(resolve(root, 'dist'), { recursive: true });
if (existsSync(resolve(root, 'release/web'))) {
  cpSync(resolve(root, 'release/web'), resolve(root, 'dist'), { recursive: true });
}

if (existsSync(resolve(root, 'public'))) {
  cpSync(resolve(root, 'public'), resolve(root, 'dist'), { recursive: true });
}

console.log('✅ Vercel deployable output successfully generated in ma-nguon/dist!');
