const { expect } = require('chai');

function setup(userSettings = {}, warnings) {
  let registered;
  const RED = {
    settings: { plugins: { 'node-red-dashboard-2-oauth2-auth': userSettings } },
    plugins: { registerPlugin: (_id, def) => { registered = def; } }
  };
  if (warnings) {
    RED.log = { warn: msg => warnings.push(msg) };
  }
  delete require.cache[require.resolve('..')];
  require('..')(RED);
  return registered.hooks;
}

describe('node-red-dashboard-2-oauth2-auth plugin', () => {
  it('attaches allowed headers, redacts sensitive ones, and decodes JWT claims', () => {
    const hooks = setup({ allowedHeaders: ['x-forwarded-user', 'cookie'] });
    const payload = { sub: '123', name: 'Alice' };
    const token = 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.y';
    const conn = { request: { headers: { 'x-forwarded-user': 'alice', cookie: 'secret', 'x-forwarded-access-token': token } } };

    const msg = hooks.onAddConnectionCredentials(conn, {});

    expect(msg._client.proxy['x-forwarded-user']).to.equal('alice');
    expect(msg._client.proxy.cookie).to.equal('__REDACTED__');
    expect(msg._client.proxy.jwt.sub).to.equal('123');
    expect(msg._client.proxy.jwt.name).to.equal('Alice');
  });

  it('onCanSaveInStore blocks messages with socketId', () => {
    const hooks = setup();

    expect(hooks.onCanSaveInStore({ _client: { socketId: 'abc' } })).to.be.false;
    expect(hooks.onCanSaveInStore({})).to.be.true;
  });

  it('warns and falls back to defaults when config values are not arrays', () => {
    const warnings = [];
    const payload = { sub: '123' };
    const token = 'x.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.y';
    const hooks = setup(
      { allowedHeaders: 'x-forwarded-user', redactedHeaders: 'cookie', allowedJwtClaims: 'sub' },
      warnings
    );
    const conn = { request: { headers: { 'x-forwarded-user': 'alice', cookie: 'secret', 'x-forwarded-access-token': token } } };
    const msg = hooks.onAddConnectionCredentials(conn, {});

    expect(warnings).to.have.lengthOf(3);
    expect(msg._client.proxy['x-forwarded-user']).to.equal('alice');
    expect(msg._client.proxy.jwt.sub).to.equal('123');
  });
});
