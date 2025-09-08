export function parseMoney(v) {
  if (!v) return 0;
  return parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0;
}

export function formatNumber(n) {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatMoney(n) {
  return '$' + formatNumber(n);
}

