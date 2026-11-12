export function Card({ as: Tag = 'section', className = '', padded = true, children, ...props }) {
  return (
    <Tag className={`rounded-2xl bg-surface shadow-card ${padded ? 'p-5 sm:p-6' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
