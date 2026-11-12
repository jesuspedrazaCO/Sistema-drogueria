import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui/Skeleton.jsx';
import { EmptyState } from './ui/EmptyState.jsx';
import { ShieldAlert } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

// Solo usuarios con sesión. Si no hay, va al login y vuelve a donde estaba al entrar.
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Las pantallas de login/recuperación no tienen sentido con sesión iniciada
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}

// Restringe una ruta a ciertos roles (el servidor igual los valida)
export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No tienes acceso a esta sección"
        description="Tu rol no incluye este módulo. Si lo necesitas, pídele al administrador que te lo habilite."
      />
    );
  }
  return <Outlet />;
}
