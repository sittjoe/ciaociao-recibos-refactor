let currentReceiptId = null;
let signatures = { client: null, company: null };

export function getCurrentReceiptId() { return currentReceiptId; }
export function setCurrentReceiptId(id) { currentReceiptId = id; }
export function getSignatures() { return signatures; }
export function setSignature(type, dataUrl) { signatures[type] = dataUrl; }
export function clearSignature(type) { signatures[type] = null; }
export function resetSignatures() { signatures = { client: null, company: null }; }

export function generateReceiptNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dateKey = `CCI-${year}${month}${day}`;
  const dailyCounter = (parseInt(localStorage.getItem(dateKey) || '0', 10) + 1).toString();
  localStorage.setItem(dateKey, dailyCounter);

  cleanOldCounters();

  const receiptNumber = `CCI-${year}-${month}${day}-${dailyCounter.padStart(3, '0')}`;
  currentReceiptId = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return receiptNumber;
}

function cleanOldCounters() {
  const limit = new Date();
  limit.setDate(limit.getDate() - 30);
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith('CCI-')) return;
    const parts = key.split('-');
    if (parts.length < 2) return;
    const dateStr = parts[1];
    if (dateStr.length !== 8) return;
    const d = new Date(dateStr.slice(0,4), parseInt(dateStr.slice(4,6)) - 1, dateStr.slice(6,8));
    if (d < limit) localStorage.removeItem(key);
  });
}

