// main.js – Pantalla de selección de modo

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

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
    if (el) el.innerHTML = `
      <span class="stat-item">Total: <strong>${receipts.length}</strong></span>
      <span class="stat-item">Hoy: <strong>${todayReceipts}</strong></span>`;

    const quotations = JSON.parse(localStorage.getItem('quotations_ciaociao') || '[]');
    const pending = quotations.filter(q => q.status === 'pending').length;
    const qEl = qs('#quotationStats');
    if (qEl) qEl.innerHTML = `
      <span class="stat-item">Total: <strong>${quotations.length}</strong></span>
      <span class="stat-item">Pendientes: <strong>${pending}</strong></span>`;

    const projects = JSON.parse(localStorage.getItem('calculator_projects') || '[]');
    const cEl = qs('#calculatorStats');
    if (cEl) cEl.innerHTML = `
      <span class="stat-item">Proyectos: <strong>${projects.length}</strong></span>
      <span class="stat-item">Guardados: <strong>${projects.length}</strong></span>`;
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
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('sessionExpiry');
    window.location.reload();
  });

  loadStatistics();
}

document.addEventListener('DOMContentLoaded', setup);
