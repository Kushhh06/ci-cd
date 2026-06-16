// ── State ─────────────────────────────────────────────────
let notes = [];
let searchQuery = '';

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectV2Styles();
  injectV3Styles();
  injectSearchBar();
  injectHelpModal();
  loadNotes();
  refreshBadge();
  setInterval(refreshBadge, 15000);

  document.getElementById('note-form').addEventListener('submit', addNote);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-bar')?.focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('help-modal')?.classList.remove('open');
    }
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
    <input id="search-bar" type="text" placeholder="Search notes… (Ctrl+K)" autocomplete="off" />
  `;
  grid.parentNode.insertBefore(wrap, grid);
  document.getElementById('search-bar').addEventListener('input', e => filterNotes(e.target.value));
}

function filterNotes(q) {
  searchQuery = q.toLowerCase().trim();
  renderNotes();
}

// ── V3 Injected UI ────────────────────────────────────────
function injectV3Styles() {
  const s = document.createElement('style');
  s.textContent = `
    .help-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(139,92,246,0.08);
      border: 1px solid rgba(139,92,246,0.25);
      border-radius: 9px;
      color: var(--accent-hover, #c084fc);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 7px 16px;
      cursor: pointer;
      transition: background .2s, border-color .2s, box-shadow .2s;
      white-space: nowrap;
    }
    .help-btn:hover {
      background: rgba(139,92,246,0.16);
      border-color: rgba(139,92,246,0.5);
      box-shadow: 0 0 14px rgba(139,92,246,0.22);
    }
    #help-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      justify-content: flex-end;
    }
    #help-modal.open { display: flex; }
    .help-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
    }
    .help-panel {
      position: relative;
      width: 340px;
      background: rgba(10,3,24,0.96);
      backdrop-filter: blur(32px);
      -webkit-backdrop-filter: blur(32px);
      border-left: 1px solid rgba(139,92,246,0.2);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 48px rgba(0,0,0,0.55);
      animation: slideInRight .28s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .help-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #f0ebff);
    }
    .help-close {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px;
      color: var(--text-muted, #9d8cc4);
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      transition: background .2s, color .2s;
      flex-shrink: 0;
    }
    .help-close:hover { background: rgba(255,255,255,0.12); color: var(--text,#f0ebff); }
    .help-body {
      flex: 1;
      overflow-y: auto;
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 26px;
    }
    .help-section h4 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent, #a855f7);
      margin: 0 0 12px;
    }
    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 13px;
      color: var(--text-muted, #9d8cc4);
    }
    .shortcut-row:last-child { border-bottom: none; }
    kbd {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.14);
      border-bottom-width: 2px;
      border-radius: 5px;
      padding: 2px 8px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #f0ebff);
    }
    .help-section ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .help-section li, .help-section p {
      font-size: 13px;
      color: var(--text-muted, #9d8cc4);
      line-height: 1.6;
      margin: 0;
    }
    .help-about {
      background: rgba(139,92,246,0.06);
      border: 1px solid rgba(139,92,246,0.15);
      border-radius: 10px;
      padding: 14px 16px;
    }
    .help-about p { font-size: 12px; line-height: 1.7; }
  `;
  document.head.appendChild(s);
}

function injectHelpModal() {
  if (document.getElementById('help-modal')) return;

  const btn = document.createElement('button');
  btn.className = 'help-btn';
  btn.id = 'help-btn';
  btn.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    Help
  `;
  btn.onclick = toggleHelp;
  const headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.appendChild(btn);

  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.innerHTML = `
    <div class="help-backdrop" onclick="toggleHelp()"></div>
    <div class="help-panel">
      <div class="help-hdr">
        <span>Help &amp; Support</span>
        <button class="help-close" onclick="toggleHelp()">✕</button>
      </div>
      <div class="help-body">
        <div class="help-section">
          <h4>Keyboard Shortcuts</h4>
          <div class="shortcut-row"><span>Focus search</span><kbd>Ctrl K</kbd></div>
          <div class="shortcut-row"><span>Close this panel</span><kbd>Esc</kbd></div>
          <div class="shortcut-row"><span>Send chat message</span><kbd>Enter</kbd></div>
        </div>
        <div class="help-section">
          <h4>Smart Features</h4>
          <ul>
            <li><strong style="color:var(--text,#f0ebff)">Smart Tags</strong> — auto-generated from your note content, no setup needed</li>
            <li><strong style="color:var(--text,#f0ebff)">Search</strong> — filters by title and content in real time</li>
            <li><strong style="color:var(--text,#f0ebff)">AI Chat</strong> — ask anything about your notes using Gemini</li>
            <li><strong style="color:var(--text,#f0ebff)">Summarise</strong> — get an AI overview of all your notes at once</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>About This App</h4>
          <div class="help-about">
            <p>AI Notes is a CI/CD blue-green deployment demo built with Jenkins + Docker + nginx. Every commit triggers an automated pipeline — zero-downtime deployments proven live.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function toggleHelp() {
  document.getElementById('help-modal')?.classList.toggle('open');
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
