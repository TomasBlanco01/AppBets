const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestEnv, startApi, SoftAuthenticator } = require('./helpers');

setupTestEnv();
let api;

before(async () => {
  api = await startApi();
});
after(() => api.close());

test('login con contraseña: correcta da token, incorrecta 401', async () => {
  const bad = await api.call('POST', '/api/auth/login', { password: 'nop' }, { ip: '1.1.1.1', auth: false });
  assert.equal(bad.status, 401);

  const token = await api.login('1.1.1.2');
  assert.ok(token);
  assert.equal((await api.call('GET', '/api/pages')).status, 200);
});

test('rutas protegidas sin token dan 401', async () => {
  const res = await api.call('GET', '/api/io', undefined, { auth: false });
  assert.equal(res.status, 401);
});

test('5 intentos fallidos bloquean la IP 15 minutos, aun con la contraseña correcta', async () => {
  const ip = '2.2.2.2';
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await api.call('POST', '/api/auth/login', { password: 'mal' }, { ip, auth: false })).status, 401);
  }
  const blocked = await api.call('POST', '/api/auth/login', { password: 'test-pass' }, { ip, auth: false });
  assert.equal(blocked.status, 429);

  // Otra IP no se ve afectada.
  const other = await api.call('POST', '/api/auth/login', { password: 'test-pass' }, { ip: '2.2.2.3', auth: false });
  assert.equal(other.status, 200);
});

test('cerrar sesión en todos los dispositivos invalida los tokens anteriores', async () => {
  const oldToken = await api.login('3.3.3.3');
  assert.equal((await api.call('POST', '/api/auth/logout-all')).status, 200);

  api.setToken(oldToken);
  assert.equal((await api.call('GET', '/api/pages')).status, 401);

  await api.login('3.3.3.3');
  assert.equal((await api.call('GET', '/api/pages')).status, 200);
});

test('passkey: registrar y entrar con Face ID / huella', async () => {
  const origin = api.base;
  const authenticator = new SoftAuthenticator({ rpID: 'localhost', origin });
  await api.login('4.4.4.4');

  // Registro (requiere sesión).
  const regOptions = await api.call('POST', '/api/auth/passkey/register/options', {}, { origin });
  assert.equal(regOptions.status, 200);
  assert.equal(regOptions.body.options.rp.id, 'localhost');

  const registered = await api.call('POST', '/api/auth/passkey/register/verify', {
    challengeId: regOptions.body.challengeId,
    response: authenticator.register(regOptions.body.options),
    deviceName: 'iPhone',
  }, { origin });
  assert.equal(registered.status, 201, JSON.stringify(registered.body));

  const list = await api.call('GET', '/api/auth/passkeys');
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].deviceName, 'iPhone');

  // Login sin sesión.
  const loginOptions = await api.call('POST', '/api/auth/passkey/login/options', {}, { origin, auth: false, ip: '4.4.4.5' });
  assert.equal(loginOptions.status, 200);
  const assertion = authenticator.authenticate(loginOptions.body.options);
  const loggedIn = await api.call('POST', '/api/auth/passkey/login/verify', {
    challengeId: loginOptions.body.challengeId,
    response: assertion,
  }, { origin, auth: false, ip: '4.4.4.5' });
  assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));

  api.setToken(loggedIn.body.token);
  assert.equal((await api.call('GET', '/api/pages')).status, 200);

  // El challenge es de un solo uso.
  const replay = await api.call('POST', '/api/auth/passkey/login/verify', {
    challengeId: loginOptions.body.challengeId,
    response: assertion,
  }, { origin, auth: false, ip: '4.4.4.6' });
  assert.equal(replay.status, 400);

  // Una passkey que no está registrada no entra.
  const stranger = new SoftAuthenticator({ rpID: 'localhost', origin });
  const opts = await api.call('POST', '/api/auth/passkey/login/options', {}, { origin, auth: false, ip: '4.4.4.7' });
  const unknown = await api.call('POST', '/api/auth/passkey/login/verify', {
    challengeId: opts.body.challengeId,
    response: stranger.authenticate(opts.body.options),
  }, { origin, auth: false, ip: '4.4.4.7' });
  assert.equal(unknown.status, 401);

  // Quitar la passkey.
  assert.equal((await api.call('DELETE', `/api/auth/passkeys/${list.body[0].id}`)).status, 200);
  assert.equal((await api.call('GET', '/api/auth/passkeys')).body.length, 0);
});

test('passkey: se rechaza un Origin que no es el de la app', async () => {
  const res = await api.call('POST', '/api/auth/passkey/login/options', {}, { origin: 'https://evil.example.com', auth: false, ip: '5.5.5.5' });
  assert.equal(res.status, 400);
});
