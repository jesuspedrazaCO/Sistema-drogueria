import { APP_UTC_OFFSET } from '../config/constants.js';

const OFFSET_MS = Number(APP_UTC_OFFSET.slice(0, 3)) * 60 * 60 * 1000; // -5 h (Colombia)

// "Hoy" y "este mes" se calculan en hora de Colombia, no en la del servidor (Render usa UTC).
const localDateString = (date) => new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
const startOf = (ymd) => new Date(`${ymd}T00:00:00.000${APP_UTC_OFFSET}`);
const endOf = (ymd) => new Date(`${ymd}T23:59:59.999${APP_UTC_OFFSET}`);

export function todayRange(now = new Date()) {
  const day = localDateString(now);
  return { from: startOf(day), to: endOf(day) };
}

export function monthRange(now = new Date()) {
  const day = localDateString(now);
  const [year, month] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = day.slice(0, 7);
  return { from: startOf(`${prefix}-01`), to: endOf(`${prefix}-${String(lastDay).padStart(2, '0')}`) };
}

export function lastDaysRange(days, now = new Date()) {
  const to = todayRange(now).to;
  const start = new Date(todayRange(now).from.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from: start, to };
}
