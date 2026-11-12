import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = forwardRef(function SearchInput({ value, onChange, onClear, className = '', label = 'Buscar', ...props }, ref) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-mute" aria-hidden />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-full bg-surface pl-11 pr-10 text-base text-ink ring-1 ring-inset ring-black/10 placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 focus:ring-brand-500 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button type="button" onClick={onClear} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/10 p-1 text-ink-soft hover:bg-black/15">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
