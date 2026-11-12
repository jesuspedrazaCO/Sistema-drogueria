import { Purchase, Supplier, Product, Batch } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { round2 } from '../utils/modelHelpers.js';
import { MOVEMENT_TYPES } from '../config/constants.js';
import { receiveStock, removeStock, loadProducts } from './stockService.js';
import { audit } from './auditService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });

const POPULATE_SUPPLIER = ['supplier', 'name nit paymentTermsDays'];

// ---------------------------------------------------------------------------
// Crear compra: registra la factura, crea/actualiza lotes, sube stock y deja kardex.
// Todo en una sola transacción: o queda completa o no queda nada.
// ---------------------------------------------------------------------------
export async function createPurchase(input, user, meta) {
  const { supplierId, invoiceNumber, items, paymentMethod, notes } = input;
  const purchaseDate = input.purchaseDate ?? new Date();

  const purchase = await withTransaction(async (session) => {
    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) throw new AppError('Proveedor no encontrado', 404);
    if (!supplier.isActive) throw new AppError('El proveedor está inactivo', 422);

    if (await Purchase.exists({ supplier: supplierId, invoiceNumber, status: 'received' }).session(session)) {
      throw new AppError('Esa factura ya está registrada para este proveedor', 409);
    }

    const products = await loadProducts(items.map((item) => item.productId), session);

    // Validar líneas y calcular totales antes de tocar el inventario
    const seen = new Set();
    const lines = items.map((item, index) => {
      const product = products.get(String(item.productId));
      const label = `Línea ${index + 1} ("${product.name}")`;

      if (product.trackBatches) {
        if (!item.batchNumber || !item.expirationDate) {
          throw new AppError(`${label}: el lote y la fecha de vencimiento son obligatorios`, 422);
        }
        if (item.expirationDate.getTime() < Date.now()) {
          throw new AppError(`${label}: el lote ya está vencido`, 422);
        }
        if (item.manufacturingDate && item.manufacturingDate >= item.expirationDate) {
          throw new AppError(`${label}: la fabricación debe ser anterior al vencimiento`, 422);
        }
        const key = `${item.productId}|${item.batchNumber}`;
        if (seen.has(key)) throw new AppError(`${label}: el lote ${item.batchNumber} está repetido en la factura`, 422);
        seen.add(key);
      } else {
        if (item.batchNumber || item.expirationDate || item.manufacturingDate) {
          throw new AppError(`${label}: los productos de ferretería no llevan lote ni vencimiento`, 422);
        }
        if (seen.has(String(item.productId))) {
          throw new AppError(`${label}: el producto está repetido en la factura`, 422);
        }
        seen.add(String(item.productId));
      }

      const ivaRate = item.ivaRate ?? product.ivaRate;
      const lineSubtotal = round2(item.quantity * item.unitCost);
      const lineTax = round2((lineSubtotal * ivaRate) / 100);
      return {
        product,
        item,
        data: {
          product: product._id,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          manufacturingDate: item.manufacturingDate,
          quantity: item.quantity,
          unitCost: item.unitCost,
          ivaRate,
          lineSubtotal,
          lineTax,
          lineTotal: round2(lineSubtotal + lineTax),
        },
      };
    });

    const subtotal = round2(lines.reduce((sum, line) => sum + line.data.lineSubtotal, 0));
    const taxTotal = round2(lines.reduce((sum, line) => sum + line.data.lineTax, 0));
    const total = round2(subtotal + taxTotal);

    const isCredit = paymentMethod === 'credit';
    const dueDate = isCredit
      ? input.dueDate ?? new Date(purchaseDate.getTime() + supplier.paymentTermsDays * DAY_MS)
      : undefined;

    const doc = new Purchase({
      supplier: supplierId,
      invoiceNumber,
      purchaseDate,
      items: lines.map((line) => line.data),
      subtotal,
      taxTotal,
      total,
      paymentMethod,
      paymentStatus: isCredit ? 'pending' : 'paid',
      amountPaid: isCredit ? 0 : total,
      payments: isCredit ? [] : [{ amount: total, method: paymentMethod, paidAt: purchaseDate, paidBy: user._id }],
      dueDate,
      notes,
      createdBy: user._id,
    });

    // Entrada al inventario línea por línea (en una sesión no se puede paralelizar)
    for (const [index, line] of lines.entries()) {
      const { batch } = await receiveStock(
        {
          product: line.product,
          quantity: line.item.quantity,
          type: MOVEMENT_TYPES.PURCHASE,
          batchInfo: line.product.trackBatches
            ? {
                batchNumber: line.item.batchNumber,
                expirationDate: line.item.expirationDate,
                manufacturingDate: line.item.manufacturingDate,
              }
            : undefined,
          unitCost: line.item.unitCost,
          reason: `Factura ${invoiceNumber}`,
          refModel: 'Purchase',
          refId: doc._id,
          supplierId,
          purchaseId: doc._id,
          userId: user._id,
        },
        session
      );
      if (batch) doc.items[index].batch = batch._id;

      // El costo del producto queda en el último costo de compra
      await Product.updateOne({ _id: line.product._id }, { $set: { costPrice: line.item.unitCost } }, { session });
    }

    await doc.save({ session });
    return doc;
  });

  await audit({
    ...auditBase(user, meta),
    action: 'purchase_created',
    entity: 'Purchase',
    entityId: purchase._id,
    metadata: { invoiceNumber, supplier: String(supplierId), total: purchase.total, paymentMethod },
  });
  return getPurchase(purchase._id);
}

