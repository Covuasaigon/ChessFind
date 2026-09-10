import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, cwd) {
  console.log(`\n> Executing: ${cmd} ${args.join(' ')} (in ${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`❌ Command failed with exit code ${r.status}`);
    process.exit(r.status || 1);
  }
}

console.log('=== STARTING PRODUCTION BUILD FOR CỜ VUA SÀI GÒN ===');

// 1. Build backend standalone bundle
run('npm', ['run', 'build'], resolve(root, 'backend'));

// 2. Build frontend production bundle
run('npx', ['vite', 'build'], resolve(root, 'frontend'));

// 3. Build legacy ma-nguon portable bundle
run('npm', ['run', 'build:portable'], resolve(root, 'ma-nguon'));

console.log('\n✅ ALL PRODUCTION BUILDS COMPLETED WITH 0 ERRORS!');
