const STORAGE_KEY = 'quotations_ciaociao';

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

export function renderHistoryTable(onLoad) {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '';
  listQuotes().slice().reverse().forEach(q => {
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
}

export function searchHistory(query) {
  const q = String(query || '').toLowerCase();
  const tbody = document.getElementById('historyTableBody');
  const filtered = listQuotes().filter(x => (x.number || '').toLowerCase().includes(q)
    || (x.client?.name || '').toLowerCase().includes(q)
    || (x.dates?.issue || '').toLowerCase().includes(q));
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

export function openHistory(onLoad) {
  renderHistoryTable(onLoad);
  document.getElementById('historyModal').classList.add('active');
}

export function closeHistory() {
  document.getElementById('historyModal').classList.remove('active');
}

