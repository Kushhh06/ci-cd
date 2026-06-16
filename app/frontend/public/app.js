// ── State ─────────────────────────────────────────────────
let notes = [];
let searchQuery = '';

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectV2Styles();
  injectSearchBar();
  loadNotes();
  refreshBadge();
  setInterval(refreshBadge, 15000);

  document.getElementById('note-form').addEventListener('submit', addNote);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  });
});

// ── V2 Injected UI ────────────────────────────────────────
function injectV2Styles() {
  const s = document.createElement('style');
  s.textContent = `
    .search-wrap {
      position: relative;
      margin-bottom: 18px;
    }
    .search-icon {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted, #9d8cc4);
      pointer-events: none;
    }
    #search-bar {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      color: var(--text, #f0ebff);
      font: inherit;
      font-size: 13px;
      padding: 10px 14px 10px 38px;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    #search-bar::placeholder { color: var(--text-subtle, #4a3d6e); }
    #search-bar:focus {
      border-color: var(--accent, #a855f7);
      box-shadow: 0 0 0 3px rgba(168,85,247,0.18);
    }
    .note-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 10px;
    }
    .note-tag-chip {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 999px;
      background: rgba(139,92,246,0.12);
      border: 1px solid rgba(139,92,246,0.28);
      color: var(--accent-hover, #c084fc);
      letter-spacing: 0.03em;
    }
    .search-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 0;
      color: var(--text-muted, #9d8cc4);
    }
    .search-empty .si { font-size: 36px; margin-bottom: 10px; }
    .search-empty p { margin: 0; font-size: 14px; }
  `;
  document.head.appendChild(s);
}

function injectSearchBar() {
  if (document.getElementById('search-bar')) return;
  const grid = document.getElementById('notes-grid');
  if (!grid) return;
  const wrap = document.createElement('div');
  wrap.className = 'search-wrap';
  wrap.innerHTML = `
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input id="search-bar" type="text" placeholder="Search notes…" autocomplete="off" />
  `;
  grid.parentNode.insertBefore(wrap, grid);
  document.getElementById('search-bar').addEventListener('input', e => filterNotes(e.target.value));
}

function filterNotes(q) {
  searchQuery = q.toLowerCase().trim();
  renderNotes();
}

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
  const grid = document.getElementById('notes-grid');
  const chip = document.getElementById('notes-count');
  chip.textContent = notes.length === 1 ? '1 note' : `${notes.length} notes`;

  const filtered = searchQuery
    ? notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery) ||
        n.content.toLowerCase().includes(searchQuery))
    : notes;

  if (notes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" id="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">No notes yet</p>
        <p class="empty-sub">Add your first note using the form on the left</p>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="search-empty">
        <div class="si">🔍</div>
        <p>No notes match <strong>"${esc(searchQuery)}"</strong></p>
      </div>`;
    return;
  }

  grid.innerHTML = [...filtered].reverse().map(n => {
    const tags = autoTags(n.content);
    const tagsHtml = tags.length
      ? `<div class="note-tags">${tags.map(t => `<span class="note-tag-chip">${esc(t)}</span>`).join('')}</div>`
      : '';
    return `
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
      ${tagsHtml}
      <div class="note-footer">
        <span class="note-date">${fmtDate(n.createdAt)}</span>
        <span class="note-tag">Note</span>
      </div>
    </div>`;
  }).join('');
}

function autoTags(content) {
  const stop = new Set(['the','and','for','with','this','that','have','from','are','was','were','will','been','has','had','not','but','they','their','what','when','there','your','can','all','one','its','into','than','more','also','about','which','some','would','other','these','could','time','just','only','after','very','then','most','over','such','both','each','before','should']);
  const words = content.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/);
  const seen = new Set();
  const tags = [];
  for (const w of words) {
    if (w.length >= 4 && !stop.has(w) && !seen.has(w)) {
      seen.add(w);
      tags.push(w[0].toUpperCase() + w.slice(1));
      if (tags.length === 3) break;
    }
  }
  return tags;
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
