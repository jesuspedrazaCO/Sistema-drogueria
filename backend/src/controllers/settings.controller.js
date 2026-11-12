import { asyncHandler } from '../utils/asyncHandler.js';
import * as settingsService from '../services/settingsService.js';

export const get = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: { settings: await settingsService.getSettings() } });
});

export const update = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, req.user, { ip: req.ip, userAgent: req.get('user-agent') });
  res.json({ status: 'success', data: { settings } });
});
