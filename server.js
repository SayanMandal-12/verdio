require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 4173;
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/verify-turnstile', async (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!token) return res.status(400).json({ success: false, error: 'Captcha verification is required.' });
  if (!process.env.TURNSTILE_SECRET_KEY) return res.status(503).json({ success: false, error: 'Captcha verification is not configured on the server.' });
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: req.ip }) });
    const result = await response.json();
    if (!result.success) return res.status(403).json({ success: false, error: 'Captcha verification failed. Please try again.' });
    return res.json({ success: true });
  } catch {
    return res.status(502).json({ success: false, error: 'Captcha verification is temporarily unavailable.' });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`verdio running at http://localhost:${port}`));
