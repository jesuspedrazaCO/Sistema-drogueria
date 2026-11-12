// Textos en español para los valores que el backend guarda en inglés
export const AREAS = { drogueria: 'Droguería', ferreteria: 'Ferretería' };
export const PAYMENT_METHODS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
export const STORAGE = { ambient: 'Ambiente', cold: 'Refrigerado' };
export const STOCK_STATUS = {
  ok: { label: 'Disponible', tone: 'ok' },
  low: { label: 'Stock bajo', tone: 'warn' },
  out: { label: 'Agotado', tone: 'bad' },
};
export const IVA_OPTIONS = [0, 5, 19];

// Tono según los días que le quedan a un lote
export function expiryTone(days) {
  if (days < 0) return 'bad';
  if (days <= 30) return 'bad';
  if (days <= 90) return 'warn';
  return 'ok';
}
export function expiryLabel(days) {
  if (days < 0) return `Vencido hace ${Math.abs(days)} d`;
  if (days === 0) return 'Vence hoy';
  return `${days} d`;
}

export const DOC_TYPES = { CC: 'Cédula', CE: 'Cédula extranjería', NIT: 'NIT', TI: 'Tarjeta identidad', PP: 'Pasaporte', OTHER: 'Otro' };

// Movimientos de inventario (kardex): entran (+) o salen (-)
export const MOVEMENT_TYPES = {
  initial: 'Inventario inicial',
  purchase: 'Compra',
  purchase_void: 'Compra anulada',
  sale: 'Venta',
  sale_void: 'Venta anulada',
  adjustment_in: 'Ajuste (+)',
  adjustment_out: 'Ajuste (−)',
  expiry_writeoff: 'Baja por vencimiento',
  damage_writeoff: 'Baja por daño',
  supplier_return: 'Devolución a proveedor',
};

export const PURCHASE_PAYMENT = { cash: 'Efectivo', transfer: 'Transferencia', credit: 'A crédito' };
export const PAYMENT_STATUS = {
  paid: { label: 'Pagada', tone: 'ok' },
  partial: { label: 'Abonada', tone: 'warn' },
  pending: { label: 'Pendiente', tone: 'warn' },
};

export const EXPENSE_CATEGORIES = {
  rent: 'Arriendo',
  utilities: 'Servicios públicos',
  payroll: 'Nómina',
  taxes: 'Impuestos',
  supplies: 'Insumos',
  transport: 'Transporte',
  maintenance: 'Mantenimiento',
  marketing: 'Publicidad',
  fees: 'Honorarios y comisiones',
  other: 'Otros',
};
export const EXPENSE_AREAS = { general: 'General', drogueria: 'Droguería', ferreteria: 'Ferretería' };
