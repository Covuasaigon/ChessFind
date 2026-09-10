import {env} from 'cloudflare:workers';
import {createApi,json} from './api';
export async function handleRequest(req:Request){if(!env.DB)return json({error:'Kho dữ liệu chưa sẵn sàng.'},503);return createApi(env.DB)(req,req.headers.get('cf-connecting-ip')||'site')}
