# Sistema de Droguería

Plataforma de gestión para droguería: inventario por lotes (FEFO), ventas, compras,
contabilidad básica, reportes y un módulo pequeño de ferretería.

## Stack
- Backend: Node.js, Express, MongoDB Atlas (Mongoose)
- Frontend: React + Vite, Tailwind, Recharts
- Despliegue: Render (API) + Vercel (web)

## Estructura
- `backend/`  API REST
- `frontend/` aplicación web

## Desarrollo
Ver `backend/.env.example` y ejecutar `npm install && npm run dev` en cada carpeta.

## Datos de demostración (solo desarrollo)

```bash
cd backend
npm run seed -- --reset
```

Borra la base configurada en `MONGODB_URI` y carga usuarios de los 4 roles, 31 productos, compras con
lotes, ~110 ventas de los últimos 30 días, gastos y alertas de ejemplo. Los usuarios son
`admin@`, `regente@`, `vendedor@` y `contador@drogueria.demo` con la contraseña `Demo12345x`.
El seed se niega a correr con `NODE_ENV=production` o si el nombre de la base contiene "prod".

## Despliegue del backend en Render

1. **Bases separadas.** En Atlas usa una base para desarrollo (`.../drogueria_dev?...`) y otra para
   producción (`.../drogueria_prod?...`), cada una con su propio usuario de base de datos con permiso
   solo sobre esa base (rol `readWrite`). Cambia solo el nombre que va después del `/` en la URI.
2. **Atlas > Network Access:** Render no tiene IP fija, así que agrega `0.0.0.0/0` (la seguridad queda
   en el usuario y la contraseña de la URI). Si el cliente pasa a un plan de pago, se puede restringir.
3. Sube el repositorio a GitHub (incluye `backend/package-lock.json`, no incluyas `.env`).
4. En Render: **New > Blueprint**, elige el repositorio (usa `render.yaml`). Pide estas variables:
   - `MONGODB_URI`: la URI de **producción**.
   - `CLIENT_URL`: la URL del frontend en Vercel (sin `/` final). Varias URLs, separadas por coma.
   - `RESEND_API_KEY` y `EMAIL_FROM`: para invitaciones y recuperación de contraseña. Con el remitente
     de prueba (`onboarding@resend.dev`) Resend solo entrega a tu propio correo; para correos a los
     empleados hay que verificar un dominio.
   - Los secretos JWT los genera Render solos.
5. Cuando termine, abre `https://TU-SERVICIO.onrender.com/api/v1/health`: debe responder `status: ok`.
6. **Primer administrador (producción).** El plan gratuito de Render no da terminal, así que se crea
   desde tu computador apuntando a la base de producción:
   ```bash
   cd backend
   MONGODB_URI="URI_DE_PRODUCCION" JWT_ACCESS_SECRET=x JWT_REFRESH_SECRET=x CLIENT_URL=x npm run create-admin
   ```
   (los tres valores `x` solo sirven para pasar la validación de variables; el script pide nombre,
   correo y contraseña sin mostrarla).
7. **IP real de los clientes.** Con el rewrite de Vercel hay dos proxies, por eso `TRUST_PROXY_HOPS=2`.
   Para verificarlo: inicia sesión desde tu casa y revisa en Atlas el último documento de `auditlogs`;
   el campo `ip` debe ser tu IP pública. Si aparece una IP de Vercel o de Render, cambia el valor
   (1 o 3) en Render y repite la prueba. Si no, el límite de intentos de login se compartiría entre
   todos los usuarios.

### Limitaciones del plan gratuito

- **Render** duerme el servicio tras 15 minutos sin tráfico: la primera petición tarda ~30–60 s.
  Un monitor gratuito (UptimeRobot) pegándole a `/api/v1/health` cada 5 minutos lo mantiene despierto.
- **Atlas M0** no incluye copias de seguridad y se pausa tras 60 días sin actividad. Mientras tanto,
  haz una copia manual antes de cambios grandes y cada semana:
  `mongodump --uri="URI_DE_PRODUCCION" --out=./copia-AAAA-MM-DD` (herramienta gratuita de MongoDB
  Database Tools). Para un cliente real conviene el plan M10 con respaldos automáticos.
