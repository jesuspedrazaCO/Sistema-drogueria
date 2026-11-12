import { asyncHandler } from '../utils/asyncHandler.js';
import * as supplierService from '../services/supplierService.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  const data = await supplierService.listSuppliers(req.query);
  res.json({ status: 'success', data });
});

export const getOne = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplier(req.params.id);
  res.json({ status: 'success', data: { supplier } });
});

export const create = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { supplier } });
});

export const update = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { supplier } });
});
