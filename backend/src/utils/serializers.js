import { PERMISSIONS } from '../config/permissions.js';

// Los costos y proveedores de los lotes solo los ven los roles con permiso (no el vendedor).
export const canSeeCosts = (user) => PERMISSIONS.viewCosts.includes(user.role);

export function serializeProduct(doc, showCosts) {
  const data = doc.toJSON();
  if (!showCosts) delete data.costPrice;
  return data;
}

export function serializeBatch(doc, showCosts) {
  const data = doc.toJSON();
  if (!showCosts) {
    delete data.unitCost;
    delete data.supplier;
    delete data.purchase;
  }
  return data;
}

export function serializeMovement(doc, showCosts) {
  const data = doc.toJSON();
  if (!showCosts) delete data.unitCost;
  return data;
}

// Comprobante de venta: el costo de cada lote solo lo ven los roles con permiso
export function serializeSale(doc, showCosts) {
  const data = doc.toJSON();
  if (!showCosts) {
    for (const item of data.items ?? []) {
      for (const allocation of item.allocations ?? []) delete allocation.unitCost;
    }
  }
  return data;
}
