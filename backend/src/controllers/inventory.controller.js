import { asyncHandler } from '../utils/asyncHandler.js';
import * as inventoryService from '../services/inventoryService.js';
import { canSeeCosts, serializeBatch, serializeMovement } from '../utils/serializers.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const initialStock = asyncHandler(async (req, res) => {
  const data = await inventoryService.loadInitialStock(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data });
});

export const adjust = asyncHandler(async (req, res) => {
  const { movement, ...summary } = await inventoryService.adjustStock(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { ...summary, movement: serializeMovement(movement, true) } });
});

export const writeOff = asyncHandler(async (req, res) => {
  const { movement, lostValue } = await inventoryService.writeOffStock(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { movement: serializeMovement(movement, true), lostValue } });
});

export const writeOffExpired = asyncHandler(async (req, res) => {
  const data = await inventoryService.writeOffAllExpired(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data });
});

export const movements = asyncHandler(async (req, res) => {
  const showCosts = canSeeCosts(req.user);
  const { items, ...rest } = await inventoryService.listMovements(req.query);
  res.json({ status: 'success', data: { items: items.map((item) => serializeMovement(item, showCosts)), ...rest } });
});

export const listBatches = asyncHandler(async (req, res) => {
  const showCosts = canSeeCosts(req.user);
  const { items, ...rest } = await inventoryService.listBatches(req.query);
  res.json({ status: 'success', data: { items: items.map((item) => serializeBatch(item, showCosts)), ...rest } });
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await inventoryService.getBatch(req.params.id);
  res.json({ status: 'success', data: { batch: serializeBatch(batch, canSeeCosts(req.user)) } });
});

export const blockBatch = asyncHandler(async (req, res) => {
  const batch = await inventoryService.setBatchBlocked(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { batch: serializeBatch(batch, canSeeCosts(req.user)) } });
});
