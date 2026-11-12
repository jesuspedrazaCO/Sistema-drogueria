import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PackageSearch, Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { AREAS, STOCK_STATUS } from '../lib/labels.js';
import { formatCOP, formatNumber } from '../lib/format.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Segmented } from '../components/ui/Segmented.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ProductForm } from './products/ProductForm.jsx';
import { ProductDetail } from './products/ProductDetail.jsx';

export default function Products() {
  useDocumentTitle('Productos');
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ open: false, product: null });
  const debounced = useDebounced(search);

  const query = { page, limit: 20, search: debounced, area, stockStatus, isActive: true };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['products', query],
    queryFn: () => api.get('/products', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;
  const canManage = can(user, 'manageCatalog');
  const showCosts = can(user, 'viewCosts');

  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo y existencias"
        actions={canManage && <Button onClick={() => setForm({ open: true, product: null })}><Plus className="h-4 w-4" aria-hidden /> Nuevo</Button>}
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <SearchInput value={search} onChange={(e) => reset(setSearch)(e.target.value)} onClear={() => reset(setSearch)('')} placeholder="Nombre, principio activo, marca o código" label="Buscar productos" />
        <Segmented label="Área" value={area} onChange={reset(setArea)} options={[{ value: '', label: 'Todos' }, { value: 'drogueria', label: 'Droguería' }, { value: 'ferreteria', label: 'Ferretería' }]} />
        <Select aria-label="Estado de stock" value={stockStatus} onChange={(e) => reset(setStockStatus)(e.target.value)} className="min-w-44">
          <option value="">Todo el stock</option>
          <option value="ok">Disponible</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotado</option>
        </Select>
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No encontramos productos" description="Prueba con otra búsqueda o cambia los filtros." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((product) => {
              const status = STOCK_STATUS[product.stockStatus];
              return (
                <li key={product.id}>
                  <button type="button" onClick={() => setDetailId(product.id)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{product.name}</p>
                      <p className="truncate text-sm text-ink-mute">
                        {[product.presentation, product.brand, product.area === 'ferreteria' ? AREAS.ferreteria : null].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="num font-medium text-ink">{formatCOP(product.salePrice)}</p>
                      {showCosts && <p className="num text-xs text-ink-mute">Costo {formatCOP(product.costPrice)}</p>}
                    </div>
                    <div className="flex w-24 flex-col items-end gap-1">
                      <span className="num text-[17px] font-semibold text-ink">{formatNumber(product.stock)}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />

      <ProductDetail id={detailId} onClose={() => setDetailId(null)} onEdit={(product) => { setDetailId(null); setForm({ open: true, product }); }} />
      <ProductForm open={form.open} product={form.product} onClose={() => setForm({ open: false, product: null })} />
    </>
  );
}
