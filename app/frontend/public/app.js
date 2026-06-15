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
