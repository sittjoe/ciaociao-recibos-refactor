import { parseMoney, formatNumber, formatMoney, normalizeCurrencyText, normalizeIntegerText } from '../receipt/money.js';
import { generateQuoteNumber, getCurrentQuoteId, setCurrentQuoteId } from './state.js';
import { saveQuote, loadQuote, openHistory, closeHistory, searchHistory } from './history.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

function showNotification(message, type = 'success') {
  const n = $('#notification');
  const m = $('#notification-message');
  n.className = `notification ${type} show`;
  m.textContent = message;
  setTimeout(() => n.classList.remove('show'), 3000);
}

function formatDate(date) {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function recalc() {
  let subtotal = 0;
  $$('#tabla-items tbody tr').forEach(tr => {
    const qty = parseMoney($('.qty', tr)?.textContent);
    const unit = parseMoney($('.price', tr)?.textContent);
    const imp = (qty * unit) || 0;
    $('.subtotal', tr).textContent = formatNumber(imp);
    subtotal += imp;
  });
  $('#subtotal').textContent = formatNumber(subtotal);
  const descuento = parseMoney($('#descuento')?.textContent);
  const base = Math.max(subtotal - descuento, 0);
  const applyIVA = document.getElementById('applyIVA')?.checked ?? true;
  const ivaRate = parseFloat(document.getElementById('ivaRate')?.value || '16') || 16;
  const iva = applyIVA ? base * (ivaRate / 100) : 0;
  $('#iva').textContent = formatNumber(iva);
  $('#total').textContent = formatMoney(base + iva);
}

function addRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="editable" contenteditable>Artículo de joyería</td>
    <td class="center editable qty" contenteditable>1</td>
    <td class="right editable price" contenteditable>0.00</td>
    <td class="right subtotal">0.00</td>
    <td class="center editable" contenteditable>—</td>
    <td class="center" style="position:relative; white-space:nowrap;">
      <button class="delete-row" title="Eliminar" data-action="delete-row">×</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Duplicar" data-action="row-dup">⎘</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Subir" data-action="row-up">↑</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Bajar" data-action="row-down">↓</button>
    </td>`;
  $('#itemsBody').appendChild(tr);
  tr.querySelector('.editable').focus();
  showNotification('Producto agregado','success');
}

function collectQuoteData() {
  return {
    id: getCurrentQuoteId(),
    number: $('#quoteNumber').textContent,
    status: $('#quoteStatus').textContent || 'pendiente',
    date: new Date().toISOString(),
    client: {
      name: $('#clientName').textContent,
      phone: $('#clientPhone').textContent,
      email: $('#clientEmail').textContent,
      address: $('#clientAddress').textContent,
    },
    dates: {
      issue: $('#issueDate').textContent,
      validUntil: $('#validUntil').textContent,
    },
    items: $$('#tabla-items tbody tr').map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      return {
        description: cells[0]?.textContent || '',
        qty: cells[1]?.textContent || '',
        price: cells[2]?.textContent || '',
        subtotal: cells[3]?.textContent || '',
        sku: cells[4]?.textContent || '',
      };
    }),
    totals: {
      subtotal: $('#subtotal').textContent,
      discount: $('#descuento').textContent,
      iva: $('#iva').textContent,
      total: $('#total').textContent,
    },
    observations: $('#observations').textContent,
  };
}

function saveQuoteAction() {
  const data = collectQuoteData();
  saveQuote(data);
  showNotification('Cotización guardada','success');
}

function loadQuoteAction(id) {
  const q = loadQuote(id);
  if (!q) { showNotification('Cotización no encontrada','error'); return; }
  setCurrentQuoteId(q.id);
  $('#quoteNumber').textContent = q.number;
  $('#quoteStatus').textContent = q.status || 'pendiente';
  $('#clientName').textContent = q.client?.name || '';
  $('#clientPhone').textContent = q.client?.phone || '';
  $('#clientEmail').textContent = q.client?.email || '';
  $('#clientAddress').textContent = q.client?.address || '';
  $('#issueDate').textContent = q.dates?.issue || '';
  $('#validUntil').textContent = q.dates?.validUntil || '';
  $('#itemsBody').innerHTML = '';
  (q.items || []).forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="editable" contenteditable>${it.description}</td>
      <td class="center editable qty" contenteditable>${it.qty}</td>
      <td class="right editable price" contenteditable>${it.price}</td>
      <td class="right subtotal">${it.subtotal}</td>
      <td class="center editable" contenteditable>${it.sku}</td>
      <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
    $('#itemsBody').appendChild(tr);
  });
  $('#descuento').textContent = q.totals?.discount || '0.00';
  recalc();
  showNotification('Cotización cargada','success');
}

function newQuote() {
  $('#itemsBody').innerHTML = '';
  addRow();
  $('#descuento').textContent = '0.00';
  const number = generateQuoteNumber();
  $('#quoteNumber').textContent = number;
  setCurrentQuoteId(`quote_${Date.now()}_${Math.random().toString(36).slice(2,11)}`);
  const now = new Date(); const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  $('#issueDate').textContent = formatDate(now);
  $('#validUntil').textContent = formatDate(valid);
  recalc();
}

async function generatePDF() {
  try {
    showNotification('Generando PDF...','info');
    saveQuoteAction();
    const element = document.querySelector('.gilded-frame');
    const canvas = await html2canvas(element, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900, windowHeight: element.scrollHeight });
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const imgW = canvas.width; const imgH = canvas.height; const ratio = imgW / imgH;
    let renderW = maxW; let renderH = renderW / ratio;
    if (renderH > maxH) { renderH = maxH; renderW = renderH * ratio; }
    const x = (pageWidth - renderW) / 2; const y = (pageHeight - renderH) / 2;
    pdf.addImage(imgData, 'PNG', x, y, renderW, renderH);
    const fileName = `Cotizacion_${$('#quoteNumber').textContent}_${$('#clientName').textContent.replace(/\s+/g,'_')}.pdf`;
    pdf.save(fileName);
    showNotification('PDF generado correctamente','success');
  } catch (e) { console.error(e); showNotification('Error al generar PDF','error'); }
}

function shareWhatsApp() {
  const q = collectQuoteData();
  let msg = `*COTIZACIÓN - CIAO CIAO MX*\n_Joyería Fina_\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Número: ${q.number}\nFecha: ${q.dates.issue}\nVálido hasta: ${q.dates.validUntil}\n\n`;
  msg += `*CLIENTE*\n${q.client.name}\nTel: ${q.client.phone}\n\n`;
  msg += `*PRODUCTOS/SERVICIOS*\n`;
  q.items.forEach(it => { msg += `• ${it.description}\n  Cant: ${it.qty} | Precio: $${it.price} | Total: $${it.subtotal}\n`; });
  msg += `\n*RESUMEN*\nSubtotal: $${q.totals.subtotal}\n`;
  if (parseMoney(q.totals.discount) > 0) msg += `Descuento: -$${q.totals.discount}\n`;
  msg += `IVA: $${q.totals.iva}\n*TOTAL: ${q.totals.total}*`;
  const phone = (q.client.phone || '').replace(/\D/g,'');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showNotification('Abriendo WhatsApp...','success');
}

function convertToReceipt() {
  const q = collectQuoteData();
  const payload = {
    client: q.client,
    items: q.items,
    discount: q.totals.discount,
    observations: q.observations || ''
  };
  localStorage.setItem('quoteToConvert', JSON.stringify(payload));
  window.location.href = '../receipt/index.html';
}

function bindUI() {
  $('#add-row').addEventListener('click', addRow);
  $('#save-quote').addEventListener('click', saveQuoteAction);
  $('#new-quote').addEventListener('click', newQuote);
  $('#show-history').addEventListener('click', () => openHistory(loadQuoteAction));
  $('#closeHistoryModal').addEventListener('click', () => closeHistory());
  $('#searchHistory').addEventListener('input', e => searchHistory(e.target.value));
  $('#generate-pdf').addEventListener('click', generatePDF);
  $('#share-whatsapp').addEventListener('click', shareWhatsApp);
  const pngBtn = document.getElementById('generate-png');
  if (pngBtn) pngBtn.addEventListener('click', generatePNG);
  $('#convert-to-receipt').addEventListener('click', convertToReceipt);
  // Datos modal
  $('#edit-data').addEventListener('click', openDataModal);
  $('#closeDataModal').addEventListener('click', closeDataModal);
  $('#saveDataModal').addEventListener('click', saveDataFromModal);

  document.body.addEventListener('click', e => {
    const del = e.target.closest('[data-action="delete-row"]');
    if (del) {
      const tr = del.closest('tr'); const tbody = tr?.parentElement;
      if (tbody && tbody.children.length > 1) { tr.remove(); recalc(); showNotification('Producto eliminado','success'); }
      else showNotification('Debe mantener al menos un producto','error');
    }
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const action = btn.getAttribute('data-action');
      const tr = btn.closest('tr');
      const tbody = tr?.parentElement;
      if (action === 'row-dup' && tr && tbody) { const clone = tr.cloneNode(true); tbody.insertBefore(clone, tr.nextSibling); recalc(); }
      if (action === 'row-up' && tr && tbody) { const prev = tr.previousElementSibling; if (prev) tbody.insertBefore(tr, prev); recalc(); }
      if (action === 'row-down' && tr && tbody) { const next = tr.nextElementSibling; if (next) tbody.insertBefore(next, tr); recalc(); }
    }
  });

  document.addEventListener('input', e => { if (e.target.matches('[contenteditable]')) recalc(); });
  // Formateo automático: qty (int), price y descuento (2 decimales)
  document.addEventListener('focusout', e => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches('.qty')) { t.textContent = normalizeIntegerText(t.textContent || '1', { min: 1 }); recalc(); }
    if (t.matches('.price')) { t.textContent = normalizeCurrencyText(t.textContent || '0', { min: 0 }); recalc(); }
    if (t.id === 'descuento') { t.textContent = normalizeCurrencyText(t.textContent || '0', { min: 0 }); recalc(); }
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveQuoteAction(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newQuote(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); generatePDF(); }
    if (e.key === 'Escape') closeHistory();
  });
}

function prefillFromCalculatorIfPresent() {
  const raw = localStorage.getItem('calculatorToQuote');
  if (!raw) return;
  localStorage.removeItem('calculatorToQuote');
  try {
    const data = JSON.parse(raw);
    if (data?.client) {
      $('#clientName').textContent = data.client.name || $('#clientName').textContent;
      $('#clientPhone').textContent = data.client.phone || $('#clientPhone').textContent;
      $('#clientEmail').textContent = data.client.email || $('#clientEmail').textContent;
      $('#clientAddress').textContent = data.client.address || $('#clientAddress').textContent;
    }
    if (Array.isArray(data.items) && data.items.length) {
      $('#itemsBody').innerHTML = '';
      data.items.forEach(it => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="editable" contenteditable>${it.description}</td>
          <td class="center editable qty" contenteditable>${it.qty}</td>
          <td class="right editable price" contenteditable>${it.price}</td>
          <td class="right subtotal">${it.subtotal}</td>
          <td class="center editable" contenteditable>${it.sku || ''}</td>
          <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
        $('#itemsBody').appendChild(tr);
      });
      recalc();
    }
  } catch {}
}

function init() {
  const number = generateQuoteNumber();
  $('#quoteNumber').textContent = number;
  setCurrentQuoteId(`quote_${Date.now()}_${Math.random().toString(36).slice(2,11)}`);
  const now = new Date(); const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  $('#issueDate').textContent = formatDate(now);
  $('#validUntil').textContent = formatDate(valid);
  recalc();
  prefillFromCalculatorIfPresent();
}

document.addEventListener('DOMContentLoaded', () => { bindUI(); init(); });

async function generatePNG(){
  try {
    showNotification('Generando PNG...','info');
    const element = document.querySelector('.gilded-frame');
    const canvas = await html2canvas(element, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900, windowHeight: element.scrollHeight });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = dataUrl; a.download = `Cotizacion_${$('#quoteNumber').textContent}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    showNotification('PNG generado','success');
  } catch(e){ console.error(e); showNotification('Error al generar PNG','error'); }
}

