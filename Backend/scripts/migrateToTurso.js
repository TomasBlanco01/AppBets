// Copia los datos actuales del archivo SQLite local (Backend/db/appbets.db) a Turso.
// Uso: node scripts/migrateToTurso.js
// Requiere TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en Backend/.env (ver README).
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { ready, client } = require('../db/connection');

const LOCAL_DB_PATH = path.join(__dirname, '../db/appbets.db');

async function main() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.log('No hay base local en', LOCAL_DB_PATH, '- nada para migrar.');
    return;
  }

  await ready; // espera a que Turso tenga las tablas creadas

  const local = new Database(LOCAL_DB_PATH, { readonly: true });

  const tables = [
    { name: 'pages', columns: ['id', 'name'] },
    { name: 'tipsters', columns: ['id', 'name'] },
    { name: 'sports', columns: ['id', 'name'] },
    { name: 'movements', columns: ['id', 'pageId', 'type', 'amount', 'date', 'note'] },
    {
      name: 'bets',
      columns: [
        'id', 'date', 'description', 'tipsterId', 'pageId', 'sportId',
        'specialOptions', 'stakePct', 'amount', 'odds', 'status', 'cashoutAmount',
      ],
    },
    { name: 'bankroll_history', columns: ['id', 'date', 'amount'] },
  ];

  for (const table of tables) {
    const rows = local.prepare(`SELECT * FROM ${table.name}`).all();
    if (rows.length === 0) {
      console.log(`${table.name}: sin filas, nada que copiar.`);
      continue;
    }

    const placeholders = table.columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`;

    for (const row of rows) {
      const args = table.columns.map((c) => (row[c] === undefined ? null : row[c]));
      await client.execute({ sql, args });
    }
    console.log(`${table.name}: ${rows.length} filas copiadas a Turso.`);
  }

  local.close();
  console.log('Migración a Turso completa.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error migrando a Turso:', err);
    process.exit(1);
  });
