import cron from 'node-cron';
import { runCrawl } from '../crawler';

let isRunning = false;

export function startScheduler() {
  // Every 30 minutes during 06:00 - 23:00
  cron.schedule('*/30 6-23 * * *', async () => {
    if (isRunning) {
      console.log('[Scheduler] Previous crawl still running, skipping');
      return;
    }
    isRunning = true;
    console.log('[Scheduler] Starting scheduled crawl at', new Date().toISOString());
    try {
      await runCrawl();
      console.log('[Scheduler] Crawl completed successfully');
    } catch (err: any) {
      console.error('[Scheduler] Crawl failed:', err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('[Scheduler] Crawler scheduled to run every 30 minutes (06:00-23:00)');
}
