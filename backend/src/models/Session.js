import mongoose from 'mongoose';

const { Schema } = mongoose;

// Una sesión = un refresh token emitido. Se guarda solo su hash.
// "family" agrupa los tokens que provienen del mismo inicio de sesión: si alguien
// reutiliza un token ya rotado, se revoca toda la familia.
const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 },
  },
  { timestamps: true }
);

// MongoDB elimina automáticamente las sesiones vencidas
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
