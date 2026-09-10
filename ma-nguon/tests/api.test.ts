import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {openDatabase} from '../portable/database';
import {createApi} from '../lib/api';
import {makeDemo,type Tournament} from '../lib/chess';
const dir=mkdtempSync(resolve(tmpdir(),'sgc-test-'));
let db=openDatabase(resolve(dir,'test.sqlite'),resolve(process.cwd(),'drizzle'));
const source={async tournament(url:string,group:string){if(url.includes('broken'))throw Error('Nguồn kiểm thử bị lỗi');const t=makeDemo();const id=url.match(/tnr(\d+)/)![1];return{...t,id,name:'Giải kiểm thử',group,source:url,updated:new Date().toISOString(),demo:false,players:t.players.map(p=>({...p,id:id+'-'+p.snr}))} as Tournament},async player(t:any,p:any){return p}};
let api=createApi(db,source);const origin='http://localhost:3000';let cookie='',csrf='';
async function call(path:string,body?:any,options:{anonymous?:boolean;badOrigin?:boolean;badCsrf?:boolean;ip?:string}={}){const h:Record<string,string>={Origin:options.badOrigin?'https://evil.test':origin};if(!options.anonymous){h.Cookie=cookie;h['X-CSRF-Token']=options.badCsrf?'bad':csrf}const r=await api(new Request(origin+path,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined}),options.ip||'127.0.0.1');return{r,d:await r.json() as any}}
try{
 assert.equal((await call('/api/admin')).d.admin,false);
 assert.equal((await call('/api/admin',{action:'save'})).r.status,401);
 assert.equal((await call('/api/auth/login',{username:'admin',password:'wrong'})).r.status,401);
 const login=await call('/api/auth/login',{username:'admin',password:process.env.TEST_ADMIN_PASSWORD});assert.equal(login.r.status,200);cookie=login.r.headers.get('set-cookie')!.split(';')[0];assert.match(login.r.headers.get('set-cookie')!,/HttpOnly/);assert.match(login.r.headers.get('set-cookie')!,/SameSite=Strict/);csrf=login.d.csrf;
 assert.equal((await call('/api/admin')).d.admin,true);assert.equal((await call('/api/admin',{action:'preview'},{badOrigin:true})).r.status,403);assert.equal((await call('/api/admin',{action:'preview'},{badCsrf:true})).r.status,403);
 const preview=await call('/api/admin',{action:'preview',url:'https://chess-results.com/tnr123.aspx',group:'U8',name:'Giải A'});assert.equal(preview.r.status,200);assert.equal((await call('/api/admin',{action:'save',token:preview.d.token})).r.status,200);
 assert.equal((await call('/api/tournaments')).d.tournaments.length,0);
 assert.equal((await call('/api/admin',{action:'publish',id:'123',published:true})).r.status,200);assert.equal((await call('/api/tournaments')).d.tournaments.length,1);
 const ed=await call('/api/admin',{action:'edit',id:'123',name:'Giải đã sửa',group:'U10',url:'https://chess-results.com/tnr123.aspx'});assert.equal(ed.r.status,200);assert.equal((await call('/api/tournaments')).d.tournaments[0].name,'Giải đã sửa');
 const failure=await call('/api/admin',{action:'edit',id:'123',name:'Mất dữ liệu',group:'U10',url:'https://chess-results.com/tnr456.aspx?broken=1'});assert.equal(failure.r.status,502);assert.equal((await call('/api/tournaments')).d.tournaments[0].name,'Giải đã sửa');
 assert.equal((await call('/api/admin',{action:'delete',id:'123',confirmName:'sai'})).r.status,400);
 db.close();db=openDatabase(resolve(dir,'test.sqlite'),resolve(process.cwd(),'drizzle'));api=createApi(db,source);assert.equal((await call('/api/tournaments')).d.tournaments.length,1);assert.equal((await call('/api/admin')).d.admin,true);
 assert.equal((await call('/api/admin',{action:'publish',id:'123',published:false})).r.status,200);assert.equal((await call('/api/tournaments')).d.tournaments.length,0);
 assert.equal((await call('/api/admin',{action:'delete',id:'123',confirmName:'Giải đã sửa'})).r.status,200);assert.equal((await call('/api/admin')).d.tournaments.length,0);
 assert.equal((await call('/api/auth/logout',{})).r.status,200);assert.equal((await call('/api/admin')).d.admin,false);
 for(let i=0;i<8;i++)await call('/api/auth/login',{username:'admin',password:'wrong'},{ip:'rate-limit-test'});assert.equal((await call('/api/auth/login',{username:'admin',password:'wrong'},{ip:'rate-limit-test'})).r.status,429);
 console.log('PASS: login, wrong password, session persistence, logout revocation, CSRF, cross-origin protection, add, edit, hide/show, delete confirmation, source failure preservation, durable SQLite restart, rate limit.');
}finally{db.close();rmSync(dir,{recursive:true,force:true})}
