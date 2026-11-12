import { ROLES } from './roles.js';

const { ADMIN, REGENTE, VENDEDOR, CONTADOR } = ROLES;

// Quién puede hacer qué. Las rutas usan estos grupos con authorize(...PERMISSIONS.xxx),
// así cambiar un permiso se hace en un solo lugar.
export const PERMISSIONS = Object.freeze({
  manageUsers: [ADMIN],
  manageCatalog: [ADMIN, REGENTE], // productos y proveedores
  manageInventory: [ADMIN, REGENTE], // compras, lotes, ajustes y bajas
  viewInventory: [ADMIN, REGENTE, VENDEDOR, CONTADOR],
  sell: [ADMIN, REGENTE, VENDEDOR],
  voidSale: [ADMIN, REGENTE],
  manageExpenses: [ADMIN, CONTADOR],
  viewReports: [ADMIN, REGENTE, CONTADOR],
  viewFinance: [ADMIN, CONTADOR],
  viewSuppliers: [ADMIN, REGENTE, CONTADOR],
  viewPurchases: [ADMIN, REGENTE, CONTADOR],
  viewCosts: [ADMIN, REGENTE, CONTADOR], // el vendedor no ve costos ni márgenes
  voidPurchase: [ADMIN, REGENTE],
  paySuppliers: [ADMIN, CONTADOR],
  viewSales: [ADMIN, REGENTE, VENDEDOR, CONTADOR],
  applyDiscount: [ADMIN, REGENTE],
  sellControlled: [ADMIN, REGENTE], // medicamentos de control especial: solo con el regente
  manageCustomers: [ADMIN, REGENTE, VENDEDOR],
  viewCustomers: [ADMIN, REGENTE, VENDEDOR, CONTADOR],
});
