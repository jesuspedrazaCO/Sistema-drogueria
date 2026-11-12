import { z } from 'zod';
import { emailSchema, objectIdSchema, paginationQuery, booleanQuery, optionalText } from './common.js';

export { idParamSchema } from './user.validators.js';

const supplierFields = {
  name: optionalText(120).min(2, 'El nombre es muy corto'),
  nit: optionalText(20),
  contactName: optionalText(80),
  phone: optionalText(30),
  email: z.union([emailSchema, z.literal('')]),
  address: optionalText(160),
  city: optionalText(60),
  paymentTermsDays: z.number().int().min(0).max(365),
  notes: optionalText(500),
};

export const listSuppliersSchema = {
  query: z.strictObject({
    ...paginationQuery,
    search: optionalText(80).optional(),
    isActive: booleanQuery.optional(),
  }),
};

export const createSupplierSchema = {
  body: z.strictObject({
    ...supplierFields,
    nit: supplierFields.nit.optional(),
    contactName: supplierFields.contactName.optional(),
    phone: supplierFields.phone.optional(),
    email: supplierFields.email.optional(),
    address: supplierFields.address.optional(),
    city: supplierFields.city.optional(),
    paymentTermsDays: supplierFields.paymentTermsDays.default(0),
    notes: supplierFields.notes.optional(),
  }),
};

export const updateSupplierSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject({
      ...Object.fromEntries(Object.entries(supplierFields).map(([key, schema]) => [key, schema.optional()])),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};
