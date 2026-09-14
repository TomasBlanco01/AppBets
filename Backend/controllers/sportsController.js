const db = require('../db/connection');

const getSports = (req, res) => {
  try {
    const sports = db.prepare('SELECT * FROM sports ORDER BY name').all();
    res.json(sports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener deportes' });
  }
};

const createSport = (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM sports WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un deporte con ese nombre' });
    }

    const result = db.prepare('INSERT INTO sports (name) VALUES (?)').run(trimmedName);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear deporte' });
  }
};

const deleteSport = (req, res) => {
  try {
    const sportId = parseInt(req.params.id);
    const sport = db.prepare('SELECT * FROM sports WHERE id = ?').get(sportId);

    if (!sport) {
      return res.status(404).json({ message: 'Deporte no encontrado' });
    }

    db.prepare('DELETE FROM sports WHERE id = ?').run(sportId);

    res.json({ message: 'Deporte eliminado', sport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar deporte' });
  }
};

module.exports = { getSports, createSport, deleteSport };
