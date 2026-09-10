import {spawnSync} from 'node:child_process';
import {mkdirSync,cpSync} from 'node:fs';
import {build} from 'esbuild';

const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.portable.config.ts'],{stdio:'inherit'});
if(r.status!==0)process.exit(r.status||1);

mkdirSync('release/server',{recursive:true});
await build({entryPoints:['portable/server.ts'],bundle:true,platform:'node',format:'esm',target:'node24',outfile:'release/server/server.mjs'});
cpSync('drizzle','release/migrations',{recursive:true});

for(const f of ['CHAY-WINDOWS.bat','CHAY-MAC-LINUX.sh','CAU-HINH.env','HUONG-DAN.md','KIEM-THU.md']) {
  cpSync('portable/'+f,'release/'+f);
}

// Copy built output to workspace root so CHAY-WINDOWS.bat runs V2 Production immediately
cpSync('release/web', '../web', {recursive: true});
cpSync('release/server', '../server', {recursive: true});
cpSync('release/migrations', '../migrations', {recursive: true});

console.log('Đã cập nhật bản chạy V2 Production vào release/ và thư mục gốc!');

