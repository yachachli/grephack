import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db.js';

const weekQuery = z.object({ start: z.string().date() });
const assignmentInput = z.object({ blockId: z.string().uuid(), harvestDate: z.string().date(), plannedTons: z.number().positive() });
const capacityInput = z.object({ harvestDate: z.string().date(), scheduledTrucks: z.number().int().nonnegative(), tonsPerLoad: z.number().positive().default(20) });

export function createPlannerRouter(db: Db): Router {
  const router = Router();

  router.get('/week', async (req, res, next) => {
    try {
      const { start } = weekQuery.parse(req.query);
      const { rows } = await db.query(
        `select harvest_date, expected_tons, required_loads, scheduled_trucks,
                truck_delta, capacity_status
           from nightly_capacity
          where harvest_date >= $1::date and harvest_date < $1::date + 7
          order by harvest_date`,
        [start],
      );
      res.json({ data: rows });
    } catch (error) { next(error); }
  });

  router.post('/assignments', async (req, res, next) => {
    try {
      const input = assignmentInput.parse(req.body);
      const { rows } = await db.query(
        `insert into harvest_assignments (block_id, harvest_date, planned_tons)
         values ($1, $2, $3) returning *`,
        [input.blockId, input.harvestDate, input.plannedTons],
      );
      res.status(201).json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  router.put('/capacity/:date', async (req, res, next) => {
    try {
      const input = capacityInput.parse({ ...req.body, harvestDate: req.params.date });
      const { rows } = await db.query(
        `insert into nightly_truck_capacity (harvest_date, scheduled_trucks, tons_per_load)
         values ($1, $2, $3)
         on conflict (harvest_date) do update set scheduled_trucks = excluded.scheduled_trucks,
           tons_per_load = excluded.tons_per_load, updated_at = now()
         returning *`,
        [input.harvestDate, input.scheduledTrucks, input.tonsPerLoad],
      );
      res.json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  return router;
}
