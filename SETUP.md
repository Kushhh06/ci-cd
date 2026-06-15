# AI Notes — CI/CD Demo with Docker + Jenkins + Gemini AI

A full-stack AI-powered notes app with a complete CI/CD pipeline featuring **zero-downtime blue-green deployment**, automated testing, and three live demo scenarios.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Initial Setup](#5-initial-setup)
6. [All Source Code](#6-all-source-code)
   - [Backend](#61-backend)
   - [Frontend](#62-frontend)
   - [Nginx (Reverse Proxy)](#63-nginx-reverse-proxy)
   - [Jenkins CI/CD](#64-jenkins-cicd)
   - [Scripts](#65-scripts)
   - [Demo Scripts](#66-demo-scripts)
7. [Running the Demo](#7-running-the-demo)
   - [Demo v1 — UI Change (SUCCESS)](#demo-v1--ui-change-success)
   - [Demo v2 — Broken Build (FAIL, App Stays Live)](#demo-v2--broken-build-fail-app-stays-live)
   - [Demo v3 — Fix & Redeploy (SUCCESS)](#demo-v3--fix--redeploy-success)
8. [Blue-Green Deployment Explained](#8-blue-green-deployment-explained)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. What This Project Does

| Feature | Detail |
|---|---|
| **App** | AI Notes — create, delete, and chat about notes with Gemini AI |
| **CI/CD** | Jenkins pipeline: Build → Test → Deploy → Verify |
| **Deployment** | Zero-downtime blue-green (nginx switches instantly, no restart) |
| **AI** | Google Gemini (`gemini-flash-lite-latest`) — chat + summarise |
| **Persistence** | JSON file stored in a Docker named volume (survives container restarts) |
| **Tests** | 12 Jest + Supertest tests run inside Docker before every deploy |
| **Demo** | 3 scripted scenarios: UI change ✅, broken build ❌, fix ✅ |

---

## 2. Architecture Overview

```
Browser
  │
  ▼
┌─────────────────────────────────────────────┐
│  nginx-proxy  (port 80)                     │
│  Routes /api/* → backend                   │
│  Routes /*    → frontend                   │
│  upstream.conf rewritten on every deploy   │
└────────┬──────────────────┬────────────────┘
         │                  │
         ▼                  ▼
  ┌─────────────┐    ┌──────────────┐
  │  backend    │    │  frontend    │
  │  blue OR    │    │  blue OR     │
  │  green      │    │  green       │
  │  Node.js    │    │  nginx SPA   │
  │  :3000      │    │  :80         │
  └──────┬──────┘    └──────────────┘
         │  /data volume (notes.json)
         ▼
  ┌──────────────┐
  │  ai-notes-   │
  │  data volume │
  └──────────────┘

┌─────────────────────────────────────────────┐
│  Jenkins  (port 8080)                        │
│  Polls git every 60s → runs Jenkinsfile      │
│  Runs tests inside Docker, then deploy.sh    │
└─────────────────────────────────────────────┘
```

### Blue-Green Flow

```
Commit pushed
     │
     ▼
Jenkins detects change (SCM poll)
     │
     ├─ Build Docker images
     ├─ Run tests in container
     │       │
     │   FAIL? ──► Stop here. Old container still live. Zero downtime.
     │       │
     │   PASS?
     │       │
     ├─ Start NEW color container (blue↔green)
     ├─ Health check new container
     ├─ Rewrite nginx upstream.conf → reload nginx (instant, no downtime)
     ├─ Stop OLD color container
     └─ Verify live endpoint
```

---

## 3. Project Structure

```
ci-cd/
├── app/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── src/
│   │   │   └── server.js          ← Express API + Gemini AI
│   │   └── test/
│   │       └── server.test.js     ← 12 Jest tests
│   └── frontend/
│       ├── Dockerfile
│       ├── nginx.conf             ← SPA nginx config
│       └── public/
│           ├── index.html
│           ├── style.css
│           └── app.js
├── jenkins/
│   ├── Dockerfile                 ← Jenkins + Docker CLI
│   ├── plugins.txt
│   └── casc/
│       └── jenkins.yaml           ← JCasC auto-configuration
├── nginx/
│   ├── nginx.conf                 ← Reverse proxy config
│   └── conf.d/
│       └── upstream.conf          ← Written by deploy.sh on each deploy
├── scripts/
│   ├── deploy.sh                  ← Blue-green deploy logic
│   └── health-check.sh            ← Post-deploy verification
├── demo/
│   ├── apply-v1-ui-success.sh
│   ├── apply-v2-broken-fail.sh
│   └── apply-v3-fix-feature-success.sh
├── docker-compose.yml             ← Jenkins + nginx-proxy only
├── Jenkinsfile
├── .env                           ← NEVER commit — has real API key
├── .env.example
└── .gitignore
```

---

## 4. Prerequisites

- **Docker** (with Docker Compose)
- **Git**
- **A Gemini API key** — get one free at https://aistudio.google.com/apikey

Check your Docker socket GID (needed for Jenkins to run docker commands):

```bash
stat -c '%g' /var/run/docker.sock
```

If it is not `124`, update line 14 of `jenkins/Dockerfile` to match:

```dockerfile
RUN if getent group docker; then groupmod -g YOUR_GID docker; else groupadd -g YOUR_GID docker; fi \
 && usermod -aG docker jenkins
```

---

## 5. Initial Setup

### Step 1 — Clone and configure

```bash
git clone <your-repo-url> ci-cd
cd ci-cd
```

Create your `.env` file (never commit this):

```bash
cp .env.example .env
# Edit .env and paste your real Gemini API key
nano .env
```

`.env` should contain:

```
GEMINI_API_KEY=your_actual_key_here
```

### Step 2 — Initialise git (if not already done)

The Jenkins pipeline polls a local git repo. Make sure you have at least one commit:

```bash
git init
git add -A
git commit -m "initial commit"
```

### Step 3 — Start the infrastructure

```bash
docker compose up -d --build
```

This starts:
- **Jenkins** on `http://localhost:8080`
- **nginx-proxy** on `http://localhost` (port 80) — shows 502 until first deploy

Check both are running:

```bash
docker compose ps
```

### Step 4 — Wait for Jenkins to finish booting (~60–90 seconds)

```bash
docker logs -f jenkins
# Wait until you see: "Jenkins is fully up and running"
# Press Ctrl+C to stop following logs
```

### Step 5 — Trigger the first build

Open `http://localhost:8080` in your browser.

- Login: `admin` / `admin123`
- Open the **ai-notes-pipeline** job
- Click **Build Now**

Watch the pipeline run. When it goes green, your app is live at `http://localhost`.

---

## 6. All Source Code

### 6.1 Backend

#### `app/backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY test/ ./test/

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
```

#### `app/backend/package.json`

```json
{
  "name": "ai-notes-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "test": "jest --forceExit --detectOpenHandles"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

#### `app/backend/src/server.js`

```javascript
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
```

#### `app/backend/test/server.test.js`

```javascript
process.env.DATA_DIR = '/tmp/ai-notes-test-' + process.pid;

const request = require('supertest');
const app = require('../src/server');
const { _resetForTest } = app;

beforeEach(() => _resetForTest());

describe('Health Endpoint', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Notes API', () => {
  it('GET /api/notes returns an empty array initially', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('POST /api/notes creates a new note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test Note', content: 'This is test content' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Test Note');
    expect(res.body.content).toBe('This is test content');
    expect(res.body.createdAt).toBeDefined();
  });

  it('POST /api/notes persists note and GET returns it', async () => {
    await request(app).post('/api/notes').send({ title: 'Persisted', content: 'Should survive' });
    const res = await request(app).get('/api/notes');
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Persisted');
  });

  it('POST /api/notes returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/notes').send({ content: 'No title here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/notes returns 400 when content is missing', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'No content here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/notes/:id removes a note', async () => {
    const create = await request(app)
      .post('/api/notes')
      .send({ title: 'To Delete', content: 'Will be deleted' });
    const id = create.body.id;

    const del = await request(app).delete(`/api/notes/${id}`);
    expect(del.status).toBe(204);

    const list = await request(app).get('/api/notes');
    expect(list.body.length).toBe(0);
  });

  it('DELETE /api/notes/:id returns 404 for non-existent note', async () => {
    const res = await request(app).delete('/api/notes/99999');
    expect(res.status).toBe(404);
  });
});

describe('Chat API', () => {
  it('POST /api/chat returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/chat returns a response (no API key = friendly fallback)', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'Hello AI' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
  });
});

describe('Summarise API', () => {
  it('POST /api/summarise returns 400 when notes is empty', async () => {
    const res = await request(app).post('/api/summarise').send({ notes: [] });
    expect(res.status).toBe(400);
  });

  it('POST /api/summarise returns summary (no API key = friendly fallback)', async () => {
    const res = await request(app)
      .post('/api/summarise')
      .send({ notes: [{ title: 'Test', content: 'Content here' }] });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });
});
```

---

### 6.2 Frontend

#### `app/frontend/Dockerfile`

```dockerfile
FROM nginx:1.25-alpine

COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

#### `app/frontend/nginx.conf`

```nginx
events { worker_connections 512; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;

  server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri /index.html;
    }
  }
}
```

#### `app/frontend/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Notes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <!-- Header -->
  <header>
    <div class="header-inner">
      <div class="brand">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <span class="brand-name">AI Notes <span style="font-size:.7em;font-weight:400;opacity:.7">v2</span></span>
      </div>
      <div id="deploy-badge" class="badge">
        <span class="badge-dot"></span>
        <span id="badge-text">Connecting…</span>
      </div>
    </div>
  </header>

  <!-- Main Layout -->
  <main>

    <!-- Left Column -->
    <aside class="sidebar">

      <!-- Add Note -->
      <div class="panel">
        <div class="panel-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Note
        </div>
        <form id="note-form" class="note-form">
          <input id="note-title" type="text" placeholder="Title…" autocomplete="off" required />
          <textarea id="note-content" rows="4" placeholder="What's on your mind?…" required></textarea>
          <button type="submit" class="btn btn-primary" id="add-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Note
          </button>
        </form>
      </div>

      <!-- AI Chat -->
      <div class="panel ai-panel">
        <div class="panel-header">
          <span class="ai-dot"></span>
          AI Assistant
          <button id="summarise-btn" class="btn-pill" onclick="summariseNotes()">✨ Summarise</button>
        </div>
        <div id="chat-messages" class="chat-messages">
          <div class="chat-msg bot">
            <div class="msg-bubble">👋 Hi! Ask me anything about your notes, or hit <strong>Summarise</strong> to get an overview.</div>
          </div>
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Ask about your notes…" autocomplete="off" />
          <button class="btn btn-primary btn-icon" id="chat-send-btn" onclick="sendChat()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

    </aside>

    <!-- Notes Area -->
    <section class="notes-area">
      <div class="notes-header">
        <h2>Your Notes</h2>
        <span id="notes-count" class="count-chip">0 notes</span>
      </div>
      <div id="notes-grid" class="notes-grid">
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">📭</div>
          <p class="empty-title">No notes yet</p>
          <p class="empty-sub">Add your first note using the form on the left</p>
        </div>
      </div>
    </section>

  </main>

  <script src="app.js"></script>
</body>
</html>
```

#### `app/frontend/public/style.css`

```css
/* ── Reset ───────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Design tokens ───────────────────────────────────────── */
:root {
  --bg:           #0d1117;
  --bg-2:         #111827;
  --surface:      #161b22;
  --surface-2:    #1c2433;
  --border:       #21262d;
  --border-2:     #30363d;
  --text:         #e6edf3;
  --text-muted:   #8b949e;
  --text-subtle:  #484f58;
  --accent:       #8b5cf6;
  --accent-hover: #a78bfa;
  --accent-glow:  rgba(139, 92, 246, 0.15);
  --green:        #3fb950;
  --green-dim:    rgba(63,185,80,.15);
  --green-border: rgba(63,185,80,.3);
  --blue-dim:     rgba(139,92,246,.12);
  --blue-border:  rgba(139,92,246,.3);
  --red:          #f85149;
  --purple:       #bc8cff;
  --purple-glow:  rgba(188,140,255,.2);
  --radius:       12px;
  --radius-sm:    7px;
}

/* ── Base ────────────────────────────────────────────────── */
html { font-size: 15px; scroll-behavior: smooth; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ── Header ──────────────────────────────────────────────── */
header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: rgba(13,17,23,.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 13px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-icon {
  width: 34px; height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(139,92,246,.35);
}
.brand-icon svg { color: #fff; }
.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #f0f6fc;
}

/* ── Badge ───────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 14px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: .02em;
  transition: all .4s ease;
}
.badge.blue  { background: var(--blue-dim);  border-color: var(--blue-border);  color: var(--accent-hover); }
.badge.green { background: var(--green-dim); border-color: var(--green-border); color: var(--green); }

.badge-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--text-subtle);
  flex-shrink: 0;
  transition: all .4s;
}
.badge.blue  .badge-dot { background: var(--accent); box-shadow: 0 0 0 3px var(--blue-dim); animation: pulse-blue 2s infinite; }
.badge.green .badge-dot { background: var(--green);  box-shadow: 0 0 0 3px var(--green-dim); animation: pulse-green 2s infinite; }

/* ── Main layout ─────────────────────────────────────────── */
main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  align-items: start;
  min-height: calc(100vh - 62px);
}

/* ── Sidebar ─────────────────────────────────────────────── */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 78px;
}

/* ── Panels ──────────────────────────────────────────────── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 16px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: .03em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}
.panel-header svg { flex-shrink: 0; }

/* ── Note form ───────────────────────────────────────────── */
.note-form {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input[type="text"],
textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border-2);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  color: var(--text);
  font-family: inherit;
  font-size: .875rem;
  transition: border-color .2s, box-shadow .2s;
  resize: none;
}
input[type="text"]:focus,
textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
input::placeholder, textarea::placeholder { color: var(--text-subtle); }
textarea { min-height: 90px; }

/* ── Buttons ─────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: .875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all .15s;
}
.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-primary:hover { background: var(--accent-hover); box-shadow: 0 0 0 3px var(--accent-glow); }
.btn-primary:active { transform: scale(.97); }

.btn-icon { padding: 9px 12px; }

.btn-pill {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 99px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  color: var(--text-muted);
  font-family: inherit;
  font-size: .75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.btn-pill:hover { background: var(--surface-2); color: var(--text); border-color: var(--border-2); }

.btn-delete {
  background: none;
  border: none;
  padding: 5px;
  border-radius: 6px;
  color: var(--text-subtle);
  cursor: pointer;
  transition: all .15s;
  flex-shrink: 0;
}
.btn-delete:hover { background: rgba(248,81,73,.12); color: var(--red); }

/* ── AI Panel ────────────────────────────────────────────── */
.ai-panel { display: flex; flex-direction: column; }

.ai-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--purple);
  flex-shrink: 0;
  animation: pulse-purple 2s infinite;
  box-shadow: 0 0 0 3px var(--purple-glow);
}

.chat-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 10px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-2) transparent;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 4px; }

.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.bot  { justify-content: flex-start; }

.msg-bubble {
  max-width: 85%;
  padding: 9px 13px;
  border-radius: 12px;
  font-size: .84rem;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.chat-msg.user .msg-bubble {
  background: var(--accent);
  color: #fff;
  border-radius: 12px 12px 3px 12px;
}
.chat-msg.bot .msg-bubble {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-2);
  border-radius: 3px 12px 12px 12px;
}

/* Typing dots */
.typing-dots { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.typing-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-subtle);
  animation: bounce-dot 1.4s infinite ease-in-out;
}
.typing-dots span:nth-child(2) { animation-delay: .2s; }
.typing-dots span:nth-child(3) { animation-delay: .4s; }

.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
}
.chat-input-row input { flex: 1; }

/* ── Notes Area ──────────────────────────────────────────── */
.notes-area { display: flex; flex-direction: column; gap: 16px; }

.notes-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.notes-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f0f6fc;
  letter-spacing: -.02em;
}
.count-chip {
  padding: 3px 10px;
  border-radius: 99px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  font-size: .75rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* ── Notes Grid ──────────────────────────────────────────── */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  align-content: start;
}

.note-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  transition: border-color .2s, box-shadow .2s, transform .15s;
  animation: slide-in .2s ease;
  position: relative;
}
.note-card:hover {
  border-color: var(--border-2);
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
  transform: translateY(-2px);
}

.note-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.note-title {
  font-size: .92rem;
  font-weight: 600;
  color: #f0f6fc;
  line-height: 1.3;
  flex: 1;
  word-break: break-word;
}
.note-body {
  font-size: .82rem;
  color: var(--text-muted);
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  flex: 1;
}
.note-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  border-top: 1px solid var(--border);
  padding-top: 9px;
  margin-top: 2px;
}
.note-date {
  font-size: .72rem;
  color: var(--text-subtle);
  flex: 1;
}
.note-tag {
  padding: 2px 7px;
  border-radius: 99px;
  background: var(--blue-dim);
  border: 1px solid var(--blue-border);
  color: var(--accent-hover);
  font-size: .68rem;
  font-weight: 600;
}

/* ── Empty state ─────────────────────────────────────────── */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 24px;
  animation: slide-in .3s ease;
}
.empty-icon { font-size: 3rem; opacity: .5; }
.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
}
.empty-sub {
  font-size: .82rem;
  color: var(--text-subtle);
  text-align: center;
  max-width: 220px;
}

