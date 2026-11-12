import { z } from 'zod';
import { emailSchema, optionalText } from './common.js';

export const updateSettingsSchema = {
  body: z
    .strictObject({
      businessName: optionalText(120).min(2).optional(),
      nit: optionalText(20).optional(),
      address: optionalText(160).optional(),
      city: optionalText(60).optional(),
      phone: optionalText(30).optional(),
      email: z.union([emailSchema, z.literal('')]).optional(),
      receiptFooter: optionalText(200).optional(),
      expiryAlertDays: z.number().int().min(1).max(365).optional(),
      criticalExpiryDays: z.number().int().min(1).max(365).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar'),
};
