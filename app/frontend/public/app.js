const API = '/api';

// ── Helpers ──────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Deployment badge ─────────────────────────────────────
async function refreshBadge() {
  try {
    const res = await fetch(`${API}/health`);
    const d = await res.json();
    const badge = document.getElementById('deploy-badge');
    badge.textContent = `v${d.version} · ${d.color.toUpperCase()}`;
    badge.className = `deploy-badge ${d.color}`;
  } catch { /* server not ready yet */ }
}

// ── Notes ─────────────────────────────────────────────────
async function loadNotes() {
  const res = await fetch(`${API}/notes`);
  const notes = await res.json();

  const list = document.getElementById('notes-list');
  const count = document.getElementById('note-count');
  count.textContent = notes.length;

  if (notes.length === 0) {
    list.innerHTML = '<p class="empty">No notes yet — add one on the left!</p>';
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-card">
      <div class="note-header">
        <span class="note-title">${esc(n.title)}</span>
        <button class="delete-btn" onclick="deleteNote(${n.id})" title="Delete">×</button>
      </div>
      <p class="note-body">${esc(n.content)}</p>
      <span class="note-time">${formatDate(n.createdAt)}</span>
    </div>
  `).join('');
}

async function addNote(e) {
  e.preventDefault();
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();

  const btn = e.target.querySelector('button');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  await fetch(`${API}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });

  e.target.reset();
  btn.textContent = 'Add Note';
  btn.disabled = false;
  await loadNotes();
}

async function deleteNote(id) {
  await fetch(`${API}/notes/${id}`, { method: 'DELETE' });
  await loadNotes();
}

// ── AI Chat ───────────────────────────────────────────────
function appendMsg(sender, text, type) {
  const box = document.getElementById('chat-box');
  const el = document.createElement('div');
  el.className = `msg ${type}`;
  el.innerHTML = `<span class="sender">${sender}</span>${esc(text)}`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

async function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendMsg('You', message, 'user');

  const thinking = appendMsg('AI', 'Thinking…', 'thinking');

  try {
    const notesRes = await fetch(`${API}/notes`);
    const notes = await notesRes.json();
    const context = notes.map(n => `${n.title}: ${n.content}`).join('\n');

    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    });
    const d = await res.json();
    thinking.remove();
    appendMsg('AI', d.response || d.error, 'ai');
  } catch (err) {
    thinking.remove();
    appendMsg('AI', 'Error reaching the server. Please try again.', 'ai');
  }
}

// ── Bootstrap ─────────────────────────────────────────────
document.getElementById('note-form').addEventListener('submit', addNote);
document.getElementById('chat-form').addEventListener('submit', sendChat);

refreshBadge();
loadNotes();
setInterval(refreshBadge, 15000);
