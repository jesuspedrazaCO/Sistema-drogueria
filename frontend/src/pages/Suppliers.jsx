import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { SupplierForm } from './suppliers/SupplierForm.jsx';

export default function Suppliers() {
  useDocumentTitle('Proveedores');
  const { user } = useAuth();
  const canManage = can(user, 'manageCatalog');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, supplier: null });
  const debounced = useDebounced(search);

  const query = { page, limit: 20, search: debounced, isActive: true };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['suppliers', query],
    queryFn: () => api.get('/suppliers', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;

  return (
    <>
      <PageHeader title="Proveedores" subtitle="A quién le compras" actions={canManage && <Button onClick={() => setForm({ open: true, supplier: null })}><Plus className="h-4 w-4" aria-hidden /> Nuevo</Button>} />
      <SearchInput className="mb-5" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Nombre o NIT" label="Buscar proveedores" />

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={Building2} title="Aún no hay proveedores" description="Regístralos para asociar cada compra a su factura." action={canManage && <Button onClick={() => setForm({ open: true, supplier: null })}>Crear proveedor</Button>} />
        ) : (
          <ul className="divide-y">
            {result?.items.map((supplier) => {
              const content = (
                <>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Building2 className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{supplier.name}</p>
                    <p className="truncate text-sm text-ink-mute">{[supplier.nit && `NIT ${supplier.nit}`, supplier.contactName, supplier.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                  </div>
                  <Badge tone={supplier.paymentTermsDays > 0 ? 'brand' : 'neutral'}>{supplier.paymentTermsDays > 0 ? `${supplier.paymentTermsDays} días` : 'Contado'}</Badge>
                </>
              );
              return (
                <li key={supplier.id}>
                  {canManage ? (
                    <button type="button" onClick={() => setForm({ open: true, supplier })} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">{content}</button>
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
      <SupplierForm open={form.open} supplier={form.supplier} onClose={() => setForm({ open: false, supplier: null })} />
    </>
  );
}
