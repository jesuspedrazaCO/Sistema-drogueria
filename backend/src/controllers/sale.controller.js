import { asyncHandler } from '../utils/asyncHandler.js';
import * as saleService from '../services/saleService.js';
import { canSeeCosts, serializeSale } from '../utils/serializers.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  const data = await saleService.listSales(req.query, req.user);
  res.json({ status: 'success', data });
});

export const getOne = asyncHandler(async (req, res) => {
  const sale = await saleService.getSale(req.params.id, req.user);
  res.json({ status: 'success', data: { sale: serializeSale(sale, canSeeCosts(req.user)) } });
});

export const create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { sale: serializeSale(sale, canSeeCosts(req.user)) } });
});

export const voidOne = asyncHandler(async (req, res) => {
  const sale = await saleService.voidSale(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { sale: serializeSale(sale, canSeeCosts(req.user)) } });
});
