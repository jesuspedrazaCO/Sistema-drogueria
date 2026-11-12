import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env.js';
import { AppError } from './utils/AppError.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Render / Vercel van detrás de proxies: necesario para el rate limit y la auditoría por IP.
// Ajustar TRUST_PROXY_HOPS según la cadena real (ver README).
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.disable('x-powered-by');

// Seguridad
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Permite herramientas sin origen (Postman, health checks) y la lista blanca
      if (!origin || env.CLIENT_URLS.includes(origin)) return callback(null, true);
      return callback(new AppError('Origen no permitido por CORS', 403));
    },
    credentials: true,
  })
);
app.use('/api', apiLimiter);

// Parsers (con límite de tamaño). Las compras y cargas de inventario traen muchas líneas,
// por eso esas rutas aceptan un cuerpo mayor; el resto de la API se queda en 10kb.
app.use(['/api/v1/purchases', '/api/v1/inventory', '/api/v1/sales'], express.json({ limit: '100kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// Sanitización contra inyección NoSQL y contaminación de parámetros
app.use(mongoSanitize());
app.use(hpp());

app.use(compression());
if (!env.isProd) app.use(morgan('dev'));

// Rutas
app.use('/api/v1', routes);

// Errores
app.use(notFound);
app.use(errorHandler);

export default app;
