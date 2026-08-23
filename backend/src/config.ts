import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv({ path: new URL('../.env', import.meta.url).pathname });

const schema = z.object({
  // Forecasting can run directly from /data without Postgres; planner routes still use this default when called.
  DATABASE_URL: z.string().min(1).default('postgres://vineflow:vineflow@localhost:5432/vineflow'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  return {
    databaseUrl: result.data.DATABASE_URL,
    port: result.data.PORT,
    webOrigin: result.data.WEB_ORIGIN,
  };
}
