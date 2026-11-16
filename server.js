// Relay Bridge (public version) — server
// Serves the static bridge page and proxies Relay API calls so the
// API key is NEVER sent to the browser. The key comes only from
// process.env.RELAY_API_KEY, set in PXXL as an environment variable.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RELAY_API = 'https://api.relay.link';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function relayError(res, status, body) {
  // Pass Relay's own error through honestly; never invent data.
  let message = 'Relay API error';
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    message = parsed.message || parsed.error || JSON.stringify(parsed);
  } catch (_) {
    if (body) message = String(body).slice(0, 500);
  }
  return res.status(status || 502).json({ error: message });
}

// POST /api/quote  { user, amountUsdc, recipient? }
// Returns Relay's quote/v2 response unchanged on success.
app.post('/api/quote', async (req, res) => {
  const apiKey = process.env.RELAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Relay API key is not configured on this server. Set RELAY_API_KEY in the hosting environment (PXXL env vars) and redeploy.',
    });
  }
  const { user, amountUsdc, recipient } = req.body || {};
  if (!user || !/^0x[0-9a-fA-F]{40}$/.test(user)) {
    return res.status(400).json({ error: 'A valid wallet address (user) is required for a quote.' });
  }
  const amount = Number(amountUsdc);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a number greater than 0.' });
  }
  // USDC has 6 decimals.
  const amountAtomic = BigInt(Math.round(amount * 1e6)).toString();

  try {
    const r = await fetch(`${RELAY_API}/quote/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        user,
        originChainId: 8453,
        destinationChainId: 42161,
        originCurrency: '0x833589fCD6eDb6E08f4c7C32D4f71b54bd029029', // USDC on Base
        destinationCurrency: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
        amount: amountAtomic,
        recipient: recipient || user,
        tradeType: 'EXACT_INPUT',
      }),
    });
    const text = await r.text();
    if (!r.ok) return relayError(res, r.status, text);
    res.type('application/json').send(text);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the Relay API: ' + err.message });
  }
});

// POST /api/status  { requestId }
// Returns Relay's intents/status/v3 response unchanged on success.
app.post('/api/status', async (req, res) => {
  const apiKey = process.env.RELAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Relay API key is not configured on this server. Set RELAY_API_KEY in the hosting environment (PXXL env vars) and redeploy.',
    });
  }
  const { requestId } = req.body || {};
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required.' });
  }
  try {
    const url = `${RELAY_API}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`;
    const r = await fetch(url, { headers: { 'x-api-key': apiKey } });
    const text = await r.text();
    if (!r.ok) return relayError(res, r.status, text);
    res.type('application/json').send(text);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the Relay API: ' + err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, keyConfigured: Boolean(process.env.RELAY_API_KEY) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Relay Bridge listening on port ${PORT}`);
});
