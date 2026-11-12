import { z } from 'zod';
import { rangeFromSchema, rangeToSchema } from './common.js';
import { rangeRefine, rangeMessage } from './expense.validators.js';

const range = { from: rangeFromSchema, to: rangeToSchema };

export const salesSummarySchema = {
  query: z
    .strictObject({ ...range, groupBy: z.enum(['day', 'month']).default('day') })
    .refine(rangeRefine, rangeMessage),
};

export const topProductsSchema = {
  query: z
    .strictObject({
      ...range,
      limit: z.coerce.number().int().min(1).max(50).default(10),
      by: z.enum(['quantity', 'revenue']).default('quantity'),
    })
    .refine(rangeRefine, rangeMessage),
};

export const profitSchema = {
  query: z.strictObject(range).refine(rangeRefine, rangeMessage),
};
