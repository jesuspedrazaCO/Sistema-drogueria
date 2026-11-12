import { Batch, Product, StockMovement } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { MOVEMENT_TYPES } from '../config/constants.js';
import { round2 } from '../utils/modelHelpers.js';
import { receiveStock, removeStock, loadProducts } from './stockService.js';
import { audit } from './auditService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EXPIRED_BATCHES = 500;

const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });

async function loadBatchOf(product, batchId, session) {
  if (!product.trackBatches) {
    if (batchId) throw new AppError(`"${product.name}" no maneja lotes`, 422);
    return null;
  }
  if (!batchId) throw new AppError(`Indica el lote de "${product.name}"`, 422);
  const batch = await Batch.findOne({ _id: batchId, product: product._id }).session(session);
  if (!batch) throw new AppError('El lote no existe para ese producto', 404);
  return batch;
}

// ---------------------------------------------------------------------------
// Carga de inventario inicial (arranque del sistema con lo que ya hay en estantes)
// ---------------------------------------------------------------------------
export async function loadInitialStock({ items, note }, user, meta) {
  const result = await withTransaction(async (session) => {
    const products = await loadProducts(items.map((item) => item.productId), session);
    const movements = [];

    for (const item of items) {
      const product = products.get(String(item.productId));
      if (!product.trackBatches && (item.batchNumber || item.expirationDate)) {
        throw new AppError(`"${product.name}" no maneja lotes ni vencimientos`, 422);
      }
      const { movement } = await receiveStock(
        {
          product,
          quantity: item.quantity,
          type: MOVEMENT_TYPES.INITIAL,
          batchInfo: product.trackBatches
            ? {
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate,
                manufacturingDate: item.manufacturingDate,
              }
            : undefined,
          unitCost: item.unitCost,
          reason: note ?? 'Inventario inicial',
          userId: user._id,
        },
        session
      );
      movements.push(movement);
    }
    return { movements: movements.length, units: items.reduce((sum, item) => sum + item.quantity, 0) };
  });

  await audit({ ...auditBase(user, meta), action: 'stock_initial_loaded', entity: 'Product', metadata: result });
  return result;
}

// ---------------------------------------------------------------------------
// Ajuste por conteo físico: el usuario dice cuánto contó y el sistema calcula la diferencia
// ---------------------------------------------------------------------------
export async function adjustStock({ productId, batchId, countedQuantity, reason }, user, meta) {
  const result = await withTransaction(async (session) => {
    const products = await loadProducts([productId], session);
    const product = products.get(String(productId));
    const batch = await loadBatchOf(product, batchId, session);

    const current = batch ? batch.quantityAvailable : product.stock;
    const delta = countedQuantity - current;
    if (delta === 0) {
      throw new AppError('La cantidad contada es igual a la registrada: no hay nada que ajustar', 422);
    }

    const movement =
      delta > 0
        ? (
            await receiveStock(
              {
                product,
                quantity: delta,
                type: MOVEMENT_TYPES.ADJUSTMENT_IN,
                batchInfo: batch && {
                  batchNumber: batch.batchNumber,
                  expirationDate: batch.expirationDate,
                },
                unitCost: batch?.unitCost,
                reason,
                userId: user._id,
                increaseReceived: false,
              },
              session
            )
          ).movement
        : (
            await removeStock(
              { product, batch, quantity: -delta, type: MOVEMENT_TYPES.ADJUSTMENT_OUT, reason, userId: user._id },
              session
            )
          ).movement;

    return {
      movement,
      previousQuantity: current,
      newQuantity: countedQuantity,
      difference: delta,
      productName: product.name,
      batchNumber: batch?.batchNumber,
    };
  });

  await audit({
    ...auditBase(user, meta),
    action: 'stock_adjusted',
    entity: 'Product',
    entityId: productId,
    metadata: {
      batchId,
      previous: result.previousQuantity,
      counted: result.newQuantity,
      difference: result.difference,
      reason,
    },
  });
  return result;
}

