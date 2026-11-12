import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { MOVEMENT_TYPES } from '../lib/labels.js';
import { formatCOP, formatDate, formatDateTime, formatNumber } from '../lib/format.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ProductPicker } from '../components/ProductPicker.jsx';

const dateInput = 'h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function Kardex() {
  useDocumentTitle('Kardex');
  const [product, setProduct] = useState(null);
  const [filters, setFilters] = useState({ type: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const set = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(1);
  };
  const query = { page, limit: 25, ...filters, product: product?.id };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['movements', query],
    queryFn: () => api.get('/inventory/movements', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;

  return (
    <>
      <PageHeader title="Kardex" subtitle="Todas las entradas y salidas del inventario" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProductPicker value={product} onChange={(value) => { setProduct(value); setPage(1); }} />
        <Select aria-label="Tipo de movimiento" value={filters.type} onChange={set('type')}>
          <option value="">Todos los movimientos</option>
          {Object.entries(MOVEMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <input type="date" aria-label="Desde" value={filters.from} max={filters.to || undefined} onChange={set('from')} className={dateInput} />
        <input type="date" aria-label="Hasta" value={filters.to} min={filters.from || undefined} onChange={set('to')} className={dateInput} />
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="Sin movimientos" description="No hay movimientos con estos filtros." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((move) => {
              const incoming = move.quantity > 0;
              return (
                <li key={move.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{move.product?.name ?? 'Producto'}</p>
                    <p className="truncate text-sm text-ink-mute">
                      {formatDateTime(move.createdAt)} · {move.performedBy?.name ?? '—'}
                      {move.batch && ` · lote ${move.batch.batchNumber} (vence ${formatDate(move.batch.expirationDate)})`}
                    </p>
                    {move.reason && <p className="truncate text-sm text-ink-mute">{move.reason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`num text-[17px] font-semibold leading-none ${incoming ? 'text-ok' : 'text-bad'}`}>{incoming ? '+' : '−'}{formatNumber(Math.abs(move.quantity))}</span>
                    <Badge tone={incoming ? 'ok' : 'neutral'}>{MOVEMENT_TYPES[move.type] ?? move.type}</Badge>
                  </div>
                  <div className="hidden w-24 text-right sm:block">
                    <p className="text-xs text-ink-mute">Saldo</p>
                    <p className="num font-medium text-ink">{formatNumber(move.balanceAfter)}</p>
                    {move.unitCost !== undefined && <p className="num text-xs text-ink-mute">{formatCOP(move.unitCost)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
    </>
  );
}
