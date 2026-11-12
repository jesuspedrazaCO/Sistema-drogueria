import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth, RequireRole, FullScreenLoader } from './components/RouteGuards.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import NotFound from './pages/NotFound.jsx';

// Las páginas pesadas (con gráficas) se cargan solo cuando se visitan
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const NewSale = lazy(() => import('./pages/sales/NewSale.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const Sales = lazy(() => import('./pages/Sales.jsx'));
const Customers = lazy(() => import('./pages/Customers.jsx'));
const Batches = lazy(() => import('./pages/Batches.jsx'));
const Kardex = lazy(() => import('./pages/Kardex.jsx'));
const Suppliers = lazy(() => import('./pages/Suppliers.jsx'));
const Purchases = lazy(() => import('./pages/Purchases.jsx'));
const NewPurchase = lazy(() => import('./pages/purchases/NewPurchase.jsx'));
const Payables = lazy(() => import('./pages/Payables.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));


export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/olvide-mi-contrasena" element={<ForgotPassword />} />
        </Route>
        {/* Visible con o sin sesión: también sirve para aceptar invitaciones */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cuenta" element={<Account />} />
            <Route path="ventas/nueva" element={<RequireRole roles={['admin', 'regente', 'vendedor']} />}>
              <Route index element={<NewSale />} />
            </Route>
            <Route path="productos" element={<Products />} />
            <Route path="alertas" element={<Alerts />} />
            <Route path="ventas" element={<Sales />} />
            <Route path="clientes" element={<Customers />} />
            <Route path="lotes" element={<Batches />} />
            <Route element={<RequireRole roles={['admin', 'regente', 'contador']} />}>
              <Route path="kardex" element={<Kardex />} />
              <Route path="compras" element={<Purchases />} />
              <Route path="proveedores" element={<Suppliers />} />
              <Route path="por-pagar" element={<Payables />} />
            </Route>
            <Route path="compras/nueva" element={<RequireRole roles={['admin', 'regente']} />}>
              <Route index element={<NewPurchase />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'contador']} />}>
              <Route path="gastos" element={<Expenses />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'regente', 'contador']} />}>
              <Route path="reportes" element={<Reports />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="usuarios" element={<Users />} />
              <Route path="ajustes" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound standalone />} />
      </Routes>
    </Suspense>
  );
}
