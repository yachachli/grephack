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
