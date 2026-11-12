// Espejo de backend/src/config/permissions.js: solo sirve para mostrar u ocultar opciones.
// La seguridad real la aplica siempre el servidor.
export const ROLES = {
  admin: 'Administrador',
  regente: 'Regente',
  vendedor: 'Vendedor',
  contador: 'Contador',
};

const ALL = ['admin', 'regente', 'vendedor', 'contador'];

export const PERMISSIONS = {
  manageUsers: ['admin'],
  manageCatalog: ['admin', 'regente'],
  manageInventory: ['admin', 'regente'],
  viewInventory: ALL,
  sell: ['admin', 'regente', 'vendedor'],
  voidSale: ['admin', 'regente'],
  manageExpenses: ['admin', 'contador'],
  viewReports: ['admin', 'regente', 'contador'],
  viewFinance: ['admin', 'contador'],
  viewSuppliers: ['admin', 'regente', 'contador'],
  viewPurchases: ['admin', 'regente', 'contador'],
  viewCosts: ['admin', 'regente', 'contador'],
  voidPurchase: ['admin', 'regente'],
  paySuppliers: ['admin', 'contador'],
  viewSales: ALL,
  applyDiscount: ['admin', 'regente'],
  sellControlled: ['admin', 'regente'],
  manageCustomers: ['admin', 'regente', 'vendedor'],
  viewCustomers: ALL,
};

export const can = (user, permission) => Boolean(user && PERMISSIONS[permission]?.includes(user.role));
