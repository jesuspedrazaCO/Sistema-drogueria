// Título grande al estilo Apple: mucho aire, subtítulo discreto y acciones a la derecha
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-[1.1] text-ink sm:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-mute first-letter:uppercase">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