// ---------------------------------------------------------------------------
// Anular compra: revierte las entradas. Solo si la mercancía sigue intacta en estantes.
// ---------------------------------------------------------------------------
export async function voidPurchase(id, { reason }, user, meta) {
  const purchase = await withTransaction(async (session) => {
    const doc = await Purchase.findById(id).session(session);
    if (!doc) throw new AppError('Compra no encontrada', 404);
    if (doc.status === 'voided') throw new AppError('La compra ya está anulada', 409);

    const products = await loadProducts(
      doc.items.map((item) => item.product),
      session,
      { requireActive: false }
    );

    for (const item of doc.items) {
      const product = products.get(String(item.product));
      const batch = item.batch ? await Batch.findById(item.batch).session(session) : null;
      await removeStock(
        {
          product,
          batch,
          quantity: item.quantity,
          type: MOVEMENT_TYPES.PURCHASE_VOID,
          reason: `Anulación factura ${doc.invoiceNumber}: ${reason}`,
          refModel: 'Purchase',
          refId: doc._id,
          userId: user._id,
          insufficientMessage: `No se puede anular: "${product.name}" ya tuvo salidas y no alcanza para revertir la compra. Registra un ajuste o una devolución`,
        },
        session
      );
    }

    doc.status = 'voided';
    doc.voidedAt = new Date();
    doc.voidedBy = user._id;
    doc.voidReason = reason;
    await doc.save({ session });
    return doc;
  });

  await audit({
    ...auditBase(user, meta),
    action: 'purchase_voided',
    entity: 'Purchase',
    entityId: id,
    metadata: { invoiceNumber: purchase.invoiceNumber, total: purchase.total, amountPaid: purchase.amountPaid, reason },
  });
  return getPurchase(id);
}

// ---------------------------------------------------------------------------
// Pagos / abonos a proveedores (cuentas por pagar)
// ---------------------------------------------------------------------------
export async function registerPayment(id, { amount, method, paidAt, note }, user, meta) {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new AppError('Compra no encontrada', 404);
  if (purchase.status !== 'received') throw new AppError('No se puede pagar una compra anulada', 409);

  const balance = round2(purchase.total - purchase.amountPaid);
  if (balance <= 0) throw new AppError('La compra ya está pagada', 409);
  if (amount > balance) throw new AppError(`El pago supera el saldo pendiente ($${balance})`, 422);

  const newPaid = round2(purchase.amountPaid + amount);
  const paymentStatus = newPaid >= purchase.total ? 'paid' : 'partial';

  // Solo se aplica si nadie más pagó entre la lectura y la escritura
  const updated = await Purchase.findOneAndUpdate(
    { _id: id, status: 'received', amountPaid: purchase.amountPaid },
    {
      $set: { amountPaid: newPaid, paymentStatus },
      $push: { payments: { amount, method, paidAt: paidAt ?? new Date(), paidBy: user._id, note } },
    },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AppError('La compra cambió mientras registrabas el pago. Recarga e intenta de nuevo', 409);

  await audit({
    ...auditBase(user, meta),
    action: 'purchase_payment',
    entity: 'Purchase',
    entityId: id,
    metadata: { amount, method, balanceAfter: round2(updated.total - updated.amountPaid) },
  });
  return getPurchase(id);
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------
export async function listPurchases({ page, limit, supplier, status, paymentStatus, from, to, invoice }) {
  const filter = {};
  if (supplier) filter.supplier = supplier;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (invoice) filter.invoiceNumber = new RegExp(invoice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (from || to) {
    filter.purchaseDate = {};
    if (from) filter.purchaseDate.$gte = from;
    if (to) filter.purchaseDate.$lte = to;
  }

  const [items, total] = await Promise.all([
    Purchase.find(filter)
      .select('-items') // el listado no necesita las líneas
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(...POPULATE_SUPPLIER),
    Purchase.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getPurchase(id) {
  const purchase = await Purchase.findById(id)
    .populate(...POPULATE_SUPPLIER)
    .populate('items.product', 'name sku area unit')
    .populate('items.batch', 'batchNumber expirationDate quantityAvailable')
    .populate('createdBy', 'name');
  if (!purchase) throw new AppError('Compra no encontrada', 404);
  return purchase;
}

// Cuentas por pagar: compras recibidas con saldo, las más urgentes primero
export async function listPayables() {
  const purchases = await Purchase.find({ status: 'received', paymentStatus: { $in: ['pending', 'partial'] } })
    .select('-items')
    .sort({ dueDate: 1 })
    .limit(500)
    .populate(...POPULATE_SUPPLIER);

  const now = Date.now();
  let totalDue = 0;
  let overdueTotal = 0;
  const items = purchases.map((purchase) => {
    const data = purchase.toJSON();
    const overdue = Boolean(purchase.dueDate) && purchase.dueDate.getTime() < now;
    totalDue += purchase.balanceDue;
    if (overdue) overdueTotal += purchase.balanceDue;
    return { ...data, isOverdue: overdue };
  });

  return { items, totalDue: round2(totalDue), overdueTotal: round2(overdueTotal) };
}
