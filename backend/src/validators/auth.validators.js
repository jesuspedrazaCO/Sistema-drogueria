import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

// strictObject rechaza campos desconocidos (evita asignaciones masivas)

export const loginSchema = {
  body: z.strictObject({
    email: emailSchema,
    password: z.string('La contraseña es obligatoria').min(1, 'La contraseña es obligatoria').max(200),
  }),
};

export const forgotPasswordSchema = {
  body: z.strictObject({ email: emailSchema }),
};

export const resetPasswordSchema = {
  body: z.strictObject({
    token: z.string('El token es obligatorio').min(32).max(256),
    password: passwordSchema,
  }),
};

export const changePasswordSchema = {
  body: z
    .strictObject({
      currentPassword: z.string('La contraseña actual es obligatoria').min(1).max(200),
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'La nueva contraseña debe ser distinta a la actual',
      path: ['newPassword'],
    }),
};
