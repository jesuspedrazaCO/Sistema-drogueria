const TONES = {
  neutral: 'bg-black/5 text-ink-soft',
  brand: 'bg-brand-50 text-brand-700',
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
