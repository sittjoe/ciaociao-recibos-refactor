import { getDateTimestamp } from '../common/dates.js';

const STORAGE_KEY = 'quotations_ciaociao';
let sortDir = localStorage.getItem('quotes_sort_dir') || 'desc';

export function listQuotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

export function saveQuote(q) {
  const all = listQuotes();
  const i = all.findIndex(x => x.id === q.id);
  if (i >= 0) all[i] = q; else all.push(q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadQuote(id) {
  return listQuotes().find(x => x.id === id) || null;
}

export function deleteQuote(id) {
  const next = listQuotes().filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function sortByDate(arr){
  const copy = arr.slice();
  copy.sort((a,b)=>{
    const da = getQuoteDateTs(a);
    const db = getQuoteDateTs(b);
    return sortDir === 'asc' ? da - db : db - da;
  });
  return copy;
}

function getQuoteDateTs(q) {
  return getDateTimestamp(q?.dates?.issueISO)
    || getDateTimestamp(q?.dates?.issue)
    || getDateTimestamp(q?.date)
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

function buildRow(q) {
  const tr = document.createElement('tr');
  tr.appendChild(createCell(q.number));
  tr.appendChild(createCell(q.dates?.issue || ''));
  tr.appendChild(createCell(q.client?.name || ''));
  tr.appendChild(createCell(q.totals?.total || ''));
  tr.appendChild(createCell(q.status || 'pendiente'));
  const actions = document.createElement('td');
  actions.appendChild(createActionButton('Cargar', 'load', q.id));
  actions.appendChild(createActionButton('Eliminar', 'delete', q.id));
  tr.appendChild(actions);
  return tr;
}

export function renderHistoryTable(onLoad) {
  const tbody = document.getElementById('historyTableBody');
  tbody.replaceChildren();
  const frag = document.createDocumentFragment();
  sortByDate(listQuotes()).forEach(q => frag.appendChild(buildRow(q)));
  tbody.appendChild(frag);

  tbody.onclick = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'load') onLoad(id);
    if (action === 'delete') { deleteQuote(id); renderHistoryTable(onLoad); }
  };

  const sortTh = document.getElementById('quoteHistorySortDate');
  const dirSpan = document.getElementById('quoteHistorySortDateDir');
  if (dirSpan) dirSpan.textContent = sortDir === 'asc' ? '↑' : '↓';
  if (sortTh) {
    sortTh.onclick = () => {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      localStorage.setItem('quotes_sort_dir', sortDir);
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
  const filtered = sortByDate(listQuotes()).filter(x => (x.number || '').toLowerCase().includes(q)
    || (x.client?.name || '').toLowerCase().includes(q)
    || (x.dates?.issue || '').toLowerCase().includes(q)).filter(x => {
      const d = getQuoteDateTs(x);
      if (from && d < fromTs) return false;
      if (to && d > toTs) return false;
      return true;
    });
  tbody.replaceChildren();
  const frag = document.createDocumentFragment();
  filtered.forEach(x => frag.appendChild(buildRow(x)));
  tbody.appendChild(frag);
}

export function exportHistoryCSV() {
  const q = document.getElementById('searchHistory')?.value || '';
  const from = document.getElementById('historyFrom')?.value;
  const to = document.getElementById('historyTo')?.value;
  const fromTs = from ? getDateTimestamp(from) : 0;
  const toTs = to ? getDateTimestamp(to) + (24 * 60 * 60 * 1000 - 1) : 0;
  const items = sortByDate(listQuotes()).filter(x => (x.number || '').toLowerCase().includes(q.toLowerCase())
    || (x.client?.name || '').toLowerCase().includes(q.toLowerCase())
    || (x.dates?.issue || '').toLowerCase().includes(q.toLowerCase())).filter(x => {
      const d = getQuoteDateTs(x);
      if (from && d < fromTs) return false;
      if (to && d > toTs) return false;
      return true;
    });
  const rows = [ ['Folio','Fecha','Cliente','Total','Estatus'] ];
  items.forEach(r => rows.push([r.number, r.dates?.issue||'', r.client?.name||'', r.totals?.total||'', r.status||'']));
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'cotizaciones.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function openHistory(onLoad) {
  renderHistoryTable(onLoad);
  document.getElementById('historyModal').classList.add('active');
}

export function closeHistory() {
  document.getElementById('historyModal').classList.remove('active');
}
