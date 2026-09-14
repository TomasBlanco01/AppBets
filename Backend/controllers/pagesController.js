const db = require('../db/connection');

const getPages = (req, res) => {
  try {
    const pages = db.prepare('SELECT * FROM pages ORDER BY id').all();
    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener páginas' });
  }
};

const createPage = (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM pages WHERE name = ?').get(trimmedName);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una página con ese nombre' });
    }

    const result = db.prepare('INSERT INTO pages (name) VALUES (?)').run(trimmedName);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear página' });
  }
};

const deletePage = (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);

    if (!page) {
      return res.status(404).json({ message: 'Página no encontrada' });
    }

    db.prepare('DELETE FROM pages WHERE id = ?').run(pageId);

    res.json({ message: 'Página eliminada', page });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar página' });
  }
};

module.exports = { getPages, createPage, deletePage };
