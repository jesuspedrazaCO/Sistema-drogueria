import { z } from 'zod';
import { EXPENSE_CATEGORIES, EXPENSE_AREAS, PAYMENT_METHODS } from '../config/constants.js';
import {
  objectIdSchema,
  paginationQuery,
  booleanQuery,
  optionalText,
  moneySchema,
  notFutureDateSchema,
  rangeFromSchema,
  rangeToSchema,
} from './common.js';

export { idParamSchema } from './user.validators.js';

const fields = {
  description: optionalText(200).min(3, 'La descripción es muy corta'),
  category: z.enum(EXPENSE_CATEGORIES),
  area: z.enum(EXPENSE_AREAS),
  amount: moneySchema.positive('El monto debe ser mayor a cero'),
  date: notFutureDateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  supplierId: objectIdSchema,
  receiptNumber: optionalText(40),
  notes: optionalText(500),
};

const optional = (keys) => Object.fromEntries(keys.map((key) => [key, fields[key].optional()]));

export const listExpensesSchema = {
  query: z.strictObject({
    ...paginationQuery,
    category: fields.category.optional(),
    area: fields.area.optional(),
    search: optionalText(80).optional(),
    from: rangeFromSchema.optional(),
    to: rangeToSchema.optional(),
    includeVoided: booleanQuery.optional(),
  }),
};

export const createExpenseSchema = {
  body: z.strictObject({
    description: fields.description,
    amount: fields.amount,
    ...optional(['category', 'area', 'date', 'paymentMethod', 'supplierId', 'receiptNumber', 'notes']),
  }),
};

export const updateExpenseSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject(optional(Object.keys(fields)))
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};

export const voidExpenseSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z.strictObject({ reason: optionalText(300).min(5, 'Explica el motivo (mínimo 5 caracteres)') }),
};

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
export const rangeRefine = (data) => data.from <= data.to && data.to - data.from <= MAX_RANGE_MS;
export const rangeMessage = { message: 'Rango inválido: "from" debe ser anterior a "to" y el máximo es 366 días', path: ['from'] };

export const expenseSummarySchema = {
  query: z
    .strictObject({ from: rangeFromSchema, to: rangeToSchema, area: fields.area.optional() })
    .refine(rangeRefine, rangeMessage),
};
