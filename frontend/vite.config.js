import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvía a la API local: así el navegador ve un solo origen
// (igual que en producción con el rewrite de Vercel) y la cookie de sesión funciona sin CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_DEV_API ?? 'http://localhost:5000', changeOrigin: false },
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
});
