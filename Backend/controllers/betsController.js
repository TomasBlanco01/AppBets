const { all, get, run } = require('../db/helpers');

const isValidAmount = (amount) => Number.isFinite(amount) && amount > 0;
const isValidOdds = (odds) => Number.isFinite(odds) && odds >= 1;
const VALID_STATUSES = ['pending', 'won', 'half_won', 'lost', 'half_lost', 'void', 'cashed_out'];
const VALID_SPECIAL_OPTIONS = ['live', 'free_bet'];

const parseSpecialOptions = (specialOptions) => {
  if (specialOptions === undefined || specialOptions === null) return { ok: true, value: [] };
  if (!Array.isArray(specialOptions)) return { ok: false };
  if (!specialOptions.every(opt => VALID_SPECIAL_OPTIONS.includes(opt))) return { ok: false };
  return { ok: true, value: specialOptions };
};

const rowToBet = (row) => ({
  ...row,
  specialOptions: row.specialOptions ? row.specialOptions.split(',').filter(Boolean) : [],
});

const getBets = async (req, res) => {
  try {
    const bets = await all(`
      SELECT bets.*, pages.name AS pageName, tipsters.name AS tipsterName, sports.name AS sportName
      FROM bets
      LEFT JOIN pages ON pages.id = bets.pageId
      LEFT JOIN tipsters ON tipsters.id = bets.tipsterId
      LEFT JOIN sports ON sports.id = bets.sportId
      ORDER BY bets.date DESC, bets.id DESC
    `);
    res.json(bets.map(b => rowToBet({ ...b, pageName: b.pageName || 'Eliminada' })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener apuestas' });
  }
};

const createBet = async (req, res) => {
  try {
    const { date, description, tipsterId, pageId, sportId, specialOptions, stakePct, amount, odds } = req.body;

    if (!date || !description || !description.trim() || !pageId || !amount || !odds) {
      return res.status(400).json({ message: 'Faltan campos obligatorios (date, description, pageId, amount, odds)' });
    }

    const parsedAmount = parseFloat(amount);
    if (!isValidAmount(parsedAmount)) {
      return res.status(400).json({ message: 'El monto debe ser un número mayor a 0' });
    }

    const parsedOdds = parseFloat(odds);
    if (!isValidOdds(parsedOdds)) {
      return res.status(400).json({ message: 'La cuota debe ser un número mayor o igual a 1' });
    }

    const parsedPageId = parseInt(pageId);
    const pageExists = await get('SELECT id FROM pages WHERE id = ?', [parsedPageId]);
    if (!pageExists) {
      return res.status(400).json({ message: 'La página no existe' });
    }

    let parsedTipsterId = null;
    if (tipsterId !== undefined && tipsterId !== null && tipsterId !== '') {
      parsedTipsterId = parseInt(tipsterId);
      const tipsterExists = await get('SELECT id FROM tipsters WHERE id = ?', [parsedTipsterId]);
      if (!tipsterExists) {
        return res.status(400).json({ message: 'La persona no existe' });
      }
    }

    let parsedSportId = null;
    if (sportId !== undefined && sportId !== null && sportId !== '') {
      parsedSportId = parseInt(sportId);
      const sportExists = await get('SELECT id FROM sports WHERE id = ?', [parsedSportId]);
      if (!sportExists) {
        return res.status(400).json({ message: 'El deporte no existe' });
      }
    }

    const parsedOptions = parseSpecialOptions(specialOptions);
    if (!parsedOptions.ok) {
      return res.status(400).json({ message: 'Opciones especiales inválidas' });
    }

    const parsedStakePct = stakePct !== undefined && stakePct !== '' ? parseFloat(stakePct) : null;

    const result = await run(
      'INSERT INTO bets (date, description, tipsterId, pageId, sportId, specialOptions, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [date, description.trim(), parsedTipsterId, parsedPageId, parsedSportId, parsedOptions.value.join(','), parsedStakePct, parsedAmount, parsedOdds, 'pending']
    );

    const newBet = {
      id: result.lastInsertRowid,
      date,
      description: description.trim(),
      tipsterId: parsedTipsterId,
      pageId: parsedPageId,
      sportId: parsedSportId,
      specialOptions: parsedOptions.value,
      stakePct: parsedStakePct,
      amount: parsedAmount,
      odds: parsedOdds,
      status: 'pending',
    };
    res.status(201).json(newBet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear apuesta' });
  }
};

const updateBet = async (req, res) => {
  try {
    const betId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM bets WHERE id = ?', [betId]);

    if (!existing) {
      return res.status(404).json({ message: 'Apuesta no encontrada' });
    }

    const { date, description, tipsterId, pageId, sportId, specialOptions, stakePct, amount, odds, status, cashoutAmount } = req.body;

    const updated = { ...existing };

    if (date !== undefined) {
      if (!date) return res.status(400).json({ message: 'La fecha no puede estar vacía' });
      updated.date = date;
    }

    if (description !== undefined) {
      if (!description.trim()) return res.status(400).json({ message: 'La descripción no puede estar vacía' });
      updated.description = description.trim();
    }

    if (tipsterId !== undefined) {
      if (tipsterId === null || tipsterId === '') {
        updated.tipsterId = null;
      } else {
        const parsedTipsterId = parseInt(tipsterId);
        const tipsterExists = await get('SELECT id FROM tipsters WHERE id = ?', [parsedTipsterId]);
        if (!tipsterExists) return res.status(400).json({ message: 'La persona no existe' });
        updated.tipsterId = parsedTipsterId;
      }
    }

    if (pageId !== undefined) {
      const parsedPageId = parseInt(pageId);
      const pageExists = await get('SELECT id FROM pages WHERE id = ?', [parsedPageId]);
      if (!pageExists) return res.status(400).json({ message: 'La página no existe' });
      updated.pageId = parsedPageId;
    }

    if (sportId !== undefined) {
      if (sportId === null || sportId === '') {
        updated.sportId = null;
      } else {
        const parsedSportId = parseInt(sportId);
        const sportExists = await get('SELECT id FROM sports WHERE id = ?', [parsedSportId]);
        if (!sportExists) return res.status(400).json({ message: 'El deporte no existe' });
        updated.sportId = parsedSportId;
      }
    }

    if (specialOptions !== undefined) {
      const parsedOptions = parseSpecialOptions(specialOptions);
      if (!parsedOptions.ok) return res.status(400).json({ message: 'Opciones especiales inválidas' });
      updated.specialOptions = parsedOptions.value.join(',');
    }

    if (stakePct !== undefined) {
      updated.stakePct = stakePct === '' || stakePct === null ? null : parseFloat(stakePct);
    }

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (!isValidAmount(parsedAmount)) return res.status(400).json({ message: 'El monto debe ser un número mayor a 0' });
      updated.amount = parsedAmount;
    }

    if (odds !== undefined) {
      const parsedOdds = parseFloat(odds);
      if (!isValidOdds(parsedOdds)) return res.status(400).json({ message: 'La cuota debe ser un número mayor o igual a 1' });
      updated.odds = parsedOdds;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Estado inválido' });
      updated.status = status;
    }

    if (cashoutAmount !== undefined) {
      updated.cashoutAmount = cashoutAmount === '' || cashoutAmount === null ? null : parseFloat(cashoutAmount);
    }

    if (updated.status === 'cashed_out') {
      if (!Number.isFinite(updated.cashoutAmount) || updated.cashoutAmount < 0) {
        return res.status(400).json({ message: 'Para Cashout hace falta el monto retirado (mayor o igual a 0)' });
      }
    }

    await run(
      'UPDATE bets SET date = ?, description = ?, tipsterId = ?, pageId = ?, sportId = ?, specialOptions = ?, stakePct = ?, amount = ?, odds = ?, status = ?, cashoutAmount = ? WHERE id = ?',
      [updated.date, updated.description, updated.tipsterId, updated.pageId, updated.sportId, updated.specialOptions, updated.stakePct, updated.amount, updated.odds, updated.status, updated.cashoutAmount, betId]
    );

    res.json(rowToBet({ id: betId, ...updated }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar apuesta' });
  }
};

const deleteBet = async (req, res) => {
  try {
    const betId = parseInt(req.params.id);
    const existing = await get('SELECT * FROM bets WHERE id = ?', [betId]);

    if (!existing) {
      return res.status(404).json({ message: 'Apuesta no encontrada' });
    }

    await run('DELETE FROM bets WHERE id = ?', [betId]);

    res.json({ message: 'Apuesta eliminada', bet: existing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar apuesta' });
  }
};

module.exports = { getBets, createBet, updateBet, deleteBet };
