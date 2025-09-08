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
    const da = new Date(a?.dates?.issue || a?.date || 0).getTime();
    const db = new Date(b?.dates?.issue || b?.date || 0).getTime();
    return sortDir === 'asc' ? da - db : db - da;
  });
  return copy;
}

export function renderHistoryTable(onLoad) {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '';
  sortByDate(listQuotes()).forEach(q => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${q.number}</td>
      <td>${q.dates?.issue || ''}</td>
      <td>${q.client?.name || ''}</td>
      <td>${q.totals?.total || ''}</td>
      <td>${q.status || 'pendiente'}</td>
      <td>
        <button data-action="load" data-id="${q.id}">Cargar</button>
        <button data-action="delete" data-id="${q.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'load') onLoad(id);
    if (action === 'delete') { deleteQuote(id); renderHistoryTable(onLoad); }
  }, { once: true });

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
  const filtered = sortByDate(listQuotes()).filter(x => (x.number || '').toLowerCase().includes(q)
    || (x.client?.name || '').toLowerCase().includes(q)
    || (x.dates?.issue || '').toLowerCase().includes(q)).filter(x => {
      const d = new Date(x?.dates?.issue || x?.date || 0);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to)) return false;
      return true;
    });
  tbody.innerHTML = '';
  filtered.forEach(x => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${x.number}</td>
      <td>${x.dates?.issue || ''}</td>
      <td>${x.client?.name || ''}</td>
      <td>${x.totals?.total || ''}</td>
      <td>${x.status || 'pendiente'}</td>
      <td>
        <button data-action="load" data-id="${x.id}">Cargar</button>
        <button data-action="delete" data-id="${x.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

export function exportHistoryCSV() {
  const q = document.getElementById('searchHistory')?.value || '';
  const from = document.getElementById('historyFrom')?.value;
  const to = document.getElementById('historyTo')?.value;
  const items = sortByDate(listQuotes()).filter(x => (x.number || '').toLowerCase().includes(q.toLowerCase())
    || (x.client?.name || '').toLowerCase().includes(q.toLowerCase())
    || (x.dates?.issue || '').toLowerCase().includes(q.toLowerCase())).filter(x => {
      const d = new Date(x?.dates?.issue || x?.date || 0);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to)) return false;
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
