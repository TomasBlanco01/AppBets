require('dotenv').config();
const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    'Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN. Configuralas en Backend/.env (ver README) o en las variables de entorno del deploy.'
  );
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createTables() {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
        amount REAL NOT NULL CHECK(amount > 0),
        date TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS tipsters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS sports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        tipsterId INTEGER REFERENCES tipsters(id) ON DELETE SET NULL,
        pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        sportId INTEGER REFERENCES sports(id) ON DELETE SET NULL,
        specialOptions TEXT NOT NULL DEFAULT '',
        stakePct REAL,
        amount REAL NOT NULL CHECK(amount > 0),
        odds REAL NOT NULL CHECK(odds >= 1),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'half_won', 'lost', 'half_lost', 'void', 'cashed_out')),
        cashoutAmount REAL
      )`,
      `CREATE TABLE IF NOT EXISTS bankroll_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0)
      )`,
    ],
    'write'
  );
}

// Migración única: las primeras versiones de `bets` guardaban `tipster` como texto libre.
// Si la tabla todavía tiene esa columna, la reemplazamos por `tipsterId` relacional.
async function migrateTipsterColumnToRelation() {
  const columns = await client.execute("PRAGMA table_info(bets)");
  const hasOldTipsterColumn = columns.rows.some((c) => c.name === 'tipster');
  if (!hasOldTipsterColumn) return;

  const oldBets = (await client.execute('SELECT * FROM bets')).rows;

  await client.execute(`
    CREATE TABLE bets_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      tipsterId INTEGER REFERENCES tipsters(id) ON DELETE SET NULL,
      pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      betType TEXT NOT NULL CHECK(betType IN ('simple', 'combinada')),
      stakePct REAL,
      amount REAL NOT NULL CHECK(amount > 0),
      odds REAL NOT NULL CHECK(odds >= 1),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'lost', 'void'))
    )
  `);

  for (const b of oldBets) {
    let tipsterId = null;
    const name = (b.tipster || '').trim();
    if (name) {
      await client.execute({ sql: 'INSERT OR IGNORE INTO tipsters (name) VALUES (?)', args: [name] });
      const found = await client.execute({ sql: 'SELECT id FROM tipsters WHERE name = ?', args: [name] });
      tipsterId = found.rows[0].id;
    }
    await client.execute({
      sql: 'INSERT INTO bets_new (id, date, description, tipsterId, pageId, betType, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [b.id, b.date, b.description, tipsterId, b.pageId, b.betType, b.stakePct, b.amount, b.odds, b.status],
    });
  }

  await client.execute('DROP TABLE bets');
  await client.execute('ALTER TABLE bets_new RENAME TO bets');
  console.log('Migrado bets.tipster (texto) a bets.tipsterId (relacional).');
}

// Migración única: se eliminó el campo "tipo de apuesta" (simple/combinada) por no ser útil.
async function migrateDropBetType() {
  const columns = await client.execute("PRAGMA table_info(bets)");
  const hasBetTypeColumn = columns.rows.some((c) => c.name === 'betType');
  if (!hasBetTypeColumn) return;

  await client.execute('ALTER TABLE bets DROP COLUMN betType');
  console.log('Columna bets.betType eliminada.');
}

// Migración única: se agregan sportId y specialOptions, y se amplía el CHECK de status
// para soportar hándicap asiático (medio ganada / medio perdida).
async function migrateBetsAddSportAndHalfStatuses() {
  const columns = await client.execute("PRAGMA table_info(bets)");
  const hasSportIdColumn = columns.rows.some((c) => c.name === 'sportId');
  if (hasSportIdColumn) return;

  const oldBets = (await client.execute('SELECT * FROM bets')).rows;

  await client.execute(`
    CREATE TABLE bets_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      tipsterId INTEGER REFERENCES tipsters(id) ON DELETE SET NULL,
      pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      sportId INTEGER REFERENCES sports(id) ON DELETE SET NULL,
      specialOptions TEXT NOT NULL DEFAULT '',
      stakePct REAL,
      amount REAL NOT NULL CHECK(amount > 0),
      odds REAL NOT NULL CHECK(odds >= 1),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'half_won', 'lost', 'half_lost', 'void'))
    )
  `);

  for (const b of oldBets) {
    await client.execute({
      sql: 'INSERT INTO bets_new (id, date, description, tipsterId, pageId, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [b.id, b.date, b.description, b.tipsterId, b.pageId, b.stakePct, b.amount, b.odds, b.status],
    });
  }

  await client.execute('DROP TABLE bets');
  await client.execute('ALTER TABLE bets_new RENAME TO bets');
  console.log('Migrado bets: agregado sportId, specialOptions y estados medio ganada/medio perdida.');
}

// Migración única: "Cashout" deja de ser solo un tag informativo y pasa a ser una
// forma de resolver la apuesta. Agrega cashoutAmount y el estado 'cashed_out'.
async function migrateBetsAddCashoutAmount() {
  const columns = await client.execute("PRAGMA table_info(bets)");
  const hasCashoutColumn = columns.rows.some((c) => c.name === 'cashoutAmount');
  if (hasCashoutColumn) return;

  const oldBets = (await client.execute('SELECT * FROM bets')).rows;

  await client.execute(`
    CREATE TABLE bets_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      tipsterId INTEGER REFERENCES tipsters(id) ON DELETE SET NULL,
      pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      sportId INTEGER REFERENCES sports(id) ON DELETE SET NULL,
      specialOptions TEXT NOT NULL DEFAULT '',
      stakePct REAL,
      amount REAL NOT NULL CHECK(amount > 0),
      odds REAL NOT NULL CHECK(odds >= 1),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'half_won', 'lost', 'half_lost', 'void', 'cashed_out')),
      cashoutAmount REAL
    )
  `);

  for (const b of oldBets) {
    await client.execute({
      sql: 'INSERT INTO bets_new (id, date, description, tipsterId, pageId, sportId, specialOptions, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [b.id, b.date, b.description, b.tipsterId, b.pageId, b.sportId, b.specialOptions, b.stakePct, b.amount, b.odds, b.status],
    });
  }

  await client.execute('DROP TABLE bets');
  await client.execute('ALTER TABLE bets_new RENAME TO bets');
  console.log('Migrado bets: agregado cashoutAmount y estado cashed_out.');
}

async function migrate() {
  await createTables();
  await migrateTipsterColumnToRelation();
  await migrateDropBetType();
  await migrateBetsAddSportAndHalfStatuses();
  await migrateBetsAddCashoutAmount();
}

const ready = migrate().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
  throw err;
});

// Todas las rutas deben esperar a `ready` (awaiteado una vez en index.js antes de
// levantar el servidor) antes de usar `client`.
module.exports = { client, ready };
