import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addDays } from 'date-fns/addDays';

const router = Router();

router.get('/', async (_req, res) => {
  const inns = await prisma.inn.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(inns);
});

router.post('/', async (req, res) => {
  const { name, platform, platformId, url, totalRooms, location } = req.body;
  try {
    const inn = await prisma.inn.create({
      data: { name, platform, platformId, url, totalRooms: Number(totalRooms), location },
    });
    res.status(201).json(inn);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  const inn = await prisma.inn.findUnique({ where: { id: Number(req.params.id) } });
  if (!inn) return res.status(404).json({ error: 'Not found' });
  res.json(inn);
});

router.put('/:id', async (req, res) => {
  const { name, url, totalRooms, location, isActive } = req.body;
  try {
    const inn = await prisma.inn.update({
      where: { id: Number(req.params.id) },
      data: { name, url, totalRooms: totalRooms ? Number(totalRooms) : undefined, location, isActive },
    });
    res.json(inn);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await prisma.inn.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

router.get('/:id/availability', async (req, res) => {
  const innId = Number(req.params.id);
  const days = Math.min(Number(req.query.days) || 30, 90);
  const today = startOfDay(new Date());

  const availabilities = await prisma.roomAvailability.findMany({
    where: {
      innId,
      date: { gte: today, lte: endOfDay(addDays(today, days - 1)) },
    },
    orderBy: [{ date: 'asc' }, { capturedAt: 'desc' }],
    distinct: ['date'],
    include: { inn: { select: { name: true, totalRooms: true } } },
  });

  res.json(availabilities);
});

router.get('/:id/prices', async (req, res) => {
  const innId = Number(req.params.id);
  const days = Math.min(Number(req.query.days) || 30, 90);
  const today = startOfDay(new Date());

  const prices = await prisma.priceHistory.findMany({
    where: {
      innId,
      date: { gte: today, lte: endOfDay(addDays(today, days - 1)) },
    },
    orderBy: [{ date: 'asc' }, { capturedAt: 'desc' }],
    distinct: ['date', 'roomType'],
  });

  res.json(prices);
});

export { router as innsRouter };
