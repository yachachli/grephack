import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import { createDb, type Db } from './db.js';
import { createBlocksRouter } from './routes/blocks.js';
import { createForecastsRouter } from './routes/forecasts.js';
import { createPlannerRouter } from './routes/planner.js';

export function createApp(config: AppConfig, db: Db = createDb(config.databaseUrl)) {
  const app = express();
  app.use(cors({ origin: config.webOrigin }));
  app.use(express.json({ limit: '128kb' }));

  app.get('/health', async (_req, res, next) => {
    try {
      await db.query('select 1');
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  app.use('/api/blocks', createBlocksRouter(db));
  app.use('/api/forecasts', createForecastsRouter());
  app.use('/api/planner', createPlannerRouter(db));
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: error.issues.map((issue) => issue.message).join(', ') } });
      return;
    }
    console.error(error);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  };
  app.use(errorHandler);
  return app;
}
