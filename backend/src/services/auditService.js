import { AuditLog } from '../models/index.js';

// Registra una acción importante. Nunca interrumpe la operación principal si falla.
// meta = { ip, userAgent } del request.
export async function audit({ userId, userEmail, action, entity, entityId, metadata, meta = {} }) {
  try {
    await AuditLog.create({
      user: userId,
      userEmail,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      metadata,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300),
    });
  } catch (err) {
    console.error('No se pudo registrar la auditoría:', err.message);
  }
}
