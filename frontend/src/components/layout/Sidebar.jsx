import { NavLink } from 'react-router-dom';
import { LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { navFor } from '../../lib/nav.js';
import { ROLES } from '../../lib/permissions.js';
import { LogoMark } from '../ui/Logo.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2 text-[14.5px] transition ${
          isActive ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-soft hover:bg-black/[0.045]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-600' : 'text-ink-mute group-hover:text-ink-soft'}`} strokeWidth={1.9} aria-hidden />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ businessName }) {
  const { user, logout } = useAuth();
  const groups = navFor(user.role);

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r bg-canvas lg:flex">
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <LogoMark />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-ink">{businessName}</p>
          <p className="text-xs text-ink-mute">Gestión de inventario</p>
        </div>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {groups.map((group, index) => (
          <div key={group.section ?? index}>
            {group.section && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">{group.section}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-mute">{ROLES[user.role]}</p>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <NavLink
            to="/cuenta"
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] text-ink-soft hover:bg-black/[0.045]"
          >
            <KeyRound className="h-4 w-4" aria-hidden /> Mi cuenta
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] text-ink-soft hover:bg-black/[0.045]"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
