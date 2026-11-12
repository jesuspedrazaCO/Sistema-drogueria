import { Settings } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { audit } from './auditService.js';

export const getSettings = () => Settings.getSingleton();

export async function updateSettings(data, user, meta) {
  const current = await Settings.getSingleton();
  const alertDays = data.expiryAlertDays ?? current.expiryAlertDays;
  const criticalDays = data.criticalExpiryDays ?? current.criticalExpiryDays;
  if (criticalDays >= alertDays) {
    throw new AppError('Los días críticos deben ser menos que los días de alerta de vencimiento', 422);
  }

  current.set({ ...data, updatedBy: user._id });
  await current.save();
  await audit({
    userId: user._id,
    userEmail: user.email,
    action: 'settings_updated',
    entity: 'Settings',
    metadata: { fields: Object.keys(data) },
    meta,
  });
  return current;
}
