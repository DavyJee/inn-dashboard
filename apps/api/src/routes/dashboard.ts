import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addDays } from 'date-fns/addDays';
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';

const router = Router();

router.get('/summary', async (_req, res) => {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [inns, todayData, alerts] = await Promise.all([
    prisma.inn.findMany({ where: { isActive: true } }),
    prisma.roomAvailability.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: { inn: true },
      orderBy: { capturedAt: 'desc' },
      distinct: ['innId'],
    }),
    prisma.alert.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const totalRooms = inns.reduce((sum, i) => sum + i.totalRooms, 0);
  const totalBooked = todayData.reduce((sum, d) => sum + d.bookedRooms, 0);
  const avgOccupancy = totalRooms > 0 ? (totalBooked / totalRooms) * 100 : 0;

  res.json({
    totalInns: inns.length,
    totalRooms,
    totalBooked,
    avgOccupancy: Number(avgOccupancy.toFixed(1)),
    todayData: todayData.map(d => ({
      innId: d.innId,
      innName: d.inn.name,
      platform: d.inn.platform,
      availableRooms: d.availableRooms,
      totalRooms: d.totalRooms,
      bookedRooms: d.bookedRooms,
      occupancyRate: d.occupancyRate,
      lowestPrice: d.lowestPrice,
    })),
    recentAlerts: alerts,
  });
});

router.get('/trend', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  const today = startOfDay(new Date());
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(today, i));
  }

  const inns = await prisma.inn.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const innIds = inns.map(i => i.id);

  const trendData = await Promise.all(
    dates.map(async (date) => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const records = await prisma.roomAvailability.findMany({
        where: { innId: { in: innIds }, date: { gte: dayStart, lte: dayEnd } },
        orderBy: { capturedAt: 'desc' },
        distinct: ['innId'],
      });
      const totalRooms = inns.reduce((s, i) => s + (records.find(r => r.innId === i.id)?.totalRooms || 0), 0);
      const totalBooked = records.reduce((s, r) => s + r.bookedRooms, 0);
      return {
        date: format(date, 'MM-dd'),
        occupancyRate: totalRooms > 0 ? Number(((totalBooked / totalRooms) * 100).toFixed(1)) : 0,
        totalBooked,
        totalRooms,
      };
    })
  );

  res.json({ trend: trendData });
});

router.get('/weekly-detail', async (req, res) => {
  const dateStr = req.query.date as string;
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const inns = await prisma.inn.findMany({ where: { isActive: true } });
  const innIds = inns.map(i => i.id);

  const [availabilities, prices] = await Promise.all([
    prisma.roomAvailability.findMany({
      where: { innId: { in: innIds }, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { capturedAt: 'desc' },
      distinct: ['innId'],
    }),
    prisma.priceHistory.findMany({
      where: { innId: { in: innIds }, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { capturedAt: 'desc' },
      distinct: ['innId'],
    }),
  ]);

  const data = inns.map(inn => {
    const av = availabilities.find(a => a.innId === inn.id);
    const pr = prices.find(p => p.innId === inn.id);
    return {
      innId: inn.id,
      innName: inn.name,
      platform: inn.platform,
      availableRooms: av?.availableRooms ?? 0,
      totalRooms: av?.totalRooms ?? inn.totalRooms,
      bookedRooms: av?.bookedRooms ?? 0,
      occupancyRate: av?.occupancyRate ?? 0,
      lowestPrice: av?.lowestPrice ?? pr?.price ?? null,
    };
  });

  const totalRooms = data.reduce((sum, d) => sum + d.totalRooms, 0);
  const totalBooked = data.reduce((sum, d) => sum + d.bookedRooms, 0);
  const avgOccupancy = totalRooms > 0 ? (totalBooked / totalRooms) * 100 : 0;

  res.json({
    date: targetDate.toISOString().split('T')[0],
    totalRooms,
    totalBooked,
    avgOccupancy: Number(avgOccupancy.toFixed(1)),
    data,
  });
});

export { router as dashboardRouter };
