import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: 15 * 60 * 1000,
};

// Límite general para toda la API
export const apiLimiter = rateLimit({
  ...base,
  limit: 300,
  message: { status: 'error', message: 'Demasiadas solicitudes. Intenta más tarde.' },
});

// Límite estricto para login, recuperación y reseteo de contraseña
export const authLimiter = rateLimit({
  ...base,
  limit: 10,
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  },
});
