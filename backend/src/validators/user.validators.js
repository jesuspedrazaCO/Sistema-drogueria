import { z } from 'zod';
import { ROLE_LIST } from '../config/roles.js';
import { emailSchema, nameSchema, objectIdSchema } from './common.js';

export const idParamSchema = {
  params: z.strictObject({ id: objectIdSchema }),
};

export const listUsersSchema = {
  query: z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(80).optional(),
    role: z.enum(ROLE_LIST).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  }),
};

// La contraseña no se define aquí: el usuario la crea con el enlace de invitación
export const createUserSchema = {
  body: z.strictObject({
    name: nameSchema,
    email: emailSchema,
    role: z.enum(ROLE_LIST, 'Rol inválido'),
  }),
};

export const updateUserSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject({
      name: nameSchema.optional(),
      role: z.enum(ROLE_LIST, 'Rol inválido').optional(),
      isActive: z.boolean('isActive debe ser verdadero o falso').optional(),
    })
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};
