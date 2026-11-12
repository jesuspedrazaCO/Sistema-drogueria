import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Sidebar } from './Sidebar.jsx';
import { MobileNav } from './MobileNav.jsx';
import { LogoMark } from '../ui/Logo.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function AppLayout() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 10 * 60 * 1000,
  });
  const businessName = data?.data.settings.businessName ?? 'Droguería';

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar businessName={businessName} />

      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b px-5 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="font-semibold text-ink">{businessName}</span>
          </div>
          <Avatar name={user.name} className="h-8 w-8 text-xs" />
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1120px] px-5 pb-28 pt-7 outline-none sm:px-8 lg:px-10 lg:pb-14 lg:pt-12">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
