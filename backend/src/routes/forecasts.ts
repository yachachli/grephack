import { Router } from 'express';
import { z } from 'zod';
import { ForecastService } from '../engineer3/forecasting.js';

const listQuery = z.object({
  region: z.string().min(1).optional(),
  variety: z.string().min(1).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});
const backtestQuery = z.object({ season: z.coerce.number().int().min(2020).max(2030).default(2024) });

/** Engineer 3's self-contained workbook-backed forecasting API. */
export function createForecastsRouter(service = new ForecastService()): Router {
  const router = Router();

  router.get('/', (req, res, next) => {
    try { res.json({ data: service.forecasts(listQuery.parse(req.query)) }); } catch (error) { next(error); }
  });
  router.get('/data-status', (_req, res, next) => {
    try { res.json({ data: service.dataStatus() }); } catch (error) { next(error); }
  });
  router.post('/refresh', (_req, res, next) => {
    try { res.json({ data: service.refresh() }); } catch (error) { next(error); }
  });
  router.get('/backtest', (req, res, next) => {
    try { res.json({ data: service.backtest(backtestQuery.parse(req.query).season) }); } catch (error) { next(error); }
  });
  router.get('/:blockCode', (req, res, next) => {
    try {
      const result = service.forecast(req.params.blockCode);
      if (!result) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Forecast not found' } });
      return res.json({ data: result });
    } catch (error) { return next(error); }
  });
  return router;
}
