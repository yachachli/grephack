# VineFlow backend

This is intentionally a small Express + Postgres service for a hackathon. Route factories
receive a shared `pg` pool, inputs are checked with Zod, and schema changes are plain SQL.

## Team boundaries

- **Engineer 1 — normalized source data:** owns ingestion/cleaning and upserts canonical
  vineyard blocks through `PUT /api/blocks/:externalId`. The `blocks` table is the handoff.
- **Engineer 2 — harvest planner and logistics:** owns `harvest_assignments`,
  `nightly_truck_capacity`, the `nightly_capacity` view, and `/api/planner/*` routes.
- **Engineer 3 — downstream experience/integrations:** exact scope was not supplied. The
  scaffold treats Engineer 3 and the frontend as consumers of the stable weekly planner
  response so they do not need to reproduce capacity math. Update this note once their
  ownership is finalized.

The core calculation assumes one scheduled truck covers one load and makes one trip per
night. With 240 tons and the practical payload of 23.5 tons/load, the tonnage cross-check
requires 11 trucks. An explicit scheduled-load count overrides that cross-check: if the
schedule requests 12 loads, 12 distinct trucks are required.

## Routes

- `GET /health` checks API and database connectivity.
- `GET /api/blocks` lists normalized blocks.
- `PUT /api/blocks/:externalId` creates or updates a normalized block.
- `GET /api/planner/week?start=YYYY-MM-DD` returns daily capacity, block assignments,
  appointment status, and truck-order lead-time warnings.
- `POST /api/planner/assignments` schedules block tonnage, optional explicit loads, and a
  winery appointment on a night.
- `PATCH /api/planner/assignments/:id` moves or updates a scheduled block.
- `PUT /api/planner/capacity/:date` sets scheduled trucks, payload, and truck-order time.

For hackathon speed there is no authentication yet. Add auth before exposing write routes
outside a trusted demo environment.
