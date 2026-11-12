import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import * as authService from '../services/authService.js';
import { AUTH, refreshCookieOptions, clearRefreshCookieOptions } from '../config/auth.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });
const setRefreshCookie = (res, token) => res.cookie(AUTH.REFRESH_COOKIE, token, refreshCookieOptions());
const clearRefreshCookie = (res) => res.clearCookie(AUTH.REFRESH_COOKIE, clearRefreshCookieOptions());

// El refresh token viaja solo en cookie httpOnly; el access token va en el cuerpo
const sendSession = (res, { user, accessToken, refreshToken }) => {
  setRefreshCookie(res, refreshToken);
  res.json({ status: 'success', data: { accessToken, user } });
};

export const login = asyncHandler(async (req, res) => {
  sendSession(res, await authService.login(req.body, requestMeta(req)));
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const session = await authService.refresh(req.cookies?.[AUTH.REFRESH_COOKIE], requestMeta(req));
    sendSession(res, session);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 401) clearRefreshCookie(res);
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[AUTH.REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.json({ status: 'success', message: 'Sesión cerrada' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user, requestMeta(req));
  clearRefreshCookie(res);
  res.json({ status: 'success', message: 'Se cerraron todas las sesiones' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: { user: req.user } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body, requestMeta(req));
  res.json({
    status: 'success',
    message: 'Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body, requestMeta(req));
  res.json({ status: 'success', message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  sendSession(res, await authService.changePassword(req.user, req.body, requestMeta(req)));
});
