import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return total ? <p className="mt-4 text-center text-sm text-ink-mute">{total} resultados</p> : null;
  return (
    <nav aria-label="Paginación" className="mt-5 flex items-center justify-between">
      <p className="text-sm text-ink-mute">{total} resultados</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior" className="rounded-full bg-surface p-2 shadow-card disabled:opacity-40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="num min-w-16 text-center text-sm text-ink-soft">{page} / {pages}</span>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Página siguiente" className="rounded-full bg-surface p-2 shadow-card disabled:opacity-40">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
