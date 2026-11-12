export function Avatar({ name = '', className = 'h-9 w-9 text-sm' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700 ${className}`} aria-hidden>
      {initials || '?'}
    </span>
  );
}
