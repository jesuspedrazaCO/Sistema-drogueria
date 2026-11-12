import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportService from '../services/reportService.js';
import * as alertService from '../services/alertService.js';
import { canSeeCosts, serializeBatch, serializeProduct } from '../utils/serializers.js';

export const dashboard = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await reportService.dashboard(req.user) });
});

export const salesSummary = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await reportService.salesSummary(req.query) });
});

export const topProducts = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: { items: await reportService.topProducts(req.query) } });
});

export const profit = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await reportService.profitReport(req.query) });
});

export const inventoryValue = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await reportService.inventoryValue() });
});

export const alerts = asyncHandler(async (req, res) => {
  const showCosts = canSeeCosts(req.user);
  const data = await alertService.getAlerts(req.user);
  res.json({
    status: 'success',
    data: {
      ...data,
      lowStock: data.lowStock.map((item) => serializeProduct(item, showCosts)),
      outOfStock: data.outOfStock.map((item) => serializeProduct(item, showCosts)),
      expiring: data.expiring.map(({ batch, level }) => ({ ...serializeBatch(batch, showCosts), level })),
      expired: data.expired.map((item) => serializeBatch(item, showCosts)),
    },
  });
});
