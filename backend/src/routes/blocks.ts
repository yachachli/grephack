import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db.js';

const blockInput = z.object({
  externalId: z.string().min(1),
  vineyardName: z.string().min(1),
  blockName: z.string().min(1),
  variety: z.string().min(1),
  region: z.string().min(1),
  acres: z.number().nonnegative(),
  estimatedTons: z.number().nonnegative().nullable().optional(),
  harvestWindowStart: z.coerce.date().nullable().optional(),
  harvestWindowEnd: z.coerce.date().nullable().optional(),
});

export function createBlocksRouter(db: Db): Router {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const { rows } = await db.query('select * from blocks order by harvest_window_start nulls last, vineyard_name, block_name');
      res.json({ data: rows });
    } catch (error) { next(error); }
  });

  // Engineer 1 can upsert normalized blocks without coordinating database IDs.
  router.put('/:externalId', async (req, res, next) => {
    try {
      const input = blockInput.parse({ ...req.body, externalId: req.params.externalId });
      const { rows } = await db.query(
        `insert into blocks
           (external_id, vineyard_name, block_name, variety, region, acres, estimated_tons,
            harvest_window_start, harvest_window_end)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (external_id) do update set
           vineyard_name = excluded.vineyard_name, block_name = excluded.block_name,
           variety = excluded.variety, region = excluded.region, acres = excluded.acres,
           estimated_tons = excluded.estimated_tons,
           harvest_window_start = excluded.harvest_window_start,
           harvest_window_end = excluded.harvest_window_end, updated_at = now()
         returning *`,
        [input.externalId, input.vineyardName, input.blockName, input.variety, input.region,
          input.acres, input.estimatedTons ?? null, input.harvestWindowStart ?? null, input.harvestWindowEnd ?? null],
      );
      res.status(200).json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  return router;
}
