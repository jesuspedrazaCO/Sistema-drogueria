// Minúsculas, sin tildes y con espacios normalizados: base de las búsquedas.
export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Convierte lo que escribe el usuario en filtros "contiene todas las palabras".
// Devuelve un arreglo de RegExp para usar con $and sobre un campo ya normalizado.
export function searchTokens(search, max = 6) {
  return normalizeText(search)
    .split(' ')
    .filter(Boolean)
    .slice(0, max)
    .map((token) => new RegExp(escapeRegex(token)));
}
