import { Batch, Counter, Customer, Sale } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { withTransaction } from '../utils/transaction.js';
import { round2 } from '../utils/modelHelpers.js';
import { MOVEMENT_TYPES } from '../config/constants.js';
import { PERMISSIONS } from '../config/permissions.js';
import { ROLES } from '../config/roles.js';
import { receiveStock, removeStock, loadProducts } from './stockService.js';
import { audit } from './auditService.js';

const auditBase = (user, meta) => ({ userId: user._id, userEmail: user.email, meta });
const POPULATE = [
  ['soldBy', 'name'],
  ['customer', 'name documentType documentNumber'],
];

// FEFO: sale primero el lote que vence antes. Solo cuentan los lotes vendibles
// (con existencias, no bloqueados y no vencidos). Devuelve [{ batch, quantity }].
async function planFefo(product, quantity, session) {
  const batches = await Batch.find({
    product: product._id,
    quantityAvailable: { $gt: 0 },
    isBlocked: false,
    expirationDate: { $gte: new Date() },
  })
    .sort({ expirationDate: 1 })
    .session(session);

  const sellable = batches.reduce((sum, batch) => sum + batch.quantityAvailable, 0);
  if (sellable < quantity) {
    throw new AppError(
      `Existencias vendibles insuficientes de "${product.name}": hay ${sellable}` +
        (product.stock > sellable ? ` (${product.stock - sellable} están vencidas o bloqueadas)` : ''),
      409
    );
  }

  const plan = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining === 0) break;
    const take = Math.min(batch.quantityAvailable, remaining);
    plan.push({ batch, quantity: take });
    remaining -= take;
  }
  return plan;
}

function checkPrescription(products, prescription) {
  const needsRx = products.some((product) => product.requiresPrescription);
  const controlled = products.some((product) => product.isControlled);
  if (!needsRx) return;

  const required = ['formulaNumber', 'doctorName', 'patientName', 'patientDocument'];
  if (controlled) required.push('doctorLicense', 'issuedAt');
  const missing = required.filter((field) => !prescription?.[field]);
  if (missing.length) {
    throw new AppError(
      `Esta venta incluye medicamentos con fórmula médica. Faltan datos de la fórmula: ${missing.join(', ')}`,
      422,
      { missing }
    );
  }
}

export async function createSale(input, user, meta) {
  const { customerId, items, paymentMethod, amountReceived, prescription, notes } = input;

  const ids = items.map((item) => item.productId);
  if (new Set(ids.map(String)).size !== ids.length) {
    throw new AppError('Un producto está repetido: suma las cantidades en una sola línea', 422);
  }
  const hasDiscount = items.some((item) => item.discount > 0);
  if (hasDiscount && !PERMISSIONS.applyDiscount.includes(user.role)) {
    throw new AppError('No tienes permiso para aplicar descuentos', 403);
  }

  let hasControlled = false;
  const sale = await withTransaction(async (session) => {
    if (customerId) {
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) throw new AppError('Cliente no encontrado', 404);
      if (!customer.isActive) throw new AppError('El cliente está inactivo', 422);
    }

    const products = await loadProducts(ids, session);
    const productList = ids.map((id) => products.get(String(id)));

    if (productList.some((product) => product.isControlled) && !PERMISSIONS.sellControlled.includes(user.role)) {
      throw new AppError('Los medicamentos de control especial solo los dispensa el regente', 403);
    }
    checkPrescription(productList, prescription);
    hasControlled = productList.some((product) => product.isControlled);

    // Líneas: el precio sale siempre de la base de datos, nunca del cliente
    const lines = [];
    for (const item of items) {
      const product = products.get(String(item.productId));
      const gross = round2(item.quantity * product.salePrice);
      const discount = round2(item.discount ?? 0);
      if (discount > gross) throw new AppError(`El descuento de "${product.name}" supera el valor de la línea`, 422);

      const lineTotal = round2(gross - discount);
      const lineSubtotal = round2(lineTotal / (1 + product.ivaRate / 100));
      const plan = product.trackBatches ? await planFefo(product, item.quantity, session) : [];

      lines.push({
        product,
        plan,
        quantity: item.quantity,
        data: {
          product: product._id,
          name: product.name,
          area: product.area,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          discount,
          ivaRate: product.ivaRate,
          lineSubtotal,
          lineTax: round2(lineTotal - lineSubtotal),
          lineTotal,
          // Droguería: una asignación por lote (FEFO). Ferretería: una sin lote, solo para
          // guardar el costo de la venta y poder calcular la utilidad.
          allocations: product.trackBatches
            ? plan.map(({ batch, quantity }) => ({
                batch: batch._id,
                batchNumber: batch.batchNumber,
                expirationDate: batch.expirationDate,
                quantity,
                unitCost: batch.unitCost ?? product.costPrice,
              }))
            : [{ quantity: item.quantity, unitCost: product.costPrice }],
        },
      });
    }

    const total = round2(lines.reduce((sum, line) => sum + line.data.lineTotal, 0));
    const subtotal = round2(lines.reduce((sum, line) => sum + line.data.lineSubtotal, 0));
    const taxTotal = round2(lines.reduce((sum, line) => sum + line.data.lineTax, 0));
    const discountTotal = round2(lines.reduce((sum, line) => sum + line.data.discount, 0));

    let received = total;
    if (paymentMethod === 'cash') {
      received = amountReceived ?? total;
      if (received < total) throw new AppError(`El efectivo recibido ($${received}) no cubre el total ($${total})`, 422);
    }

    const receiptNumber = await Counter.next('sale', session);
    const doc = new Sale({
      receiptNumber,
      customer: customerId,
      items: lines.map((line) => line.data),
      subtotal,
      discountTotal,
      taxTotal,
      total,
      paymentMethod,
      amountReceived: received,
      change: round2(received - total),
      prescription,
      notes,
      soldBy: user._id,
    });

    for (const line of lines) {
      if (line.product.trackBatches) {
        for (const { batch, quantity } of line.plan) {
          await removeStock(
            {
              product: line.product,
              batch,
              quantity,
              type: MOVEMENT_TYPES.SALE,
              reason: `Venta #${receiptNumber}`,
              refModel: 'Sale',
              refId: doc._id,
              userId: user._id,
            },
            session
          );
        }
      } else {
        await removeStock(
          {
            product: line.product,
            quantity: line.quantity,
            type: MOVEMENT_TYPES.SALE,
            reason: `Venta #${receiptNumber}`,
            refModel: 'Sale',
            refId: doc._id,
            userId: user._id,
          },
          session
        );
      }
    }

    await doc.save({ session });
    return doc;
  });

  if (hasDiscount || hasControlled) {
    await audit({
      ...auditBase(user, meta),
      action: hasControlled ? 'sale_controlled' : 'sale_with_discount',
      entity: 'Sale',
      entityId: sale._id,
      metadata: { receiptNumber: sale.receiptNumber, total: sale.total, discountTotal: sale.discountTotal },
    });
  }
  return getSale(sale._id, user);
}

