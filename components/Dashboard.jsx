'use client';

import { useEffect, useMemo, useState } from 'react';

const NOMBRE = 'Keyla';
const META_KEY = 'medibelle_meta_horas';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function toHoursDecimal(inicio, fin) {
  if (!inicio || !fin) return null;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function fmtHoras(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '') + ' h';
}

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function csvEscape(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const emptyForm = { fecha: '', inicio: '', fin: '', horas: '', actividad: '', obs: '' };

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [meta, setMeta] = useState(500);

  useEffect(() => {
    const saved = localStorage.getItem(META_KEY);
    if (saved) setMeta(Number(saved));
    setForm((f) => ({ ...f, fecha: new Date().toISOString().slice(0, 10) }));
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/entries');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.map((e) => ({ ...e, horas: Number(e.horas) })));
    } catch {
      setError('No se pudieron cargar los registros. Revisa que la base de datos esté conectada en Vercel.');
    } finally {
      setLoading(false);
    }
  }

  function updateMeta(v) {
    setMeta(v);
    localStorage.setItem(META_KEY, String(v));
  }

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.inicio || '').localeCompare(b.inicio || ''));
  }, [entries, desde, hasta]);

  const total = useMemo(() => entries.reduce((s, e) => s + e.horas, 0), [entries]);
  const monthTotal = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return entries.filter((e) => e.fecha.startsWith(ym)).reduce((s, e) => s + e.horas, 0);
  }, [entries]);
  const remaining = Math.max(meta - total, 0);
  const pct = meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : 0;

  function startEdit(e) {
    setEditingId(e.id);
    setForm({
      fecha: e.fecha.slice(0, 10),
      inicio: e.inicio || '',
      fin: e.fin || '',
      horas: e.horasManual ? String(e.horas) : '',
      actividad: e.actividad,
      obs: e.observaciones || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, fecha: new Date().toISOString().slice(0, 10) });
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    let horas, horasManual = false;
    if (form.horas !== '') {
      horas = parseFloat(form.horas);
      horasManual = true;
    } else {
      horas = toHoursDecimal(form.inicio, form.fin);
    }
    if (horas === null || isNaN(horas)) {
      setError('Indica hora de entrada y salida, o captura las horas manualmente.');
      return;
    }
    if (!form.actividad.trim()) {
      setError('Describe la actividad realizada.');
      return;
    }

    const payload = {
      fecha: form.fecha,
      inicio: form.inicio || null,
      fin: form.fin || null,
      horas,
      horasManual,
      actividad: form.actividad.trim(),
      observaciones: form.obs.trim(),
    };

    setSaving(true);
    try {
      const url = editingId ? `/api/entries/${editingId}` : '/api/entries';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      resetForm();
      await loadEntries();
    } catch {
      setError('No se pudo guardar el registro. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadEntries();
    } catch {
      setError('No se pudo eliminar el registro.');
    }
  }

  function exportCsv() {
    if (filtered.length === 0) {
      alert('No hay registros en el rango seleccionado.');
      return;
    }
    const header = ['Fecha', 'Entrada', 'Salida', 'Horas', 'Actividad', 'Observaciones'];
    const lines = [header.join(',')];
    filtered.forEach((e) => {
      lines.push([e.fecha, e.inicio || '', e.fin || '', e.horas, csvEscape(e.actividad), csvEscape(e.observaciones || '')].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora_keyla_${desde || 'inicio'}_${hasta || 'hoy'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  const now = new Date();

  return (
    <>
      <div className="hero">
        <div className="hero-inner">
          <p className="kicker">Medibelle · Servicio social</p>
          <h1>Hola {NOMBRE}, bienvenida</h1>
          <p className="sub">Aquí va quedando el registro de cada día — cuando te pidan el reporte trimestral, lo generas en un clic.</p>
        </div>
      </div>

      <main>
        {error && <div className="banner error no-print">{error}</div>}
        {loading && <div className="banner info no-print">Cargando tus registros…</div>}

        <section>
          <div className="stats">
            <div className="stat">
              <div className="label">Horas acumuladas</div>
              <div className="value">{fmtHoras(total)}</div>
              <div className="sub">{entries.length} {entries.length === 1 ? 'registro' : 'registros'}</div>
            </div>
            <div className="stat gold">
              <div className="label">Este mes</div>
              <div className="value">{fmtHoras(monthTotal)}</div>
              <div className="sub">{MESES[now.getMonth()]}</div>
            </div>
            <div className="stat">
              <div className="label">Faltan para la meta</div>
              <div className="value">{meta > 0 ? fmtHoras(remaining) : '—'}</div>
              <div className="sub">según la meta de abajo</div>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-head">
              <span>
                Meta total de horas:{' '}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={meta}
                  onChange={(e) => updateMeta(Number(e.target.value) || 0)}
                />
              </span>
              <span>{pct}%</span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Registrar actividad</h2>
          <div className="panel">
            <form id="entry-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="f-fecha">Fecha</label>
                <input id="f-fecha" type="date" required value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="f-inicio">Hora de entrada</label>
                <input id="f-inicio" type="time" value={form.inicio}
                  onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="f-fin">Hora de salida</label>
                <input id="f-fin" type="time" value={form.fin}
                  onChange={(e) => setForm({ ...form, fin: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="f-horas">Horas (manual, opcional)</label>
                <input id="f-horas" type="number" min="0" step="0.25" placeholder="auto" value={form.horas}
                  onChange={(e) => setForm({ ...form, horas: e.target.value })} />
              </div>
              <div className="field full">
                <label htmlFor="f-actividad">Actividad realizada</label>
                <input id="f-actividad" type="text" required
                  placeholder="Ej. Atención a pacientes en recepción, captura de expedientes..."
                  value={form.actividad}
                  onChange={(e) => setForm({ ...form, actividad: e.target.value })} />
              </div>
              <div className="field full">
                <label htmlFor="f-obs">Observaciones (opcional)</label>
                <textarea id="f-obs" placeholder="Notas, incidencias, quién superviso..."
                  value={form.obs}
                  onChange={(e) => setForm({ ...form, obs: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Guardando…' : editingId ? 'Actualizar registro' : 'Guardar registro'}
                </button>
                {editingId && (
                  <button type="button" className="ghost" onClick={resetForm}>Cancelar edición</button>
                )}
              </div>
            </form>
          </div>
        </section>

        <section>
          <div className="toolbar">
            <h2 className="section-title" style={{ border: 'none', margin: 0, padding: 0 }}>Historial de registros</h2>
            <div className="filter-row">
              <div className="field">
                <label htmlFor="filter-desde">Desde</label>
                <input id="filter-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="filter-hasta">Hasta</label>
                <input id="filter-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
              <button type="button" className="ghost" onClick={() => { setDesde(''); setHasta(''); }}>Quitar filtro</button>
            </div>
          </div>

          <div className="panel">
            <div className="export-row no-print" style={{ marginBottom: '1rem' }}>
              <button type="button" className="ghost" onClick={printReport}>Generar reporte / imprimir PDF</button>
              <button type="button" className="ghost" onClick={exportCsv}>Exportar CSV</button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Entrada</th><th>Salida</th>
                    <th style={{ textAlign: 'right' }}>Horas</th>
                    <th>Actividad</th><th>Observaciones</th>
                    <th className="no-print">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr className="empty-row"><td colSpan={7}>
                      {loading ? 'Cargando…' : 'Sin registros todavía. Agrega tu primer día de servicio arriba.'}
                    </td></tr>
                  ) : (
                    filtered.slice().reverse().map((e) => (
                      <tr key={e.id}>
                        <td>{fmtFecha(e.fecha)}</td>
                        <td>{e.inicio ? e.inicio.slice(0, 5) : '—'}</td>
                        <td>{e.fin ? e.fin.slice(0, 5) : '—'}</td>
                        <td className="num">{fmtHoras(e.horas)}</td>
                        <td className="actividad">{e.actividad}</td>
                        <td className="obs">{e.observaciones || ''}</td>
                        <td className="actions no-print">
                          <button type="button" className="link-btn" onClick={() => startEdit(e)}>Editar</button>{' '}
                          <button type="button" className="danger-link" onClick={() => handleDelete(e.id)}>Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div id="print-report">
          <h1>Bitácora de servicio social — Medibelle</h1>
          <div className="meta">
            Registrado por: {NOMBRE} · Periodo: {desde ? fmtFecha(desde) : 'inicio'} — {hasta ? fmtFecha(hasta) : 'hoy'} · Generado el {fmtFecha(now.toISOString().slice(0, 10))}
          </div>
          <table>
            <thead>
              <tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th style={{ textAlign: 'right' }}>Horas</th><th>Actividad</th><th>Observaciones</th></tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{fmtFecha(e.fecha)}</td>
                  <td>{e.inicio ? e.inicio.slice(0, 5) : '—'}</td>
                  <td>{e.fin ? e.fin.slice(0, 5) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{fmtHoras(e.horas)}</td>
                  <td>{e.actividad}</td>
                  <td>{e.observaciones || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtHoras(filtered.reduce((s, e) => s + e.horas, 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

      <footer className="appnote no-print">
        Datos guardados en la base de datos del proyecto en Vercel — visibles desde cualquier dispositivo donde abras este sitio.
      </footer>
    </>
  );
}
