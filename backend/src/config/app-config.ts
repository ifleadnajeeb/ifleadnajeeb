import { env } from './env.js';

export const appConfig = {
  isProd: env.NODE_ENV === 'production',
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  cookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // No `domain` — cookie scopes to the exact host (Railway or Vercel)
  },

  accessTokenTtlMs: 15 * 60 * 1000,
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,

  bcryptRounds: 12,
};
