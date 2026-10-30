const { all, get, run, batch } = require('../db/helpers');

const VALID_TYPES = ['income', 'expense'];
const DEFAULT_CATEGORY = {
  income: 'Otros ingresos',
  expense: 'Otros gastos',
};
const isValidAmount = (amount) => Number.isFinite(amount) && amount > 0;

const normalizeCategory = (category, type) => {
  const value = typeof category === 'string' ? category.trim() : '';
  const fallback = DEFAULT_CATEGORY[type] || 'Otros';
  return (value || fallback).slice(0, 60);
};

const getIOMovements = async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM io_movements';
    const params = [];

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ message: 'Type debe ser income o expense' });
      }
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY date DESC, id DESC';

    const movements = await all(query, params);
    res.json(movements.map(m => ({
      ...m,
      category: m.category || DEFAULT_CATEGORY[m.type] || 'Otros',
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener movimientos I/O' });
  }
};

const createIOMovement = async (req, res) => {
  try {
    const { type, amount, date, note, category } = req.body;

    if (!type || amount === undefined || !date) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (type, amount, date)' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Type debe ser income o expense' });
    }

    const parsedAmount = parseFloat(amount);
    if (!isValidAmount(parsedAmount)) {
      return res.status(400).json({ message: 'El monto debe ser un número mayor a 0' });
    }

    const normalizedCategory = normalizeCategory(category, type);

    const result = await run(
      'INSERT INTO io_movements (type, amount, date, note, category) VALUES (?, ?, ?, ?, ?)',
      [type, parsedAmount, date, note || '', normalizedCategory]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      type,
      amount: parsedAmount,
      date,
      note: note || '',
      category: normalizedCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear movimiento I/O' });
  }
};

const updateIOMovement = async (req, res) => {
  try {
    const movementId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM io_movements WHERE id = ?', [movementId]);

    if (!existing) {
      return res.status(404).json({ message: 'Movimiento I/O no encontrado' });
    }

    const { type, amount, date, note, category } = req.body;

    const updated = {
      type: existing.type,
      category: existing.category || DEFAULT_CATEGORY[existing.type] || 'Otros',
      amount: existing.amount,
      date: existing.date,
      note: existing.note,
    };

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ message: 'Type debe ser income o expense' });
      }
      updated.type = type;
      if (category === undefined) {
        updated.category = DEFAULT_CATEGORY[type];
      }
    }

    if (category !== undefined) {
      updated.category = normalizeCategory(category, updated.type);
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (!isValidAmount(parsedAmount)) {
        return res.status(400).json({ message: 'El monto debe ser un número mayor a 0' });
      }
      updated.amount = parsedAmount;
    }

    if (date !== undefined) {
      if (!date) {
        return res.status(400).json({ message: 'La fecha no puede estar vacía' });
      }
      updated.date = date;
    }

    if (note !== undefined) {
      updated.note = note;
    }

    await run(
      'UPDATE io_movements SET type = ?, category = ?, amount = ?, date = ?, note = ? WHERE id = ?',
      [updated.type, updated.category, updated.amount, updated.date, updated.note, movementId]
    );

    res.json({ id: movementId, ...updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar movimiento I/O' });
  }
};

const deleteIOMovement = async (req, res) => {
  try {
    const movementId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM io_movements WHERE id = ?', [movementId]);

    if (!existing) {
      return res.status(404).json({ message: 'Movimiento I/O no encontrado' });
    }

    await run('DELETE FROM io_movements WHERE id = ?', [movementId]);

    res.json({ message: 'Movimiento I/O eliminado', movement: existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar movimiento I/O' });
  }
};

const parseBudgetsPayload = (body) => {
  if (!Array.isArray(body?.budgets)) {
    return { error: 'budgets debe ser un array' };
  }

  const seen = new Set();
  const budgets = [];

  for (const item of body.budgets) {
    const category = typeof item?.category === 'string' ? item.category.trim() : '';
    if (!category) {
      return { error: 'Cada presupuesto debe tener una categoría' };
    }

    const normalizedCategory = category.slice(0, 60);
    if (seen.has(normalizedCategory)) {
      return { error: `Categoría duplicada: ${normalizedCategory}` };
    }
    seen.add(normalizedCategory);

    const amount = parseFloat(item.amount);
    if (!isValidAmount(amount)) {
      return { error: `El presupuesto de ${normalizedCategory} debe ser mayor a 0` };
    }

    budgets.push({ category: normalizedCategory, amount });
  }

  return { budgets };
};

const getIOBudgets = async (req, res) => {
  try {
    const budgets = await all('SELECT category, amount FROM io_budgets ORDER BY category COLLATE NOCASE');
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener presupuestos I/O' });
  }
};

// Reemplaza todos los presupuestos de una sola vez: el frontend envía la
// configuración completa y acá se guarda de forma atómica.
const saveIOBudgets = async (req, res) => {
  try {
    const parsed = parseBudgetsPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const statements = ['DELETE FROM io_budgets'];
    parsed.budgets.forEach((budget) => {
      statements.push({
        sql: 'INSERT INTO io_budgets (category, amount) VALUES (?, ?)',
        args: [budget.category, budget.amount],
      });
    });

    await batch(statements, 'write');

    const budgets = await all('SELECT category, amount FROM io_budgets ORDER BY category COLLATE NOCASE');
    res.json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al guardar presupuestos I/O' });
  }
};

module.exports = {
  getIOMovements,
  createIOMovement,
  updateIOMovement,
  deleteIOMovement,
  getIOBudgets,
  saveIOBudgets,
};
