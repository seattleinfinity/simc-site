const MAX_BODY_BYTES = 4096;
const MAX_EMAIL_LENGTH = 254;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const textEncoder = new TextEncoder();

const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
};

const HTML_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'text/html; charset=utf-8',
  'x-content-type-options': 'nosniff',
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: HTML_HEADERS });
}

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method-not-allowed' }, 405, { allow });
}

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;

  let body;
  try {
    body = await request.text();
  } catch {
    return null;
  }
  if (textEncoder.encode(body).byteLength > MAX_BODY_BYTES) return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function verifyTurnstile(token, request, secret) {
  const form = new URLSearchParams({ secret, response: token });
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) form.set('remoteip', clientIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) return { ok: false, unavailable: true };
    const result = await response.json();
    return { ok: result?.success === true, unavailable: false };
  } catch {
    return { ok: false, unavailable: true };
  }
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return new Uint8Array(signature);
}

function createUnsubscribeToken() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashUnsubscribeToken(token, secret) {
  return base64UrlEncode(await signPayload(token, secret));
}

async function subscribe(request, env) {
  if (!env.DB || !env.TURNSTILE_SECRET || !env.UNSUBSCRIBE_SECRET) {
    return json({ ok: false, error: 'service-not-configured' }, 503);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'json-required' }, 415);
  }

  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (!email || turnstileToken.length === 0 || turnstileToken.length > 2048) {
    return json({ ok: false, error: 'invalid-request' }, 400);
  }

  const verification = await verifyTurnstile(turnstileToken, request, env.TURNSTILE_SECRET);
  if (verification.unavailable) return json({ ok: false, error: 'verification-unavailable' }, 503);
  if (!verification.ok) return json({ ok: false, error: 'verification-failed' }, 400);

  try {
    const unsubscribeToken = createUnsubscribeToken();
    await env.DB.prepare(
      `INSERT INTO subscribers (id, email, subscribed)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(email) DO UPDATE SET subscribed = 1, unsubscribe_token_hash = excluded.unsubscribe_token_hash`,
    ).bind(crypto.randomUUID(), email, await hashUnsubscribeToken(unsubscribeToken, env.UNSUBSCRIBE_SECRET)).run();

    const unsubscribeUrl = new URL('/unsubscribe', request.url);
    unsubscribeUrl.searchParams.set('token', unsubscribeToken);

    return json({ ok: true, unsubscribeUrl: unsubscribeUrl.toString() });
  } catch {
    return json({ ok: false, error: 'database-unavailable' }, 503);
  }
}

async function unsubscribe(request, env) {
  if (request.method !== 'GET') return methodNotAllowed('GET');
  if (!env.DB || !env.UNSUBSCRIBE_SECRET) {
    return html('<!doctype html><title>Unsubscribe unavailable</title><p>Unsubscribe is temporarily unavailable.</p>', 503);
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token || token.length > 512) {
    return html('<!doctype html><title>Invalid unsubscribe link</title><p>This unsubscribe link is invalid or expired.</p>', 400);
  }

  try {
    await env.DB.prepare('UPDATE subscribers SET subscribed = 0 WHERE unsubscribe_token_hash = ?1').bind(await hashUnsubscribeToken(token, env.UNSUBSCRIBE_SECRET)).run();
    return html('<!doctype html><title>You are unsubscribed</title><p>You have been unsubscribed from the SIMC mailing list.</p><p><a href="/">Return to SIMC</a></p>');
  } catch {
    return html('<!doctype html><title>Unsubscribe unavailable</title><p>We could not update your subscription. Please try again later.</p>', 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      if (!isSameOrigin(request)) return json({ ok: false, error: 'origin-not-allowed' }, 403);
      if (request.method !== 'POST') return methodNotAllowed('POST');
      return subscribe(request, env);
    }

    if (url.pathname === '/unsubscribe') return unsubscribe(request, env);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'not-found' }, 404);

    return env.ASSETS.fetch(request);
  },
};
