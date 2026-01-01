import { getDateTimestamp } from '../common/dates.js';

const STORAGE_KEY = 'premium_receipts_ciaociao';
let sortDir = localStorage.getItem('receipts_sort_dir') || 'desc'; // 'asc' | 'desc'

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

function sortByDate(arr) {
  const copy = arr.slice();
  copy.sort((a,b)=>{
    const da = getReceiptDateTs(a);
    const db = getReceiptDateTs(b);
    return sortDir === 'asc' ? da - db : db - da;
  });
  return copy;
}

function getReceiptDateTs(r) {
  return getDateTimestamp(r?.dates?.issueISO)
    || getDateTimestamp(r?.dates?.issue)
    || getDateTimestamp(r?.date)
    || 0;
}

function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text == null ? '' : String(text);
  return td;
}

function createActionButton(label, action, id) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.dataset.action = action;
  btn.dataset.id = id;
  return btn;
}

function buildRow(r) {
  const tr = document.createElement('tr');
  tr.appendChild(createCell(r.number));
  tr.appendChild(createCell(r.dates?.issue || ''));
  tr.appendChild(createCell(r.client?.name || ''));
  tr.appendChild(createCell(r.totals?.total || ''));
  tr.appendChild(createCell(r.transactionType || ''));
  const actions = document.createElement('td');
  actions.appendChild(createActionButton('Cargar', 'load', r.id));
  actions.appendChild(createActionButton('Eliminar', 'delete', r.id));
  tr.appendChild(actions);
  return tr;
}

export function renderHistoryTable(onLoad) {
  const tbody = document.getElementById('historyTableBody');
  tbody.replaceChildren();
  const rows = sortByDate(listReceipts());
  const frag = document.createDocumentFragment();
  rows.forEach(r => frag.appendChild(buildRow(r)));
  tbody.appendChild(frag);

  tbody.onclick = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'load') onLoad(id);
    if (action === 'delete') { deleteReceipt(id); renderHistoryTable(onLoad); }
  };

  const sortTh = document.getElementById('historySortDate');
  const dirSpan = document.getElementById('historySortDateDir');
  if (dirSpan) dirSpan.textContent = sortDir === 'asc' ? '↑' : '↓';
  if (sortTh) {
    sortTh.onclick = () => {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      localStorage.setItem('receipts_sort_dir', sortDir);
      renderHistoryTable(onLoad);
    };
  }
}

export function searchHistory(query) {
  const q = String(query || '').toLowerCase();
  const tbody = document.getElementById('historyTableBody');
  const from = document.getElementById('historyFrom')?.value;
  const to = document.getElementById('historyTo')?.value;
  const fromTs = from ? getDateTimestamp(from) : 0;
  const toTs = to ? getDateTimestamp(to) + (24 * 60 * 60 * 1000 - 1) : 0;
  const receipts = sortByDate(listReceipts()).filter(r => {
    return (r.number || '').toLowerCase().includes(q)
      || (r.client?.name || '').toLowerCase().includes(q)
      || (r.dates?.issue || '').toLowerCase().includes(q);
  }).filter(r => {
    const d = getReceiptDateTs(r);
    if (from && d < fromTs) return false;
    if (to && d > toTs) return false;
    return true;
  });
  tbody.replaceChildren();
  const frag = document.createDocumentFragment();
  receipts.forEach(r => frag.appendChild(buildRow(r)));
  tbody.appendChild(frag);
}

export function exportHistoryCSV() {
  const q = document.getElementById('searchHistory')?.value || '';
  const from = document.getElementById('historyFrom')?.value;
  const to = document.getElementById('historyTo')?.value;
  const fromTs = from ? getDateTimestamp(from) : 0;
  const toTs = to ? getDateTimestamp(to) + (24 * 60 * 60 * 1000 - 1) : 0;
  const items = sortByDate(listReceipts()).filter(r => {
    const ok = (r.number||'').toLowerCase().includes(q.toLowerCase()) || (r.client?.name||'').toLowerCase().includes(q.toLowerCase()) || (r.dates?.issue||'').toLowerCase().includes(q.toLowerCase());
    if (!ok) return false;
    const d = getReceiptDateTs(r);
    if (from && d < fromTs) return false;
    if (to && d > toTs) return false;
    return true;
  });
  const rows = [ ['Folio','Fecha','Cliente','Total','Tipo'] ];
  items.forEach(r => rows.push([r.number, r.dates?.issue||'', r.client?.name||'', r.totals?.total||'', r.transactionType||'']));
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'recibos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function openHistory(onLoad) {
  renderHistoryTable(onLoad);
  document.getElementById('historyModal').classList.add('active');
}

export function closeHistory() {
  document.getElementById('historyModal').classList.remove('active');
}
