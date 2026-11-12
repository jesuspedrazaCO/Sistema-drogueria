import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User, Session } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { AUTH } from '../config/auth.js';
import { signAccessToken, generateOpaqueToken, hashToken } from '../utils/tokens.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { audit } from './auditService.js';

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos';
const MINUTE_MS = 60 * 1000;

// Se compara contra un hash falso cuando el correo no existe, para que la respuesta
// tarde lo mismo y no se pueda averiguar qué correos están registrados.
let dummyHash;
const getDummyHash = async () => {
  dummyHash ??= await bcrypt.hash('contraseña-falsa-para-igualar-tiempos', 12);
  return dummyHash;
};

const revokeAllSessions = (userId) =>
  Session.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

// Crea una sesión (refresh token) y el access token que la acompaña.
// "family" agrupa los tokens que se van rotando desde un mismo inicio de sesión.
async function startSession(user, meta, family = crypto.randomUUID()) {
  const refreshToken = generateOpaqueToken();
  await Session.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * MINUTE_MS),
    userAgent: meta.userAgent?.slice(0, 300),
    ip: meta.ip,
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

async function registerFailedAttempt(user) {
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  );
  if (updated.failedLoginAttempts >= AUTH.MAX_FAILED_ATTEMPTS) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lockUntil: new Date(Date.now() + AUTH.LOCK_MINUTES * MINUTE_MS),
          failedLoginAttempts: 0,
        },
      }
    );
  }
}

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    await audit({ userEmail: email, action: 'login_failed', metadata: { reason: 'unknown_user' }, meta });
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  if (user.isLocked) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / MINUTE_MS);
    await audit({ userId: user._id, userEmail: user.email, action: 'login_blocked', meta });
    throw new AppError(
      `Cuenta bloqueada por intentos fallidos. Inténtalo de nuevo en ${minutes} minuto(s).`,
      423
    );
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk || !user.isActive) {
    if (!passwordOk) await registerFailedAttempt(user);
    await audit({
      userId: user._id,
      userEmail: user.email,
      action: 'login_failed',
      metadata: { reason: passwordOk ? 'inactive_user' : 'wrong_password' },
      meta,
    });
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );
  const tokens = await startSession(user, meta);
  await audit({ userId: user._id, userEmail: user.email, action: 'login_success', meta });

  return { user, ...tokens };
}

// Rotación de refresh token: cada uso entrega uno nuevo e invalida el anterior.
// Si alguien reutiliza un token ya rotado, se asume robo y se cierra toda la familia.
export async function refresh(rawToken, meta) {
  if (!rawToken) throw new AppError('Sesión no encontrada. Inicia sesión.', 401);

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  // Consumo atómico: solo una petición puede usar el token
  const session = await Session.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } }
  );

  if (!session) {
    const known = await Session.findOne({ tokenHash });
    const reusedAfterGrace =
      known?.revokedAt && now.getTime() - known.revokedAt.getTime() > AUTH.REUSE_GRACE_SECONDS * 1000;
    if (reusedAfterGrace) {
      await Session.updateMany({ family: known.family, revokedAt: null }, { $set: { revokedAt: now } });
      await audit({ userId: known.user, action: 'refresh_token_reuse', meta });
    }
    throw new AppError('Sesión expirada. Inicia sesión de nuevo.', 401);
  }

  const user = await User.findById(session.user);
  if (!user || !user.isActive) {
    await Session.updateMany({ family: session.family, revokedAt: null }, { $set: { revokedAt: now } });
    throw new AppError('Sesión expirada. Inicia sesión de nuevo.', 401);
  }

  const tokens = await startSession(user, meta, session.family);
  return { user, ...tokens };
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await Session.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function logoutAll(user, meta) {
  await revokeAllSessions(user._id);
  await audit({ userId: user._id, userEmail: user.email, action: 'logout_all', meta });
}

// Guarda el hash del token y su vencimiento; devuelve el token en claro para enviarlo por correo
export async function issueResetToken(user, ttlMs) {
  const token = generateOpaqueToken();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetToken: hashToken(token),
        passwordResetExpires: new Date(Date.now() + ttlMs),
      },
    }
  );
  return token;
}

export const buildResetLink = (token) => `${env.PRIMARY_CLIENT_URL}/reset-password?token=${token}`;

// Responde siempre igual exista o no el correo, para no revelar qué cuentas existen
export async function forgotPassword({ email }, meta) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;

  const token = await issueResetToken(user, AUTH.RESET_TTL_MINUTES * MINUTE_MS);

  // Sin await: la respuesta no debe tardar distinto según si el correo existe
  sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    link: buildResetLink(token),
    expiresMinutes: AUTH.RESET_TTL_MINUTES,
  }).catch((err) => console.error('No se pudo enviar el correo de recuperación:', err.message));

  await audit({ userId: user._id, userEmail: user.email, action: 'password_reset_requested', meta });
}

// También sirve para que un usuario invitado cree su primera contraseña
export async function resetPassword({ token, password }, meta) {
  // Se "reclama" el token de forma atómica: solo puede usarse una vez
  const user = await User.findOneAndUpdate(
    { passwordResetToken: hashToken(token), passwordResetExpires: { $gt: new Date() } },
    { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
  );
  if (!user || !user.isActive) throw new AppError('El enlace no es válido o ya expiró', 400);

  user.password = password; // el hook pre-save la encripta
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await revokeAllSessions(user._id);
  await audit({ userId: user._id, userEmail: user.email, action: 'password_reset_completed', meta });
}

export async function changePassword(user, { currentPassword, newPassword }, meta) {
  const full = await User.findById(user._id).select('+password');
  if (!(await full.comparePassword(currentPassword))) {
    throw new AppError('La contraseña actual es incorrecta', 400);
  }

  full.password = newPassword;
  await full.save();

  // Se cierran todas las sesiones y se abre una nueva para este dispositivo
  await revokeAllSessions(full._id);
  const tokens = await startSession(full, meta);
  await audit({ userId: full._id, userEmail: full.email, action: 'password_changed', meta });

  return { user: full, ...tokens };
}
