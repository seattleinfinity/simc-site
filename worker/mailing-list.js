const MAX_BODY_BYTES = 4096;

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    ...headers,
  },
});

export async function mailingList(request, env) {
  const url = new URL(request.url);
  const config = url.pathname === '/api/mailing-list/config';
  if (!config && url.pathname !== '/api/subscribe') return json({ error: 'Not found.' }, 404);
  if (request.method !== (config ? 'GET' : 'POST')) {
    return json({ error: 'Method not allowed.' }, 405, { Allow: config ? 'GET' : 'POST' });
  }
  if (!env.MAILING_LIST_DB || !env.SIGNUP_LIMITER || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) {
    return json({ error: 'Signup is temporarily unavailable. Please try again later.' }, 503);
  }
  if (config) return json({ siteKey: env.TURNSTILE_SITE_KEY });
  if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Please sign up from our website.' }, 403);
  }
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Expected JSON.' }, 415);
  }

  try {
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return json({ error: 'Signup is temporarily unavailable.' }, 503);
    // Anonymous signup has no account ID; allow room for shared school networks.
    const { success } = await env.SIGNUP_LIMITER.limit({ key: `signup:${ip}` });
    if (!success) return json({ error: 'Too many attempts. Please wait a minute.' }, 429, { 'Retry-After': '60' });

    // Bound the actual stream, including requests without Content-Length.
    if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
      return json({ error: 'Request too large.' }, 413);
    }
    let body = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    if (request.body) {
      for await (const chunk of request.body) {
        bytes += chunk.byteLength;
        if (bytes > MAX_BODY_BYTES) return json({ error: 'Request too large.' }, 413);
        body += decoder.decode(chunk, { stream: true });
      }
    }
    let data;
    try { data = JSON.parse(body + decoder.decode()); }
    catch { return json({ error: 'Invalid request.' }, 400); }
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const token = data?.token;
    if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)
      || email.split('@')[0].length > 64 || email.startsWith('.') || email.includes('..') || email.includes('.@')
      || email.split('@')[1].split('.').some((label) => label.length > 63)) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }
    if (typeof token !== 'string' || !token || token.length > 2048) {
      return json({ error: 'Please complete the security check.' }, 400);
    }
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok) throw new Error('Verification unavailable');
    const result = await verification.json();
    if (result.success !== true || result.hostname !== url.hostname || result.action !== 'mailing_list') {
      return json({ error: 'Security check expired or failed. Please try again.' }, 400);
    }
    await env.MAILING_LIST_DB.prepare(
      'INSERT INTO mailing_list_subscribers (email) VALUES (?) ON CONFLICT(email) DO NOTHING',
    ).bind(email).run();
    // Identical response for new and existing addresses prevents subscriber lookup.
    return json({ ok: true });
  } catch {
    // Never log submitted addresses, IPs, tokens, or upstream responses.
    return json({ error: 'Signup is temporarily unavailable. Please try again later.' }, 503);
  }
}
