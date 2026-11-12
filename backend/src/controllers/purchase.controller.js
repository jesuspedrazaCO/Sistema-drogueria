import { asyncHandler } from '../utils/asyncHandler.js';
import * as purchaseService from '../services/purchaseService.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  const data = await purchaseService.listPurchases(req.query);
  res.json({ status: 'success', data });
});

export const payables = asyncHandler(async (_req, res) => {
  const data = await purchaseService.listPayables();
  res.json({ status: 'success', data });
});

export const getOne = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchase(req.params.id);
  res.json({ status: 'success', data: { purchase } });
});

export const create = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { purchase } });
});

export const voidOne = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.voidPurchase(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { purchase } });
});

export const pay = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.registerPayment(req.params.id, req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { purchase } });
});
