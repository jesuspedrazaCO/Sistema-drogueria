export function Skeleton({ className = '' }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-black/[0.06] ${className}`} />;
}

export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <span role="status" aria-label="Cargando" className={`inline-block animate-spin rounded-full border-2 border-brand-600/25 border-t-brand-600 ${className}`} />
  );
}
