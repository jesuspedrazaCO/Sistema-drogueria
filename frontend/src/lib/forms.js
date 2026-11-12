import { ApiError } from './api.js';

// Errores de validación del servidor ([{field, message}]) -> { campo: mensaje }
export function fieldErrors(err) {
  if (!(err instanceof ApiError) || !Array.isArray(err.errors)) return {};
  return Object.fromEntries(err.errors.map((item) => [String(item.field).split('.').pop(), item.message]));
}

// "12.500" / "12500" / "12,5" -> número (vacío -> undefined)
export function toNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}
