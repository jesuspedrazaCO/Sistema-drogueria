import { z } from 'zod';
import { APP_UTC_OFFSET, IVA_RATES } from '../config/constants.js';

export const emailSchema = z
  .string('El correo es obligatorio')
  .trim()
  .toLowerCase()
  .pipe(z.email('Correo inválido'));

export const nameSchema = z
  .string('El nombre es obligatorio')
  .trim()
  .min(2, 'El nombre es muy corto')
  .max(80, 'El nombre es muy largo');

// bcrypt solo procesa los primeros 72 bytes, por eso se limita el largo
export const passwordSchema = z
  .string('La contraseña es obligatoria')
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña es demasiado larga')
  .refine((value) => /[a-z]/.test(value), 'Debe incluir una letra minúscula')
  .refine((value) => /[A-Z]/.test(value), 'Debe incluir una letra mayúscula')
  .refine((value) => /\d/.test(value), 'Debe incluir un número');

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido');

// ---------- Esquemas compartidos por los módulos de inventario ----------
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// "true" / "false" en la URL -> booleano
export const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

// Cantidades enteras (unidades) y dinero
export const quantitySchema = z
  .number('La cantidad es obligatoria')
  .int('La cantidad debe ser un número entero')
  .min(1, 'La cantidad debe ser al menos 1')
  .max(1_000_000, 'Cantidad demasiado grande');

export const moneySchema = z
  .number('El valor es obligatorio')
  .min(0, 'El valor no puede ser negativo')
  .max(1_000_000_000, 'Valor demasiado grande');

export const ivaRateSchema = z.literal(IVA_RATES, `IVA inválido (permitidos: ${IVA_RATES.join(', ')})`);

export const batchNumberSchema = z
  .string('El número de lote es obligatorio')
  .trim()
  .min(1, 'El número de lote es obligatorio')
  .max(40, 'El número de lote es muy largo')
  .transform((value) => value.toUpperCase());

// Fecha sin hora (AAAA-MM-DD). Se guarda a las 12:00 UTC: cae en el mismo día en Colombia y en UTC.
export const dateOnlySchema = z.iso
  .date('Fecha inválida (usa AAAA-MM-DD)')
  .transform((value) => new Date(`${value}T12:00:00.000Z`));

export const notFutureDateSchema = dateOnlySchema.refine(
  (date) => date.getTime() <= Date.now() + 12 * 60 * 60 * 1000,
  'La fecha no puede ser futura'
);

// Vencimiento: acepta AAAA-MM-DD o AAAA-MM (como viene en los empaques: último día del mes).
// Se guarda al final de ese día en UTC (convención del modelo Batch).
function toExpiration(value) {
  const [year, month, day] = value.split('-').map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const finalDay = day ?? lastDay;
  if (finalDay < 1 || finalDay > lastDay) return null;
  return new Date(Date.UTC(year, month - 1, finalDay, 23, 59, 59, 999));
}

export const expirationDateSchema = z
  .string('La fecha de vencimiento es obligatoria')
  .trim()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Usa AAAA-MM o AAAA-MM-DD')
  .refine((value) => toExpiration(value) !== null, 'Fecha de vencimiento inválida')
  .transform((value) => toExpiration(value));

// Filtros de rango: días completos en hora de Colombia
export const rangeFromSchema = z.iso
  .date('Fecha inválida (usa AAAA-MM-DD)')
  .transform((value) => new Date(`${value}T00:00:00.000${APP_UTC_OFFSET}`));
export const rangeToSchema = z.iso
  .date('Fecha inválida (usa AAAA-MM-DD)')
  .transform((value) => new Date(`${value}T23:59:59.999${APP_UTC_OFFSET}`));

// Texto opcional: la cadena vacía cuenta como "sin valor"
export const optionalText = (max) => z.string().trim().max(max, `Máximo ${max} caracteres`);
