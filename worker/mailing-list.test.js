import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from './index.js';

test('mailing-list security, persistence, and routing', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('./migrations/0001_mailing_list.sql', import.meta.url), 'utf8'));
  const verification = { success: true, hostname: 'seattleinfinity.org', action: 'mailing_list' };
  const originalFetch = globalThis.fetch;
  let verifyCalls = 0;
  let limited = false;
  let upstreamFails = false;
  let databaseFails = false;
  const env = {
    TURNSTILE_SITE_KEY: 'public-key',
    TURNSTILE_SECRET_KEY: 'private-key',
    SIGNUP_LIMITER: { limit: async ({ key }) => {
      assert.equal(key, 'signup:192.0.2.1');
      return { success: !limited };
    } },
    MAILING_LIST_DB: { prepare: (sql) => ({ bind: (email) => ({ run: async () => {
      if (databaseFails) throw new Error('private database details');
      return database.prepare(sql).run(email);
    } }) }) },
    ASSETS: { fetch: async () => new Response('static asset') },
  };
  const request = (body = { email: ' Student@Example.org ', token: 'test-token' }, headers = {}, path = '/api/subscribe', method = 'POST') => new Request(`https://seattleinfinity.org${path}`, {
    method,
    headers: { Origin: 'https://seattleinfinity.org', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  const send = (body, headers, path, method) => worker.fetch(request(body, headers, path, method), env);
  globalThis.fetch = async (url, options) => {
    verifyCalls++;
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.deepEqual(JSON.parse(options.body), { secret: 'private-key', response: 'test-token', remoteip: '192.0.2.1' });
    if (upstreamFails) throw new Error('private upstream details');
    return Response.json(verification);
  };
  try {
    const config = await send(undefined, {}, '/api/mailing-list/config', 'GET');
    assert.deepEqual(await config.json(), { siteKey: 'public-key' });
    assert.equal(config.headers.get('Cache-Control'), 'no-store');
    for (const key of ['MAILING_LIST_DB', 'SIGNUP_LIMITER', 'TURNSTILE_SECRET_KEY']) {
      const availableConfig = await worker.fetch(request(undefined, {}, '/api/mailing-list/config', 'GET'), { ...env, [key]: undefined });
      assert.equal(availableConfig.status, 200, key);
    }
    assert.equal((await worker.fetch(request(undefined, {}, '/api/mailing-list/config', 'GET'), { ...env, TURNSTILE_SITE_KEY: undefined })).status, 503);
    assert.equal((await send(undefined, {}, '/api/subscribers', 'GET')).status, 404);
    assert.equal((await send(undefined, {}, '/api/subscribe', 'GET')).status, 405);
    assert.equal((await send(undefined, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await send(undefined, { Origin: '' })).status, 403);
    assert.equal((await send(undefined, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await send(undefined, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await send(undefined, { 'Content-Length': '4097' })).status, 413);
    assert.equal((await send(' '.repeat(4097))).status, 413);
    assert.equal((await send('not json')).status, 400);
    assert.equal((await send(null)).status, 400);
    for (const email of ['bad', 'a@b', 'a\nb@example.org', '.a@example.org', 'a..b@example.org', 'a.@example.org', `a@${'x'.repeat(64)}.org`, `${'x'.repeat(65)}@example.org`]) {
      assert.equal((await send({ email, token: 'test-token' })).status, 400, email);
    }
    for (const token of ['', 123, 'x'.repeat(2049)]) {
      assert.equal((await send({ email: 'student@example.org', token })).status, 400);
    }
    limited = true;
    const blocked = await send();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('Retry-After'), '60');
    limited = false;
    assert.equal(verifyCalls, 0, 'invalid requests never reach Turnstile');
    for (const [key, invalid] of [['success', false], ['hostname', 'evil.example'], ['action', 'other']]) {
      const original = verification[key];
      verification[key] = invalid;
      assert.equal((await send()).status, 400);
      verification[key] = original;
    }
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM mailing_list_subscribers').get().n, 0);
    const saved = await send();
    assert.equal(saved.status, 200);
    assert.equal(saved.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(saved.headers.get('Access-Control-Allow-Origin'), null);
    const first = await saved.json();
    assert.deepEqual(first, { ok: true });
    assert.deepEqual(await (await send()).json(), first, 'duplicates do not reveal membership');
    const rows = database.prepare('SELECT * FROM mailing_list_subscribers').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'student@example.org');
    assert.match(rows[0].subscribed_at, /^\d{4}-\d\d-\d\dT/);
    // Single-use/replayed token rejection is authoritative at Siteverify.
    verification.success = false;
    assert.equal((await send()).status, 400);
    verification.success = true;
    upstreamFails = true;
    assert.equal((await send()).status, 503);
    upstreamFails = false;
    databaseFails = true;
    const failedWrite = await send();
    assert.equal(failedWrite.status, 503);
    assert.doesNotMatch(await failedWrite.text(), /private|student@/);
    for (const key of ['MAILING_LIST_DB', 'SIGNUP_LIMITER', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) {
      assert.equal((await worker.fetch(request(), { ...env, [key]: undefined })).status, 503, key);
    }
    assert.equal(await (await send(undefined, {}, '/', 'GET')).text(), 'static asset');
    const redirect = await send(undefined, {}, '/about', 'GET');
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('Location'), 'https://seattleinfinity.org/about-us');
  } finally {
    globalThis.fetch = originalFetch;
    database.close();
  }
});
