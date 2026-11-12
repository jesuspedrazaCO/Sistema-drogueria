import { Batch, Product, Purchase } from '../models/index.js';
import { PERMISSIONS } from '../config/permissions.js';
import { getSettings } from './settingsService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT = 100;

// Conteos para el tablero (baratos: no traen listas)
export async function alertCounts() {
  const settings = await getSettings();
  const now = new Date();
  const horizon = new Date(now.getTime() + settings.expiryAlertDays * DAY_MS);
  const withStock = { quantityAvailable: { $gt: 0 } };

  const [lowStock, outOfStock, expiringSoon, expired] = await Promise.all([
    Product.countDocuments({ isActive: true, stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$minStock'] } }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
    Batch.countDocuments({ ...withStock, expirationDate: { $gte: now, $lte: horizon } }),
    Batch.countDocuments({ ...withStock, expirationDate: { $lt: now } }),
  ]);
  return { lowStock, outOfStock, expiringSoon, expired };
}

// Listas completas de alertas (pantalla de alertas)
export async function getAlerts(user) {
  const settings = await getSettings();
  const now = new Date();
  const horizon = new Date(now.getTime() + settings.expiryAlertDays * DAY_MS);
  const criticalLimit = now.getTime() + settings.criticalExpiryDays * DAY_MS;
  const withStock = { quantityAvailable: { $gt: 0 } };
  const productFields = 'name sku area unit';

  const [lowStock, outOfStock, expiring, expired] = await Promise.all([
    Product.find({ isActive: true, stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$minStock'] } })
      .sort({ stock: 1 })
      .limit(LIMIT),
    Product.find({ isActive: true, stock: { $lte: 0 } }).sort({ name: 1 }).limit(LIMIT),
    Batch.find({ ...withStock, expirationDate: { $gte: now, $lte: horizon } })
      .sort({ expirationDate: 1 })
      .limit(LIMIT)
      .populate('product', productFields),
    Batch.find({ ...withStock, expirationDate: { $lt: now } })
      .sort({ expirationDate: 1 })
      .limit(LIMIT)
      .populate('product', productFields),
  ]);

  let overduePayables = [];
  if (PERMISSIONS.viewPurchases.includes(user.role)) {
    overduePayables = await Purchase.find({
      status: 'received',
      paymentStatus: { $in: ['pending', 'partial'] },
      dueDate: { $lt: now },
    })
      .select('-items')
      .sort({ dueDate: 1 })
      .limit(LIMIT)
      .populate('supplier', 'name');
  }

  return {
    thresholds: { expiryAlertDays: settings.expiryAlertDays, criticalExpiryDays: settings.criticalExpiryDays },
    lowStock,
    outOfStock,
    expiring: expiring.map((batch) => ({ batch, level: batch.expirationDate.getTime() <= criticalLimit ? 'critical' : 'warning' })),
    expired,
    overduePayables,
  };
}
