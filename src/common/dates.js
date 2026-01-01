const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

const MONTH_INDEX = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
};

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateString(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = normalizeText(raw);
  const parts = normalized.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (parts) {
    const day = Number(parts[1]);
    const month = MONTH_INDEX[parts[2]];
    const year = Number(parts[3]);
    if (Number.isFinite(day) && Number.isFinite(year) && month !== undefined) {
      return new Date(year, month, day);
    }
  }
  return null;
}

export function getISODateFromText(text) {
  const d = parseDateString(text);
  return d ? toISODate(d) : '';
}

export function setDateEl(el, date) {
  if (!el) return;
  const d = date instanceof Date ? date : parseDateString(date);
  if (!d) return;
  el.textContent = formatDate(d);
  el.dataset.iso = toISODate(d);
}

export function getISODateFromEl(el) {
  if (!el) return '';
  const iso = el.dataset && el.dataset.iso;
  if (iso) return iso;
  return getISODateFromText(el.textContent);
}

export function getDateTimestamp(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const d = parseDateString(value);
  return d ? d.getTime() : 0;
}
