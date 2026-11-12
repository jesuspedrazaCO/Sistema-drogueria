import mongoose from 'mongoose';

// Ejecuta fn(session) dentro de una transacción de MongoDB: si algo falla, todo se revierte
// (stock, lotes y kardex quedan como estaban). Mongoose reintenta solo los errores transitorios,
// así que fn no debe tener efectos fuera de la base de datos (correos, etc.).
// Requiere replica set; MongoDB Atlas (incluido M0) ya lo es.
export const withTransaction = (fn) => mongoose.connection.transaction(fn);
