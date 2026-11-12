// Valida y limpia params, query y body con esquemas de Zod.
// Lo que llega a los controladores ya está validado, tipado y sin campos extra.
// Los errores de Zod los convierte el errorHandler en respuestas 422.
export const validate = (schemas) => (req, _res, next) => {
  for (const key of ['params', 'query', 'body']) {
    if (schemas[key]) req[key] = schemas[key].parse(req[key] ?? {});
  }
  next();
};
