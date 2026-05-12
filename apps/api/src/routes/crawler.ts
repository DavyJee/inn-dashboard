import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { runCrawl } from '../crawler';

const router = Router();

router.post('/trigger', async (req, res) => {
  const { innId } = req.body;
  try {
    // Start crawl in background to avoid proxy timeout
    setImmediate(() => {
      runCrawl(innId ? Number(innId) : undefined).catch((err) => {
        console.error('[Crawler] Background crawl error:', err);
      });
    });
    res.json({ success: true, message: '抓取任务已启动，请稍后刷新日志查看结果' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const logs = await prisma.captureLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
  res.json(logs);
});

export { router as crawlerRouter };
