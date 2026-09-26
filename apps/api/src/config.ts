import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(8787),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PUBLIC_WEB_ORIGIN: z.string().default('http://localhost:5173'),
  EXTRA_CORS_ORIGINS: z.string().default('tauri://localhost,http://tauri.localhost,https://tauri.localhost'),
  INTERNAL_SECRET: z.string().min(16),
  ADMIN_EMAILS: z.string().default(''),
  LITELLM_URL: z.string().default('http://127.0.0.1:4000'),
  LITELLM_MASTER_KEY: z.string().min(1),
  PUBLIC_GATEWAY_URL: z.string().default('http://localhost:4000/v1'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
  JOBS_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  LOG_LEVEL: z.string().default('info'),
});

export type Config = z.infer<typeof schema> & { corsOrigins: string[]; adminEmails: Set<string> };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  if (parsed.NODE_ENV === 'production' && parsed.INTERNAL_SECRET.includes('change-me')) {
    throw new Error('INTERNAL_SECRET must be set to a real secret in production');
  }
  return {
    ...parsed,
    corsOrigins: [parsed.PUBLIC_WEB_ORIGIN, ...parsed.EXTRA_CORS_ORIGINS.split(',')]
      .map((s) => s.trim())
      .filter(Boolean),
    adminEmails: new Set(
      parsed.ADMIN_EMAILS.split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  };
}