/* ── Animations ──────────────────────────────────────────── */
@keyframes slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-blue {
  0%,100% { box-shadow: 0 0 0 2px rgba(56,139,253,.2); }
  50%      { box-shadow: 0 0 0 5px rgba(56,139,253,.05); }
}
@keyframes pulse-green {
  0%,100% { box-shadow: 0 0 0 2px rgba(63,185,80,.2); }
  50%      { box-shadow: 0 0 0 5px rgba(63,185,80,.05); }
}
@keyframes pulse-purple {
  0%,100% { box-shadow: 0 0 0 3px var(--purple-glow); }
  50%      { box-shadow: 0 0 0 6px rgba(188,140,255,.05); }
}
@keyframes bounce-dot {
  0%,80%,100% { transform: translateY(0); }
  40%         { transform: translateY(-5px); }
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 900px) {
  main {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .sidebar { position: static; }
  .chat-messages { max-height: 240px; }
}
@media (max-width: 480px) {
  .header-inner { padding: 11px 16px; }
  main { padding: 12px; gap: 14px; }
  .notes-grid { grid-template-columns: 1fr; }
}
```

#### `app/frontend/public/app.js`

```javascript
// ── State ─────────────────────────────────────────────────
let notes = [];

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  refreshBadge();
  setInterval(refreshBadge, 15000);

  document.getElementById('note-form').addEventListener('submit', addNote);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  });
});