// Clientes recientes (reutiliza recibos + cotizaciones guardadas)
function openClientsModal(){ renderClientsTable(''); document.getElementById('clientsModal').classList.add('active'); }
function closeClientsModal(){ document.getElementById('clientsModal').classList.remove('active'); }
function renderClientsTable(query){
  const q = (query||'').toLowerCase();
  const tbody = document.getElementById('clientsTableBody');
  const list = aggregateClients().filter(c => (c.name||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q));
  tbody.innerHTML='';
  list.slice(0,50).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.name||''}</td><td>${c.phone||''}</td><td>${c.email||''}</td><td>${c.address||''}</td><td><button class=\"btn\" data-pick=\"${encodeURIComponent(JSON.stringify(c))}\">Elegir</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.onclick = (e)=>{
    const btn = e.target.closest('button[data-pick]');
    if (!btn) return;
    const c = JSON.parse(decodeURIComponent(btn.getAttribute('data-pick')));
    if (c.name) document.getElementById('clientName').textContent = c.name;
    if (c.phone) document.getElementById('clientPhone').textContent = c.phone;
    if (c.email) document.getElementById('clientEmail').textContent = c.email;
    if (c.address) document.getElementById('clientAddress').textContent = c.address;
    closeClientsModal();
  };
}
function aggregateClients(){
  const out = [];
  try { (JSON.parse(localStorage.getItem('premium_receipts_ciaociao')||'[]')||[]).forEach(r => out.push(r.client||{})); } catch {}
  try { (JSON.parse(localStorage.getItem('quotations_ciaociao')||'[]')||[]).forEach(r => out.push(r.client||{})); } catch {}
  const seen = new Set();
  const uniq = [];
  out.forEach(c => { const key = `${c.name||''}|${c.phone||''}|${c.email||''}|${c.address||''}`; if (seen.has(key)) return; seen.add(key); uniq.push(c); });
  return uniq;
}

