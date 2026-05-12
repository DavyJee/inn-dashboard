import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
  const { resolved, limit = '50' } = req.query;
  const where: any = {};
  if (resolved !== undefined) where.isResolved = resolved === 'true';

  const alerts = await prisma.alert.findMany({
    where,
    include: { inn: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
  });
  res.json(alerts);
});

router.post('/', async (req, res) => {
  const { type, innId, message, severity } = req.body;
  const alert = await prisma.alert.create({
    data: { type, innId: innId ? Number(innId) : null, message, severity: severity || 'medium' },
  });
  res.status(201).json(alert);
});

router.put('/:id/resolve', async (req, res) => {
  const alert = await prisma.alert.update({
    where: { id: Number(req.params.id) },
    data: { isResolved: true, resolvedAt: new Date() },
  });
  res.json(alert);
});

router.delete('/:id', async (req, res) => {
  await prisma.alert.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

export { router as alertsRouter };
