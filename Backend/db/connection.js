const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'appbets.db');
const LEGACY_JSON_PATH = path.join(__dirname, 'data.json');

const isNewDatabase = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS tipsters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS sports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS bets (
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
  );

  CREATE TABLE IF NOT EXISTS bankroll_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0)
  );
`);

// Migración única: las primeras versiones de `bets` guardaban `tipster` como texto libre.
// Si la tabla todavía tiene esa columna, la reemplazamos por `tipsterId` relacional
// (creando una fila en `tipsters` por cada nombre distinto ya cargado).
function migrateTipsterColumnToRelation() {
  const columns = db.prepare("PRAGMA table_info(bets)").all();
  const hasOldTipsterColumn = columns.some(c => c.name === 'tipster');
  if (!hasOldTipsterColumn) return;

  const migrate = db.transaction(() => {
    const insertTipster = db.prepare('INSERT OR IGNORE INTO tipsters (name) VALUES (?)');
    const getTipsterId = db.prepare('SELECT id FROM tipsters WHERE name = ?');
    const oldBets = db.prepare('SELECT * FROM bets').all();

    db.exec(`
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
      );
    `);

    const insertBet = db.prepare(
      'INSERT INTO bets_new (id, date, description, tipsterId, pageId, betType, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const b of oldBets) {
      let tipsterId = null;
      const name = (b.tipster || '').trim();
      if (name) {
        insertTipster.run(name);
        tipsterId = getTipsterId.get(name).id;
      }
      insertBet.run(b.id, b.date, b.description, tipsterId, b.pageId, b.betType, b.stakePct, b.amount, b.odds, b.status);
    }

    db.exec('DROP TABLE bets;');
    db.exec('ALTER TABLE bets_new RENAME TO bets;');
  });

  migrate();
  console.log('Migrado bets.tipster (texto) a bets.tipsterId (relacional).');
}

migrateTipsterColumnToRelation();

// Migración única: se eliminó el campo "tipo de apuesta" (simple/combinada) por no ser útil.
// Si la tabla todavía tiene la columna betType, la borramos.
function migrateDropBetType() {
  const columns = db.prepare("PRAGMA table_info(bets)").all();
  const hasBetTypeColumn = columns.some(c => c.name === 'betType');
  if (!hasBetTypeColumn) return;

  db.exec('ALTER TABLE bets DROP COLUMN betType;');
  console.log('Columna bets.betType eliminada.');
}

migrateDropBetType();

// Migración única: se agregan sportId y specialOptions, y se amplía el CHECK de status
// para soportar hándicap asiático (medio ganada / medio perdida). SQLite no permite
// alterar un CHECK existente, así que se reconstruye la tabla completa.
function migrateBetsAddSportAndHalfStatuses() {
  const columns = db.prepare("PRAGMA table_info(bets)").all();
  const hasSportIdColumn = columns.some(c => c.name === 'sportId');
  if (hasSportIdColumn) return;

  const migrate = db.transaction(() => {
    const oldBets = db.prepare('SELECT * FROM bets').all();

    db.exec(`
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
      );
    `);

    const insertBet = db.prepare(
      'INSERT INTO bets_new (id, date, description, tipsterId, pageId, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const b of oldBets) {
      insertBet.run(b.id, b.date, b.description, b.tipsterId, b.pageId, b.stakePct, b.amount, b.odds, b.status);
    }

    db.exec('DROP TABLE bets;');
    db.exec('ALTER TABLE bets_new RENAME TO bets;');
  });

  migrate();
  console.log('Migrado bets: agregado sportId, specialOptions y estados medio ganada/medio perdida.');
}

migrateBetsAddSportAndHalfStatuses();

// Migración única: "Cashout" deja de ser solo un tag informativo y pasa a ser una
// forma de resolver la apuesta (se carga el monto retirado y se calcula la
// ganancia/pérdida real a partir de ese monto). Agrega cashoutAmount y el estado
// 'cashed_out' al CHECK de status.
function migrateBetsAddCashoutAmount() {
  const columns = db.prepare("PRAGMA table_info(bets)").all();
  const hasCashoutColumn = columns.some(c => c.name === 'cashoutAmount');
  if (hasCashoutColumn) return;

  const migrate = db.transaction(() => {
    const oldBets = db.prepare('SELECT * FROM bets').all();

    db.exec(`
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
      );
    `);

    const insertBet = db.prepare(
      'INSERT INTO bets_new (id, date, description, tipsterId, pageId, sportId, specialOptions, stakePct, amount, odds, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const b of oldBets) {
      insertBet.run(b.id, b.date, b.description, b.tipsterId, b.pageId, b.sportId, b.specialOptions, b.stakePct, b.amount, b.odds, b.status);
    }

    db.exec('DROP TABLE bets;');
    db.exec('ALTER TABLE bets_new RENAME TO bets;');
  });

  migrate();
  console.log('Migrado bets: agregado cashoutAmount y estado cashed_out.');
}

migrateBetsAddCashoutAmount();

// Migración única: `bankroll` era una fila única mutable; se reemplaza por
// `bankroll_history` (historial completo). Si existe la tabla vieja, su valor
// se conserva como primera entrada del historial.
function migrateBankrollToHistory() {
  const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bankroll'").get();
  if (!oldTable) return;

  const migrate = db.transaction(() => {
    const old = db.prepare('SELECT amount FROM bankroll WHERE id = 1').get();
    if (old && old.amount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      db.prepare('INSERT INTO bankroll_history (date, amount) VALUES (?, ?)').run(today, old.amount);
    }
    db.exec('DROP TABLE bankroll;');
  });

  migrate();
  console.log('Migrado bankroll (valor único) a bankroll_history (historial).');
}

migrateBankrollToHistory();

function migrateFromLegacyJson() {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return;

  const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8'));

  const insertPage = db.prepare('INSERT INTO pages (id, name) VALUES (?, ?)');
  const insertMovement = db.prepare(
    'INSERT INTO movements (id, pageId, type, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const migrate = db.transaction(() => {
    for (const page of legacy.pages || []) {
      insertPage.run(page.id, page.name);
    }
    for (const m of legacy.movements || []) {
      insertMovement.run(m.id, m.pageId, m.type, m.amount, m.date, m.note || '');
    }
  });

  migrate();
  console.log(`Datos migrados desde data.json: ${legacy.pages?.length || 0} páginas, ${legacy.movements?.length || 0} movimientos.`);
}

if (isNewDatabase) {
  migrateFromLegacyJson();
}

module.exports = db;
