import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db.js';

const weekQuery = z.object({ start: z.string().date() });
const appointmentStatus = z.enum(['not_requested', 'requested', 'confirmed', 'hold']);
const assignmentInput = z.object({
  blockId: z.string().uuid(),
  harvestDate: z.string().date(),
  plannedTons: z.number().positive(),
  scheduledLoads: z.number().int().nonnegative().nullable().optional(),
  wineryAppointmentStatus: appointmentStatus.default('not_requested'),
  wineryAppointmentAt: z.string().datetime().nullable().optional(),
});
const assignmentUpdate = assignmentInput.omit({ blockId: true }).partial();
const capacityInput = z.object({
  harvestDate: z.string().date(),
  scheduledTrucks: z.number().int().nonnegative(),
  tonsPerLoad: z.number().positive().default(23.5),
  truckOrderedAt: z.string().datetime().nullable().optional(),
});

export function createPlannerRouter(db: Db): Router {
  const router = Router();

  router.get('/week', async (req, res, next) => {
    try {
      const { start } = weekQuery.parse(req.query);
      const [days, assignments] = await Promise.all([db.query(
        `select harvest_date, expected_tons, required_loads, scheduled_trucks,
                tonnage_required_loads, truck_delta, capacity_status,
                unconfirmed_appointments, truck_ordered_at, truck_order_status
           from nightly_capacity
          where harvest_date >= $1::date and harvest_date < $1::date + 7
          order by harvest_date`,
        [start],
      ), db.query(
        `select a.id, a.block_id, a.harvest_date, a.planned_tons, a.scheduled_loads,
                a.winery_appointment_status, a.winery_appointment_at,
                b.external_id, b.vineyard_name, b.block_name, b.variety, b.region,
                b.acres, b.estimated_tons, b.harvest_window_start, b.harvest_window_end
           from harvest_assignments a
           join blocks b on b.id = a.block_id
          where a.harvest_date >= $1::date and a.harvest_date < $1::date + 7
          order by a.harvest_date, b.vineyard_name, b.block_name`,
        [start],
      )]);
      res.json({ data: days.rows, assignments: assignments.rows, assumptions: { tonsPerLoad: 23.5, oneLoadPerTruck: true, oneTripPerNight: true } });
    } catch (error) { next(error); }
  });

  router.post('/assignments', async (req, res, next) => {
    try {
      const input = assignmentInput.parse(req.body);
      const { rows } = await db.query(
        `insert into harvest_assignments
           (block_id, harvest_date, planned_tons, scheduled_loads, winery_appointment_status, winery_appointment_at)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [input.blockId, input.harvestDate, input.plannedTons, input.scheduledLoads ?? null,
          input.wineryAppointmentStatus, input.wineryAppointmentAt ?? null],
      );
      res.status(201).json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  router.patch('/assignments/:id', async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const input = assignmentUpdate.parse(req.body);
      const { rows } = await db.query(
        `update harvest_assignments set
           harvest_date = coalesce($2, harvest_date),
           planned_tons = coalesce($3, planned_tons),
           scheduled_loads = case when $4::boolean then $5 else scheduled_loads end,
           winery_appointment_status = coalesce($6, winery_appointment_status),
           winery_appointment_at = case when $7::boolean then $8 else winery_appointment_at end
         where id = $1 returning *`,
        [id, input.harvestDate ?? null, input.plannedTons ?? null,
          Object.hasOwn(input, 'scheduledLoads'), input.scheduledLoads ?? null,
          input.wineryAppointmentStatus ?? null,
          Object.hasOwn(input, 'wineryAppointmentAt'), input.wineryAppointmentAt ?? null],
      );
      if (!rows[0]) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Assignment not found' } }); return; }
      res.json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  router.put('/capacity/:date', async (req, res, next) => {
    try {
      const input = capacityInput.parse({ ...req.body, harvestDate: req.params.date });
      const { rows } = await db.query(
        `insert into nightly_truck_capacity (harvest_date, scheduled_trucks, tons_per_load, truck_ordered_at)
         values ($1, $2, $3, $4)
         on conflict (harvest_date) do update set scheduled_trucks = excluded.scheduled_trucks,
           tons_per_load = excluded.tons_per_load,
           truck_ordered_at = excluded.truck_ordered_at, updated_at = now()
         returning *`,
        [input.harvestDate, input.scheduledTrucks, input.tonsPerLoad, input.truckOrderedAt ?? null],
      );
      res.json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  return router;
}
