import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) =>
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));

// Convierte errores conocidos en AppError; devuelve null si es desconocido
const normalize = (err) => {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError(
      'Datos inválidos',
      422,
      err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError(
      'Datos inválidos',
      422,
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Valor inválido para "${err.path}"`, 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'campo';
    return new AppError(`Ya existe un registro con ese valor de "${field}"`, 409);
  }

  if (err.name === 'JsonWebTokenError') return new AppError('Token inválido', 401);
  if (err.name === 'TokenExpiredError') return new AppError('Token expirado', 401);
  if (err.type === 'entity.parse.failed') return new AppError('JSON malformado', 400);
  if (err.type === 'entity.too.large') return new AppError('Solicitud demasiado grande', 413);

  return null;
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const known = normalize(err);

  if (!known) console.error(err);

  const error = known ?? new AppError('Error interno del servidor', 500);

  res.status(error.statusCode).json({
    status: 'error',
    message: error.message,
    ...(error.details && { errors: error.details }),
    ...(!env.isProd && !known && { stack: err.stack }),
  });
};
