import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-700',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-black/10 hover:bg-black/[0.03]',
  ghost: 'text-brand-600 hover:bg-brand-50',
  danger: 'bg-bad text-white hover:opacity-90',
};
const SIZES = {
  md: 'h-11 px-5 text-[15px]',
  sm: 'h-9 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
