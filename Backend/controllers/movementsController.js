const { all, get, run } = require('../db/helpers');

const isValidAmount = (amount) => Number.isFinite(amount) && amount > 0;

const getMovements = async (req, res) => {
  try {
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
  try {
    const { pageId, type, amount, date, note } = req.body;

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

    const result = await run(
      'INSERT INTO movements (pageId, type, amount, date, note) VALUES (?, ?, ?, ?, ?)',
      [parsedPageId, type, parsedAmount, date, note || '']
    );

    const newMovement = { id: result.lastInsertRowid, pageId: parsedPageId, type, amount: parsedAmount, date, note: note || '' };
    res.status(201).json(newMovement);
  } catch (error) {
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
      'UPDATE movements SET pageId = ?, type = ?, amount = ?, date = ?, note = ? WHERE id = ?',
      [updated.pageId, updated.type, updated.amount, updated.date, updated.note, movementId]
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
