import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_LIST, ROLES } from '../config/roles.js';

const { Schema } = mongoose;

const SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre es muy corto'],
      maxlength: [80, 'El nombre es muy largo'],
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Correo inválido'],
    },
    // Se guarda siempre como hash bcrypt (ver hook pre-save). Nunca se devuelve por defecto.
    password: { type: String, required: [true, 'La contraseña es obligatoria'], select: false },
    role: { type: String, enum: ROLE_LIST, default: ROLES.VENDEDOR, required: true },
    isActive: { type: Boolean, default: true },

    // Protección contra fuerza bruta
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },

    // Recuperación de contraseña: se guarda el hash del token, nunca el token
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  // El -1s evita que un token emitido justo después quede invalidado
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// true si la contraseña cambió después de emitido el token (iat en segundos)
userSchema.methods.changedPasswordAfter = function (tokenIssuedAtSeconds) {
  if (!this.passwordChangedAt) return false;
  return this.passwordChangedAt.getTime() / 1000 > tokenIssuedAtSeconds;
};

userSchema.virtual('isLocked').get(function () {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
