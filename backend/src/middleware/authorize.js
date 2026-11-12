import { AppError } from '../utils/AppError.js';

// Uso: router.post('/', protect, authorize(...PERMISSIONS.sell), controlador)
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError('Debes iniciar sesión', 401));
    if (!roles.flat().includes(req.user.role)) {
      return next(new AppError('No tienes permiso para realizar esta acción', 403));
    }
    return next();
  };
