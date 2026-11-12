import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Phone, Plus, Users } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { CustomerForm } from './customers/CustomerForm.jsx';

export default function Customers() {
  useDocumentTitle('Clientes');
  const { user } = useAuth();
  const canManage = can(user, 'manageCustomers');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, customer: null });
  const debounced = useDebounced(search);

  const query = { page, limit: 20, search: debounced, isActive: true };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['customers', query],
    queryFn: () => api.get('/customers', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;

  return (
    <>
      <PageHeader title="Clientes" subtitle="Quienes te compran con frecuencia" actions={canManage && <Button onClick={() => setForm({ open: true, customer: null })}><Plus className="h-4 w-4" aria-hidden /> Nuevo</Button>} />
      <SearchInput className="mb-5" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Nombre o documento" label="Buscar clientes" />

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={Users} title="Aún no hay clientes" description="Agrégalos para asociarlos a sus compras." action={canManage && <Button onClick={() => setForm({ open: true, customer: null })}>Crear cliente</Button>} />
        ) : (
          <ul className="divide-y">
            {result?.items.map((customer) => {
              const content = (
                <>
                  <Avatar name={customer.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{customer.name}</p>
                    <p className="truncate text-sm text-ink-mute">{[customer.documentNumber && `${customer.documentType} ${customer.documentNumber}`, customer.email].filter(Boolean).join(' · ') || 'Sin documento'}</p>
                  </div>
                  {customer.phone && <span className="hidden items-center gap-1.5 text-sm text-ink-mute sm:flex"><Phone className="h-4 w-4" aria-hidden />{customer.phone}</span>}
                </>
              );
              return (
                <li key={customer.id}>
                  {canManage ? (
                    <button type="button" onClick={() => setForm({ open: true, customer })} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">{content}</button>
                  ) : (
                    <div className="flex items-center gap-4 px-5 py-3.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
      <CustomerForm open={form.open} customer={form.customer} onClose={() => setForm({ open: false, customer: null })} />
    </>
  );
}
