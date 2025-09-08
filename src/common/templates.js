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
  } catch {}
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

