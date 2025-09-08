import { parseMoney } from '../receipt/money.js';

function $(s, c=document){ return c.querySelector(s); }

function fill(data){
  $('#tNumber').textContent = `Folio: ${data.number || '-'}`;
  $('#tDate').textContent = `Fecha: ${data.dates?.issue || '-'}`;
  $('#tClient').textContent = `Cliente: ${data.client?.name || '-'}`;
  const itemsEl = $('#tItems');
  itemsEl.innerHTML = '';
  (data.items || []).forEach(it => {
    const row = document.createElement('div');
    row.className = 'row';
    const qty = it.qty || '1';
    row.innerHTML = `<span>${qty} x ${it.description}</span><span>$${it.subtotal}</span>`;
    itemsEl.appendChild(row);
  });
  $('#tSubtotal').textContent = `$${data.totals?.subtotal || '0.00'}`;
  $('#tDiscount').textContent = `$${data.totals?.discount || '0.00'}`;
  $('#tIva').textContent = `$${data.totals?.iva || '0.00'}`;
  $('#tTotal').textContent = data.totals?.total || '$0.00';
  $('#tAdvance').textContent = `$${data.totals?.advance || '0.00'}`;
  $('#tBalance').textContent = data.totals?.balance || '$0.00';
}

function load(){
  // Prefer ticket_preview_data (pasado desde Recibos)
  try {
    const raw = localStorage.getItem('ticket_preview_data');
    if (raw) { const d = JSON.parse(raw); fill(d); return; }
  } catch {}
  // Fallback: último recibo guardado
  try {
    const all = JSON.parse(localStorage.getItem('premium_receipts_ciaociao')||'[]');
    const last = all[all.length - 1];
    if (last) fill(last);
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  const back = document.getElementById('backBtn');
  if (back) back.addEventListener('click', () => history.back());
});

