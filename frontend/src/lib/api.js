// Cliente HTTP de la API.
// - El access token vive solo en memoria (nunca en localStorage): un XSS no puede robarlo.
// - La sesión se restaura con la cookie httpOnly de refresh.
// - Si una petición recibe 401 se renueva el token UNA vez (aunque varias fallen a la vez) y se reintenta.
const BASE = '/api/v1';

let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors; // [{ field, message }] en errores de validación
  }
}

const readJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

let refreshing = null;

// Renueva la sesión con la cookie de refresh. Llamadas simultáneas comparten una sola petición
// (el backend rota el token en cada uso y detecta reutilizaciones).
export function refreshSession() {
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
    .then(async (res) => {
      const body = await readJson(res);
      if (!res.ok) throw new ApiError(body?.message ?? 'Sesión expirada', res.status);
      setAccessToken(body.data.accessToken);
      return body.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const buildUrl = (path, query) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
};

async function request(method, path, { body, query, signal, auth = true } = {}) {
  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(auth && accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res;
  try {
    res = await send();
    if (res.status === 401 && auth) {
      try {
        await refreshSession();
      } catch {
        setAccessToken(null);
        onSessionExpired();
        throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
      }
      res = await send();
    }
  } catch (err) {
    if (err instanceof ApiError || err.name === 'AbortError') throw err;
    throw new ApiError('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
  }

  const data = await readJson(res);
  if (!res.ok) throw new ApiError(data?.message ?? 'Ocurrió un error inesperado', res.status, data?.errors);
  return data;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body: body ?? {} }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
};

// Mensaje legible para mostrar al usuario a partir de cualquier error
export const errorMessage = (err) => {
  if (err instanceof ApiError) {
    const first = err.errors?.[0]?.message;
    return first && err.status === 422 ? first : err.message;
  }
  return 'Ocurrió un error inesperado';
};
