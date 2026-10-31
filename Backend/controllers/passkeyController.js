const crypto = require('crypto');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { all, get, run } = require('../db/helpers');
const { signToken, bumpTokenVersion } = require('../middleware/sessions');
const { registerFailedAttempt, clearAttempts } = require('../middleware/loginRateLimit');

// Passkeys (Face ID / huella / PIN del dispositivo) para entrar sin contraseña.
// La app tiene un solo usuario: todas las passkeys registradas son suyas y el
// login usa credenciales "descubribles" (el dispositivo elige cuál usar).

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const USER_ID = new TextEncoder().encode('geseco-owner');

// El RP ID es el dominio de la app (appbets.vercel.app, una preview o
// localhost). Solo se acepta si el Origin coincide con el host que atendió la
// petición; localhost se permite fuera de Vercel para desarrollo (Vite hace de proxy).
const getRelyingParty = (req) => {
  const origin = req.get('origin');
  if (!origin) return null;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }

  const host = req.get('x-forwarded-host') || req.get('host');
  const isLocal = !process.env.VERCEL && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.host !== host && !isLocal) return null;

  return { origin, rpID: url.hostname };
};

const saveChallenge = async (challenge) => {
  const id = crypto.randomUUID();
  await run('DELETE FROM auth_challenges WHERE expiresAt < ?', [Date.now()]);
  await run('INSERT INTO auth_challenges (id, challenge, expiresAt) VALUES (?, ?, ?)', [id, challenge, Date.now() + CHALLENGE_TTL_MS]);
  return id;
};

// Un challenge sirve una sola vez.
const consumeChallenge = async (id) => {
  if (typeof id !== 'string') return null;
  const row = await get('SELECT * FROM auth_challenges WHERE id = ?', [id]);
  if (!row) return null;
  await run('DELETE FROM auth_challenges WHERE id = ?', [id]);
  return row.expiresAt >= Date.now() ? row.challenge : null;
};

const toCredential = (row) => ({
  id: row.id,
  publicKey: Buffer.from(row.publicKey, 'base64url'),
  counter: row.counter,
  transports: JSON.parse(row.transports || '[]'),
});

const badOrigin = (res) => res.status(400).json({ message: 'Origen no permitido para passkeys' });

const listPasskeys = async (req, res) => {
  const rows = await all('SELECT id, deviceName, createdAt, lastUsedAt FROM webauthn_credentials ORDER BY createdAt');
  res.json(rows);
};

const registrationOptions = async (req, res) => {
  const rp = getRelyingParty(req);
  if (!rp) return badOrigin(res);

  const existing = await all('SELECT id, transports FROM webauthn_credentials');
  const options = await generateRegistrationOptions({
    rpName: 'Ges.Eco',
    rpID: rp.rpID,
    userName: 'Ges.Eco',
    userID: USER_ID,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: JSON.parse(c.transports || '[]') })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });

  const challengeId = await saveChallenge(options.challenge);
  res.json({ challengeId, options });
};

const registrationVerify = async (req, res) => {
  const rp = getRelyingParty(req);
  if (!rp) return badOrigin(res);

  const { challengeId, response, deviceName } = req.body || {};
  const challenge = await consumeChallenge(challengeId);
  if (!challenge) return res.status(400).json({ message: 'El pedido expiró. Probá de nuevo.' });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
    });
  } catch (error) {
    console.error('Registro de passkey inválido:', error);
    return res.status(400).json({ message: 'No se pudo verificar la passkey' });
  }

  if (!verification.verified) return res.status(400).json({ message: 'No se pudo verificar la passkey' });

  const { credential } = verification.registrationInfo;
  await run(
    `INSERT INTO webauthn_credentials (id, publicKey, counter, transports, deviceName, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      credential.id,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      JSON.stringify(credential.transports || []),
      typeof deviceName === 'string' ? deviceName.slice(0, 60) : '',
      new Date().toISOString(),
    ]
  );

  res.status(201).json({ id: credential.id });
};

const authenticationOptions = async (req, res) => {
  const rp = getRelyingParty(req);
  if (!rp) return badOrigin(res);

  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'preferred' });
  const challengeId = await saveChallenge(options.challenge);
  res.json({ challengeId, options });
};

const authenticationVerify = async (req, res) => {
  const rp = getRelyingParty(req);
  if (!rp) return badOrigin(res);

  const { challengeId, response } = req.body || {};
  const challenge = await consumeChallenge(challengeId);
  if (!challenge) return res.status(400).json({ message: 'El pedido expiró. Probá de nuevo.' });

  const row = response?.id ? await get('SELECT * FROM webauthn_credentials WHERE id = ?', [response.id]) : null;
  if (!row) {
    await registerFailedAttempt(req.ip);
    return res.status(401).json({ message: 'Esta passkey no está registrada en Ges.Eco' });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: toCredential(row),
    });
  } catch (error) {
    console.error('Login con passkey inválido:', error);
    verification = { verified: false };
  }

  if (!verification.verified) {
    await registerFailedAttempt(req.ip);
    return res.status(401).json({ message: 'No se pudo verificar la passkey' });
  }

  await run('UPDATE webauthn_credentials SET counter = ?, lastUsedAt = ? WHERE id = ?', [
    verification.authenticationInfo.newCounter,
    new Date().toISOString(),
    row.id,
  ]);
  await clearAttempts(req.ip);
  res.json({ token: await signToken() });
};

const deletePasskey = async (req, res) => {
  const result = await run('DELETE FROM webauthn_credentials WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Passkey no encontrada' });
  res.json({ message: 'Passkey eliminada' });
};

// Invalida todos los tokens emitidos (incluido el de este dispositivo).
const logoutAll = async (req, res) => {
  await bumpTokenVersion();
  res.json({ message: 'Se cerró la sesión en todos los dispositivos' });
};

module.exports = {
  listPasskeys,
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  deletePasskey,
  logoutAll,
};
