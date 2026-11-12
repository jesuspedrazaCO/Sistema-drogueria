import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Ellipsis, X, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { navFor, tabsFor } from '../../lib/nav.js';
import { ROLES } from '../../lib/permissions.js';
import { Avatar } from '../ui/Avatar.jsx';
import { NavItem } from './Sidebar.jsx';

// Barra inferior tipo iOS: 4 accesos rápidos y "Más" con el resto del menú
export function MobileNav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const tabs = tabsFor(user.role);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <nav aria-label="Principal" className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t lg:hidden">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-ink-mute'}`
                }
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
                {label.split(' ')[0]}
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-mute"
            >
              <Ellipsis className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden />
              Más
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 animate-fade bg-black/35" />
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[86vh] animate-sheet overflow-y-auto rounded-t-[28px] bg-canvas px-4 pb-6 pt-3 shadow-pop">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/15" aria-hidden />
            <div className="mb-4 flex items-center gap-3 px-1">
              <Avatar name={user.name} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{user.name}</p>
                <p className="text-sm text-ink-mute">{ROLES[user.role]}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-black/5 p-2 text-ink-soft" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {navFor(user.role).map((group, index) => (
                <div key={group.section ?? index}>
                  {group.section && (
                    <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">{group.section}</p>
                  )}
                  <div className="space-y-0.5 rounded-2xl bg-surface p-1.5 shadow-card">
                    {group.items.map((item) => (
                      <NavItem key={item.to} item={item} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="space-y-0.5 rounded-2xl bg-surface p-1.5 shadow-card">
                <NavLink to="/cuenta" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-ink-soft">
                  <KeyRound className="h-[18px] w-[18px] text-ink-mute" aria-hidden /> Mi cuenta
                </NavLink>
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] text-bad">
                  <LogOut className="h-[18px] w-[18px]" aria-hidden /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
