const { all } = require('../db/helpers');

// Volcado completo de todas las tablas en un único JSON, pensado como
// backup/migración: no depende de Turso ni de su ubicación.
const exportData = async (req, res) => {
  try {
    const [pages, tipsters, sports, movements, bets, bankrollHistory] = await Promise.all([
      all('SELECT * FROM pages ORDER BY id'),
      all('SELECT * FROM tipsters ORDER BY id'),
      all('SELECT * FROM sports ORDER BY id'),
      all('SELECT * FROM movements ORDER BY id'),
      all('SELECT * FROM bets ORDER BY id'),
      all('SELECT * FROM bankroll_history ORDER BY id'),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      pages,
      tipsters,
      sports,
      movements,
      bets,
      bankrollHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al exportar datos' });
  }
};

module.exports = { exportData };
