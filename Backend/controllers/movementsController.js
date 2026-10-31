const { all, get, run } = require('../db/helpers');
const { fillMissingRates } = require('./fxController');

// Al cambiar la fecha se borra la cotización guardada (en SQLite el SET ve la
// fila anterior) y se vuelve a completar al listar con la del nuevo día.
const RESET_FX_IF_DATE_CHANGES = 'fxRate = CASE WHEN date = ? THEN fxRate END, fxCasa = CASE WHEN date = ? THEN fxCasa END';

const isValidAmount = (amount) => Number.isFinite(amount) && amount > 0;

const normalizeClientId = (clientId) => {
  const value = typeof clientId === 'string' ? clientId.trim() : '';
  return value ? value.slice(0, 100) : null;
};

// Igual que en I/O: un reintento del frontend con el mismo clientId actualiza
// el registro existente en vez de duplicarlo. Devuelve null si no existe.
const upsertByClientId = async (clientId, movement) => {
  const existing = await get('SELECT * FROM movements WHERE clientId = ?', [clientId]);
  if (!existing) return null;

  await run(
    `UPDATE movements SET ${RESET_FX_IF_DATE_CHANGES}, pageId = ?, type = ?, amount = ?, date = ?, note = ? WHERE clientId = ?`,
    [movement.date, movement.date, movement.pageId, movement.type, movement.amount, movement.date, movement.note, clientId]
  );

  return { ...existing, ...movement };
};

const getMovements = async (req, res) => {
  try {
    await fillMissingRates('movements');

    const { pageId } = req.query;

    let query = `
      SELECT movements.*, pages.name AS pageName
      FROM movements
      LEFT JOIN pages ON pages.id = movements.pageId
    `;
    const params = [];

    if (pageId) {
      query += ' WHERE movements.pageId = ?';
      params.push(parseInt(pageId));
    }

    query += ' ORDER BY movements.date DESC, movements.id DESC';

    const movements = await all(query, params);
    res.json(movements.map(m => ({ ...m, pageName: m.pageName || 'Eliminada' })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
};

const createMovement = async (req, res) => {
  let normalizedClientId = null;
  let movement = null;

  try {
    const { pageId, type, amount, date, note, clientId } = req.body;

    if (!pageId || !type || !amount || !date) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (pageId, type, amount, date)' });
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ message: 'Type debe ser deposit o withdrawal' });
    }

    const parsedAmount = parseFloat(amount);
    if (!isValidAmount(parsedAmount)) {
      return res.status(400).json({ message: 'El monto debe ser un número mayor a 0' });
    }

    const parsedPageId = parseInt(pageId);
    const pageExists = await get('SELECT id FROM pages WHERE id = ?', [parsedPageId]);
    if (!pageExists) {
      return res.status(400).json({ message: 'La página no existe' });
    }

    movement = { pageId: parsedPageId, type, amount: parsedAmount, date, note: note || '' };
    normalizedClientId = normalizeClientId(clientId);

    if (normalizedClientId) {
      const updated = await upsertByClientId(normalizedClientId, movement);
      if (updated) {
        return res.json(updated);
      }
    }

    const result = await run(
      'INSERT INTO movements (pageId, type, amount, date, note, clientId) VALUES (?, ?, ?, ?, ?, ?)',
      [movement.pageId, movement.type, movement.amount, movement.date, movement.note, normalizedClientId]
    );

    res.status(201).json({ id: result.lastInsertRowid, ...movement, clientId: normalizedClientId });
  } catch (error) {
    // Carrera entre dos reintentos simultáneos: el índice único gana.
    if (normalizedClientId && movement && /UNIQUE constraint failed/i.test(error.message || '')) {
      try {
        const updated = await upsertByClientId(normalizedClientId, movement);
        if (updated) {
          return res.json(updated);
        }
      } catch (retryError) {
        console.error('Error recuperando movimiento duplicado:', retryError);
      }
    }

    console.error(error);
    res.status(500).json({ message: 'Error al crear movimiento' });
  }
};

const updateMovement = async (req, res) => {
  try {
    const movementId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM movements WHERE id = ?', [movementId]);

    if (!existing) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    const { pageId, type, amount, date, note } = req.body;

    const updated = {
      pageId: existing.pageId,
      type: existing.type,
      amount: existing.amount,
      date: existing.date,
      note: existing.note,
    };

    if (pageId !== undefined) {
      const parsedPageId = parseInt(pageId);
      const pageExists = await get('SELECT id FROM pages WHERE id = ?', [parsedPageId]);
      if (!pageExists) {
        return res.status(400).json({ message: 'La página no existe' });
      }
      updated.pageId = parsedPageId;
    }

    if (type !== undefined) {
      if (!['deposit', 'withdrawal'].includes(type)) {
        return res.status(400).json({ message: 'Type debe ser deposit o withdrawal' });
      }
      updated.type = type;
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
      `UPDATE movements SET ${RESET_FX_IF_DATE_CHANGES}, pageId = ?, type = ?, amount = ?, date = ?, note = ? WHERE id = ?`,
      [updated.date, updated.date, updated.pageId, updated.type, updated.amount, updated.date, updated.note, movementId]
    );

    res.json({ id: movementId, ...updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar movimiento' });
  }
};

const deleteMovement = async (req, res) => {
  try {
    const movementId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM movements WHERE id = ?', [movementId]);

    if (!existing) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    await run('DELETE FROM movements WHERE id = ?', [movementId]);

    res.json({ message: 'Movimiento eliminado', movement: existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar movimiento' });
  }
};

module.exports = { getMovements, createMovement, updateMovement, deleteMovement };
