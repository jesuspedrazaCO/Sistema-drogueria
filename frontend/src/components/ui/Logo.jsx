// Marca provisional: cruz sobre fondo de color. Se cambia por el logo del cliente cuando lo tengan.
export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[10px] bg-brand-600 text-white shadow-sm ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="currentColor">
        <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" />
      </svg>
    </span>
  );
}
