import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Access token: JWT de vida corta. Solo lleva el id del usuario (sub); el rol se lee
// siempre de la base de datos, así un cambio de rol o una desactivación aplican de inmediato.
export const signAccessToken = (user) =>
  jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: env.ACCESS_TOKEN_TTL,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

// Token aleatorio opaco (refresh, recuperación de contraseña, invitación)
export const generateOpaqueToken = () => crypto.randomBytes(48).toString('hex');

// En la base de datos solo se guarda el HMAC del token: si la base se filtra,
// los tokens no sirven sin JWT_REFRESH_SECRET.
export const hashToken = (token) =>
  crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