export async function voidSale(id, { reason }, user, meta) {
  const sale = await withTransaction(async (session) => {
    const doc = await Sale.findById(id).session(session);
    if (!doc) throw new AppError('Venta no encontrada', 404);
    if (doc.status === 'voided') throw new AppError('La venta ya está anulada', 409);

    const products = await loadProducts(
      doc.items.map((item) => item.product),
      session,
      { requireActive: false }
    );

    // Cada unidad vuelve al mismo lote del que salió
    for (const item of doc.items) {
      const product = products.get(String(item.product));
      const base = {
        product,
        type: MOVEMENT_TYPES.SALE_VOID,
        reason: `Anulación venta #${doc.receiptNumber}: ${reason}`,
        refModel: 'Sale',
        refId: doc._id,
        userId: user._id,
        increaseReceived: false,
      };
      if (product.trackBatches) {
        for (const allocation of item.allocations) {
          await receiveStock(
            {
              ...base,
              quantity: allocation.quantity,
              batchInfo: { batchNumber: allocation.batchNumber, expirationDate: allocation.expirationDate },
              unitCost: allocation.unitCost,
            },
            session
          );
        }
      } else {
        await receiveStock({ ...base, quantity: item.quantity }, session);
      }
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
    action: 'sale_voided',
    entity: 'Sale',
    entityId: id,
    metadata: { receiptNumber: sale.receiptNumber, total: sale.total, reason },
  });
  return getSale(id, user);
}

export async function listSales(
  { page, limit, status, paymentMethod, customer, soldBy, receipt, from, to },
  user
) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (customer) filter.customer = customer;
  if (receipt) filter.receiptNumber = receipt;
  // El vendedor solo ve sus propias ventas
  if (user.role === ROLES.VENDEDOR) filter.soldBy = user._id;
  else if (soldBy) filter.soldBy = soldBy;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .select('-items')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(...POPULATE[0])
      .populate(...POPULATE[1]),
    Sale.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getSale(id, user) {
  const sale = await Sale.findById(id)
    .populate(...POPULATE[0])
    .populate(...POPULATE[1]);
  const ownerId = sale?.soldBy?._id ?? sale?.soldBy;
  if (!sale || (user.role === ROLES.VENDEDOR && String(ownerId) !== String(user._id))) {
    throw new AppError('Venta no encontrada', 404);
  }
  return sale;
}
