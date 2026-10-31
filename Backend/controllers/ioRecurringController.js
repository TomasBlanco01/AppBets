const { all, get, run } = require('../db/helpers');

// Ingresos y gastos fijos (alquiler, sueldo, suscripciones...). Cada plantilla
// genera un movimiento I/O por mes en el día indicado. La generación ocurre al
// pedir la lista de I/O (ver getIOMovements), no hace falta un cron.
//
// `lastGeneratedMonth` recuerda hasta dónde se generó: si el usuario borra un
// movimiento generado, no vuelve a aparecer. El clientId `rec-<id>-<mes>` y el
// índice único de io_movements evitan duplicados si dos peticiones generan a la vez.

const VALID_TYPES = ['income', 'expense'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Hoy en Argentina como 'YYYY-MM-DD' (el servidor corre en UTC).
const todayAR = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(now);

const nextMonth = (month) => {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

// El día 31 en un mes de 30 días (o febrero) cae el último día del mes.
const occurrenceDate = (month, dayOfMonth) => {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`;
};

// Fechas pendientes de generar para una plantilla, hasta hoy inclusive.
const dueOccurrences = (template, today) => {
  const currentMonth = today.slice(0, 7);
  const afterLast = template.lastGeneratedMonth ? nextMonth(template.lastGeneratedMonth) : template.startMonth;
  // Si se movió el inicio hacia adelante, no se generan meses anteriores a él.
  let month = afterLast > template.startMonth ? afterLast : template.startMonth;
  const due = [];

  while (month <= currentMonth) {
    const date = occurrenceDate(month, template.dayOfMonth);
    if (date > today) break;
    due.push({ month, date });
    month = nextMonth(month);
  }
  return due;
};

const generateRecurring = async (now = new Date()) => {
  const today = todayAR(now);
  const templates = await all('SELECT * FROM io_recurring');

  for (const template of templates) {
    const due = dueOccurrences(template, today);
    if (due.length === 0) continue;

    for (const { month, date } of due) {
      await run(
        `INSERT OR IGNORE INTO io_movements (type, amount, date, note, category, clientId)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [template.type, template.amount, date, template.note, template.category, `rec-${template.id}-${month}`]
      );
    }
    await run('UPDATE io_recurring SET lastGeneratedMonth = ? WHERE id = ?', [due[due.length - 1].month, template.id]);
  }
};

const parseTemplate = (body, existing = {}) => {
  const merged = { ...existing, ...body };
  const type = merged.type;
  if (!VALID_TYPES.includes(type)) return { error: 'Type debe ser income o expense' };

  const category = typeof merged.category === 'string' ? merged.category.trim().slice(0, 60) : '';
  if (!category) return { error: 'La categoría es obligatoria' };

  const amount = parseFloat(merged.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'El monto debe ser un número mayor a 0' };

  const dayOfMonth = parseInt(merged.dayOfMonth, 10);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return { error: 'El día del mes debe estar entre 1 y 31' };
  }

  const startMonth = merged.startMonth;
  if (!MONTH_RE.test(startMonth || '')) return { error: 'El mes de inicio debe tener formato AAAA-MM' };

  return {
    template: {
      type,
      category,
      amount,
      dayOfMonth,
      startMonth,
      note: typeof merged.note === 'string' ? merged.note.slice(0, 200) : '',
    },
  };
};

const getRecurring = async (req, res) => {
  try {
    res.json(await all('SELECT * FROM io_recurring ORDER BY type DESC, dayOfMonth, id'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener los movimientos fijos' });
  }
};

const createRecurring = async (req, res) => {
  try {
    const parsed = parseTemplate(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const t = parsed.template;
    const result = await run(
      'INSERT INTO io_recurring (type, category, amount, note, dayOfMonth, startMonth) VALUES (?, ?, ?, ?, ?, ?)',
      [t.type, t.category, t.amount, t.note, t.dayOfMonth, t.startMonth]
    );
    res.status(201).json({ id: result.lastInsertRowid, ...t, lastGeneratedMonth: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear el movimiento fijo' });
  }
};

// Editar cambia los meses que todavía no se generaron; los movimientos ya
// creados quedan como están (se editan desde la lista de I/O).
const updateRecurring = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await get('SELECT * FROM io_recurring WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Movimiento fijo no encontrado' });

    const parsed = parseTemplate(req.body, existing);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const t = parsed.template;
    await run(
      'UPDATE io_recurring SET type = ?, category = ?, amount = ?, note = ?, dayOfMonth = ?, startMonth = ? WHERE id = ?',
      [t.type, t.category, t.amount, t.note, t.dayOfMonth, t.startMonth, id]
    );
    res.json({ ...existing, ...t });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el movimiento fijo' });
  }
};

// Borrar la plantilla deja de generar meses nuevos; no toca los ya creados.
const deleteRecurring = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await get('SELECT * FROM io_recurring WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Movimiento fijo no encontrado' });

    await run('DELETE FROM io_recurring WHERE id = ?', [id]);
    res.json({ message: 'Movimiento fijo eliminado', recurring: existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el movimiento fijo' });
  }
};

module.exports = {
  generateRecurring,
  dueOccurrences,
  occurrenceDate,
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
