// main.js – Pantalla de selección de modo

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function renderStats(el, items) {
  if (!el) return;
  const frag = document.createDocumentFragment();
  items.forEach(({ label, value }) => {
    const span = document.createElement('span');
    span.className = 'stat-item';
    span.appendChild(document.createTextNode(`${label}: `));
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    span.appendChild(strong);
    frag.appendChild(span);
  });
  el.replaceChildren(frag);
}

function navigateTo(mode) {
  if (mode === 'receipt') {
    window.location.href = './receipt/index.html';
  } else if (mode === 'quotation') {
    window.location.href = './quotation/index.html';
  } else if (mode === 'calculator') {
    window.location.href = './calculator/index.html';
  }
}

function loadStatistics() {
  try {
    const receipts = JSON.parse(localStorage.getItem('premium_receipts_ciaociao') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayReceipts = receipts.filter(r => (r.date || '').startsWith(today)).length;
    const el = qs('#receiptStats');
    renderStats(el, [
      { label: 'Total', value: receipts.length },
      { label: 'Hoy', value: todayReceipts }
    ]);

    const quotations = JSON.parse(localStorage.getItem('quotations_ciaociao') || '[]');
    const pending = quotations.filter(q => q.status === 'pending').length;
    const qEl = qs('#quotationStats');
    renderStats(qEl, [
      { label: 'Total', value: quotations.length },
      { label: 'Pendientes', value: pending }
    ]);

    const projects = JSON.parse(localStorage.getItem('calculator_projects') || '[]');
    const cEl = qs('#calculatorStats');
    renderStats(cEl, [
      { label: 'Proyectos', value: projects.length },
      { label: 'Guardados', value: projects.length }
    ]);
  } catch (e) {
    console.warn('No se pudieron cargar estadísticas', e);
  }
}

function setup() {
  // Navegación por tarjetas y botones
  qsa('.mode-card').forEach(card => {
    const mode = card.getAttribute('data-mode');
    card.addEventListener('click', () => navigateTo(mode));
    const btn = card.querySelector('.mode-button');
    if (btn && !btn.disabled) btn.addEventListener('click', e => { e.stopPropagation(); navigateTo(mode); });
  });

  // Logout
  const logout = qs('#logoutBtnSelector');
  if (logout) logout.addEventListener('click', () => {
    if (window.authManager && typeof window.authManager.logout === 'function') window.authManager.logout();
    else {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('sessionExpiry');
      window.location.reload();
    }
  });

  loadStatistics();

  // Demo button: hide on GitHub Pages environment
  const demoBtn = document.getElementById('demoBtn');
  if (demoBtn) {
    demoBtn.href = 'https://sittjoe.github.io/ciaociao-recibos-refactor/';
    if (location.host.includes('github.io')) {
      demoBtn.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', setup);
