import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI es obligatoria'),
  CLIENT_URL: z.string().min(1, 'CLIENT_URL es obligatoria'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener 32+ caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener 32+ caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  // Cuántos proxies hay delante de la API (Render = 1; Vercel con rewrite + Render = 2)
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Droguería <onboarding@resend.dev>'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const data = parsed.data;
const clientUrls = data.CLIENT_URL.split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const env = Object.freeze({
  ...data,
  CLIENT_URLS: clientUrls,
  PRIMARY_CLIENT_URL: clientUrls[0],
  isProd: data.NODE_ENV === 'production',
});
