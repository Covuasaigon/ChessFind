import cron from 'node-cron';
import { importTournament } from '../lib/chess-source.js';
import type { Database, ApiSource } from '../lib/api.js';
import type { Tournament } from '../lib/chess.js';

let isSyncRunning = false;

export function startSyncScheduler(db: Database, sourceOverride?: ApiSource) {
  console.log('[Sync Scheduler] Initializing automatic 5-minute Chess-Results sync scheduler...');

  // Schedule task every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', async () => {
    if (isSyncRunning) {
      console.log('[Sync Scheduler] Previous sync cycle still running, skipping...');
      return;
    }
    isSyncRunning = true;
    try {
      await runAutoSyncCycle(db, sourceOverride);
    } catch (err) {
      console.error('[Sync Scheduler] Error in auto sync cycle:', err);
    } finally {
      isSyncRunning = false;
    }
  });

  // Run an initial check 10 seconds after server launch
  setTimeout(() => {
    runAutoSyncCycle(db, sourceOverride).catch(e => console.error('[Sync Scheduler] Initial check error:', e));
  }, 10000);
}

export async function runAutoSyncCycle(db: Database, sourceOverride?: ApiSource) {
  try {
    let rows: any[] = [];
    try {
      const res = await db.prepare('SELECT payload, published, auto_sync, sync_interval, last_sync, next_sync FROM tournaments').all<any>();
      rows = res.results || [];
    } catch {
      const res = await db.prepare('SELECT payload, published FROM tournaments').all<any>();
      rows = res.results || [];
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    for (const r of rows) {
      let t: Tournament;
      try {
        t = JSON.parse(r.payload);
      } catch {
        continue;
      }

      const published = r.published !== undefined && r.published !== null ? !!r.published : !!t.published;
      if (!published) continue;

      const autoSync = r.auto_sync !== undefined && r.auto_sync !== null ? !!r.auto_sync : (t.autoSync ?? t.auto_sync ?? true);
      if (!autoSync) continue;

      const interval = r.sync_interval ? Number(r.sync_interval) : (t.syncInterval ?? t.sync_interval ?? 5);
      const lastSyncStr = r.last_sync || t.lastSync || t.last_sync || null;
      const lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;

      const intervalMs = interval * 60 * 1000;
      if (lastSyncTime > 0 && (now - lastSyncTime) < (intervalMs - 30000)) {
        continue;
      }

      console.log(`[Sync Scheduler] Auto syncing tournament "${t.name}" (${t.id})...`);

      try {
        const fetcher = sourceOverride?.tournament ? sourceOverride.tournament : importTournament;
        const updatedTour = await fetcher(t.source, t.group);

        updatedTour.name = t.name;
        updatedTour.published = true;
        updatedTour.info = t.info;
        updatedTour.prizes = t.prizes;

        const nextSyncIso = new Date(now + intervalMs).toISOString();

        updatedTour.autoSync = true;
        updatedTour.auto_sync = true;
        updatedTour.syncInterval = interval;
        updatedTour.sync_interval = interval;
        updatedTour.lastSync = nowIso;
        updatedTour.last_sync = nowIso;
        updatedTour.nextSync = nextSyncIso;
        updatedTour.next_sync = nextSyncIso;

        const payloadStr = JSON.stringify(updatedTour);

        try {
          await db.prepare('UPDATE tournaments SET payload = ?, updated = ?, auto_sync = 1, sync_interval = ?, last_sync = ?, next_sync = ? WHERE id = ?')
            .bind(payloadStr, updatedTour.updated, interval, nowIso, nextSyncIso, t.id).run();
        } catch {
          await db.prepare('UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?')
            .bind(payloadStr, updatedTour.updated, t.id).run();
        }

        try {
          const logId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO sync_logs (id, tournament_id, tournament_name, url, created_at, status, players_updated, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            t.id,
            t.name,
            t.source,
            nowIso,
            'success',
            updatedTour.players ? updatedTour.players.length : 0,
            `Tự động đồng bộ thành công từ Chess-Results: ${t.name} (${updatedTour.players ? updatedTour.players.length : 0} kỳ thủ)`
          ).run();
        } catch (logErr) {
          console.error('[Sync Scheduler] Failed to write sync log:', logErr);
        }

        console.log(`[Sync Scheduler] Auto synced "${t.name}" successfully (${updatedTour.players?.length || 0} players).`);

      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Sync Scheduler] Error auto syncing "${t.name}":`, errMsg);

        try {
          const logId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO sync_logs (id, tournament_id, tournament_name, url, created_at, status, players_updated, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            t.id,
            t.name,
            t.source,
            nowIso,
            'failed',
            0,
            `Lỗi tự động đồng bộ: ${errMsg}`
          ).run();
        } catch {}
      }
    }
  } catch (err) {
    console.error('[Sync Scheduler] Error in runAutoSyncCycle:', err);
  }
}
