export function parseMoney(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

export function formatNumber(n) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatMoney(n) {
  return '$' + formatNumber(n);
}

// Normalizadores útiles para contentEditable/inputs
export function normalizeCurrencyText(text, { min = 0 } = {}) {
  const num = parseMoney(text);
  const clamped = Math.max(min, isFinite(num) ? num : 0);
  return formatNumber(clamped);
}

export function normalizeIntegerText(text, { min = 0 } = {}) {
  const only = String(text).replace(/[^0-9-]/g, '');
  let v = parseInt(only || '0', 10);
  if (!isFinite(v)) v = 0;
  if (typeof min === 'number') v = Math.max(min, v);
  return String(v);
}
