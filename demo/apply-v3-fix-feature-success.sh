#!/usr/bin/env bash
# Demo Update v3 — fixes the bug from v2 AND adds a "Summarise notes" AI feature.
# Pipeline will: Build ✅ Test ✅ Deploy ✅
# App updates: users now see a "Summarise All" button powered by Gemini.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying v3: fix broken server + add AI summarise feature..."

# ── 1. Restore server.js to a clean state ──────────────────
cat > "$ROOT/app/backend/src/server.js" << 'SERVEREOF'
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const notes = [];
let noteIdCounter = 1;

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.APP_VERSION || '1.0.0',
    color: process.env.APP_COLOR || 'blue',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/notes', (req, res) => {
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const note = {
    id: noteIdCounter++,
    title,
    content,
    createdAt: new Date().toISOString()
  };
  notes.push(note);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  notes.splice(idx, 1);
  res.status(204).send();
});

app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!genAI) {
    return res.json({
      response: 'Gemini AI is not configured. Set the GEMINI_API_KEY environment variable to enable AI features.'
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = context
      ? `You are a helpful assistant for a notes app. Here are the user's current notes:\n\n${context}\n\nUser question: ${message}\n\nAnswer helpfully and concisely.`
      : message;
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// NEW in v3: summarise all notes with Gemini
app.post('/api/summarise', async (req, res) => {
  if (!genAI) {
    return res.json({ summary: 'Set GEMINI_API_KEY to enable AI summarisation.' });
  }
  if (notes.length === 0) {
    return res.json({ summary: 'No notes to summarise yet!' });
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const noteText = notes.map(n => `**${n.title}**: ${n.content}`).join('\n\n');
    const result = await model.generateContent(
      `Summarise these notes in 3-5 bullet points:\n\n${noteText}`
    );
    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error('Gemini summarise error:', err.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${process.env.APP_COLOR || 'blue'}] Server v${process.env.APP_VERSION || '1.0.0'} listening on :${PORT}`);
  });
}

module.exports = app;
SERVEREOF

# ── 2. Add Summarise button to the frontend ────────────────
# Add button after the notes card h2
sed -i 's|<h2>Your Notes <span id="note-count" class="count"></span></h2>|<h2>Your Notes <span id="note-count" class="count"></span> <button id="summarise-btn" style="float:right;font-size:0.75rem;padding:0.25rem 0.65rem;background:#0f172a;border:1px solid #334155;color:#94a3b8;border-radius:6px;cursor:pointer;">✨ Summarise</button></h2>|' \
  "$ROOT/app/frontend/public/index.html"

# Add summarise handler to app.js
cat >> "$ROOT/app/frontend/public/app.js" << 'JSEOF'

// v3: Summarise all notes with Gemini
document.getElementById('summarise-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('summarise-btn');
  btn.textContent = '…';
  btn.disabled = true;
  appendMsg('You', 'Summarise all my notes', 'user');
  const thinking = appendMsg('AI', 'Summarising…', 'thinking');
  try {
    const res = await fetch('/api/summarise', { method: 'POST' });
    const d = await res.json();
    thinking.remove();
    appendMsg('AI', d.summary || d.error, 'ai');
  } catch {
    thinking.remove();
    appendMsg('AI', 'Failed to summarise notes.', 'ai');
  }
  btn.textContent = '✨ Summarise';
  btn.disabled = false;
});
JSEOF

echo "Done. Now commit and watch v3 deploy:"
echo ""
echo "  git add -A && git commit -m 'fix: syntax error; feat: AI summarise endpoint'"
echo ""
echo "Jenkins: Build ✅ → Test ✅ → Deploy ✅"
echo "App updates live — deployment badge switches colour. New Summarise button appears."
