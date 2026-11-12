import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';

const start = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`API escuchando en el puerto ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada sin manejar:', reason);
    shutdown('unhandledRejection');
  });
};

start().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});