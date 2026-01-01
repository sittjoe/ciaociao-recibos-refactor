// Catálogo de plantillas de ítems con búsqueda
const DEFAULT_TEMPLATES = [
  { description: 'Anillo oro 14K', sku: 'AN-ORO14', price: 8500.0, type: 'producto' },
  { description: 'Cadena plata .925', sku: 'CAD-PL925', price: 1200.0, type: 'producto' },
  { description: 'Aretes oro 18K', sku: 'AR-ORO18', price: 9800.0, type: 'producto' },
  { description: 'Limpieza profesional', sku: 'SERV-LIMP', price: 300.0, type: 'servicio' },
  { description: 'Ajuste de talla', sku: 'SERV-AJUSTE', price: 600.0, type: 'servicio' },
  { description: 'Soldadura plata', sku: 'SERV-SOLD-PL', price: 450.0, type: 'servicio' },
  { description: 'Soldadura oro', sku: 'SERV-SOLD-OR', price: 1200.0, type: 'servicio' }
];

export function getTemplates() {
  try {
    const raw = localStorage.getItem('item_templates');
    if (!raw) return DEFAULT_TEMPLATES.slice();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) return arr;
  } catch (e) { void e; }
  return DEFAULT_TEMPLATES.slice();
}

export function searchTemplates(query) {
  const q = (query || '').toLowerCase();
  return getTemplates().filter(t =>
    (t.description || '').toLowerCase().includes(q) ||
    (t.sku || '').toLowerCase().includes(q) ||
    (t.type || '').toLowerCase().includes(q)
  );
}

export function saveTemplates(list) {
  try { localStorage.setItem('item_templates', JSON.stringify(list)); } catch (e) { void e; }
}

export function upsertTemplate(tpl) {
  const list = getTemplates();
  const id = tpl.id || (tpl.id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = tpl; else list.push(tpl);
  saveTemplates(list); return tpl;
}

export function removeTemplate(id) {
  const list = getTemplates().filter(x => x.id !== id);
  saveTemplates(list);
}

export function exportTemplatesCSV() {
  const rows = [['description','sku','type','price']];
  getTemplates().forEach(t => rows.push([t.description||'', t.sku||'', t.type||'', String(t.price||0)]));
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'plantillas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export function importTemplatesCSV(text) {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  if (!lines.length) return;
  const out = [];
  for (let i=1;i<lines.length;i++){
    const cols = parseCSVLine(lines[i]);
    if (!cols.length) continue;
    const [description, sku, type, price] = cols;
    out.push({ id:`tpl_${Date.now()}_${i}`, description, sku, type: type||'producto', price: parseFloat(price||'0')||0 });
  }
  const merged = getTemplates().concat(out);
  saveTemplates(merged);
}

function parseCSVLine(line){
  const res = []; let cur=''; let inq=false;
  for (let i=0;i<line.length;i++){
    const ch=line[i];
    if (ch==='"'){ if (inq && line[i+1]==='"'){ cur+='"'; i++; } else { inq=!inq; } }
    else if (ch===',' && !inq){ res.push(cur); cur=''; }
    else { cur+=ch; }
  }
  res.push(cur); return res.map(s=>s.trim());
}
