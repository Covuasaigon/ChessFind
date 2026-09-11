import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import type {Database,Statement} from '../lib/api';
export function openDatabase(file:string,migrations:string):Database&{close():void}{
 mkdirSync(dirname(file),{recursive:true});const sql=new DatabaseSync(file);sql.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');sql.exec('CREATE TABLE IF NOT EXISTS sgc_migrations (name TEXT PRIMARY KEY, applied TEXT NOT NULL)');
 if (existsSync(migrations)) {
  for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort())if(!sql.prepare('SELECT name FROM sgc_migrations WHERE name = ?').get(name)){sql.exec('BEGIN');try{sql.exec(readFileSync(resolve(migrations,name),'utf8'));sql.prepare('INSERT INTO sgc_migrations (name,applied) VALUES (?,?)').run(name,new Date().toISOString());sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}}
 }
 class Query implements Statement{text:string;args:any[]=[];constructor(text:string){this.text=text;}bind(...args:any[]){const q=new Query(this.text);q.args=args;return q}async first<T=any>():Promise<T|null>{return sql.prepare(this.text).get(...this.args) as T||null}async all<T=any>(){return{results:sql.prepare(this.text).all(...this.args) as T[]}}execute(){const r=sql.prepare(this.text).run(...this.args);return{meta:{changes:Number(r.changes)}}}async run(){return this.execute()}}
 return{prepare:s=>new Query(s),async batch(ss:Statement[]){sql.exec('BEGIN IMMEDIATE');try{const r=ss.map(s=>(s as Query).execute());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}},close:()=>sql.close()};
}
