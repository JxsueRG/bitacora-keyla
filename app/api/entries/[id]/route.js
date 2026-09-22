import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureTable } from '../../../../lib/db';

export async function PUT(request, { params }) {
  try {
    await ensureTable();
    const { id } = params;
    const body = await request.json();
    const { fecha, inicio, fin, horas, horasManual, actividad, observaciones } = body;

    if (!fecha || !actividad || horas === undefined || horas === null || isNaN(horas)) {
      return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE entradas SET
        fecha = ${fecha},
        inicio = ${inicio || null},
        fin = ${fin || null},
        horas = ${horas},
        horas_manual = ${!!horasManual},
        actividad = ${actividad},
        observaciones = ${observaciones || null}
      WHERE id = ${id}
      RETURNING id, fecha, inicio, fin, horas, horas_manual AS "horasManual", actividad, observaciones;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudo actualizar el registro.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureTable();
    const { id } = params;
    await sql`DELETE FROM entradas WHERE id = ${id};`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudo eliminar el registro.' }, { status: 500 });
  }
}
