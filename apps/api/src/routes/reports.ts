import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { format } from 'date-fns/format';
import { subDays } from 'date-fns/subDays';
import { zhCN } from 'date-fns/locale/zh-CN';

const router = Router();

router.get('/:period', async (req, res) => {
  const { period } = req.params;
  const dateParam = req.query.date ? new Date(req.query.date as string) : new Date();
  let start: Date, end: Date, label: string;

  if (period === 'weekly') {
    start = startOfWeek(dateParam, { weekStartsOn: 1 });
    end = endOfWeek(dateParam, { weekStartsOn: 1 });
    label = `${format(start, 'MM/dd')} - ${format(end, 'MM/dd')}`;
  } else if (period === 'monthly') {
    start = startOfMonth(dateParam);
    end = endOfMonth(dateParam);
    label = format(dateParam, 'yyyy年MM月', { locale: zhCN });
  } else if (period === 'yearly') {
    start = startOfYear(dateParam);
    end = endOfYear(dateParam);
    label = format(dateParam, 'yyyy年', { locale: zhCN });
  } else {
    return res.status(400).json({ error: 'Invalid period' });
  }

  const inns = await prisma.inn.findMany({ where: { isActive: true } });
  const innIds = inns.map(i => i.id);

  const availabilities = await prisma.roomAvailability.findMany({
    where: {
      innId: { in: innIds },
      date: { gte: start, lte: end },
    },
    orderBy: { capturedAt: 'desc' },
  });

  const prices = await prisma.priceHistory.findMany({
    where: {
      innId: { in: innIds },
      date: { gte: start, lte: end },
    },
    orderBy: { capturedAt: 'desc' },
  });

  // Aggregate by inn
  const innStats = inns.map(inn => {
    const avs = availabilities.filter(a => a.innId === inn.id);
    const prs = prices.filter(p => p.innId === inn.id);
    const avgOccupancy = avs.length > 0
      ? avs.reduce((s, a) => s + a.occupancyRate, 0) / avs.length
      : 0;
    const avgPrice = prs.length > 0
      ? prs.reduce((s, p) => s + p.price, 0) / prs.length
      : 0;
    return {
      innId: inn.id,
      name: inn.name,
      platform: inn.platform,
      avgOccupancy: Number(avgOccupancy.toFixed(1)),
      avgPrice: Number(avgPrice.toFixed(0)),
      recordCount: avs.length,
    };
  });

  // Daily trend
  const dailyMap = new Map<string, { totalRooms: number; totalBooked: number; count: number }>();
  for (const av of availabilities) {
    const key = format(av.date, 'yyyy-MM-dd');
    const existing = dailyMap.get(key) || { totalRooms: 0, totalBooked: 0, count: 0 };
    existing.totalRooms += av.totalRooms;
    existing.totalBooked += av.bookedRooms;
    existing.count += 1;
    dailyMap.set(key, existing);
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, v]) => ({
      date,
      occupancyRate: v.totalRooms > 0 ? Number(((v.totalBooked / v.totalRooms) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ period, label, start, end, innStats, dailyTrend });
});

export { router as reportsRouter };
