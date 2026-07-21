// api/oauth-callback.js
// Vercel serverless function.
// This is the ONLY piece of this project that runs on a server.
// Its single job: take the temporary "code" GitHub sends back after login,
// and exchange it for an access_token using the Client Secret.
//
// TESTING MODE: this version accepts client_id/client_secret in the request
// body, sent from the browser's input fields. This still keeps the Secret
// out of the page's SOURCE CODE, but it does travel through this server on
// every request — fine for solo testing, not for a public multi-user tool.
// For a public deployment, remove the body fallback below and rely only on
// process.env.GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET set in Vercel.

export default async function handler(req, res) {
  // Allow the browser page to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, client_id: bodyClientId, client_secret: bodyClientSecret } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  // Prefer server env vars if set; otherwise fall back to what the browser sent (testing mode).
  const client_id = process.env.GITHUB_CLIENT_ID || bodyClientId;
  const client_secret = process.env.GITHUB_CLIENT_SECRET || bodyClientSecret;

  if (!client_id || !client_secret) {
    return res.status(500).json({ error: 'Client ID / Secret tidak ada — isi di env var server atau kolom halaman' });
  }

  try {
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ client_id, client_secret, code })
    });

    const data = await ghRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error_description || data.error });
    }

    // Return only the access token to the browser — nothing else sensitive.
    return res.status(200).json({ access_token: data.access_token });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menghubungi GitHub: ' + err.message });
  }
}

