import { z } from 'zod';
import { PRODUCT_AREA_LIST, STORAGE_CONDITIONS } from '../config/constants.js';
import {
  objectIdSchema,
  paginationQuery,
  booleanQuery,
  optionalText,
  moneySchema,
  ivaRateSchema,
} from './common.js';

export { idParamSchema } from './user.validators.js';

const stockLevel = z.number().int().min(0).max(1_000_000);

// Campos editables. "area" solo se define al crear (cambiarla después rompería los lotes).
// El stock nunca se envía aquí: cambia con compras, carga inicial, ajustes y ventas.
const editable = {
  name: optionalText(150).min(2, 'El nombre es muy corto'),
  sku: optionalText(40),
  barcode: optionalText(60),
  brand: optionalText(80),
  category: optionalText(60),
  presentation: optionalText(100),
  unit: optionalText(20),
  activeIngredient: optionalText(120),
  concentration: optionalText(60),
  pharmaceuticalForm: optionalText(60),
  invimaRegistry: optionalText(60),
  requiresPrescription: z.boolean(),
  isControlled: z.boolean(),
  storageCondition: z.enum(STORAGE_CONDITIONS),
  costPrice: moneySchema,
  salePrice: moneySchema.positive('El precio de venta debe ser mayor a cero'),
  ivaRate: ivaRateSchema,
  minStock: stockLevel,
  maxStock: stockLevel,
  location: optionalText(60),
};

const optional = (keys) => Object.fromEntries(keys.map((key) => [key, editable[key].optional()]));

export const listProductsSchema = {
  query: z.strictObject({
    ...paginationQuery,
    search: optionalText(80).optional(),
    area: z.enum(PRODUCT_AREA_LIST).optional(),
    category: optionalText(60).optional(),
    isActive: booleanQuery.optional(),
    stockStatus: z.enum(['out', 'low', 'ok']).optional(),
    sort: z.enum(['name', 'stock', 'newest']).optional(),
  }),
};

export const createProductSchema = {
  body: z.strictObject({
    area: z.enum(PRODUCT_AREA_LIST).default('drogueria'),
    name: editable.name,
    salePrice: editable.salePrice,
    ...optional(Object.keys(editable).filter((key) => !['name', 'salePrice'].includes(key))),
  }),
};

export const updateProductSchema = {
  params: z.strictObject({ id: objectIdSchema }),
  body: z
    .strictObject({
      ...optional(Object.keys(editable)),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};
