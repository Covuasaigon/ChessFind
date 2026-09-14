import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const webDir = resolve(process.cwd(), 'web');

function copyRecursiveSync(src, dest) {
  const exists = statSync(src, { throwIfNoEntry: false });
  if (!exists) return;
  if (exists.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const file of readdirSync(src)) {
      copyRecursiveSync(join(src, file), join(dest, file));
    }
  } else {
    mkdirSync(resolve(dest, '..'), { recursive: true });
    copyFileSync(src, dest);
  }
}

try {
  if (statSync(distDir, { throwIfNoEntry: false })) {
    copyRecursiveSync(distDir, webDir);
    console.log('Successfully synced dist to web folder!');
  }
} catch (err) {
  console.error('Error syncing dist to web:', err);
}
