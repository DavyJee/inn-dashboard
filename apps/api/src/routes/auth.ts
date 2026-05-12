import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  (req.session as any).userId = user.id;
  res.json({ id: user.id, username: user.username, isAdmin: user.isAdmin });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, isAdmin: true } });
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(user);
});

export function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export { router as authRouter };
