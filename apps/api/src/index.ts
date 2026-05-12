import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { innsRouter } from './routes/inns';
import { compareRouter } from './routes/compare';
import { reportsRouter } from './routes/reports';
import { alertsRouter } from './routes/alerts';
import { crawlerRouter } from './routes/crawler';
import { startScheduler } from './jobs/scheduler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3001', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'inn-dashboard-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/inns', innsRouter);
app.use('/api/compare', compareRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/crawler', crawlerRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  startScheduler();
});
