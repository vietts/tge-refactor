/**
 * Cloudflare Pages Function — Brevo subscribe proxy + Meta CAPI Lead event.
 * Hides the Brevo and Meta tokens. All submissions go to one master list;
 * per-event interest is tracked in the EVENT_INTEREST contact attribute as a
 * comma-separated list that merges across multiple signups. When the user
 * grants marketing consent, the same Lead is also sent to Meta CAPI with the
 * shared eventId so it dedupes against the browser pixel.
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables):
 *   BREVO_API_KEY         — required, server-side only
 *   BREVO_LIST_ID         — required, numeric master list id
 *   BREVO_ATTR_NAME       — optional, defaults to "EVENT_INTEREST"
 *   META_PIXEL_ID         — required for CAPI
 *   META_CAPI_TOKEN       — required for CAPI (system-user access token)
 *   META_TEST_EVENT_CODE  — optional, used during Events Manager test
 */

type Env = {
  BREVO_API_KEY: string;
  BREVO_LIST_ID: string;
  BREVO_ATTR_NAME?: string;
  META_PIXEL_ID?: string;
  META_CAPI_TOKEN?: string;
  META_TEST_EVENT_CODE?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

type Payload = {
  email?: string;
  consent?: boolean;
  events?: string[];
  variant?: 'hub' | 'event';
  eventSegment?: 'slovenia' | 'germany' | 'tuscany' | null;
  source?: string;
  meta?: {
    eventId?: string;
    marketingConsent?: boolean;
    fbp?: string | null;
    fbc?: string | null;
    eventSourceUrl?: string;
  };
};

const VALID_EVENTS = new Set(['slovenia', 'germany', 'tuscany']);
const BREVO = 'https://api.brevo.com/v3';
const META_GRAPH = 'https://graph.facebook.com/v19.0';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendCapiLead(args: {
  env: Env;
  email: string;
  events: string[];
  ip: string | null;
  ua: string | null;
  meta: NonNullable<Payload['meta']>;
}) {
  const { env, email, events, ip, ua, meta } = args;
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { skipped: 'no_meta_env' };

  const emHash = await sha256Hex(email);
  const userData: Record<string, unknown> = { em: [emHash] };
  if (ip) userData.client_ip_address = ip;
  if (ua) userData.client_user_agent = ua;
  if (meta.fbp) userData.fbp = meta.fbp;
  if (meta.fbc) userData.fbc = meta.fbc;

  const payload: Record<string, unknown> = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: meta.eventId,
      event_source_url: meta.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: 'TGE Waitlist',
        content_category: events.length ? events.join(',') : 'hub',
        currency: 'EUR',
        value: 0,
      },
    }],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const res = await fetch(`${META_GRAPH}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_TOKEN}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('capi_error', res.status, text);
    return { ok: false, status: res.status };
  }
  return { ok: true };
}

export const onRequestPost = async ({ request, env }: PagesContext) => {
  if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) return json({ error: 'server_misconfigured' }, 500);

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  if (!email || !emailRegex.test(email)) return json({ error: 'invalid_email' }, 400);
  if (!payload.consent) return json({ error: 'consent_required' }, 400);

  const incoming = Array.isArray(payload.events)
    ? payload.events.filter((s) => typeof s === 'string' && VALID_EVENTS.has(s))
    : [];

  const attrName = env.BREVO_ATTR_NAME || 'EVENT_INTEREST';
  const listId = Number(env.BREVO_LIST_ID);
  const brevoHeaders = {
    'content-type': 'application/json',
    accept: 'application/json',
    'api-key': env.BREVO_API_KEY,
  };

  // Merge with existing attribute value (if contact already exists) so repeat
  // signups from different event LPs accumulate rather than overwrite.
  const merged = new Set<string>(incoming);
  const existing = await fetch(`${BREVO}/contacts/${encodeURIComponent(email)}`, { headers: brevoHeaders });
  if (existing.ok) {
    const data = (await existing.json()) as { attributes?: Record<string, string> };
    const prev = (data.attributes?.[attrName] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    prev.forEach((p) => merged.add(p));
  }

  const attributes: Record<string, string> = {
    [attrName]: [...merged].join(','),
    SIGNUP_SOURCE: payload.source ?? '/',
    SIGNUP_VARIANT: payload.variant ?? 'hub',
  };

  const brevoRes = await fetch(`${BREVO}/contacts`, {
    method: 'POST',
    headers: brevoHeaders,
    body: JSON.stringify({
      email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (!brevoRes.ok && brevoRes.status !== 204) {
    const body = await brevoRes.text().catch(() => '');
    console.error('brevo_error', brevoRes.status, body);
    return json({ error: 'brevo_failed', status: brevoRes.status }, 502);
  }

  // Meta CAPI: only when marketing consent was granted (mirrors browser pixel)
  if (payload.meta?.marketingConsent && payload.meta.eventId) {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
    const ua = request.headers.get('user-agent');
    await sendCapiLead({
      env,
      email,
      events: incoming,
      ip,
      ua,
      meta: payload.meta,
    });
  }

  return json({ ok: true });
};

export const onRequest = async (ctx: PagesContext) => {
  if (ctx.request.method === 'POST') return onRequestPost(ctx);
  return json({ error: 'method_not_allowed' }, 405);
};
