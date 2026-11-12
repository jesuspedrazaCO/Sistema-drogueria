// Valores compartidos por modelos, validadores y servicios.
// Los valores se guardan en inglés (como en el resto del código); la interfaz los traduce.

export const PRODUCT_AREAS = Object.freeze({
  DROGUERIA: 'drogueria',
  FERRETERIA: 'ferreteria',
});
export const PRODUCT_AREA_LIST = Object.values(PRODUCT_AREAS);

// ambient = temperatura ambiente, cold = refrigerado (cadena de frío)
export const STORAGE_CONDITIONS = ['ambient', 'cold'];

// Tarifas de IVA permitidas (confirmar con el contador del cliente)
export const IVA_RATES = [0, 5, 19];

export const MOVEMENT_TYPES = Object.freeze({
  INITIAL: 'initial', // carga de inventario inicial
  PURCHASE: 'purchase', // entrada por compra
  PURCHASE_VOID: 'purchase_void', // salida por anulación de compra
  SALE: 'sale', // salida por venta
  SALE_VOID: 'sale_void', // reingreso por venta anulada
  ADJUSTMENT_IN: 'adjustment_in', // ajuste positivo (conteo físico)
  ADJUSTMENT_OUT: 'adjustment_out', // ajuste negativo (conteo físico)
  EXPIRY_WRITEOFF: 'expiry_writeoff', // baja por vencimiento
  DAMAGE_WRITEOFF: 'damage_writeoff', // baja por daño o pérdida
  SUPPLIER_RETURN: 'supplier_return', // devolución a proveedor
});
export const MOVEMENT_TYPE_LIST = Object.values(MOVEMENT_TYPES);

export const PAYMENT_METHODS = ['cash', 'card', 'transfer'];
export const PURCHASE_PAYMENT_METHODS = ['cash', 'transfer', 'credit'];
export const PAYMENT_STATUS = ['paid', 'partial', 'pending'];

export const SALE_STATUS = ['completed', 'voided'];
export const PURCHASE_STATUS = ['received', 'voided'];

export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'payroll',
  'taxes',
  'supplies',
  'transport',
  'maintenance',
  'marketing',
  'fees',
  'other',
];
export const EXPENSE_AREAS = ['general', 'drogueria', 'ferreteria'];

export const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'TI', 'PP', 'OTHER'];

// Colombia no tiene horario de verano: el desfase es fijo. Se usa para interpretar
// los rangos de fechas de los filtros ("del 1 al 5" = días completos en hora local).
export const APP_UTC_OFFSET = '-05:00';

// Pagos a proveedores
export const SUPPLIER_PAYMENT_METHODS = ['cash', 'transfer'];
