import { createApi, json } from './api.ts';
import { getDb } from './db.ts';

export async function handleRequest(req: Request) {
  try {
    const db = getDb();
    if (!db) {
      return json({ error: 'Database chưa kết nối' }, 503);
    }

    const api = createApi(db);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'site';
    return await api(req, clientIp);
  } catch (err) {
    console.error('API Error:', err);
    return json({ error: 'Kho dữ liệu tạm thời không sẵn sàng. Vui lòng thử lại sau.' }, 500);
  }
}