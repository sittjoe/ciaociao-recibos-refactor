let currentQuoteId = null;

export function getCurrentQuoteId() { return currentQuoteId; }
export function setCurrentQuoteId(id) { currentQuoteId = id; }

export function generateQuoteNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const key = `CCQ-${y}${m}${day}`;
  const count = (parseInt(localStorage.getItem(key) || '0', 10) + 1).toString();
  localStorage.setItem(key, count);
  return `CCQ-${y}-${m}${day}-${count.padStart(3, '0')}`;
}

