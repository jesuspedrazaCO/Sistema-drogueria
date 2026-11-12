import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { expiryLabel } from '../lib/labels.js';
import { formatCOP, formatDate, formatNumber } from '../lib/format.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

function Row({ title, subtitle, right, badge }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{title}</p>
        {subtitle && <p className="text-sm text-ink-mute">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {right !== undefined && <span className="num text-[17px] font-semibold leading-none text-ink">{right}</span>}
        {badge}
      </div>
    </li>
  );
}

export default function Alerts() {
  useDocumentTitle('Alertas');
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['alerts'], queryFn: () => api.get('/reports/alerts') });
  const d = data?.data;
  const [selected, setSelected] = useState(null);

  const tabs = useMemo(() => {
    if (!d) return [];
    const list = [
      { key: 'expired', label: 'Vencidos', tone: 'bad', items: d.expired },
      { key: 'expiring', label: 'Por vencer', tone: 'warn', items: d.expiring },
      { key: 'out', label: 'Agotados', tone: 'bad', items: d.outOfStock },
      { key: 'low', label: 'Stock bajo', tone: 'warn', items: d.lowStock },
    ];
    if (can(user, 'viewPurchases')) list.push({ key: 'payables', label: 'Por pagar', tone: 'warn', items: d.overduePayables });
    return list;
  }, [d, user]);

  // Abre la primera pestaña que tenga algo, salvo que la persona ya eligió una
  const active = tabs.find((tab) => tab.key === selected) ?? tabs.find((tab) => tab.items.length > 0) ?? tabs[0];

  const batchRow = (batch) => (
    <Row
      key={batch.id}
      title={batch.product?.name ?? 'Producto'}
      subtitle={`Lote ${batch.batchNumber} · vence ${formatDate(batch.expirationDate)}`}
      badge={<Badge tone={batch.isExpired || batch.level === 'critical' ? 'bad' : 'warn'}>{expiryLabel(batch.daysToExpire)}</Badge>}
      right={formatNumber(batch.quantityAvailable)}
    />
  );

  const render = {
    expired: (item) => batchRow(item),
    expiring: (item) => batchRow(item),
    out: (item) => <Row key={item.id} title={item.name} subtitle={[item.presentation, item.brand].filter(Boolean).join(' · ')} right={0} />,
    low: (item) => <Row key={item.id} title={item.name} subtitle={`Mínimo ${formatNumber(item.minStock)}`} right={formatNumber(item.stock)} />,
    payables: (item) => (
      <Row
        key={item.id}
        title={item.supplier?.name ?? 'Proveedor'}
        subtitle={`Factura ${item.invoiceNumber} · venció ${formatDate(item.dueDate)}`}
        right={undefined}
        badge={<span className="num font-semibold text-bad">{formatCOP(item.balanceDue)}</span>}
      />
    ),
  };

  return (
    <>
      <PageHeader title="Alertas" subtitle={d ? `Avisamos con ${d.thresholds.expiryAlertDays} días de anticipación` : undefined} />

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <div role="tablist" aria-label="Tipo de alerta" className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)
          : tabs.map((tab) => {
              const on = tab.key === active.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSelected(tab.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${on ? 'bg-ink text-white' : 'bg-surface text-ink-soft shadow-card hover:bg-black/[0.03]'}`}
                >
                  {tab.label}
                  <span className={`num rounded-full px-2 text-xs ${on ? 'bg-white/20' : tab.items.length ? (tab.tone === 'bad' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn') : 'bg-black/5 text-ink-mute'}`}>{tab.items.length}</span>
                </button>
              );
            })}
      </div>

      <Card padded={false} role="tabpanel">
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !active || active.items.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Todo en orden" description="No hay nada pendiente en esta categoría." />
        ) : (
          <ul className="divide-y">{active.items.map(render[active.key])}</ul>
        )}
      </Card>
    </>
  );
}
