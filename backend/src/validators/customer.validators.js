import { z } from 'zod';
import { DOCUMENT_TYPES } from '../config/constants.js';
import { emailSchema, objectIdSchema, paginationQuery, booleanQuery, optionalText } from './common.js';

export { idParamSchema } from './user.validators.js';

const fields = {
  name: optionalText(120).min(2, 'El nombre es muy corto'),
  documentType: z.enum(DOCUMENT_TYPES),
  documentNumber: optionalText(30),
  phone: optionalText(30),
  email: z.union([emailSchema, z.literal('')]),
  address: optionalText(160),
  notes: optionalText(500),
};

const optional = (keys) => Object.fromEntries(keys.map((key) => [key, fields[key].optional()]));

export const listCustomersSchema = {
  query: z.strictObject({
    ...paginationQuery,
    search: optionalText(80).optional(),
    isActive: booleanQuery.optional(),
  }),
};

export const createCustomerSchema = {
  body: z.strictObject({ name: fields.name, ...optional(Object.keys(fields).filter((key) => key !== 'name')) }),
};

export const updateCustomerSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject({ ...optional(Object.keys(fields)), isActive: z.boolean().optional() })
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};
