const db = require('../db/connection');

const getTipsters = (req, res) => {
  try {
    const tipsters = db.prepare('SELECT * FROM tipsters ORDER BY name').all();
    res.json(tipsters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener personas' });
  }
};

const createTipster = (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM tipsters WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una persona con ese nombre' });
    }

    const result = db.prepare('INSERT INTO tipsters (name) VALUES (?)').run(trimmedName);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear persona' });
  }
};

const deleteTipster = (req, res) => {
  try {
    const tipsterId = parseInt(req.params.id);
    const tipster = db.prepare('SELECT * FROM tipsters WHERE id = ?').get(tipsterId);

    if (!tipster) {
      return res.status(404).json({ message: 'Persona no encontrada' });
    }

    db.prepare('DELETE FROM tipsters WHERE id = ?').run(tipsterId);

    res.json({ message: 'Persona eliminada', tipster });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar persona' });
  }
};

module.exports = { getTipsters, createTipster, deleteTipster };
