import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';
import { AREAS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../lib/labels.js';
import { daysBetween, eachDay, rangeById } from '../lib/ranges.js';
import { formatCOP, formatCompactCOP, formatNumber, formatYMD } from '../lib/format.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Segmented } from '../components/ui/Segmented.jsx';
import { RangePicker } from '../components/RangePicker.jsx';
import { Banknote, Receipt, Ticket, TrendingUp } from 'lucide-react';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between gap-3 py-2 ${strong ? 'border-t text-[17px] font-semibold text-ink' : 'text-[15px] text-ink-soft'}`}>
      <span>{label}</span>
      <span className={`num ${tone === 'bad' ? 'text-bad' : tone === 'ok' ? 'text-ok' : ''}`}>{value}</span>
    </div>
  );
}

export default function Reports() {
  useDocumentTitle('Reportes');
  const { user } = useAuth();
  const finance = can(user, 'viewFinance');
  const [rangeId, setRangeId] = useState('month');
  const [by, setBy] = useState('quantity');
  const { from, to } = rangeById(rangeId).get();
  const days = daysBetween(from, to);
  const groupBy = days > 62 ? 'month' : 'day';

  const q = { from, to };
  const sales = useQuery({ queryKey: ['report', 'sales', from, to, groupBy], queryFn: () => api.get('/reports/sales-summary', { query: { ...q, groupBy } }) });
  const top = useQuery({ queryKey: ['report', 'top', from, to, by], queryFn: () => api.get('/reports/top-products', { query: { ...q, by, limit: 8 } }) });
  const profit = useQuery({ queryKey: ['report', 'profit', from, to], queryFn: () => api.get('/reports/profit', { query: q }), enabled: finance });
  const inventory = useQuery({ queryKey: ['report', 'inventory'], queryFn: () => api.get('/reports/inventory-value'), enabled: can(user, 'viewCosts') });

  const s = sales.data?.data;
  const p = profit.data?.data;
  const inv = inventory.data?.data;
  const items = top.data?.data.items ?? [];
  const topMax = Math.max(1, ...items.map((row) => (by === 'revenue' ? row.revenue : row.quantity)));

  const chart = useMemo(() => {
    const byPeriod = new Map((s?.series ?? []).map((row) => [row.period, row.sales]));
    if (groupBy === 'day') return eachDay(from, to).map((d) => ({ period: d, label: String(Number(d.slice(8))), sales: byPeriod.get(d) ?? 0 }));
    return (s?.series ?? []).map((row) => ({ period: row.period, label: MONTHS[Number(row.period.slice(5, 7)) - 1], sales: row.sales }));
  }, [s, groupBy, from, to]);

  const error = sales.error ?? top.error ?? profit.error ?? inventory.error;
  const methodTotal = (s?.byPaymentMethod ?? []).reduce((sum, row) => sum + row.sales, 0) || 1;

  return (
    <>
      <PageHeader title="Reportes" subtitle={`${formatYMD(from)} – ${formatYMD(to)}`} />
      <div className="mb-5"><RangePicker value={rangeId} onChange={setRangeId} /></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventas" icon={Banknote} loading={sales.isLoading} value={formatCOP(s?.totals.sales)} />
        <StatCard label="N.º de ventas" icon={Receipt} tone="ok" loading={sales.isLoading} value={formatNumber(s?.totals.count)} />
        <StatCard label="Ticket promedio" icon={Ticket} tone="warn" loading={sales.isLoading} value={formatCOP(s?.totals.averageTicket)} />
        {finance && <StatCard label="Utilidad neta" icon={TrendingUp} tone={p && p.netProfit < 0 ? 'bad' : 'ok'} loading={profit.isLoading} value={formatCOP(p?.netProfit)} hint="Después de gastos" />}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ventas" subtitle={groupBy === 'day' ? 'Por día' : 'Por mes'} />
          {sales.isLoading ? <Skeleton className="h-60 w-full" /> : (
            <div className="h-60 w-full" role="img" aria-label="Gráfica de ventas del periodo">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--hairline))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} tick={{ fontSize: 12, fill: 'rgb(var(--ink-mute))' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} labelFormatter={(_, payload) => payload?.[0]?.payload.period ?? ''} formatter={(value) => [formatCOP(value), 'Ventas']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,.12)', fontSize: 13 }} />
                  <Bar dataKey="sales" radius={[6, 6, 6, 6]} maxBarSize={32}>
                    {chart.map((entry) => <Cell key={entry.period} fill="rgb(var(--brand-600))" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Medios de pago" />
          {sales.isLoading ? <Skeleton className="h-40 w-full" /> : (s?.byPaymentMethod.length ?? 0) === 0 ? <p className="py-6 text-center text-ink-mute">Sin ventas en el periodo.</p> : (
            <ul className="space-y-3.5">
              {s.byPaymentMethod.map((row) => {
                const pct = Math.round((row.sales / methodTotal) * 100);
                return (
                  <li key={row.method}>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-ink">{PAYMENT_METHODS[row.method] ?? row.method}</span><span className="num text-ink-mute">{formatCompactCOP(row.sales)} · {pct}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Más vendidos" action={<Segmented label="Ordenar por" value={by} onChange={setBy} options={[{ value: 'quantity', label: 'Unidades' }, { value: 'revenue', label: 'Ingresos' }]} />} />
          {top.isLoading ? <Skeleton className="h-56 w-full" /> : items.length === 0 ? <p className="py-6 text-center text-ink-mute">Sin ventas en el periodo.</p> : (
            <ol className="space-y-3">
              {items.map((row, index) => {
                const value = by === 'revenue' ? row.revenue : row.quantity;
                return (
                  <li key={row.productId}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink"><span className="num mr-2 text-ink-mute">{index + 1}</span>{row.name}</span>
                      <span className="num shrink-0 text-ink-soft">{by === 'revenue' ? formatCompactCOP(row.revenue) : `${formatNumber(row.quantity)} u.`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-brand-600/80" style={{ width: `${(value / topMax) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {finance && (
          <Card>
            <CardHeader title="Utilidad" subtitle="Ventas menos costo y gastos" />
            {profit.isLoading ? <Skeleton className="h-56 w-full" /> : p && (
              <div>
                <Row label="Ventas (sin IVA)" value={formatCOP(p.sales.revenueWithoutTax)} />
                <Row label="Costo de lo vendido" value={`− ${formatCOP(p.costOfGoodsSold)}`} />
                <Row label={`Utilidad bruta · margen ${p.grossMarginPct}%`} value={formatCOP(p.grossProfit)} strong />
                <Row label="Gastos" value={`− ${formatCOP(p.expenses.total)}`} />
                <Row label="Utilidad neta" value={formatCOP(p.netProfit)} strong tone={p.netProfit < 0 ? 'bad' : 'ok'} />
                {p.expenses.byCategory.length > 0 && (
                  <p className="mt-3 text-sm text-ink-mute">Gastos: {p.expenses.byCategory.map((row) => `${EXPENSE_CATEGORIES[row.category] ?? row.category} ${formatCompactCOP(row.total)}`).join(' · ')}</p>
                )}
                <p className="mt-2 text-sm text-ink-mute">Compras facturadas {formatCompactCOP(p.cashFlow.purchasesInvoiced)} · pagado a proveedores {formatCompactCOP(p.cashFlow.paidToSuppliers)}</p>
              </div>
            )}
          </Card>
        )}

        {inv && (
          <Card className={finance ? 'lg:col-span-2' : ''}>
            <CardHeader title="Valor del inventario" subtitle="Hoy" />
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div><dt className="text-sm text-ink-mute">Unidades</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatNumber(inv.totals.units)}</dd></div>
              <div><dt className="text-sm text-ink-mute">A costo</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatCOP(inv.totals.costValue)}</dd></div>
              <div><dt className="text-sm text-ink-mute">A precio de venta</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatCOP(inv.totals.saleValue)}</dd></div>
              <div><dt className="text-sm text-ink-mute">Vencido en estantes</dt><dd className={`num mt-1 text-xl font-semibold ${inv.expiredAtRisk.units ? 'text-bad' : 'text-ink'}`}>{formatCOP(inv.expiredAtRisk.costValue)}</dd><p className="text-xs text-ink-mute">{formatNumber(inv.expiredAtRisk.units)} unidades</p></div>
            </dl>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {inv.byArea.map((row) => (
                <li key={row._id ?? row.area} className="rounded-2xl bg-black/[0.03] px-4 py-3">
                  <p className="font-medium text-ink">{AREAS[row._id ?? row.area] ?? row._id ?? row.area}</p>
                  <p className="num text-sm text-ink-mute">{formatNumber(row.units)} u. · costo {formatCompactCOP(row.costValue)} · venta {formatCompactCOP(row.saleValue)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
