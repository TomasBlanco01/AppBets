const { all, get, run } = require('../db/helpers');

const getSports = async (req, res) => {
  try {
    const sports = await all('SELECT * FROM sports ORDER BY name');
    res.json(sports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener deportes' });
  }
};

const createSport = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = await get('SELECT id FROM sports WHERE name = ?', [trimmedName]);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un deporte con ese nombre' });
    }

    const result = await run('INSERT INTO sports (name) VALUES (?)', [trimmedName]);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear deporte' });
  }
};

const deleteSport = async (req, res) => {
  try {
    const sportId = parseInt(req.params.id);
    const sport = await get('SELECT * FROM sports WHERE id = ?', [sportId]);

    if (!sport) {
      return res.status(404).json({ message: 'Deporte no encontrado' });
    }

    await run('DELETE FROM sports WHERE id = ?', [sportId]);

    res.json({ message: 'Deporte eliminado', sport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar deporte' });
  }
};

module.exports = { getSports, createSport, deleteSport };
