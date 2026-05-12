import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';

const router = Router();

router.get('/', async (req, res) => {
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

  const result = inns.map(inn => {
    const av = availabilities.find(a => a.innId === inn.id);
    const pr = prices.find(p => p.innId === inn.id);
    return {
      innId: inn.id,
      name: inn.name,
      platform: inn.platform,
      location: inn.location,
      totalRooms: inn.totalRooms,
      availableRooms: av?.availableRooms ?? null,
      bookedRooms: av?.bookedRooms ?? null,
      occupancyRate: av?.occupancyRate ?? null,
      lowestPrice: av?.lowestPrice ?? pr?.price ?? null,
    };
  });

  res.json({ date: targetDate.toISOString().split('T')[0], data: result });
});

export { router as compareRouter };
