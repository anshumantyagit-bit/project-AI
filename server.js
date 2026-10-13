import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT) || 3000;
const model = process.env.OPENAI_MODEL || 'gpt-6-luna';

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/status', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ configured: Boolean(process.env.OPENAI_API_KEY), model });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 40) {
    return res.status(400).json({ error: 'Send between 1 and 40 messages.' });
  }

  const validMessages = messages.every(message =>
    message && ['user', 'assistant'].includes(message.role) &&
    typeof message.content === 'string' && message.content.trim().length > 0 &&
    message.content.length <= 4000
  );
  if (!validMessages) {
    return res.status(400).json({ error: 'Each message must have a user or assistant role and contain 1–4000 characters.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(503).json({ error: 'The API key is not configured. Add OPENAI_API_KEY to your .env file and restart the server.' });
  }

  try {
    const openai = new OpenAI({ apiKey, timeout: 90_000, maxRetries: 1 });
    const response = await openai.responses.create({
      model,
      input: messages.map(({ role, content }) => ({ role, content: content.trim() })),
      store: false
    });
    const reply = response.output_text?.trim();
    if (!reply) return res.status(502).json({ error: 'The model returned no text. Please try again.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('OpenAI request failed:', error.status || 'network error', error.code || error.name || 'unknown');

    if (error.status === 401) {
      return res.status(401).json({ error: 'OpenAI rejected the API key. Check that OPENAI_API_KEY in .env is valid, then restart the server.' });
    }
    if (error.status === 403) {
      return res.status(403).json({ error: 'This API key does not have access to the selected model or project.' });
    }
    if (error.status === 429) {
      const quotaIssue = error.code === 'insufficient_quota' || error.error?.code === 'insufficient_quota';
      return res.status(429).json({ error: quotaIssue
        ? 'The OpenAI API project has no available quota. Check API billing and usage limits.'
        : 'OpenAI rate limit reached. Wait a moment and try again.' });
    }
    if (error.status === 404) {
      return res.status(502).json({ error: `The model “${model}” is unavailable to this API project. Set OPENAI_MODEL in .env to a model your project can use.` });
    }
    if (error.status >= 500) {
      return res.status(502).json({ error: 'OpenAI is temporarily unavailable. Please try again shortly.' });
    }
    if (error.name === 'APIConnectionTimeoutError' || error.name === 'APIConnectionError') {
      return res.status(502).json({ error: 'Could not reach OpenAI. Check your internet connection and try again.' });
    }
    return res.status(500).json({ error: 'The server could not complete the AI request. Check the server log for details.' });
  }
});

app.use(express.static(__dirname, { index: false }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'webpage.html')));

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }
  console.error('Server request failed:', error.message);
  return res.status(500).json({ error: 'The server could not process the request.' });
});

app.listen(port, () => console.log(`Anshuman's AI running at http://localhost:${port}`));
