import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select({ label, error, className = '', id, children, ...props }, ref) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className="h-12 w-full appearance-none rounded-xl bg-surface pl-4 pr-10 text-base text-ink ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
      </div>
      {error && <p className="mt-1.5 text-sm text-bad">{error}</p>}
    </div>
  );
});
