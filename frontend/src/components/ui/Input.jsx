import { forwardRef, useId } from 'react';

// Campo con etiqueta visible, ayuda y error accesibles (aria-describedby / aria-invalid)
export const Input = forwardRef(function Input({ label, hint, error, trailing, className = '', id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-xl bg-surface px-4 text-base text-ink ring-1 ring-inset transition placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 ${
            error ? 'ring-bad/60 focus:ring-bad' : 'ring-black/10 focus:ring-brand-500'
          } ${trailing ? 'pr-12' : ''}`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-ink-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
