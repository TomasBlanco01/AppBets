const { all, get, run } = require('../db/helpers');

const getTipsters = async (req, res) => {
  try {
    const tipsters = await all('SELECT * FROM tipsters ORDER BY name');
    res.json(tipsters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener personas' });
  }
};

const createTipster = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = await get('SELECT id FROM tipsters WHERE name = ?', [trimmedName]);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una persona con ese nombre' });
    }

    const result = await run('INSERT INTO tipsters (name) VALUES (?)', [trimmedName]);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear persona' });
  }
};

const deleteTipster = async (req, res) => {
  try {
    const tipsterId = parseInt(req.params.id);
    const tipster = await get('SELECT * FROM tipsters WHERE id = ?', [tipsterId]);

    if (!tipster) {
      return res.status(404).json({ message: 'Persona no encontrada' });
    }

    await run('DELETE FROM tipsters WHERE id = ?', [tipsterId]);

    res.json({ message: 'Persona eliminada', tipster });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar persona' });
  }
};

module.exports = { getTipsters, createTipster, deleteTipster };
