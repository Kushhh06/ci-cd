const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'notes.json');

app.use(cors());
app.use(express.json());

// ── Persistence ───────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadNotes() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveNotes(list) {
  ensureDataDir();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

let notes = loadNotes();
let nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;

// ── AI ───────────────────────────────────────────────────
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Routes ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.APP_VERSION || '1.0.0',
    color: process.env.APP_COLOR || 'blue',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/notes', (req, res) => {
  notes = loadNotes();
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const note = { id: nextId++, title, content, createdAt: new Date().toISOString() };
  notes.push(note);
  saveNotes(notes);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  notes.splice(idx, 1);
  saveNotes(notes);
  res.status(204).send();
});

app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (!genAI) {
    return res.json({ response: 'Gemini AI is not configured. Please set the GEMINI_API_KEY environment variable.' });
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = context
      ? `You are a helpful assistant for a notes app. Here are the user's notes:\n\n${context}\n\nUser: ${message}\n\nRespond helpfully and concisely.`
      : message;
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please try again.' });
  }
});

app.post('/api/summarise', async (req, res) => {
  const { notes: inputNotes } = req.body;
  if (!inputNotes || inputNotes.length === 0) {
    return res.status(400).json({ error: 'No notes provided' });
  }
  if (!genAI) {
    return res.json({ summary: 'Gemini AI is not configured. Please set the GEMINI_API_KEY environment variable.' });
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const text = inputNotes.map((n, i) => `${i + 1}. ${n.title}: ${n.content}`).join('\n');
    const result = await model.generateContent(
      `Summarise these notes concisely in 3-5 bullet points:\n\n${text}`
    );
    res.json({ summary: result.response.text() });
  } catch (err) {
    console.error('Gemini summarise error:', err.message);
    res.status(500).json({ error: 'Could not summarise notes.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${process.env.APP_COLOR || 'blue'}] AI Notes v${process.env.APP_VERSION || '1.0.0'} on :${PORT}`);
  });
}

// Test-only helper — attached to app so it survives module.exports = app
app._resetForTest = () => {
  notes.length = 0;
  nextId = 1;
  try { fs.unlinkSync(DATA_FILE); } catch {}
};

module.exports = app;





