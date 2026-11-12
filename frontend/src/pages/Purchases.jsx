import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { PAYMENT_STATUS } from '../lib/labels.js';
import { formatCOP, formatDate } from '../lib/format.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { PurchaseDetail } from './purchases/PurchaseDetail.jsx';

export default function Purchases() {
  useDocumentTitle('Compras');
  const { user } = useAuth();
  const [invoice, setInvoice] = useState('');
  const [filters, setFilters] = useState({ paymentStatus: '', status: '' });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const debounced = useDebounced(invoice);

  const query = { page, limit: 20, invoice: debounced, ...filters };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['purchases', query],
    queryFn: () => api.get('/purchases', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;
  const set = (field) => (event) => { setFilters((c) => ({ ...c, [field]: event.target.value })); setPage(1); };

  return (
    <>
      <PageHeader title="Compras" subtitle="Facturas de tus proveedores" actions={can(user, 'manageInventory') && <Link to="/compras/nueva"><Button><Plus className="h-4 w-4" aria-hidden /> Nueva compra</Button></Link>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={invoice} onChange={(e) => { setInvoice(e.target.value); setPage(1); }} onClear={() => setInvoice('')} placeholder="N.º de factura" label="Buscar factura" />
        <Select aria-label="Estado de pago" value={filters.paymentStatus} onChange={set('paymentStatus')} className="min-w-40">
          <option value="">Todo pago</option>
          <option value="paid">Pagadas</option>
          <option value="partial">Abonadas</option>
          <option value="pending">Pendientes</option>
        </Select>
        <Select aria-label="Estado" value={filters.status} onChange={set('status')} className="min-w-40">
          <option value="">Todas</option>
          <option value="received">Recibidas</option>
          <option value="voided">Anuladas</option>
        </Select>
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={Truck} title="No hay compras" description="Registra la primera factura de un proveedor para cargar inventario." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((purchase) => {
              const status = PAYMENT_STATUS[purchase.paymentStatus];
              return (
                <li key={purchase.id}>
                  <button type="button" onClick={() => setDetailId(purchase.id)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{purchase.supplier?.name ?? 'Proveedor'}</p>
                      <p className="truncate text-sm text-ink-mute">Factura {purchase.invoiceNumber} · {formatDate(purchase.purchaseDate)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`num font-semibold ${purchase.status === 'voided' ? 'text-ink-mute line-through' : 'text-ink'}`}>{formatCOP(purchase.total)}</span>
                      {purchase.status === 'voided' ? <Badge tone="bad">Anulada</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
      <PurchaseDetail id={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
