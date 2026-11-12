import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, TriangleAlert, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { formatCOP, formatDate } from '../lib/format.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { PurchaseDetail } from './purchases/PurchaseDetail.jsx';

export default function Payables() {
  useDocumentTitle('Cuentas por pagar');
  const [detailId, setDetailId] = useState(null);
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['payables'], queryFn: () => api.get('/purchases/payables') });
  const d = data?.data;

  return (
    <>
      <PageHeader title="Cuentas por pagar" subtitle="Facturas a crédito con saldo pendiente" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total por pagar" icon={Wallet} loading={isLoading} value={formatCOP(d?.totalDue)} hint={`${d?.items.length ?? 0} facturas`} />
        <StatCard label="Vencido" icon={TriangleAlert} tone={d?.overdueTotal > 0 ? 'bad' : 'ok'} loading={isLoading} value={formatCOP(d?.overdueTotal)} hint={d?.overdueTotal > 0 ? 'Requiere pago' : 'Estás al día'} />
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : d?.items.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="No debes nada" description="Todas las facturas están pagadas." />
        ) : (
          <ul className="divide-y">
            {d?.items.map((purchase) => (
              <li key={purchase.id}>
                <button type="button" onClick={() => setDetailId(purchase.id)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{purchase.supplier?.name ?? 'Proveedor'}</p>
                    <p className="truncate text-sm text-ink-mute">Factura {purchase.invoiceNumber} · vence {formatDate(purchase.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="num font-semibold text-ink">{formatCOP(purchase.balanceDue)}</span>
                    {purchase.isOverdue ? <Badge tone="bad">Vencida</Badge> : <Badge tone="warn">Pendiente</Badge>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <PurchaseDetail id={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
