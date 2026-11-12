import crypto from 'node:crypto';
import { User, Session } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { AUTH } from '../config/auth.js';
import { ROLES } from '../config/roles.js';
import { sendInviteEmail } from '../utils/email.js';
import { issueResetToken, buildResetLink } from './authService.js';
import { audit } from './auditService.js';

const HOUR_MS = 60 * 60 * 1000;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listUsers({ page, limit, search, role, isActive }) {
  const filter = {};
  if (role) filter.role = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user;
}

async function sendInvite(user) {
  const token = await issueResetToken(user, AUTH.INVITE_TTL_HOURS * HOUR_MS);
  try {
    const { delivered } = await sendInviteEmail({
      to: user.email,
      name: user.name,
      link: buildResetLink(token),
      expiresHours: AUTH.INVITE_TTL_HOURS,
    });
    return delivered;
  } catch (err) {
    console.error('No se pudo enviar la invitación:', err.message);
    return false;
  }
}

// El administrador nunca conoce la contraseña: el usuario la crea con el enlace del correo.
export async function createUser({ name, email, role }, actor, meta) {
  if (await User.exists({ email })) throw new AppError('Ya existe un usuario con ese correo', 409);

  const user = await User.create({
    name,
    email,
    role,
    password: `${crypto.randomBytes(32).toString('base64url')}aA1`, // aleatoria e inutilizable
    createdBy: actor._id,
  });

  const emailSent = await sendInvite(user);
  await audit({
    userId: actor._id,
    userEmail: actor.email,
    action: 'user_created',
    entity: 'User',
    entityId: user._id,
    metadata: { email, role },
    meta,
  });

  return { user, emailSent };
}

export async function updateUser(id, patch, actor, meta) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const isSelf = String(user._id) === String(actor._id);
  const changesRole = patch.role !== undefined && patch.role !== user.role;
  const deactivates = patch.isActive === false && user.isActive;

  if (isSelf && (changesRole || deactivates)) {
    throw new AppError('No puedes cambiar tu propio rol ni desactivar tu cuenta', 400);
  }

  const losesAdmin = user.role === ROLES.ADMIN && user.isActive && ((changesRole && patch.role !== ROLES.ADMIN) || deactivates);
  if (losesAdmin) {
    const activeAdmins = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (activeAdmins <= 1) throw new AppError('Debe quedar al menos un administrador activo', 400);
  }

  user.set(patch);
  await user.save();

  if (deactivates) await Session.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

  await audit({
    userId: actor._id,
    userEmail: actor.email,
    action: deactivates ? 'user_deactivated' : 'user_updated',
    entity: 'User',
    entityId: user._id,
    metadata: patch,
    meta,
  });

  return user;
}

export async function resendInvite(id, actor, meta) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  if (user.lastLoginAt) {
    throw new AppError('Este usuario ya ingresó al sistema. Debe usar "Olvidé mi contraseña".', 400);
  }

  const emailSent = await sendInvite(user);
  await audit({
    userId: actor._id,
    userEmail: actor.email,
    action: 'user_invite_resent',
    entity: 'User',
    entityId: user._id,
    meta,
  });

  return { emailSent };
}
