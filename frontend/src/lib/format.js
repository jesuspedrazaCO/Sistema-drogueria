const TZ = 'America/Bogota';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('es-CO');

export const formatCOP = (value) => cop.format(value ?? 0);
export const formatCompactCOP = (value) => `$${compact.format(value ?? 0)}`;
export const formatNumber = (value) => integer.format(value ?? 0);

const dateFormat = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '—');

// "domingo, 8 de noviembre"
const longDay = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
export const formatLongDay = (date = new Date()) => longDay.format(date);

export function greeting(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }).format(date)) % 24;
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Últimos n días (AAAA-MM-DD, hora de Colombia), del más antiguo al de hoy
export function lastDays(n) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - (n - 1 - i) * 24 * 60 * 60 * 1000)));
}

const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' });
export const weekdayShort = (ymd) => weekday.format(new Date(`${ymd}T12:00:00Z`)).replace('.', '');

const dateTime = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
export const formatDateTime = (value) => (value ? dateTime.format(new Date(value)) : '—');

// "AAAA-MM-DD" (fecha sin hora) -> "9 de nov de 2026", sin que la zona horaria la corra un día
export const formatYMD = (ymd) => formatDate(`${ymd}T12:00:00Z`);