// ---------------------------------------------------------------------------
// Bajas por vencimiento o daño
// ---------------------------------------------------------------------------
export async function writeOffStock({ kind, productId, batchId, quantity, reason }, user, meta) {
  const result = await withTransaction(async (session) => {
    const products = await loadProducts([productId], session, { requireActive: false });
    const product = products.get(String(productId));

    if (kind === 'expiry' && !product.trackBatches) {
      throw new AppError('Los productos de ferretería no tienen vencimiento', 422);
    }
    const batch = await loadBatchOf(product, batchId, session);
    if (kind === 'expiry' && batch.expirationDate.getTime() >= Date.now()) {
      throw new AppError(
        `El lote ${batch.batchNumber} aún no está vencido. Usa la baja por daño o bloquéalo si debe retirarse`,
        422
      );
    }

    const { movement } = await removeStock(
      {
        product,
        batch,
        quantity,
        type: kind === 'expiry' ? MOVEMENT_TYPES.EXPIRY_WRITEOFF : MOVEMENT_TYPES.DAMAGE_WRITEOFF,
        reason: reason ?? 'Producto vencido',
        userId: user._id,
      },
      session
    );
    return { movement, lostValue: round2(quantity * (movement.unitCost ?? 0)) };
  });

  await audit({
    ...auditBase(user, meta),
    action: 'stock_written_off',
    entity: 'Product',
    entityId: productId,
    metadata: { kind, batchId, quantity, reason, lostValue: result.lostValue },
  });
  return result;
}

// Da de baja de una vez todos los lotes vencidos que aún tienen existencias
export async function writeOffAllExpired({ reason }, user, meta) {
  const result = await withTransaction(async (session) => {
    const batches = await Batch.find({
      quantityAvailable: { $gt: 0 },
      expirationDate: { $lt: new Date() },
    })
      .limit(MAX_EXPIRED_BATCHES)
      .session(session);

    if (!batches.length) throw new AppError('No hay lotes vencidos con existencias', 404);

    const products = await loadProducts(
      batches.map((batch) => batch.product),
      session,
      { requireActive: false }
    );

    let units = 0;
    let lostValue = 0;
    for (const batch of batches) {
      const product = products.get(String(batch.product));
      const quantity = batch.quantityAvailable;
      await removeStock(
        {
          product,
          batch,
          quantity,
          type: MOVEMENT_TYPES.EXPIRY_WRITEOFF,
          reason: reason ?? 'Baja masiva de lotes vencidos',
          userId: user._id,
        },
        session
      );
      units += quantity;
      lostValue += quantity * (batch.unitCost ?? 0);
    }
    return { batches: batches.length, units, lostValue: round2(lostValue) };
  });

  await audit({ ...auditBase(user, meta), action: 'stock_expired_written_off', entity: 'Batch', metadata: result });
  return result;
}

// ---------------------------------------------------------------------------
// Lotes
// ---------------------------------------------------------------------------
export async function listBatches({ page, limit, product, status, days, search, withStock }) {
  const now = new Date();
  const filter = {};
  if (product) filter.product = product;
  if (withStock !== false) filter.quantityAvailable = { $gt: 0 };

  if (status === 'expired') filter.expirationDate = { $lt: now };
  else if (status === 'expiring') filter.expirationDate = { $gte: now, $lte: new Date(now.getTime() + days * DAY_MS) };
  else if (status === 'available') {
    filter.expirationDate = { $gte: now };
    filter.isBlocked = false;
  } else if (status === 'blocked') filter.isBlocked = true;

  if (search) filter.batchNumber = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [items, total] = await Promise.all([
    Batch.find(filter)
      .sort({ expirationDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('product', 'name sku area unit'),
    Batch.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getBatch(id) {
  const batch = await Batch.findById(id).populate('product', 'name sku area unit');
  if (!batch) throw new AppError('Lote no encontrado', 404);
  return batch;
}

// Bloquear = no se vende aunque tenga stock (retiro del mercado, cuarentena, sospecha)
export async function setBatchBlocked(id, { blocked, reason }, user, meta) {
  const update = blocked
    ? { $set: { isBlocked: true, blockedReason: reason } }
    : { $set: { isBlocked: false }, $unset: { blockedReason: 1 } };

  const batch = await Batch.findOneAndUpdate({ _id: id }, update, { returnDocument: 'after' }).populate(
    'product',
    'name sku area unit'
  );
  if (!batch) throw new AppError('Lote no encontrado', 404);

  await audit({
    ...auditBase(user, meta),
    action: blocked ? 'batch_blocked' : 'batch_unblocked',
    entity: 'Batch',
    entityId: id,
    metadata: { batchNumber: batch.batchNumber, reason },
  });
  return batch;
}

// ---------------------------------------------------------------------------
// Kardex
// ---------------------------------------------------------------------------
export async function listMovements({ page, limit, product, batch, type, from, to }) {
  const filter = {};
  if (product) filter.product = product;
  if (batch) filter.batch = batch;
  if (type) filter.type = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('product', 'name sku area unit')
      .populate('batch', 'batchNumber expirationDate')
      .populate('performedBy', 'name'),
    StockMovement.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

// Usado por el catálogo: confirma que un producto existe sin cargarlo completo
export const productExists = (id) => Product.exists({ _id: id });
