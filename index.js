const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }
  const res = await fetch('https://developers.syscom.mx/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SYSCOM_CLIENT_ID,
      client_secret: process.env.SYSCOM_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

app.get('/debug', (req, res) => {
  res.json({
    ok: true,
    hasClientId: !!process.env.SYSCOM_CLIENT_ID,
    hasClientSecret: !!process.env.SYSCOM_CLIENT_SECRET,
  });
});

app.all('/api/v1/*', async (req, res) => {
  try {
    const token = await getAccessToken();
    const syscomUrl = `https://developers.syscom.mx${req.originalUrl}`;
    const response = await fetch(syscomUrl, {
      method: req.method,
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const body = await response.text();
    res.status(response.status).set('Content-Type', 'application/json').send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
