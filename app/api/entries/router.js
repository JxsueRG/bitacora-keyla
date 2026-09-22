import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureTable } from '../../../lib/db';

export async function GET() {
  try {
    await ensureTable();
    const { rows } = await sql`
      SELECT id, fecha, inicio, fin, horas, horas_manual AS "horasManual", actividad, observaciones
      FROM entradas
      ORDER BY fecha ASC, inicio ASC NULLS LAST, id ASC;
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudo leer la base de datos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTable();
    const body = await request.json();
    const { fecha, inicio, fin, horas, horasManual, actividad, observaciones } = body;

    if (!fecha || !actividad || horas === undefined || horas === null || isNaN(horas)) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO entradas (fecha, inicio, fin, horas, horas_manual, actividad, observaciones)
      VALUES (${fecha}, ${inicio || null}, ${fin || null}, ${horas}, ${!!horasManual}, ${actividad}, ${observaciones || null})
      RETURNING id, fecha, inicio, fin, horas, horas_manual AS "horasManual", actividad, observaciones;
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudo guardar el registro.' }, { status: 500 });
  }
}
