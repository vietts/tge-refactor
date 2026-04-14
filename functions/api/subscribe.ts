/**
 * Cloudflare Pages Function — Brevo subscribe proxy.
 * Hides the Brevo API key and maps our form payload to Brevo contacts.
 *
 * Env vars (Cloudflare Pages > Settings > Environment variables):
 *   BREVO_API_KEY        — required, server-side only
 *   BREVO_LIST_ID        — numeric, the main TGE newsletter list
 *   BREVO_SLOVENIA_LIST  — optional, per-event list
 *   BREVO_GERMANY_LIST
 *   BREVO_TUSCANY_LIST
 */

type Env = {
  BREVO_API_KEY: string;
  BREVO_LIST_ID?: string;
  BREVO_SLOVENIA_LIST?: string;
  BREVO_GERMANY_LIST?: string;
  BREVO_TUSCANY_LIST?: string;
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const perEventList = (env: Env, slug: string): number | undefined => {
  const key = `BREVO_${slug.toUpperCase()}_LIST` as keyof Env;
  const v = env[key];
  return v ? Number(v) : undefined;
};

export const onRequestPost = async (ctx: PagesContext) => {
  const { request, env } = ctx;
  if (!env.BREVO_API_KEY) return json({ error: 'server_misconfigured' }, 500);

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = (payload.email ?? '').trim().toLowerCase();
  if (!email || !emailRegex.test(email)) return json({ error: 'invalid_email' }, 400);
  if (!payload.consent) return json({ error: 'consent_required' }, 400);

  const selectedEvents = Array.isArray(payload.events)
    ? payload.events.filter((s) => typeof s === 'string' && ['slovenia', 'germany', 'tuscany'].includes(s))
    : [];

  const listIds: number[] = [];
  if (env.BREVO_LIST_ID) listIds.push(Number(env.BREVO_LIST_ID));
  for (const slug of selectedEvents) {
    const id = perEventList(env, slug);
    if (id) listIds.push(id);
  }

  const attributes: Record<string, string> = {
    EVENT_INTEREST: selectedEvents.join(','),
    SIGNUP_SOURCE: payload.source ?? '/',
    SIGNUP_VARIANT: payload.variant ?? 'hub',
  };

  const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      attributes,
      listIds: listIds.length ? Array.from(new Set(listIds)) : undefined,
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
