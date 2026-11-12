import { Skeleton } from './Skeleton.jsx';

// Cifra grande con etiqueta pequeña: la jerarquía de una tarjeta de métricas estilo Apple
export function StatCard({ label, value, hint, icon: Icon, loading, tone = 'brand' }) {
  const iconTone = { brand: 'bg-brand-50 text-brand-600', ok: 'bg-ok-bg text-ok', warn: 'bg-warn-bg text-warn', bad: 'bg-bad-bg text-bad' }[tone];
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-mute">{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-full ${iconTone}`}>
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="num mt-2 text-[28px] font-semibold leading-tight tracking-title text-ink">{value}</p>
      )}
      {hint && !loading && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
    </div>
  );
}
