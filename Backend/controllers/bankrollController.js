const db = require('../db/connection');

const getBankroll = (req, res) => {
  try {
    const row = db.prepare('SELECT amount, date FROM bankroll_history ORDER BY date DESC, id DESC LIMIT 1').get();
    res.json(row ? { amount: row.amount, date: row.date } : { amount: 0, date: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el banco' });
  }
};

const getBankrollHistory = (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM bankroll_history ORDER BY date ASC, id ASC').all();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el historial del banco' });
  }
};

const addBankrollEntry = (req, res) => {
  try {
    const { amount, date } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'El banco debe ser un número mayor o igual a 0' });
    }

    const entryDate = date || new Date().toISOString().slice(0, 10);

    const result = db.prepare('INSERT INTO bankroll_history (date, amount) VALUES (?, ?)').run(entryDate, parsedAmount);
    res.status(201).json({ id: result.lastInsertRowid, date: entryDate, amount: parsedAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el banco' });
  }
};

module.exports = { getBankroll, getBankrollHistory, addBankrollEntry };
