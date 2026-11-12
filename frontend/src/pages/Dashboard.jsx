import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { Banknote, Receipt, TrendingUp, AlertTriangle, Clock, PackageX, CalendarX, ChevronRight, Wallet } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCOP, formatCompactCOP, formatLongDay, formatNumber, greeting, lastDays, weekdayShort } from '../lib/format.js';
import { PAYMENT_METHODS as METHODS } from '../lib/labels.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Button } from '../components/ui/Button.jsx';


function SalesChart({ data }) {
  const today = data.length - 1;
  return (
    <div className="h-56 w-full" role="img" aria-label="Ventas de los últimos 7 días">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgb(var(--hairline))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'rgb(var(--ink-mute))' }} />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            formatter={(value) => [formatCOP(value), 'Ventas']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,.12)', fontSize: 13 }}
          />
          <Bar dataKey="sales" radius={[8, 8, 8, 8]} maxBarSize={44}>
            {data.map((entry, index) => (
              <Cell key={entry.period} fill={index === today ? 'rgb(var(--brand-600))' : 'rgb(var(--brand-600) / 0.28)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AlertRow({ icon: Icon, label, count, tone }) {
  const tones = { bad: 'bg-bad-bg text-bad', warn: 'bg-warn-bg text-warn' };
  return (
    <li>
      <Link to="/alertas" className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.03]">
        <span className={`grid h-9 w-9 place-items-center rounded-full ${count ? tones[tone] : 'bg-black/5 text-ink-mute'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="flex-1 text-[15px] text-ink">{label}</span>
        <span className="num text-[15px] font-semibold text-ink">{formatNumber(count)}</span>
        <ChevronRight className="h-4 w-4 text-ink-mute" aria-hidden />
      </Link>
    </li>
  );
}

export default function Dashboard() {
  useDocumentTitle('Inicio');
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard'),
    staleTime: 60 * 1000,
  });
  const d = data?.data;

  // El servidor solo devuelve los días con ventas: completamos los vacíos con cero
  const chart = useMemo(() => {
    const byDay = new Map((d?.last7Days ?? []).map((row) => [row.period, row.sales]));
    return lastDays(7).map((ymd) => ({ period: ymd, label: weekdayShort(ymd), sales: byDay.get(ymd) ?? 0 }));
  }, [d]);

  const methods = useMemo(() => {
    const rows = d?.byPaymentMethod ?? [];
    const total = rows.reduce((sum, row) => sum + row.sales, 0) || 1;
    return rows.map((row) => ({ ...row, pct: Math.round((row.sales / total) * 100) })).sort((a, b) => b.sales - a.sales);
  }, [d]);

  const firstName = user.name.split(' ')[0];
  const alerts = d?.alerts ?? {};

  return (
    <>
      <PageHeader title={`${greeting()}, ${firstName}`} subtitle={formatLongDay()} />

      {isError && (
        <Card className="mb-6">
          <p role="alert" className="text-bad">{errorMessage(error)}</p>
          <Button variant="secondary" className="mt-3" onClick={() => refetch()}>Reintentar</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Ventas de hoy" icon={Banknote} loading={isLoading} value={formatCOP(d?.today.sales)} hint={`${formatNumber(d?.today.count)} ${d?.today.count === 1 ? 'venta' : 'ventas'}`} />
        <StatCard label="Ventas del mes" icon={TrendingUp} tone="ok" loading={isLoading} value={formatCOP(d?.month.sales)} hint={`${formatNumber(d?.month.count)} ventas`} />
        <StatCard label="Ticket promedio" icon={Receipt} tone="warn" loading={isLoading} value={formatCOP(d?.month.averageTicket)} hint="Este mes" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Últimos 7 días" subtitle="Ventas por día" />
          {isLoading ? <Skeleton className="h-56 w-full" /> : <SalesChart data={chart} />}
        </Card>

        <Card>
          <CardHeader title="Requiere atención" />
          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ul className="-mx-2">
              <AlertRow icon={CalendarX} label="Vencidos" count={alerts.expired} tone="bad" />
              <AlertRow icon={Clock} label="Por vencer" count={alerts.expiringSoon} tone="warn" />
              <AlertRow icon={PackageX} label="Agotados" count={alerts.outOfStock} tone="bad" />
              <AlertRow icon={AlertTriangle} label="Stock bajo" count={alerts.lowStock} tone="warn" />
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Medios de pago" subtitle="Este mes" />
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : methods.length === 0 ? (
            <p className="py-6 text-center text-ink-mute">Aún no hay ventas este mes.</p>
          ) : (
            <ul className="space-y-3.5">
              {methods.map((row) => (
                <li key={row.method}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{METHODS[row.method] ?? row.method}</span>
                    <span className="num text-ink-mute">{formatCompactCOP(row.sales)} · {row.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {d?.finance && (
          <Card className="lg:col-span-2">
            <CardHeader title="Resumen financiero" subtitle="Este mes" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {[
                ['Utilidad bruta', formatCOP(d.finance.grossProfit), `Margen ${d.finance.grossMarginPct ?? 0}%`],
                ['Gastos', formatCOP(d.finance.expenses)],
                ['Utilidad neta', formatCOP(d.finance.netProfit)],
                ['Por pagar', formatCOP(d.finance.payables?.total), d.finance.payables?.overdue ? `${formatCOP(d.finance.payables.overdue)} vencido` : 'Al día'],
              ].map(([label, value, hint]) => (
                <div key={label}>
                  <dt className="text-sm text-ink-mute">{label}</dt>
                  <dd className="num mt-1 text-xl font-semibold tracking-title text-ink">{value}</dd>
                  {hint && <p className="mt-0.5 text-xs text-ink-mute">{hint}</p>}
                </div>
              ))}
            </dl>
          </Card>
        )}

        {!d?.finance && d?.inventory && (
          <Card className="lg:col-span-2">
            <CardHeader title="Inventario" subtitle="Valor actual" />
            <dl className="grid grid-cols-3 gap-6">
              <div><dt className="text-sm text-ink-mute">Unidades</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatNumber(d.inventory.totals.units)}</dd></div>
              <div><dt className="text-sm text-ink-mute">A costo</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatCompactCOP(d.inventory.totals.costValue)}</dd></div>
              <div><dt className="text-sm text-ink-mute">A precio venta</dt><dd className="num mt-1 text-xl font-semibold text-ink">{formatCompactCOP(d.inventory.totals.saleValue)}</dd></div>
            </dl>
          </Card>
        )}
      </div>
    </>
  );
}
