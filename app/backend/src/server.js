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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${process.env.APP_COLOR || 'blue'}] Server v${process.env.APP_VERSION || '1.0.0'} listening on :${PORT}`);
  });
}

module.exports = app;
