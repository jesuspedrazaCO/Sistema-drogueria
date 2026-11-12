import { Batch, Product, StockMovement } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

// Primitivas de inventario. Todo cambio de existencias en el sistema pasa por aquí,
// siempre dentro de una transacción (session) y dejando su registro en el kardex.
//
// Invariantes que se mantienen:
//   - Producto de droguería: product.stock == suma de quantityAvailable de sus lotes.
//   - Cada movimiento guarda la cantidad con signo y el stock total resultante (balanceAfter).
//   - Nunca queda un stock o una cantidad de lote negativa: la resta solo se aplica si alcanza
//     (filtro $gte dentro de la misma operación atómica).

async function recordMovement(data, session) {
  const movement = new StockMovement(data);
  await movement.save({ session });
  return movement;
}

// Entrada de existencias (compra, carga inicial, ajuste positivo, reingreso).
// batchInfo = { batchNumber, expirationDate, manufacturingDate } solo para productos con lotes.
// increaseReceived = false en ajustes por conteo (no es mercancía "recibida").
export async function receiveStock(
  { product, quantity, type, batchInfo, unitCost, reason, refModel, refId, supplierId, purchaseId, userId, increaseReceived = true },
  session
) {
  let batch = null;

  if (product.trackBatches) {
    if (!batchInfo?.batchNumber || !batchInfo?.expirationDate) {
      throw new AppError(`"${product.name}" requiere número de lote y fecha de vencimiento`, 422);
    }

    const existing = await Batch.findOne({
      product: product._id,
      batchNumber: batchInfo.batchNumber,
    }).session(session);

    if (existing) {
      if (existing.expirationDate.getTime() !== batchInfo.expirationDate.getTime()) {
        throw new AppError(
          `El lote ${batchInfo.batchNumber} de "${product.name}" ya existe con otra fecha de vencimiento`,
          409
        );
      }
      const inc = { quantityAvailable: quantity };
      if (increaseReceived) inc.quantityReceived = quantity;
      batch = await Batch.findOneAndUpdate({ _id: existing._id }, { $inc: inc }, { returnDocument: 'after', session });
    } else {
      batch = new Batch({
        product: product._id,
        batchNumber: batchInfo.batchNumber,
        expirationDate: batchInfo.expirationDate,
        manufacturingDate: batchInfo.manufacturingDate,
        quantityReceived: quantity,
        quantityAvailable: quantity,
        unitCost: unitCost ?? product.costPrice,
        supplier: supplierId,
        purchase: purchaseId,
      });
      await batch.save({ session });
    }
  }

  const updated = await Product.findOneAndUpdate(
    { _id: product._id },
    { $inc: { stock: quantity } },
    { returnDocument: 'after', session }
  );
  if (!updated) throw new AppError('Producto no encontrado', 404);

  const movement = await recordMovement(
    {
      product: product._id,
      batch: batch?._id,
      type,
      quantity,
      balanceAfter: updated.stock,
      unitCost: unitCost ?? batch?.unitCost ?? product.costPrice,
      reason,
      refModel,
      refId,
      performedBy: userId,
    },
    session
  );

  return { batch, movement, balanceAfter: updated.stock };
}

// Salida de existencias (baja, ajuste negativo, venta, anulación de compra).
// batch = documento del lote (obligatorio si el producto maneja lotes).
export async function removeStock(
  { product, batch, quantity, type, reason, refModel, refId, userId, insufficientMessage },
  session
) {
  if (product.trackBatches) {
    if (!batch) throw new AppError(`Indica el lote de "${product.name}"`, 422);
    const updatedBatch = await Batch.findOneAndUpdate(
      { _id: batch._id, product: product._id, quantityAvailable: { $gte: quantity } },
      { $inc: { quantityAvailable: -quantity } },
      { returnDocument: 'after', session }
    );
    if (!updatedBatch) {
      throw new AppError(
        insufficientMessage ?? `Existencias insuficientes en el lote ${batch.batchNumber} de "${product.name}"`,
        409
      );
    }
  }

  const updated = await Product.findOneAndUpdate(
    { _id: product._id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { returnDocument: 'after', session }
  );
  if (!updated) {
    throw new AppError(insufficientMessage ?? `Existencias insuficientes de "${product.name}"`, 409);
  }

  const movement = await recordMovement(
    {
      product: product._id,
      batch: batch?._id,
      type,
      quantity: -quantity,
      balanceAfter: updated.stock,
      unitCost: batch?.unitCost ?? product.costPrice,
      reason,
      refModel,
      refId,
      performedBy: userId,
    },
    session
  );

  return { movement, balanceAfter: updated.stock };
}

// Carga los productos de una lista de ids (una sola consulta) y valida que existan y estén activos.
export async function loadProducts(ids, session, { requireActive = true } = {}) {
  const unique = [...new Set(ids.map(String))];
  const products = await Product.find({ _id: { $in: unique } }).session(session);
  const map = new Map(products.map((product) => [String(product._id), product]));

  for (const id of unique) {
    const product = map.get(id);
    if (!product) throw new AppError('Uno de los productos no existe', 404);
    if (requireActive && !product.isActive) {
      throw new AppError(`El producto "${product.name}" está inactivo`, 422);
    }
  }
  return map;
}
