# Bitácora de servicio social — Keyla · Medibelle

App con base de datos real (Postgres), pensada para desplegarse en Vercel.

## 1. Sube el proyecto a GitHub
Crea un repositorio nuevo y sube esta carpeta completa (o usa el botón "Import" de Vercel con un ZIP si prefieres no usar Git).

## 2. Importa el proyecto en Vercel
En https://vercel.com/new, importa el repositorio. Déjalo con la configuración por defecto (Next.js se detecta solo) y dale **Deploy**. El primer deploy puede fallar o mostrar error de base de datos — es normal, todavía no existe.

## 3. Conecta una base de datos Postgres
Dentro del proyecto en Vercel:
1. Ve a la pestaña **Storage**.
2. Click en **Create Database** → elige **Postgres** (Neon).
3. Cuando pregunte a qué proyecto conectarla, selecciona este proyecto. Esto agrega automáticamente las variables de entorno (`POSTGRES_URL`, etc.) — no necesitas copiarlas a mano.
4. Ve a **Deployments** y vuelve a desplegar (Redeploy) el último deployment para que tome las nuevas variables.

La tabla `entradas` se crea sola la primera vez que la app hace una consulta — no hay que correr ningún script.

## 4. Listo
Abre la URL que te da Vercel. Ya pueden entrar desde el celular o la compu y verán los mismos registros, porque viven en la base de datos, no en el navegador.

## Desarrollo local (opcional)
```bash
npm install
vercel env pull .env.local   # trae las variables de la base de datos
npm run dev
```

## Personalizar
- El nombre "Keyla" en el saludo está en `components/Dashboard.jsx`, constante `NOMBRE` al inicio del archivo.
- Colores y tipografías están en `app/globals.css`.