// ── Badge ─────────────────────────────────────────────────
async function refreshBadge() {
  const badge = document.getElementById('deploy-badge');
  const text  = document.getElementById('badge-text');
  try {
    const data = await fetchJSON('/api/health');
    const color = data.color || 'blue';
    badge.className = `badge ${color}`;
    text.textContent = `${color.toUpperCase()} · v${data.version}`;
  } catch {
    badge.className = 'badge';
    text.textContent = 'Offline';
  }
}

// ── Notes ─────────────────────────────────────────────────
async function loadNotes() {
  try {
    notes = await fetchJSON('/api/notes');
    renderNotes();
  } catch (err) {
    console.error('Failed to load notes', err);
  }
}

function renderNotes() {
  const grid  = document.getElementById('notes-grid');
  const chip  = document.getElementById('notes-count');
  chip.textContent = notes.length === 1 ? '1 note' : `${notes.length} notes`;

  if (notes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">No notes yet</p>
        <p class="empty-sub">Add your first note using the form on the left</p>
      </div>`;
    return;
  }

  grid.innerHTML = [...notes].reverse().map(n => `
    <div class="note-card" id="note-${n.id}">
      <div class="note-card-top">
        <div class="note-title">${esc(n.title)}</div>
        <button class="btn-delete" onclick="deleteNote(${n.id})" title="Delete note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
      <div class="note-body">${esc(n.content)}</div>
      <div class="note-footer">
        <span class="note-date">${fmtDate(n.createdAt)}</span>
        <span class="note-tag">Note</span>
      </div>
    </div>
  `).join('');
}

async function addNote(e) {
  e.preventDefault();
  const title   = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  const btn     = document.getElementById('add-btn');
  if (!title || !content) return;

  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    const note = await fetchJSON('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    notes.push(note);
    renderNotes();
    e.target.reset();
  } catch {
    alert('Failed to save note. Please try again.');
  }

  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Add Note`;
  btn.disabled = false;
}

async function deleteNote(id) {
  const card = document.getElementById(`note-${id}`);
  if (card) { card.style.opacity = '.4'; card.style.pointerEvents = 'none'; }
  try {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    notes = notes.filter(n => n.id !== id);
    renderNotes();
  } catch {
    if (card) { card.style.opacity = '1'; card.style.pointerEvents = ''; }
    alert('Failed to delete note.');
  }
}

// ── AI Chat ───────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = '';
  addBubble('user', msg);
  const typing = addTyping();

  try {
    const context = notes.map(n => `[${n.title}]: ${n.content}`).join('\n');
    const data = await fetchJSON('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, context })
    });
    typing.remove();
    addBubble('bot', data.response || data.error || 'No response.');
  } catch {
    typing.remove();
    addBubble('bot', '⚠️ Could not reach AI. Please try again.');
  }
}

