const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { encodeCBOR } = require('@levischuck/tiny-cbor');

// Cada archivo de test usa su propia base libSQL en un archivo temporal.
// Hay que llamar a esto ANTES de requerir la app (connection.js lee el entorno al cargarse).
const setupTestEnv = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'geseco-test-'));
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db').split(path.sep).join('/')}`;
  process.env.TURSO_AUTH_TOKEN = 'test';
  process.env.APP_PASSWORD = 'test-pass';
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.VERCEL;
};

// Levanta la app como la invoca Vercel (un handler http) en un puerto libre.
const startApi = async () => {
  const app = require('../app');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;
  let token = null;

  const call = async (method, url, body, { ip = '10.0.0.1', origin, auth = true } = {}) => {
    const response = await fetch(base + url, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
        ...(origin && { origin }),
        ...(auth && token && { authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: response.status, body: json };
  };

  const login = async (ip) => {
    const res = await call('POST', '/api/auth/login', { password: 'test-pass' }, { ip, auth: false });
    token = res.body.token;
    return token;
  };

  return {
    base,
    call,
    login,
    setToken: (value) => { token = value; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

// Autenticador WebAuthn en software (clave P-256, atestación "none"): genera las
// mismas respuestas que un celular con Face ID para poder probar el flujo completo.
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const b64u = (data) => Buffer.from(data).toString('base64url');

class SoftAuthenticator {
  constructor({ rpID, origin }) {
    this.rpID = rpID;
    this.origin = origin;
    this.keys = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.credentialId = crypto.randomBytes(16);
    this.counter = 0;
  }

  clientData(type, challenge) {
    return Buffer.from(JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false }));
  }

  register(options) {
    const jwk = this.keys.publicKey.export({ format: 'jwk' });
    const coseKey = encodeCBOR(new Map([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x, 'base64url')],
      [-3, Buffer.from(jwk.y, 'base64url')],
    ]));
    const authData = Buffer.concat([
      sha256(options.rp.id),
      Buffer.from([0x45]), // UP | UV | AT
      u32(0),
      Buffer.alloc(16), // aaguid
      u16(this.credentialId.length),
      this.credentialId,
      Buffer.from(coseKey),
    ]);
    const attestationObject = encodeCBOR(new Map([
      ['fmt', 'none'],
      ['attStmt', new Map()],
      ['authData', authData],
    ]));

    return {
      id: b64u(this.credentialId),
      rawId: b64u(this.credentialId),
      type: 'public-key',
      response: {
        clientDataJSON: b64u(this.clientData('webauthn.create', options.challenge)),
        attestationObject: b64u(attestationObject),
        transports: ['internal'],
      },
      clientExtensionResults: {},
    };
  }

  authenticate(options) {
    this.counter += 1;
    const clientData = this.clientData('webauthn.get', options.challenge);
    const authData = Buffer.concat([sha256(options.rpId), Buffer.from([0x05]), u32(this.counter)]);
    const signature = crypto.sign('sha256', Buffer.concat([authData, sha256(clientData)]), this.keys.privateKey);

    return {
      id: b64u(this.credentialId),
      rawId: b64u(this.credentialId),
      type: 'public-key',
      response: {
        clientDataJSON: b64u(clientData),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
      },
      clientExtensionResults: {},
    };
  }
}

module.exports = { setupTestEnv, startApi, SoftAuthenticator };
