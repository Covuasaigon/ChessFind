import { mkdirSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

console.log('--- Creating frontend structure ---');
mkdirSync(resolve(root, 'frontend'), { recursive: true });
mkdirSync(resolve(root, 'frontend/app'), { recursive: true });
mkdirSync(resolve(root, 'frontend/components'), { recursive: true });
mkdirSync(resolve(root, 'frontend/lib'), { recursive: true });
mkdirSync(resolve(root, 'frontend/public'), { recursive: true });

cpSync(resolve(root, 'ma-nguon/app'), resolve(root, 'frontend/app'), { recursive: true });
cpSync(resolve(root, 'ma-nguon/components'), resolve(root, 'frontend/components'), { recursive: true });
cpSync(resolve(root, 'ma-nguon/lib'), resolve(root, 'frontend/lib'), { recursive: true });
if (existsSync(resolve(root, 'web'))) {
  cpSync(resolve(root, 'web'), resolve(root, 'frontend/public'), { recursive: true });
}
if (existsSync(resolve(root, 'ma-nguon/public'))) {
  cpSync(resolve(root, 'ma-nguon/public'), resolve(root, 'frontend/public'), { recursive: true });
}
cpSync(resolve(root, 'ma-nguon/portable/index.html'), resolve(root, 'frontend/index.html'));
cpSync(resolve(root, 'ma-nguon/portable/main.tsx'), resolve(root, 'frontend/main.tsx'));

const frontendMainPath = resolve(root, 'frontend/main.tsx');
let frontendMainContent = readFileSync(frontendMainPath, 'utf8');
frontendMainContent = frontendMainContent.replaceAll('../app/', './app/');
writeFileSync(frontendMainPath, frontendMainContent);

console.log('--- Creating backend structure ---');
mkdirSync(resolve(root, 'backend'), { recursive: true });
mkdirSync(resolve(root, 'backend/lib'), { recursive: true });
mkdirSync(resolve(root, 'backend/migrations'), { recursive: true });
mkdirSync(resolve(root, 'backend/data'), { recursive: true });
mkdirSync(resolve(root, 'backend/uploads/banner'), { recursive: true });

cpSync(resolve(root, 'ma-nguon/lib'), resolve(root, 'backend/lib'), { recursive: true });
cpSync(resolve(root, 'ma-nguon/portable/database.ts'), resolve(root, 'backend/database.ts'));
cpSync(resolve(root, 'ma-nguon/portable/server.ts'), resolve(root, 'backend/server.ts'));

const serverTsPath = resolve(root, 'backend/server.ts');
let serverTsContent = readFileSync(serverTsPath, 'utf8');
serverTsContent = serverTsContent.replace("'../lib/api'", "'./lib/api'").replace('"../lib/api"', '"./lib/api"');
writeFileSync(serverTsPath, serverTsContent);
if (existsSync(resolve(root, 'migrations'))) {
  cpSync(resolve(root, 'migrations'), resolve(root, 'backend/migrations'), { recursive: true });
}
if (existsSync(resolve(root, 'data'))) {
  cpSync(resolve(root, 'data'), resolve(root, 'backend/data'), { recursive: true });
}
if (existsSync(resolve(root, 'web/uploads'))) {
  cpSync(resolve(root, 'web/uploads'), resolve(root, 'backend/uploads'), { recursive: true });
}

console.log('Successfully initialized frontend and backend structure!');
