# Ges.Eco

Gestión financiera personal: depósitos y retiros por casa de apuestas (Bets) e
ingresos y gastos (I/O). Es una PWA instalable que funciona sin conexión para I/O.

- **Frontend:** React + Vite + MUI, en `Frontend/`
- **API:** Express, en `Backend/`
- **Base de datos:** [Turso](https://turso.tech) (libSQL)
- **Hosting:** Vercel. El frontend se sirve desde el CDN y la API corre como función serverless (`api/index.js`).

## Desarrollo local

1. Copiá `Backend/.env.example` como `Backend/.env` y completá las variables.
2. Instalá dependencias:

   ```bash
   npm install --prefix Backend
   npm install --prefix Frontend
   ```

3. En una terminal, levantá la API (puerto 3000):

   ```bash
   npm start --prefix Backend
   ```

4. En otra, el frontend (Vite reenvía `/api` a la API):

   ```bash
   npm run dev --prefix Frontend
   ```

Las tablas se crean y migran solas la primera vez que la API recibe una petición.

## Deploy

Cada push a `main` se despliega automáticamente en Vercel. La configuración
está en `vercel.json`:

- **Build:** `npm run build --prefix Frontend`, que publica `Frontend/dist`.
- **Rutas:** `/api/*` y `/health` van a la función, y el resto a la SPA.
- **Caché:** `sw.js`, `index.html` y el manifest sin caché, para que la PWA
  detecte cada deploy y se actualice sola; `/assets/*` (con hash) inmutables.

Variables de entorno en Vercel (Settings → Environment Variables):
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD` y `JWT_SECRET`.

## Backup

El botón de descarga del encabezado baja un `.json` con todas las tablas
(`GET /api/export`).
