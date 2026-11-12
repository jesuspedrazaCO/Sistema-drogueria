import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Receipt } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { PAYMENT_METHODS } from '../lib/labels.js';
import { formatCOP, formatDateTime } from '../lib/format.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { SaleDetail } from './sales/SaleDetail.jsx';

const dateInput = 'h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function Sales() {
  useDocumentTitle('Historial de ventas');
  const { user } = useAuth();
  const [filters, setFilters] = useState({ status: '', paymentMethod: '', from: '', to: '', receipt: '' });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

  const set = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(1);
  };
  const query = { page, limit: 20, ...filters };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['sales', query],
    queryFn: () => api.get('/sales', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;

  return (
    <>
      <PageHeader
        title="Historial de ventas"
        subtitle={user.role === 'vendedor' ? 'Tus ventas' : 'Todas las ventas'}
        actions={can(user, 'sell') && <Link to="/ventas/nueva"><Button><Plus className="h-4 w-4" aria-hidden /> Nueva venta</Button></Link>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="block text-sm font-medium text-ink-soft">Desde<input type="date" value={filters.from} max={filters.to || undefined} onChange={set('from')} className={`${dateInput} mt-1.5`} /></label>
        <label className="block text-sm font-medium text-ink-soft">Hasta<input type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} className={`${dateInput} mt-1.5`} /></label>
        <Select label="Pago" value={filters.paymentMethod} onChange={set('paymentMethod')}>
          <option value="">Todos</option>
          {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select label="Estado" value={filters.status} onChange={set('status')}>
          <option value="">Todos</option>
          <option value="completed">Completadas</option>
          <option value="voided">Anuladas</option>
        </Select>
        <label className="col-span-2 block text-sm font-medium text-ink-soft lg:col-span-1">N.º de recibo<input inputMode="numeric" value={filters.receipt} onChange={set('receipt')} placeholder="1042" className={`${dateInput} mt-1.5`} /></label>
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={Receipt} title="No hay ventas" description="Cambia los filtros o registra una nueva venta." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((sale) => (
              <li key={sale.id}>
                <button type="button" onClick={() => setDetailId(sale.id)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">N.º {sale.receiptNumber} <span className="font-normal text-ink-mute">· {formatDateTime(sale.createdAt)}</span></p>
                    <p className="truncate text-sm text-ink-mute">{sale.customer?.name ?? 'Consumidor final'}{user.role !== 'vendedor' && sale.soldBy ? ` · ${sale.soldBy.name}` : ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`num font-semibold ${sale.status === 'voided' ? 'text-ink-mute line-through' : 'text-ink'}`}>{formatCOP(sale.total)}</span>
                    {sale.status === 'voided' ? <Badge tone="bad">Anulada</Badge> : <Badge>{PAYMENT_METHODS[sale.paymentMethod]}</Badge>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
      <SaleDetail id={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
