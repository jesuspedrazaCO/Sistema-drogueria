import { asyncHandler } from '../utils/asyncHandler.js';
import * as productService from '../services/productService.js';
import { canSeeCosts, serializeProduct, serializeBatch } from '../utils/serializers.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const list = asyncHandler(async (req, res) => {
  const showCosts = canSeeCosts(req.user);
  const { items, ...rest } = await productService.listProducts(req.query);
  res.json({ status: 'success', data: { items: items.map((item) => serializeProduct(item, showCosts)), ...rest } });
});

export const categories = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: { categories: await productService.listCategories() } });
});

export const getOne = asyncHandler(async (req, res) => {
  const showCosts = canSeeCosts(req.user);
  const { product, batches } = await productService.getProduct(req.params.id);
  res.json({
    status: 'success',
    data: {
      product: serializeProduct(product, showCosts),
      batches: batches.map((batch) => serializeBatch(batch, showCosts)),
    },
  });
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user, requestMeta(req));
  res.status(201).json({ status: 'success', data: { product: serializeProduct(product, true) } });
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user, requestMeta(req));
  res.json({ status: 'success', data: { product: serializeProduct(product, true) } });
});
