import {
  House,
  ShoppingCart,
  Receipt,
  Pill,
  Layers,
  Bell,
  ScrollText,
  Truck,
  Building2,
  Wallet,
  Users,
  CircleDollarSign,
  ChartColumn,
  UserCog,
  Settings,
} from 'lucide-react';

const ALL = ['admin', 'regente', 'vendedor', 'contador'];

// Menú único para escritorio y móvil. "roles" decide quién lo ve.
export const NAV = [
  { items: [{ to: '/', label: 'Inicio', icon: House, roles: ALL, end: true }] },
  {
    section: 'Ventas',
    items: [
      { to: '/ventas/nueva', label: 'Nueva venta', icon: ShoppingCart, roles: ['admin', 'regente', 'vendedor'] },
      { to: '/ventas', label: 'Historial', icon: Receipt, roles: ALL, end: true },
      { to: '/clientes', label: 'Clientes', icon: Users, roles: ALL },
    ],
  },
  {
    section: 'Inventario',
    items: [
      { to: '/productos', label: 'Productos', icon: Pill, roles: ALL },
      { to: '/lotes', label: 'Lotes y vencimientos', icon: Layers, roles: ALL },
      { to: '/alertas', label: 'Alertas', icon: Bell, roles: ALL },
      { to: '/kardex', label: 'Kardex', icon: ScrollText, roles: ['admin', 'regente', 'contador'] },
    ],
  },
  {
    section: 'Compras',
    items: [
      { to: '/compras', label: 'Compras', icon: Truck, roles: ['admin', 'regente', 'contador'], end: true },
      { to: '/proveedores', label: 'Proveedores', icon: Building2, roles: ['admin', 'regente', 'contador'] },
      { to: '/por-pagar', label: 'Cuentas por pagar', icon: Wallet, roles: ['admin', 'regente', 'contador'] },
    ],
  },
  {
    section: 'Finanzas',
    items: [
      { to: '/gastos', label: 'Gastos', icon: CircleDollarSign, roles: ['admin', 'contador'] },
      { to: '/reportes', label: 'Reportes', icon: ChartColumn, roles: ['admin', 'regente', 'contador'] },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
      { to: '/ajustes', label: 'Ajustes', icon: Settings, roles: ['admin'] },
    ],
  },
];

// Menú filtrado por rol, sin secciones vacías
export const navFor = (role) =>
  NAV.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter(
    (group) => group.items.length > 0
  );

// Las 4 pestañas de la barra inferior en móvil (el resto va en "Más")
const TAB_ORDER = ['/', '/ventas/nueva', '/productos', '/alertas', '/ventas', '/reportes'];
export const tabsFor = (role) => {
  const flat = navFor(role).flatMap((group) => group.items);
  return TAB_ORDER.map((to) => flat.find((item) => item.to === to)).filter(Boolean).slice(0, 4);
};
