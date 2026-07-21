/**
 * functions/api/oauth-callback.js
 * Cloudflare Pages Function — pengganti api/oauth-callback.js (format Vercel).
 *
 * Cloudflare Pages Functions pakai Web API standard (Request / Response),
 * BUKAN format Node.js (req, res) yang dipakai Vercel.
 *
 * Deploy: letakkan file ini di /functions/api/oauth-callback.js di root project.
 * Cloudflare otomatis route /api/oauth-callback → fungsi ini.
 *
 * Env vars (set di Cloudflare Dashboard → Settings → Environment Variables):
 *   GITHUB_CLIENT_ID      — opsional, fallback ke body kalau tidak di-set
 *   GITHUB_CLIENT_SECRET  — opsional, fallback ke body kalau tidak di-set
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body harus JSON' }, 400);
  }

  const { code, client_id: bodyClientId, client_secret: bodyClientSecret } = body;

  if (!code) {
    return json({ error: 'Missing code' }, 400);
  }

  // Prioritaskan env vars server; fallback ke body untuk mode testing lokal.
  const client_id     = env.GITHUB_CLIENT_ID     || bodyClientId;
  const client_secret = env.GITHUB_CLIENT_SECRET  || bodyClientSecret;

  if (!client_id || !client_secret) {
    return json(
      { error: 'Client ID / Secret tidak ada — set env var di Cloudflare Dashboard atau isi kolom di halaman' },
      500
    );
  }

  try {
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Cloudflare Workers wajib set User-Agent
        'User-Agent': 'gitpush-cf-pages/1.0',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    if (!ghRes.ok) {
      return json({ error: `GitHub merespons ${ghRes.status}` }, 502);
    }

    const data = await ghRes.json();

    if (data.error) {
      return json({ error: data.error_description || data.error }, 400);
    }

    // Kirim hanya access_token ke browser — jangan forward field lain.
    return json({ access_token: data.access_token });

  } catch (err) {
    return json({ error: 'Gagal menghubungi GitHub: ' + err.message }, 500);
  }
}

// Tolak method lain (GET, DELETE, dsb.)
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'POST')    return onRequestPost({ request, env });
  return json({ error: 'Method not allowed' }, 405);
}

// ---- helper ----
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
