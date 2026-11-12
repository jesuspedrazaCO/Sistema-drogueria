import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserRound, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useDebounced } from '../../hooks.js';

// Cliente opcional de la venta: se busca por nombre o documento
export function CustomerPicker({ value, onChange }) {
  const [text, setText] = useState('');
  const debounced = useDebounced(text);
  const { data } = useQuery({
    queryKey: ['customers', 'picker', debounced],
    queryFn: () => api.get('/customers', { query: { search: debounced, limit: 5, isActive: true } }),
    enabled: debounced.trim().length >= 2,
  });
  const results = data?.data.items ?? [];

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-2.5">
        <UserRound className="h-4 w-4 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{value.name}</p>
          {value.documentNumber && <p className="text-xs text-ink-mute">{value.documentNumber}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label="Quitar cliente" className="rounded-full p-1 text-ink-mute hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="search"
        aria-label="Cliente (opcional)"
        placeholder="Cliente (opcional): nombre o documento"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-11 w-full rounded-xl bg-surface px-4 text-[15px] ring-1 ring-inset ring-black/10 placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {debounced.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl bg-surface shadow-pop ring-1 ring-black/5">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-mute">Sin resultados</li>
          ) : (
            results.map((customer) => (
              <li key={customer.id}>
                <button type="button" onClick={() => { onChange(customer); setText(''); }} className="block w-full px-4 py-2.5 text-left hover:bg-black/[0.04]">
                  <span className="block text-sm font-medium text-ink">{customer.name}</span>
                  {customer.documentNumber && <span className="block text-xs text-ink-mute">{customer.documentNumber}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
