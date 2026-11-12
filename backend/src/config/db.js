import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

// Todas las respuestas JSON llevan "id" (además de _id) y sin __v: el frontend siempre usa "id".
// Los esquemas con su propia configuración de toJSON (User, Product) deben incluir virtuals: true.
mongoose.set('toJSON', { virtuals: true, versionKey: false });

export async function connectDB() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB conectado: ${mongoose.connection.host}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
