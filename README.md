# VineFlow

Lean harvest operations prototype. The React dashboard lives at the repo root and the
Express/Postgres API lives in `backend/`.

## Local backend

Requirements: Node 20+ and Docker.

```bash
cp backend/.env.example backend/.env
npm run setup:backend
npm run dev:api
```

The API starts at `http://localhost:4000`. Useful checks:

```bash
curl http://localhost:4000/health
curl 'http://localhost:4000/api/planner/week?start=2025-09-08'
```

To add a table, add the next numbered SQL file under `backend/db/migrations/` and run
`npm run db:migrate`. Applied migrations are recorded in `public.schema_migrations`, so
everyone can safely run the command whenever they pull.

See [backend/README.md](backend/README.md) for API routes, ownership boundaries, and the
data model.

## Forecasting workspace

The Forecasting workspace uses Engineer 1's local normalized Brix and block outputs from
`engineer_1/generated/`. It reads the Sugar workbooks only for the winery target-Brix
settings needed to predict readiness. It does not estimate crop yield or planned tonnage.

When source workbooks change, regenerate the normalized data first:

```bash
python3 engineer_1/pipeline.py
```

Then start the API with `npm run dev:api`, start Vite with `npm run dev`, and open
**Forecasting** in the sidebar.

Its read-only endpoints are available at `/api/forecasts`; `POST /api/forecasts/refresh`
reloads the generated data and target settings after they change.
