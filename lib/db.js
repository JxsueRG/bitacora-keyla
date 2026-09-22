import { sql } from '@vercel/postgres';

let ready = false;

export async function ensureTable() {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS entradas (
      id SERIAL PRIMARY KEY,
      fecha DATE NOT NULL,
      inicio TIME,
      fin TIME,
      horas NUMERIC(6,2) NOT NULL,
      horas_manual BOOLEAN DEFAULT FALSE,
      actividad TEXT NOT NULL,
      observaciones TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  ready = true;
}
