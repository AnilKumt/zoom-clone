import { z } from 'zod';

// Fail fast at startup on missing required env — surface config errors immediately
const envSchema = z.object({
  NEXT_PUBLIC_WS_URL: z.string().url().default('ws://localhost:8000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_AUTH_MODE: z.enum(['demo', 'full']).default('demo'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_MODE: process.env.NEXT_PUBLIC_AUTH_MODE,
});

export type Env = typeof env;
