import { z } from 'zod';
import { MOVEMENT_TYPE_LIST } from '../config/constants.js';
import {
  objectIdSchema,
  paginationQuery,
  booleanQuery,
  optionalText,
  quantitySchema,
  moneySchema,
  batchNumberSchema,
  expirationDateSchema,
  dateOnlySchema,
  rangeFromSchema,
  rangeToSchema,
} from './common.js';

export { idParamSchema } from './user.validators.js';

const reason = (min = 3) => optionalText(300).min(min, `Explica el motivo (mínimo ${min} caracteres)`);

export const initialStockSchema = {
  body: z.strictObject({
    note: optionalText(300).optional(),
    items: z
      .array(
        z.strictObject({
          productId: objectIdSchema,
          quantity: quantitySchema,
          batchNumber: batchNumberSchema.optional(),
          expirationDate: expirationDateSchema.optional(),
          manufacturingDate: dateOnlySchema.optional(),
          unitCost: moneySchema.optional(), // sin IVA; si falta se usa el costo del producto
        })
      )
      .min(1, 'Agrega al menos un producto')
      .max(200, 'Máximo 200 líneas por carga'),
  }),
};

export const adjustmentSchema = {
  body: z.strictObject({
    productId: objectIdSchema,
    batchId: objectIdSchema.optional(),
    countedQuantity: z.number('La cantidad contada es obligatoria').int().min(0).max(1_000_000),
    reason: reason(),
  }),
};

export const writeOffSchema = {
  body: z
    .strictObject({
      kind: z.enum(['expiry', 'damage']),
      productId: objectIdSchema,
      batchId: objectIdSchema.optional(),
      quantity: quantitySchema,
      reason: reason().optional(),
    })
    .refine((data) => data.kind === 'expiry' || data.reason, {
      path: ['reason'],
      message: 'Explica el motivo de la baja por daño o pérdida',
    }),
};

export const writeOffExpiredSchema = {
  body: z.strictObject({ reason: reason().optional() }),
};

export const blockBatchSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject({ blocked: z.boolean(), reason: reason().optional() })
    .refine((data) => !data.blocked || data.reason, {
      path: ['reason'],
      message: 'Indica el motivo del bloqueo',
    }),
};

export const listBatchesSchema = {
  query: z.strictObject({
    ...paginationQuery,
    product: objectIdSchema.optional(),
    status: z.enum(['expired', 'expiring', 'available', 'blocked']).optional(),
    days: z.coerce.number().int().min(1).max(365).default(60), // ventana para "por vencer"
    search: optionalText(40).optional(),
    withStock: booleanQuery.optional(), // por defecto solo lotes con existencias
  }),
};

export const listMovementsSchema = {
  query: z.strictObject({
    ...paginationQuery,
    product: objectIdSchema.optional(),
    batch: objectIdSchema.optional(),
    type: z.enum(MOVEMENT_TYPE_LIST).optional(),
    from: rangeFromSchema.optional(),
    to: rangeToSchema.optional(),
  }),
};
