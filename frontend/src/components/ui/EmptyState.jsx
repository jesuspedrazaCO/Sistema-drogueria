export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden />
        </span>
      )}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-ink-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
