import { getCurrentReceiptId, setCurrentReceiptId, getSignatures } from './state.js';

const STORAGE_KEY = 'premium_receipts_ciaociao';

export function listReceipts() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export function saveReceipt(data) {
  const receipts = listReceipts();
  const i = receipts.findIndex(r => r.id === data.id);
  if (i >= 0) receipts[i] = data; else receipts.push(data);
  if (receipts.length > 1000) receipts.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

export function loadReceipt(id) {
  return listReceipts().find(r => r.id === id) || null;
}

export function deleteReceipt(id) {
  const next = listReceipts().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function renderHistoryTable(onLoad) {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '';
  listReceipts().slice().reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.number}</td>
      <td>${(r.dates?.issue) || ''}</td>
      <td>${(r.client?.name) || ''}</td>
      <td>${(r.totals?.total) || ''}</td>
      <td>${r.transactionType || ''}</td>
      <td>
        <button data-action="load" data-id="${r.id}">Cargar</button>
        <button data-action="delete" data-id="${r.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'load') onLoad(id);
    if (action === 'delete') { deleteReceipt(id); renderHistoryTable(onLoad); }
  }, { once: true });
}

export function searchHistory(query) {
  const q = String(query || '').toLowerCase();
  const tbody = document.getElementById('historyTableBody');
  const receipts = listReceipts().filter(r => {
    return (r.number || '').toLowerCase().includes(q)
      || (r.client?.name || '').toLowerCase().includes(q)
      || (r.dates?.issue || '').toLowerCase().includes(q);
  });
  tbody.innerHTML = '';
  receipts.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.number}</td>
      <td>${(r.dates?.issue) || ''}</td>
      <td>${(r.client?.name) || ''}</td>
      <td>${(r.totals?.total) || ''}</td>
      <td>${r.transactionType || ''}</td>
      <td>
        <button data-action="load" data-id="${r.id}">Cargar</button>
        <button data-action="delete" data-id="${r.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

export function openHistory(onLoad) {
  renderHistoryTable(onLoad);
  document.getElementById('historyModal').classList.add('active');
}

export function closeHistory() {
  document.getElementById('historyModal').classList.remove('active');
}

