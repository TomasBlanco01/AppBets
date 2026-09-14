const db = require('../db/connection');

// Volcado completo de todas las tablas en un único JSON, pensado como
// backup/migración: no depende del archivo .db ni de su ubicación.
const exportData = (req, res) => {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      pages: db.prepare('SELECT * FROM pages ORDER BY id').all(),
      tipsters: db.prepare('SELECT * FROM tipsters ORDER BY id').all(),
      sports: db.prepare('SELECT * FROM sports ORDER BY id').all(),
      movements: db.prepare('SELECT * FROM movements ORDER BY id').all(),
      bets: db.prepare('SELECT * FROM bets ORDER BY id').all(),
      bankrollHistory: db.prepare('SELECT * FROM bankroll_history ORDER BY id').all(),
    };
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al exportar datos' });
  }
};

module.exports = { exportData };
