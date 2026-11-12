import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Send, UserCog } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { ROLES } from '../lib/permissions.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime } from '../lib/format.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { UserForm } from './users/UserForm.jsx';

export default function Users() {
  useDocumentTitle('Usuarios');
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, user: null });
  const debounced = useDebounced(search);

  const query = { page, limit: 20, search: debounced, role };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({ queryKey: ['users', query], queryFn: () => api.get('/users', { query }), placeholderData: keepPreviousData });
  const result = data?.data;

  const resend = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/resend-invite`),
    onSuccess: ({ data: out }) => (out?.emailSent === false ? toast.error('No se pudo enviar el correo. Revisa la configuración de correo del servidor.') : toast.success('Invitación reenviada')),
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Quién puede entrar al sistema" actions={<Button onClick={() => setForm({ open: true, user: null })}><Plus className="h-4 w-4" aria-hidden /> Invitar</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Nombre o correo" label="Buscar usuarios" />
        <Select aria-label="Rol" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="min-w-44">
          <option value="">Todos los roles</option>
          {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={UserCog} title="No hay usuarios" description="Cambia la búsqueda o invita a alguien." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((u) => (
              <li key={u.id} className="flex items-center gap-2 pr-3">
                <button type="button" onClick={() => setForm({ open: true, user: u })} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{u.name}</p>
                    <p className="truncate text-sm text-ink-mute">{u.email} · {u.lastLoginAt ? `último acceso ${formatDateTime(u.lastLoginAt)}` : 'aún no ha ingresado'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone="brand">{ROLES[u.role]}</Badge>
                    {!u.isActive && <Badge tone="bad">Inactivo</Badge>}
                  </div>
                </button>
                {!u.lastLoginAt && u.isActive && (
                  <button type="button" onClick={() => resend.mutate(u.id)} disabled={resend.isPending} aria-label={`Reenviar invitación a ${u.name}`} title="Reenviar invitación" className="rounded-full p-2 text-ink-mute hover:bg-black/5 hover:text-ink disabled:opacity-50">
                    <Send className="h-[18px] w-[18px]" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
      <UserForm open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} />
    </>
  );
}
