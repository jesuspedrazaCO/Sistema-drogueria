import { env } from './env.js';

export const AUTH = Object.freeze({
  MAX_FAILED_ATTEMPTS: 5, // intentos fallidos antes de bloquear la cuenta
  LOCK_MINUTES: 15, // duración del bloqueo
  RESET_TTL_MINUTES: 60, // vigencia del enlace de recuperación
  INVITE_TTL_HOURS: 72, // vigencia del enlace de invitación a un usuario nuevo
  REUSE_GRACE_SECONDS: 10, // tolerancia para dos refresh simultáneos (dos pestañas)
  REFRESH_COOKIE: 'refresh_token',
});

// La cookie solo viaja a las rutas de autenticación y no es legible desde JavaScript
const baseCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
});

export const refreshCookieOptions = () => ({
  ...baseCookieOptions(),
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

// clearCookie no debe recibir maxAge (lo sobrescribiría la fecha de expiración)
export const clearRefreshCookieOptions = () => baseCookieOptions();