async function summariseNotes() {
  if (notes.length === 0) {
    addBubble('bot', '📭 You have no notes to summarise yet!');
    return;
  }
  addBubble('user', '✨ Summarise my notes');
  const typing = addTyping();

  try {
    const data = await fetchJSON('/api/summarise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    typing.remove();
    addBubble('bot', data.summary || data.error || 'Could not summarise.');
  } catch {
    typing.remove();
    addBubble('bot', '⚠️ Could not summarise right now.');
  }
}

// ── Chat helpers ──────────────────────────────────────────
function addBubble(role, text) {
  const container = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${role}`;
  wrap.innerHTML = `<div class="msg-bubble">${esc(text)}</div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function addTyping() {
  const container = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg bot';
  wrap.innerHTML = `<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

// ── Utilities ─────────────────────────────────────────────
async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
```

---

### 6.3 Nginx (Reverse Proxy)

#### `nginx/nginx.conf`

```nginx
events { worker_connections 1024; }

http {
  resolver 127.0.0.11 valid=10s ipv6=off;
  resolver_timeout 5s;

  server {
    listen 80;
    include /etc/nginx/conf.d/upstream.conf;

    location /api/ {
      proxy_pass         http://$backend_upstream;
      proxy_http_version 1.1;
      proxy_set_header   Host            $host;
      proxy_set_header   X-Real-IP       $remote_addr;
      proxy_connect_timeout 5s;
      proxy_read_timeout    30s;
    }

    location / {
      proxy_pass         http://$frontend_upstream;
      proxy_http_version 1.1;
      proxy_set_header   Host            $host;
      proxy_set_header   X-Real-IP       $remote_addr;
    }

    location /nginx-health {
      return 200 'ok';
      add_header Content-Type text/plain;
    }
  }
}
```

> **Why no `/api/` path on proxy_pass?** When nginx uses a variable (`$backend_upstream`) in `proxy_pass`, it does NOT perform URI substitution. Writing `proxy_pass http://$backend_upstream/api/;` would send only `/api/` to the backend and strip the real route. The correct form is `proxy_pass http://$backend_upstream;` which passes the full original URI unchanged.

#### `nginx/conf.d/upstream.conf`

This file is **auto-generated by `deploy.sh`** on every deploy. Do not edit manually.

```nginx
# Managed by deploy.sh — do not edit manually.
set $backend_upstream  "ai-notes-backend-blue:3000";
set $frontend_upstream "ai-notes-frontend-blue:80";
```

---

### 6.4 Jenkins CI/CD

#### `jenkins/Dockerfile`

```dockerfile
FROM jenkins/jenkins:lts-jdk17

USER root

# Install Docker CLI + curl
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    git \
  && rm -rf /var/lib/apt/lists/*

# Match host docker GID (124) so jenkins can access /var/run/docker.sock.
RUN if getent group docker; then groupmod -g 124 docker; else groupadd -g 124 docker; fi \
 && usermod -aG docker jenkins

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
```

#### `jenkins/plugins.txt`

```
git
workflow-aggregator
pipeline-stage-view
credentials-binding
credentials
plain-credentials
docker-workflow
blueocean
job-dsl
configuration-as-code
```

#### `jenkins/casc/jenkins.yaml`

```yaml
jenkins:
  systemMessage: "AI Notes — CI/CD Demo"
  numExecutors: 2
  securityRealm:
    local:
      allowsSignup: false
      users:
        - id: "admin"
          password: "admin123"
  authorizationStrategy: loggedInUsersCanDoAnything

credentials:
  system:
    domainCredentials:
      - credentials:
          - string:
              scope: GLOBAL
              id: "gemini-api-key"
              secret: "${GEMINI_API_KEY}"
              description: "Gemini AI API Key"

jobs:
  - script: |
      pipelineJob('ai-notes-pipeline') {
        displayName('AI Notes — Blue/Green Deploy')
        description('Builds, tests, and deploys the AI Notes app with zero-downtime blue-green deployment.')
        definition {
          cpsScm {
            scm {
              git {
                remote {
                  url('file:///repo')
                }
                branches('*/master')
              }
            }
            scriptPath('Jenkinsfile')
          }
        }
        triggers {
          pollSCM {
            scmpoll_spec('H/1 * * * *')
          }
        }
      }
```

#### `Jenkinsfile`

```groovy
pipeline {
  agent any

  environment {
    APP_NAME       = 'ai-notes'
    DOCKER_NETWORK = 'ci-cd-network'
    NGINX_CONTAINER = 'nginx-proxy'
  }

  stages {

    stage('Checkout') {
      steps {
        echo "Build #${BUILD_NUMBER} — branch: ${env.GIT_BRANCH ?: 'main'}"
        sh 'ls -la'
      }
    }

    stage('Build Images') {
      steps {
        sh "docker build -t ${APP_NAME}-backend:${BUILD_NUMBER}  ./app/backend"
        sh "docker build -t ${APP_NAME}-frontend:${BUILD_NUMBER} ./app/frontend"
      }
    }

    stage('Run Tests') {
      steps {
        sh """
          docker run --rm \
            --name ${APP_NAME}-test-${BUILD_NUMBER} \
            -e NODE_ENV=test \
            ${APP_NAME}-backend:${BUILD_NUMBER} \
            npm test
        """
      }
    }

    stage('Deploy (Blue-Green)') {
      steps {
        withCredentials([string(credentialsId: 'gemini-api-key', variable: 'GEMINI_API_KEY')]) {
          sh """
            chmod +x scripts/deploy.sh
            APP_NAME=${APP_NAME} \
            APP_VERSION=${BUILD_NUMBER} \
            DOCKER_NETWORK=${DOCKER_NETWORK} \
            NGINX_CONTAINER=${NGINX_CONTAINER} \
            GEMINI_API_KEY=\${GEMINI_API_KEY} \
            ./scripts/deploy.sh
          """
        }
      }
    }

    stage('Verify') {
      steps {
        sh """
          chmod +x scripts/health-check.sh
          APP_NAME=${APP_NAME} \
          DOCKER_NETWORK=${DOCKER_NETWORK} \
          ./scripts/health-check.sh
        """
      }
    }
  }

  post {
    success {
      echo """
      ✅ Build #${BUILD_NUMBER} DEPLOYED SUCCESSFULLY
         App is live → http://localhost:80
      """
    }
    failure {
      echo """
      ❌ Build #${BUILD_NUMBER} FAILED
         The previous version is still running — zero downtime.
         Check the stage that failed above for details.
      """
    }
    always {
      sh """
        docker rmi ${APP_NAME}-backend:${BUILD_NUMBER}  2>/dev/null || true
        docker rmi ${APP_NAME}-frontend:${BUILD_NUMBER} 2>/dev/null || true
      """
    }
  }
}
```

#### `docker-compose.yml`

```yaml
version: '3.9'

# Infrastructure layer — Jenkins + Nginx proxy.
# App containers (blue/green) are managed by deploy.sh, not here.

services:

  jenkins:
    build:
      context: ./jenkins
    container_name: jenkins
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - .:/repo:ro
      - ./jenkins/casc:/var/jenkins_home/casc:ro
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true
      - CASC_JENKINS_CONFIG=/var/jenkins_home/casc
    networks:
      - ci-cd-network
    restart: unless-stopped

  nginx:
    image: nginx:1.25-alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d
    networks:
      - ci-cd-network
    restart: unless-stopped

networks:
  ci-cd-network:
    name: ci-cd-network
    driver: bridge

volumes:
  jenkins_home:
    name: ci-cd-jenkins-home
```

---

### 6.5 Scripts

#### `scripts/deploy.sh`

```bash
#!/usr/bin/env bash
# Blue-Green zero-downtime deployment script.
# Called by the Jenkins pipeline after a successful test run.
set -euo pipefail

APP_NAME="${APP_NAME:-ai-notes}"
APP_VERSION="${APP_VERSION:-dev}"
DOCKER_NETWORK="${DOCKER_NETWORK:-ci-cd-network}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx-proxy}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
STATE_FILE="/var/jenkins_home/active_color"
HEALTH_RETRIES=12
HEALTH_INTERVAL=5

# ── Determine colors ──────────────────────────────────────
CURRENT_COLOR=$(cat "$STATE_FILE" 2>/dev/null || echo "none")
if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         BLUE-GREEN DEPLOYMENT                ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  App version : $APP_VERSION"
echo "║  Active now  : $CURRENT_COLOR"
echo "║  Deploying to: $NEW_COLOR"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Ensure Docker network + data volume exist ─────────────
docker network create "$DOCKER_NETWORK" 2>/dev/null || true
docker volume create "${APP_NAME}-data" 2>/dev/null || true

# ── Tag built images with color ───────────────────────────
docker tag "${APP_NAME}-backend:${APP_VERSION}"  "${APP_NAME}-backend:${NEW_COLOR}"
docker tag "${APP_NAME}-frontend:${APP_VERSION}" "${APP_NAME}-frontend:${NEW_COLOR}"

# ── Start NEW containers ──────────────────────────────────
echo "[1/4] Starting ${NEW_COLOR} containers..."

docker rm -f "${APP_NAME}-backend-${NEW_COLOR}"  2>/dev/null || true
docker rm -f "${APP_NAME}-frontend-${NEW_COLOR}" 2>/dev/null || true

docker run -d \
  --name "${APP_NAME}-backend-${NEW_COLOR}" \
  --network "$DOCKER_NETWORK" \
  -v "${APP_NAME}-data:/data" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e PORT=3000 \
  -e APP_VERSION="$APP_VERSION" \
  -e APP_COLOR="$NEW_COLOR" \
  --restart unless-stopped \
  "${APP_NAME}-backend:${NEW_COLOR}"

docker run -d \
  --name "${APP_NAME}-frontend-${NEW_COLOR}" \
  --network "$DOCKER_NETWORK" \
  --restart unless-stopped \
  "${APP_NAME}-frontend:${NEW_COLOR}"

# ── Health check ──────────────────────────────────────────
echo "[2/4] Health checking ${NEW_COLOR} backend..."

HEALTH_PASSED=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  echo "  Attempt $i/$HEALTH_RETRIES..."
  if docker run --rm \
       --network "$DOCKER_NETWORK" \
       curlimages/curl:latest \
       curl -sf "http://${APP_NAME}-backend-${NEW_COLOR}:3000/api/health" \
       > /dev/null 2>&1; then
    echo "  ✅ Health check passed!"
    HEALTH_PASSED=true
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTH_PASSED" = "false" ]; then
  echo ""
  echo "❌ Health check FAILED after $HEALTH_RETRIES attempts."
  echo "   Rolling back — removing ${NEW_COLOR} containers..."
  docker rm -f "${APP_NAME}-backend-${NEW_COLOR}"  2>/dev/null || true
  docker rm -f "${APP_NAME}-frontend-${NEW_COLOR}" 2>/dev/null || true
  echo "   ✅ Old version (${CURRENT_COLOR}) is still serving traffic."
  exit 1
fi

# ── Switch nginx upstream ─────────────────────────────────
echo "[3/4] Switching nginx traffic to ${NEW_COLOR}..."

UPSTREAM_CONF="# Managed by deploy.sh — do not edit manually.
set \$backend_upstream  \"${APP_NAME}-backend-${NEW_COLOR}:3000\";
set \$frontend_upstream \"${APP_NAME}-frontend-${NEW_COLOR}:80\";"

echo "$UPSTREAM_CONF" | docker exec -i "$NGINX_CONTAINER" \
  sh -c 'cat > /etc/nginx/conf.d/upstream.conf'

docker exec "$NGINX_CONTAINER" nginx -s reload
echo "  ✅ Nginx now routing to ${NEW_COLOR}."

# ── Persist state & clean up old containers ───────────────
echo "[4/4] Cleaning up old ${CURRENT_COLOR} containers..."
echo "$NEW_COLOR" > "$STATE_FILE"

if [ "$CURRENT_COLOR" != "none" ]; then
  docker rm -f "${APP_NAME}-backend-${CURRENT_COLOR}"  2>/dev/null || true
  docker rm -f "${APP_NAME}-frontend-${CURRENT_COLOR}" 2>/dev/null || true
  echo "  ✅ Removed ${CURRENT_COLOR} containers."
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  DEPLOYMENT SUCCESSFUL                   ║"
echo "║  Active: ${NEW_COLOR} (v${APP_VERSION})      ║"
echo "║  App: http://localhost:80                    ║"
echo "╚══════════════════════════════════════════════╝"
```

#### `scripts/health-check.sh`

```bash
#!/usr/bin/env bash
# Post-deployment verification — confirms the live app is responding.
set -euo pipefail

APP_NAME="${APP_NAME:-ai-notes}"
DOCKER_NETWORK="${DOCKER_NETWORK:-ci-cd-network}"
STATE_FILE="/var/jenkins_home/active_color"

ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
echo "Post-deploy verification — active color: $ACTIVE"

RESPONSE=$(docker run --rm \
  --network "$DOCKER_NETWORK" \
  curlimages/curl:latest \
  curl -sf "http://${APP_NAME}-backend-${ACTIVE}:3000/api/health" 2>&1)

STATUS=$(echo "$RESPONSE" | grep -o '"status":"ok"' || true)

if [ -n "$STATUS" ]; then
  echo "✅ Verification passed. Live response: $RESPONSE"
else
  echo "❌ Verification FAILED. Response: $RESPONSE"
  exit 1
fi
```

---

### 6.6 Demo Scripts

#### `demo/apply-v1-ui-success.sh`

```bash
#!/usr/bin/env bash
# Demo v1 — UI colour change.
# Pipeline: Build ✅  Test ✅  Deploy ✅  (badge switches colour)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSS="$ROOT/app/frontend/public/style.css"
HTML="$ROOT/app/frontend/public/index.html"

echo "Applying v1: changing accent colour to purple and bumping version label..."

sed -i 's/--accent:       #388bfd/--accent:       #8b5cf6/' "$CSS"
sed -i 's/--accent-hover: #58a6ff/--accent-hover: #a78bfa/' "$CSS"
sed -i 's/>v1</>v2</' "$HTML"

cd "$ROOT"
git add app/frontend/public/style.css app/frontend/public/index.html
git commit -m "feat: update accent colour to purple (v2 release)"

echo ""
echo "✅ v1 patch applied. Committing..."
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "Watch the badge at http://localhost switch colour!"
```

#### `demo/apply-v2-broken-fail.sh`

```bash
#!/usr/bin/env bash
# Demo v2 — intentional syntax error in backend.
# Pipeline: Build ✅  Test ❌  Deploy SKIPPED
# Live app stays running — zero downtime proven.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"

# Idempotent — skip if marker already present
if grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 already applied. Run v3 first to restore."
  exit 0
fi

echo "Applying v2: injecting syntax error into server.js..."

cat >> "$SERVER" << 'EOF'

// __DEMO_BREAK__ — marker used by v3 to cleanly remove this block
const brokenAnalytics = {
EOF

echo ""
echo "✅ v2 patch applied. Committing..."
cd "$ROOT"
git add app/backend/src/server.js
git commit -m "feat: add analytics (WIP — syntax error)"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ❌ (syntax error) → Deploy SKIPPED"
echo "Your live app at http://localhost keeps serving traffic — zero downtime!"
```

#### `demo/apply-v3-fix-feature-success.sh`

```bash
#!/usr/bin/env bash
# Demo v3 — fix the syntax error from v2.
# Pipeline: Build ✅  Test ✅  Deploy ✅
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"

# Only removes lines if the v2 marker is actually present — safe to run anytime
if ! grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 marker not found — nothing to fix. Run v2 first."
  exit 0
fi

echo "Applying v3: removing syntax error from server.js..."

# Delete from the marker line to end of file
sed -i '/\/\/ __DEMO_BREAK__/,$d' "$SERVER"

echo ""
echo "✅ v3 patch applied. Committing..."
cd "$ROOT"
git add app/backend/src/server.js
git commit -m "fix: remove accidental syntax error from analytics WIP"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "App is back — badge switches to the new deployment colour."
echo "AI chat and Summarise button are fully working."
```

---

### Other Config Files

#### `.env.example`

```
# Copy this to .env and fill in your values
GEMINI_API_KEY=your_gemini_api_key_here
```

#### `.gitignore`

```
.env
node_modules/
*.log
```

---

## 7. Running the Demo

The three demo scenarios show the full CI/CD lifecycle. Run them in order.

### Demo v1 — UI Change (SUCCESS)

**What it does:** Changes the accent colour from blue to purple, bumps version label. Shows a normal successful deploy.

```bash
bash demo/apply-v1-ui-success.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ✅  (12 tests pass)
Deploy         ✅  (nginx switches to opposite colour slot)
Verify         ✅
```

**What to watch:** At `http://localhost`, the deployment badge in the header switches colour (BLUE → GREEN or vice versa) and shows the new build number. Button colours change to purple.

---

### Demo v2 — Broken Build (FAIL, App Stays Live)

**What it does:** Injects a syntax error (`const brokenAnalytics = {` — unclosed object) into the backend. The tests catch it. Jenkins fails at Run Tests. The Deploy stage never runs. The live app keeps serving traffic.

```bash
bash demo/apply-v2-broken-fail.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ❌  (SyntaxError: Unexpected end of input)
Deploy         SKIPPED
Verify         SKIPPED
```

**What to watch:**
- Jenkins build goes red at `http://localhost:8080`
- `http://localhost` is **still working** — the previous container is still running
- The badge does NOT change — it still shows the previous build number

This is zero-downtime failure handling in action.

---

### Demo v3 — Fix & Redeploy (SUCCESS)

**What it does:** Uses a marker-based `sed` command to cleanly remove the broken lines added by v2. The fix is committed, Jenkins picks it up, tests pass, and the app redeploys.

```bash
bash demo/apply-v3-fix-feature-success.sh
```

**Expected Jenkins pipeline:**

```
Checkout       ✅
Build Images   ✅
Run Tests      ✅  (12 tests pass)
Deploy         ✅  (nginx switches to the opposite colour slot again)
Verify         ✅
```

**What to watch:** The badge at `http://localhost` switches colour again (e.g. GREEN → BLUE), showing a fresh successful deploy. The AI chat and Summarise button work again.

---

### Complete Demo Timeline

| Build | Script | Test | Deploy | Badge |
|---|---|---|---|---|
| #1 | Initial setup | ✅ | ✅ blue | BLUE |
| #N | v1 UI change | ✅ | ✅ green | GREEN |
| #N+1 | v2 broken | ❌ | skipped | GREEN (unchanged) |
| #N+2 | v3 fix | ✅ | ✅ blue | BLUE |

---

## 8. Blue-Green Deployment Explained

### Why two colour slots?

The problem with a naive deploy: stop old → start new → there's a gap where nothing is running. Users see a 502 error.

Blue-green solves this:

1. The **new version** starts in the idle slot while the old version is still serving all traffic
2. Health checks confirm the new version is healthy (`/api/health` must return `{"status":"ok"}`)
3. nginx rewrites `upstream.conf` and calls `nginx -s reload` — this is **atomic**: in-flight requests finish on the old upstream, new requests go to the new one
4. Only then is the old container stopped

The user never sees a 502.

### The state file

`/var/jenkins_home/active_color` stores which colour is currently live. It lives in the Jenkins named volume so it survives Jenkins restarts. On every deploy, `deploy.sh` reads it to know which slot is idle, and writes the new colour after switching.

### What happens on a failed build

- If `Run Tests` fails → Jenkins exits with error → `Deploy` stage is skipped → state file never updated → current containers keep running → nginx is never touched
- If new container fails its health check inside `deploy.sh` → new containers removed → state file never updated → `deploy.sh` exits 1 → Jenkins marks build failed → old containers keep running

In both cases, users experience zero downtime.

---

## 9. Troubleshooting

### Jenkins won't start

```bash
docker compose logs jenkins
```

Common cause: Docker socket GID mismatch. Check:

```bash
stat -c '%g' /var/run/docker.sock
```

Update line 14 of `jenkins/Dockerfile` with the correct GID, then rebuild:

```bash
docker compose down
docker compose up -d --build
```

### App shows 502 Bad Gateway

The app containers haven't been deployed yet. Trigger the first build in Jenkins by clicking **Build Now** at `http://localhost:8080`.

### Jenkins build says "cannot connect to docker daemon"

The Jenkins user isn't in the docker group or the GID doesn't match. Check and fix the GID as described above.

### Notes disappear after restart

Make sure the `ai-notes-data` Docker volume exists:

```bash
docker volume ls | grep ai-notes-data
```

The volume is created automatically on first deploy. If it's missing, run a new build.

### Jenkins doesn't detect commits automatically

The pipeline polls SCM every 60 seconds. If nothing happens after 2 minutes, click **Build Now** manually in Jenkins.

### Gemini AI returns errors

- **No key**: Chat returns a friendly fallback. Add key to `.env` and restart with `docker compose up -d`.
- **Quota exceeded**: The project uses `gemini-flash-lite-latest` which has the best free tier availability. Check your quota at https://aistudio.google.com.
- **Key not injected**: The key is passed at container start via `deploy.sh`. Re-run a build to redeploy.

### v3 demo says "v2 marker not found"

You must run v2 before v3:

```bash
bash demo/apply-v2-broken-fail.sh
# wait for Jenkins to pick up and fail (~60s)
bash demo/apply-v3-fix-feature-success.sh
```

### Reset everything and start fresh

```bash
# Stop infrastructure
docker compose down

# Remove app containers
docker rm -f ai-notes-backend-blue ai-notes-frontend-blue \
             ai-notes-backend-green ai-notes-frontend-green 2>/dev/null || true

# Remove app images
docker rmi ai-notes-backend:blue ai-notes-frontend:blue \
           ai-notes-backend:green ai-notes-frontend:green 2>/dev/null || true

# Remove data volume (WARNING: deletes all notes)
docker volume rm ai-notes-data 2>/dev/null || true

# Remove Jenkins home (WARNING: deletes all build history)
docker volume rm ci-cd-jenkins-home 2>/dev/null || true

# Start fresh
docker compose up -d --build
```

---

## Ports Reference

| Port | Service | URL |
|---|---|---|
| `80` | Live app (nginx proxy) | http://localhost |
| `8080` | Jenkins CI/CD | http://localhost:8080 |
| `50000` | Jenkins agent port | — |

Jenkins login: `admin` / `admin123`
