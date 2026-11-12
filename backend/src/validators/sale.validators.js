import { z } from 'zod';
import { PAYMENT_METHODS, SALE_STATUS } from '../config/constants.js';
import {
  objectIdSchema,
  paginationQuery,
  optionalText,
  quantitySchema,
  moneySchema,
  notFutureDateSchema,
  rangeFromSchema,
  rangeToSchema,
} from './common.js';

export { idParamSchema } from './user.validators.js';

// El precio nunca viene del cliente: se toma del producto en la base de datos.
const saleItemSchema = z.strictObject({
  productId: objectIdSchema,
  quantity: quantitySchema,
  discount: moneySchema.optional(), // valor en pesos sobre la línea (requiere permiso)
});

const prescriptionSchema = z.strictObject({
  formulaNumber: optionalText(40).min(1).optional(),
  doctorName: optionalText(100).min(1).optional(),
  doctorLicense: optionalText(40).min(1).optional(),
  patientName: optionalText(100).min(1).optional(),
  patientDocument: optionalText(30).min(1).optional(),
  issuedAt: notFutureDateSchema.optional(),
});

export const createSaleSchema = {
  body: z.strictObject({
    customerId: objectIdSchema.optional(),
    items: z.array(saleItemSchema).min(1, 'Agrega al menos un producto').max(60, 'Máximo 60 líneas por venta'),
    paymentMethod: z.enum(PAYMENT_METHODS).default('cash'),
    amountReceived: moneySchema.optional(), // solo efectivo; sin él se asume pago exacto
    prescription: prescriptionSchema.optional(),
    notes: optionalText(300).optional(),
  }),
};

export const listSalesSchema = {
  query: z.strictObject({
    ...paginationQuery,
    status: z.enum(SALE_STATUS).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    customer: objectIdSchema.optional(),
    soldBy: objectIdSchema.optional(),
    receipt: z.coerce.number().int().min(1).optional(),
    from: rangeFromSchema.optional(),
    to: rangeToSchema.optional(),
  }),
};

export const voidSaleSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z.strictObject({ reason: optionalText(300).min(5, 'Explica el motivo (mínimo 5 caracteres)') }),
};
