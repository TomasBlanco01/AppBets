const { all, get, run } = require('../db/helpers');

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

const normalizeClientId = (clientId) => {
  const value = typeof clientId === 'string' ? clientId.trim() : '';
  return value ? value.slice(0, 100) : null;
};

const serializeIOMovement = (movement) => ({
  ...movement,
  category: movement.category || DEFAULT_CATEGORY[movement.type] || 'Otros',
});

// Busca por clientId y, si existe, actualiza los valores. Esto hace que un
// reintento del POST siempre converja al último estado de la cola local,
// incluso si el usuario editó el movimiento mientras el request estaba en vuelo.
const upsertByClientId = async (clientId, movement) => {
  const existing = await get('SELECT * FROM io_movements WHERE clientId = ?', [clientId]);
  if (!existing) return null;

  await run(
    'UPDATE io_movements SET type = ?, amount = ?, date = ?, note = ?, category = ? WHERE clientId = ?',
    [movement.type, movement.amount, movement.date, movement.note, movement.category, clientId]
  );

  return { ...existing, ...movement };
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
    res.json(movements.map(serializeIOMovement));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener movimientos I/O' });
  }
};

const createIOMovement = async (req, res) => {
  let normalizedClientId = null;
  let movement = null;

  try {
    const { type, amount, date, note, category, clientId } = req.body;

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

    movement = {
      type,
      amount: parsedAmount,
      date,
      note: note || '',
      category: normalizeCategory(category, type),
    };
    normalizedClientId = normalizeClientId(clientId);

    // Si el frontend reintenta un movimiento que ya se guardó (por ejemplo,
    // porque se perdió la respuesta), actualizamos ese registro en vez de
    // crear un duplicado. Así un reintento con datos editados no pierde cambios.
    if (normalizedClientId) {
      const updated = await upsertByClientId(normalizedClientId, movement);
      if (updated) {
        return res.json(serializeIOMovement(updated));
      }
    }

    const result = await run(
      'INSERT INTO io_movements (type, amount, date, note, category, clientId) VALUES (?, ?, ?, ?, ?, ?)',
      [movement.type, movement.amount, movement.date, movement.note, movement.category, normalizedClientId]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      ...movement,
      clientId: normalizedClientId,
    });
  } catch (error) {
    // Carrera entre dos reintentos simultáneos: el índice único gana.
    // Buscamos/actualizamos el registro que acaba de insertar el otro request.
    if (normalizedClientId && movement && /UNIQUE constraint failed/i.test(error.message || '')) {
      try {
        const updated = await upsertByClientId(normalizedClientId, movement);
        if (updated) {
          return res.json(serializeIOMovement(updated));
        }
      } catch (retryError) {
        console.error('Error recuperando movimiento duplicado:', retryError);
      }
    }

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
      clientId: existing.clientId,
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

module.exports = {
  getIOMovements,
  createIOMovement,
  updateIOMovement,
  deleteIOMovement,
};
