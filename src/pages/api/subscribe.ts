/**
 * Astro API endpoint — Brevo subscribe proxy + Meta CAPI Lead event.
 *
 * Cloudflare Pages auto-injects @astrojs/cloudflare in SSR mode, so this
 * endpoint runs on Workers. Env vars come from `locals.runtime.env`.
 *
 * Env vars (Cloudflare Pages → Settings → Variables and secrets):
 *   BREVO_API_KEY         — required, server-side only
 *   BREVO_LIST_ID         — required, numeric master list id
 *   BREVO_ATTR_NAME       — optional, defaults to "EVENT_INTEREST"
 *   META_PIXEL_ID         — required for CAPI
 *   META_CAPI_TOKEN       — required for CAPI (system-user access token)
 *   META_TEST_EVENT_CODE  — optional, set during Events Manager test then remove
 */

import type { APIRoute } from 'astro';
// @ts-expect-error virtual module provided by @astrojs/cloudflare at runtime
import { env as cfEnv } from 'cloudflare:workers';

export const prerender = false;

type Env = {
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  BREVO_ATTR_NAME?: string;
  META_PIXEL_ID?: string;
  META_CAPI_TOKEN?: string;
  META_TEST_EVENT_CODE?: string;
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
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.error('capi_error', res.status, text);
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, status: res.status, body: text };
}

const handlePost: APIRoute = async ({ request }) => {
  // Astro 6 + @astrojs/cloudflare exposes env via the cloudflare:workers virtual module
  const env = cfEnv as Env;
  if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
    return json({ error: 'server_misconfigured', envKeys: Object.keys(env ?? {}) }, 500);
  }

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
    ? payload.events.filter((s): s is string => typeof s === 'string' && VALID_EVENTS.has(s))
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
  let capi: unknown = { skipped: 'no_consent_or_event_id' };
  if (payload.meta?.marketingConsent && payload.meta.eventId) {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
    const ua = request.headers.get('user-agent');
    capi = await sendCapiLead({
      env,
      email,
      events: incoming,
      ip,
      ua,
      meta: payload.meta,
    });
  }

  return json({ ok: true, capi });
};

export const POST: APIRoute = async (ctx) => {
  try {
    return await handlePost(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('subscribe_fatal', message, stack);
    return json({ error: 'fatal', message, stack }, 500);
  }
};

export const GET: APIRoute = () => json({ error: 'method_not_allowed' }, 405);
