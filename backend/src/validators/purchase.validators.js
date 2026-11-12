import { z } from 'zod';
import { PURCHASE_PAYMENT_METHODS, SUPPLIER_PAYMENT_METHODS, PAYMENT_STATUS, PURCHASE_STATUS } from '../config/constants.js';
import {
  objectIdSchema,
  paginationQuery,
  optionalText,
  quantitySchema,
  moneySchema,
  ivaRateSchema,
  batchNumberSchema,
  expirationDateSchema,
  dateOnlySchema,
  notFutureDateSchema,
  rangeFromSchema,
  rangeToSchema,
} from './common.js';

export { idParamSchema } from './user.validators.js';

const purchaseItemSchema = z.strictObject({
  productId: objectIdSchema,
  batchNumber: batchNumberSchema.optional(), // obligatorios en droguería: lo valida el servicio
  expirationDate: expirationDateSchema.optional(),
  manufacturingDate: dateOnlySchema.optional(),
  quantity: quantitySchema,
  unitCost: moneySchema, // sin IVA
  ivaRate: ivaRateSchema.optional(), // si no se envía se usa el del producto
});

export const createPurchaseSchema = {
  body: z.strictObject({
    supplierId: objectIdSchema,
    invoiceNumber: z
      .string('El número de factura es obligatorio')
      .trim()
      .min(1, 'El número de factura es obligatorio')
      .max(40)
      .transform((value) => value.toUpperCase()),
    purchaseDate: notFutureDateSchema.optional(),
    items: z.array(purchaseItemSchema).min(1, 'Agrega al menos un producto').max(200, 'Máximo 200 líneas por factura'),
    paymentMethod: z.enum(PURCHASE_PAYMENT_METHODS).default('cash'),
    dueDate: dateOnlySchema.optional(), // solo aplica a compras a crédito
    notes: optionalText(500).optional(),
  }),
};

export const listPurchasesSchema = {
  query: z.strictObject({
    ...paginationQuery,
    supplier: objectIdSchema.optional(),
    status: z.enum(PURCHASE_STATUS).optional(),
    paymentStatus: z.enum(PAYMENT_STATUS).optional(),
    invoice: optionalText(40).optional(),
    from: rangeFromSchema.optional(),
    to: rangeToSchema.optional(),
  }),
};

export const voidPurchaseSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z.strictObject({ reason: optionalText(300).min(5, 'Explica el motivo (mínimo 5 caracteres)') }),
};

export const paymentSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z.strictObject({
    amount: moneySchema.positive('El pago debe ser mayor a cero'),
    method: z.enum(SUPPLIER_PAYMENT_METHODS),
    paidAt: notFutureDateSchema.optional(),
    note: optionalText(200).optional(),
  }),
};
