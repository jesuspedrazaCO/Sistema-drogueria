import { User } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Exige un access token válido y carga al usuario desde la base de datos.
// Así una desactivación, un cambio de rol o un cambio de contraseña aplican de inmediato.
export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Debes iniciar sesión', 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Sesión inválida o expirada', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.changedPasswordAfter(payload.iat)) {
    throw new AppError('Sesión inválida o expirada', 401);
  }

  req.user = user;
  next();
});
