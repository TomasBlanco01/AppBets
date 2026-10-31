const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestEnv, startApi } = require('./helpers');

setupTestEnv();
const { dueOccurrences, occurrenceDate } = require('../controllers/ioRecurringController');
let api;

before(async () => {
  api = await startApi();
  await api.login();
});
after(() => api.close());

test('Bets: un reintento con el mismo clientId actualiza en vez de duplicar', async () => {
  const page = (await api.call('POST', '/api/pages', { name: 'Stake' })).body;
  const movement = { pageId: page.id, type: 'deposit', amount: 1000, date: '2026-10-01', note: '', clientId: 'cli-1' };

  assert.equal((await api.call('POST', '/api/movements', movement)).status, 201);
  assert.equal((await api.call('POST', '/api/movements', { ...movement, amount: 1500 })).status, 200);

  const list = (await api.call('GET', '/api/movements')).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].amount, 1500);
  assert.equal(list[0].pageName, 'Stake');
});

test('Bets: valida tipo, monto y casa', async () => {
  const page = (await api.call('POST', '/api/pages', { name: 'Bet365' })).body;
  const base = { pageId: page.id, type: 'deposit', amount: 10, date: '2026-10-01' };
  assert.equal((await api.call('POST', '/api/movements', { ...base, type: 'apuesta' })).status, 400);
  assert.equal((await api.call('POST', '/api/movements', { ...base, amount: -5 })).status, 400);
  assert.equal((await api.call('POST', '/api/movements', { ...base, pageId: 9999 })).status, 400);
});

test('I/O: un reintento con el mismo clientId no duplica', async () => {
  const movement = { type: 'expense', amount: 200, date: '2026-10-02', category: 'Ocio', clientId: 'io-1' };
  await api.call('POST', '/api/io', movement);
  await api.call('POST', '/api/io', movement);
  const list = (await api.call('GET', '/api/io')).body.filter((m) => m.clientId === 'io-1');
  assert.equal(list.length, 1);
});

test('fijos: el día 31 cae en el último día de meses cortos', () => {
  assert.equal(occurrenceDate('2026-02', 31), '2026-02-28');
  assert.equal(occurrenceDate('2028-02', 30), '2028-02-29');
  assert.equal(occurrenceDate('2026-04', 31), '2026-04-30');
  assert.equal(occurrenceDate('2026-05', 5), '2026-05-05');
});

test('fijos: solo genera meses vencidos y desde el último generado', () => {
  const template = { startMonth: '2026-08', dayOfMonth: 15, lastGeneratedMonth: null };
  assert.deepEqual(dueOccurrences(template, '2026-10-10').map((d) => d.date), ['2026-08-15', '2026-09-15']);
  assert.deepEqual(dueOccurrences(template, '2026-10-15').map((d) => d.date), ['2026-08-15', '2026-09-15', '2026-10-15']);
  assert.deepEqual(dueOccurrences({ ...template, lastGeneratedMonth: '2026-10' }, '2026-10-20'), []);
  // Cruza de año.
  assert.deepEqual(
    dueOccurrences({ startMonth: '2026-11', dayOfMonth: 1, lastGeneratedMonth: null }, '2027-01-05').map((d) => d.month),
    ['2026-11', '2026-12', '2027-01']
  );
});

test('fijos: se generan al listar I/O, sin duplicar y sin revivir los borrados', async () => {
  const created = await api.call('POST', '/api/io/recurring', {
    type: 'expense', category: 'Vivienda', amount: 300000, dayOfMonth: 1, startMonth: '2026-01', note: 'Alquiler',
  });
  assert.equal(created.status, 201);
  const prefix = `rec-${created.body.id}-`;
  const generated = () => api.call('GET', '/api/io').then((r) => r.body.filter((m) => (m.clientId || '').startsWith(prefix)));

  const first = await generated();
  assert.ok(first.length >= 10, `esperaba al menos 10 meses, hubo ${first.length}`);
  assert.equal((await generated()).length, first.length);

  await api.call('DELETE', `/api/io/${first[0].id}`);
  assert.equal((await generated()).length, first.length - 1);

  // Borrar la plantilla no toca lo ya generado.
  await api.call('DELETE', `/api/io/recurring/${created.body.id}`);
  assert.equal((await generated()).length, first.length - 1);
});

test('fijos: valida los datos', async () => {
  const base = { type: 'expense', category: 'Vivienda', amount: 100, dayOfMonth: 1, startMonth: '2026-01' };
  assert.equal((await api.call('POST', '/api/io/recurring', { ...base, dayOfMonth: 32 })).status, 400);
  assert.equal((await api.call('POST', '/api/io/recurring', { ...base, startMonth: '2026-13' })).status, 400);
  assert.equal((await api.call('POST', '/api/io/recurring', { ...base, amount: 0 })).status, 400);
});

test('cotizaciones: solo acepta blue, bolsa u oficial', async () => {
  assert.equal((await api.call('GET', '/api/fx/euro', undefined, { auth: false })).status, 400);
});

test('backup: incluye todas las tablas', async () => {
  const { body } = await api.call('GET', '/api/export');
  for (const key of ['pages', 'movements', 'ioMovements', 'ioRecurring', 'bets', 'tipsters']) {
    assert.ok(Array.isArray(body[key]), `falta ${key}`);
  }
});
