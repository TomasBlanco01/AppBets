const { all, get, run } = require('../db/helpers');

const getPages = async (req, res) => {
  try {
    const pages = await all('SELECT * FROM pages ORDER BY id');
    res.json(pages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener páginas' });
  }
};

const createPage = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const trimmedName = name.trim();
    const existing = await get('SELECT id FROM pages WHERE name = ?', [trimmedName]);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe una página con ese nombre' });
    }

    const result = await run('INSERT INTO pages (name) VALUES (?)', [trimmedName]);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmedName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear página' });
  }
};

const deletePage = async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const page = await get('SELECT * FROM pages WHERE id = ?', [pageId]);

    if (!page) {
      return res.status(404).json({ message: 'Página no encontrada' });
    }

    await run('DELETE FROM pages WHERE id = ?', [pageId]);

    res.json({ message: 'Página eliminada', page });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar página' });
  }
};

module.exports = { getPages, createPage, deletePage };