// =============
// Datos modal (Cotización)
// =============
function openDataModal() {
  clearAllErrors('#dataModal');
  $('#formClientName').value = $('#clientName').textContent.trim();
  $('#formClientPhone').value = $('#clientPhone').textContent.trim();
  $('#formClientEmail').value = $('#clientEmail').textContent.trim();
  $('#formClientAddress').value = $('#clientAddress').textContent.trim();
  const parseShown = (t)=>{ const d=new Date(t); return isNaN(d)?'':d.toISOString().slice(0,10); };
  $('#formIssueDate').value = parseShown($('#issueDate').textContent);
  $('#formValidUntil').value = parseShown($('#validUntil').textContent);
  $('#dataModal').classList.add('active');
}
function closeDataModal(){ $('#dataModal').classList.remove('active'); }
function saveDataFromModal(){
  const nameInput = $('#formClientName');
  const phoneInput = $('#formClientPhone');
  const emailInput = $('#formClientEmail');
  const addressInput = $('#formClientAddress');
  const issueInput = $('#formIssueDate');
  const validInput = $('#formValidUntil');
  clearAllErrors('#dataModal');
  let ok = true;
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const issue = issueInput.value;
  const validUntil = validInput.value;
  if (!name) { setFieldError(nameInput, 'Nombre requerido'); ok = false; }
  if (phone && phone.replace(/\D/g,'').length < 8) { setFieldError(phoneInput, 'Teléfono inválido'); ok = false; }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) { setFieldError(emailInput, 'Correo inválido'); ok = false; }
  if (issue && validUntil && new Date(validUntil) < new Date(issue)) { setFieldError(validInput, '“Válido hasta” debe ser posterior'); ok = false; }
  if (!ok) return;
  $('#clientName').textContent = name;
  $('#clientPhone').textContent = phone || $('#clientPhone').textContent;
  $('#clientEmail').textContent = email || $('#clientEmail').textContent;
  $('#clientAddress').textContent = address || $('#clientAddress').textContent;
  const fmt = (s)=> s? formatDate(new Date(s)) : '';
  if (issue) $('#issueDate').textContent = fmt(issue);
  if (validUntil) $('#validUntil').textContent = fmt(validUntil);
  closeDataModal();
  saveQuoteAction();
}

// Helpers de validación
function setFieldError(input, message){
  input.classList.add('is-invalid');
  let msg = input.nextElementSibling;
  if (!msg || !msg.classList || !msg.classList.contains('error-message')){
    msg = document.createElement('div');
    msg.className = 'error-message';
    input.parentElement.appendChild(msg);
  }
  msg.textContent = message;
}
function clearAllErrors(scope){
  const root = typeof scope === 'string' ? document.querySelector(scope) : scope;
  if (!root) return;
  root.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  root.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}
