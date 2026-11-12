import { lastDays } from './format.js';

const ymdOf = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const today = () => lastDays(1)[0];

// Rangos rápidos (fechas de Colombia, AAAA-MM-DD). El servidor acepta máximo 366 días.
export const RANGES = [
  { id: '7d', label: '7 días', get: () => ({ from: lastDays(7)[0], to: today() }) },
  { id: '30d', label: '30 días', get: () => ({ from: lastDays(30)[0], to: today() }) },
  { id: 'month', label: 'Este mes', get: () => ({ from: `${today().slice(0, 8)}01`, to: today() }) },
  {
    id: 'lastMonth',
    label: 'Mes pasado',
    get: () => {
      const [year, month] = today().split('-').map(Number);
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      return { from: ymdOf(prevYear, prevMonth, 1), to: ymdOf(prevYear, prevMonth, lastDay) };
    },
  },
  { id: 'year', label: 'Este año', get: () => ({ from: `${today().slice(0, 4)}-01-01`, to: today() }) },
];

export const rangeById = (id) => RANGES.find((range) => range.id === id) ?? RANGES[2];

// Todos los días entre dos fechas (inclusive)
export function eachDay(from, to) {
  const days = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d = new Date(d.getTime() + 864e5)) days.push(d.toISOString().slice(0, 10));
  return days;
}
export const daysBetween = (from, to) => eachDay(from, to).length;
