/**
 * Cloudflare Pages Function — Brevo subscribe proxy.
 * Hides the Brevo API key. All submissions go to one master list;
 * per-event interest is tracked in the EVENT_INTEREST contact attribute
 * as a comma-separated list that merges across multiple signups.
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables):
 *   BREVO_API_KEY   — required, server-side only
 *   BREVO_LIST_ID   — required, numeric master list id
 *   BREVO_ATTR_NAME — optional, defaults to "EVENT_INTEREST"
 */

type Env = {
  BREVO_API_KEY: string;
  BREVO_LIST_ID: string;
  BREVO_ATTR_NAME?: string;
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
};

const VALID_EVENTS = new Set(['slovenia', 'germany', 'tuscany']);
const BREVO = 'https://api.brevo.com/v3';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

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
  // signups from different events accumulate rather than overwrite.
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

  return json({ ok: true });
};

export const onRequest = async (ctx: PagesContext) => {
  if (ctx.request.method === 'POST') return onRequestPost(ctx);
  return json({ error: 'method_not_allowed' }, 405);
};
