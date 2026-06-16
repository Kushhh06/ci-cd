// Framer Motion-style spring animations using Web Animations API
(function () {
  const SPRING   = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

  function springIn(el, delay) {
    el.animate([
      { opacity: 0, transform: 'translateY(20px) scale(0.94)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 520, easing: SPRING, fill: 'both', delay: delay || 0 });
  }

  function slideFrom(el, x, y) {
    el.animate([
      { opacity: 0, transform: `translate(${x}px,${y}px)` },
      { opacity: 1, transform: 'translate(0,0)' }
    ], { duration: 400, easing: EASE_OUT, fill: 'both' });
  }

  // Stagger note cards already in the DOM on page load
  function animateExistingCards() {
    document.querySelectorAll('.note-card').forEach((card, i) => {
      card.style.opacity = '0';
      setTimeout(() => {
        card.style.opacity = '';
        springIn(card);
      }, i * 60);
    });
  }

  // Watch for new note cards and chat bubbles being injected
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.classList.contains('note-card')) {
          springIn(node);
        }
        if (node.classList.contains('chat-msg')) {
          const fromX = node.classList.contains('user') ? 12 : -12;
          slideFrom(node, fromX, 0);
        }
      }
    }
  });

  // Page entrance — header, sidebar, notes area slide in sequentially
  function pageEntrance() {
    const header = document.querySelector('header');
    if (header) slideFrom(header, 0, -14);

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) setTimeout(() => slideFrom(sidebar, -16, 0), 80);

    const notesArea = document.querySelector('.notes-area');
    if (notesArea) setTimeout(() => slideFrom(notesArea, 0, 12), 140);
  }

  document.addEventListener('DOMContentLoaded', () => {
    pageEntrance();

    const grid = document.getElementById('notes-grid');
    const chat = document.getElementById('chat-messages');

    if (grid) observer.observe(grid, { childList: true });
    if (chat) observer.observe(chat, { childList: true });

    // Cards animate in once app.js finishes its initial fetch
    setTimeout(animateExistingCards, 260);
  });
})();
