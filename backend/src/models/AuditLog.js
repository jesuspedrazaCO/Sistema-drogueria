import mongoose from 'mongoose';
import { makeImmutable } from '../utils/modelHelpers.js';

const { Schema } = mongoose;

// Registro de acciones importantes (inicios de sesión, anulaciones, ajustes, cambios de rol).
// Solo se inserta: no se edita ni se borra.
const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, maxlength: 120 }, // copia, por si el usuario se elimina
    action: { type: String, required: true, trim: true, maxlength: 60 },
    entity: { type: String, trim: true, maxlength: 40 },
    entityId: { type: String, trim: true, maxlength: 40 },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

makeImmutable(auditLogSchema, 'Los registros de auditoría son inmutables');

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
