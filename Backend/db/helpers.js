const { client } = require('./connection');

const toRows = (result) =>
  result.rows.map((row) => {
    const obj = {};
    result.columns.forEach((col) => {
      obj[col] = row[col];
    });
    return obj;
  });

// Envoltorios finos sobre @libsql/client que imitan la API de better-sqlite3
// (.all/.get/.run) para que los controllers queden casi iguales, solo async.
const all = async (sql, args = []) => toRows(await client.execute({ sql, args }));

const get = async (sql, args = []) => (await all(sql, args))[0];

const run = async (sql, args = []) => {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
    changes: result.rowsAffected,
  };
};

module.exports = { all, get, run };
