import { parseMoney, formatNumber, formatMoney, normalizeCurrencyText, normalizeIntegerText } from './money.js';
import { generateReceiptNumber, getCurrentReceiptId, setCurrentReceiptId, getSignatures, setSignature, clearSignature as clearSigState, resetSignatures } from './state.js';
import { initSignature, openSignatureModal, closeSignatureModal, clearModalSignature, saveSignatureToTarget, clearSignature } from './signature.js';
import { saveReceipt, loadReceipt, openHistory, closeHistory, searchHistory } from './history.js';
import { getTemplates, searchTemplates } from '../common/templates.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

function showNotification(message, type = 'success') {
  const notification = $('#notification');
  const messageEl = $('#notification-message');
  notification.className = `notification ${type} show`;
  messageEl.textContent = message;
  setTimeout(() => notification.classList.remove('show'), 3000);
}

function sanitizeEditable(el) {
  // Sanitización básica para contentEditable (solo texto)
  el.innerText = el.innerText.replace(/[\u0000-\u001F]/g, '').trim();
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
  const aportacion = parseMoney($('#aportacion')?.textContent);
  const baseConDescuento = Math.max(subtotal - descuento, 0);
  const baseTotal = baseConDescuento + aportacion;
  const applyIvaEl = document.getElementById('applyIVA');
  const ivaRateEl = document.getElementById('ivaRate');
  const applyIVA = applyIvaEl ? applyIvaEl.checked : true;
  const ivaRate = ivaRateEl ? (parseFloat(ivaRateEl.value) || 0) : 16;
  const iva = applyIVA ? baseTotal * (ivaRate / 100) : 0;
  $('#iva').textContent = formatNumber(iva);
  const total = baseTotal + iva;
  $('#total').textContent = formatMoney(total);
  const anticipo = parseMoney($('#anticipo')?.textContent);
  const saldo = Math.max(total - anticipo, 0);
  $('#saldo').textContent = formatMoney(saldo);

  const saldoEl = $('#saldo');
  if (saldo === 0) {
    saldoEl.style.color = 'var(--success)';
    saldoEl.parentElement.style.background = '#f0fdf4';
  } else {
    saldoEl.style.color = 'var(--error)';
    saldoEl.parentElement.style.background = '#fef2f2';
  }

  // Update mobile summary
  const msSubtotal = document.getElementById('msSubtotal');
  const msTotal = document.getElementById('msTotal');
  const msSaldo = document.getElementById('msSaldo');
  if (msSubtotal) msSubtotal.textContent = '$' + formatNumber(subtotal);
  if (msTotal) msTotal.textContent = $('#total').textContent;
  if (msSaldo) msSaldo.textContent = $('#saldo').textContent;
}

function addRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="editable" contenteditable>Artículo de joyería</td>
    <td class="center editable qty" contenteditable>1</td>
    <td class="right editable price" contenteditable>0.00</td>
    <td class="right subtotal">0.00</td>
    <td class="center editable" contenteditable>—</td>
    <td class="center">
      <select class="transaction-type-select item-type" style="font-size:11px; padding:4px;">
        <option value="producto">Producto</option>
        <option value="servicio">Servicio</option>
        <option value="reparacion">Reparación</option>
      </select>
    </td>
    <td class="center" style="position:relative; white-space:nowrap;">
      <button class="delete-row" title="Eliminar" data-action="delete-row">×</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Duplicar" data-action="row-dup">⎘</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Subir" data-action="row-up">↑</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Bajar" data-action="row-down">↓</button>
    </td>`;
  $('#itemsBody').appendChild(tr);
  tr.querySelector('.editable').focus();
  showNotification('Producto agregado', 'success');
}

function collectReceiptData() {
  return {
    id: getCurrentReceiptId(),
    number: $('#receiptNumber').textContent,
    date: new Date().toISOString(),
    transactionType: $('#transactionType').value,
    paymentMethod: $('#paymentMethod').value,
    orderNumber: $('#orderNumber')?.textContent || '001',
    client: {
      name: $('#clientName').textContent,
      phone: $('#clientPhone').textContent,
      email: $('#clientEmail').textContent,
      address: $('#clientAddress').textContent,
    },
    dates: {
      issue: $('#issueDate').textContent,
      delivery: $('#deliveryDate').textContent,
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
        type: $('.item-type', tr)?.value || 'producto',
      };
    }),
    totals: {
      subtotal: $('#subtotal').textContent,
      discount: $('#descuento').textContent,
      contribution: $('#aportacion').textContent,
      iva: $('#iva').textContent,
      advance: $('#anticipo').textContent,
      total: $('#total').textContent,
      balance: $('#saldo').textContent,
    },
    signatures: { ...getSignatures() },
    observations: $('#observations').textContent,
    policy: $('#policy').textContent,
  };
}

function saveReceiptAction() {
  const data = collectReceiptData();
  saveReceipt(data);
  updateQR();
  showNotification('Recibo guardado', 'success');
}

function loadReceiptAction(id) {
  const r = loadReceipt(id);
  if (!r) { showNotification('Recibo no encontrado', 'error'); return; }
  setCurrentReceiptId(r.id);
  $('#receiptNumber').textContent = r.number;
  $('#transactionType').value = r.transactionType || 'venta';
  $('#paymentMethod').value = r.paymentMethod || 'efectivo';
  $('#clientName').textContent = r.client?.name || '';
  $('#clientPhone').textContent = r.client?.phone || '';
  $('#clientEmail').textContent = r.client?.email || '';
  $('#clientAddress').textContent = r.client?.address || '';
  $('#issueDate').textContent = r.dates?.issue || '';
  $('#deliveryDate').textContent = r.dates?.delivery || '';
  $('#validUntil').textContent = r.dates?.validUntil || '';
  $('#itemsBody').innerHTML = '';
  (r.items || []).forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="editable" contenteditable>${it.description}</td>
      <td class="center editable qty" contenteditable>${it.qty}</td>
      <td class="right editable price" contenteditable>${it.price}</td>
      <td class="right subtotal">${it.subtotal}</td>
      <td class="center editable" contenteditable>${it.sku}</td>
      <td class="center">
        <select class="transaction-type-select item-type" style="font-size:11px; padding:4px;">
          <option value="producto" ${it.type === 'producto' ? 'selected' : ''}>Producto</option>
          <option value="servicio" ${it.type === 'servicio' ? 'selected' : ''}>Servicio</option>
          <option value="reparacion" ${it.type === 'reparacion' ? 'selected' : ''}>Reparación</option>
        </select>
      </td>
      <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
    $('#itemsBody').appendChild(tr);
  });
  $('#descuento').textContent = r.totals?.discount || '0.00';
  $('#aportacion').textContent = r.totals?.contribution || '0.00';
  $('#anticipo').textContent = r.totals?.advance || '0.00';
  // Signatures
  ['client','company'].forEach(t => {
    const dataUrl = r.signatures?.[t];
    if (!dataUrl) return;
    setSignature(t, dataUrl);
    const canvas = document.getElementById(t === 'client' ? 'clientSigCanvas' : 'companySigCanvas');
    const c = canvas.getContext('2d');
    canvas.style.display = 'block';
    const img = new Image();
    img.onload = () => c.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataUrl;
    const holder = document.querySelector(`[data-signature="${t}"]`);
    if (holder) holder.classList.add('signed');
  });
  recalc();
  showNotification('Recibo cargado', 'success');
}

function newReceipt() {
  resetSignatures();
  $('#itemsBody').innerHTML = '';
  addRow();
  $('#descuento').textContent = '0.00';
  $('#aportacion').textContent = '0.00';
  $('#anticipo').textContent = '0.00';
  const number = generateReceiptNumber();
  $('#receiptNumber').textContent = number;
  setCurrentReceiptId(`receipt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  const now = new Date();
  const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  $('#issueDate').textContent = formatDate(now);
  $('#deliveryDate').textContent = formatDate(now);
  $('#validUntil').textContent = formatDate(valid);
  recalc();
}

function formatDate(date) {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

async function generatePDF() {
  try {
    showNotification('Generando PDF...', 'info');
    saveReceiptAction();
    updateQR();
    $$('.delete-row, .clear-sig, .actions, .watermark, .btn-back').forEach(el => { if (el) el.style.display = 'none'; });
    const element = document.querySelector('.gilded-frame');
    const canvas = await html2canvas(element, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900, windowHeight: element.scrollHeight });
    $$('.delete-row, .clear-sig, .actions, .btn-back').forEach(el => { if (el) el.style.display = ''; });
    const wm = document.querySelector('.watermark'); if (wm) wm.style.display = 'flex';
    const { jsPDF } = window.jspdf; const fmt = (JSON.parse(localStorage.getItem('app_settings')||'{}').pdfFormat)||'letter';
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: fmt });
    const imgData = canvas.toDataURL('image/png');
    // Ajuste a una sola página: calcular escala máxima que quepa en ancho y alto
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6; // mm
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = imgW / imgH;
    let renderW = maxW;
    let renderH = renderW / ratio;
    if (renderH > maxH) { renderH = maxH; renderW = renderH * ratio; }
    const x = (pageWidth - renderW) / 2;
    const y = (pageHeight - renderH) / 2;
    pdf.addImage(imgData, 'PNG', x, y, renderW, renderH);
    const fileName = `Recibo_${$('#receiptNumber').textContent}_${$('#clientName').textContent.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
    showNotification('PDF generado correctamente', 'success');
  } catch (e) {
    console.error(e); showNotification('Error al generar PDF', 'error');
  }
}

function shareWhatsApp() {
  const r = collectReceiptData();
  let msg = `*RECIBO - CIAO CIAO MX*\n_Joyería Fina_\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `*INFORMACIÓN DEL RECIBO*\nNúmero: ${r.number}\nTipo: ${r.transactionType}\nFecha: ${r.dates.issue}\nEntrega: ${r.dates.delivery}\n\n`;
  msg += `*CLIENTE*\n${r.client.name}\nTel: ${r.client.phone}\n\n`;
  msg += `*PRODUCTOS/SERVICIOS*\n`;
  r.items.forEach(it => { msg += `• ${it.description}\n  Cant: ${it.qty} | Precio: $${it.price} | Total: $${it.subtotal}\n`; });
  msg += `\n*RESUMEN FINANCIERO*\nSubtotal: $${r.totals.subtotal}\n`;
  if (parseMoney(r.totals.discount) > 0) msg += `Descuento: -$${r.totals.discount}\n`;
  if (parseMoney(r.totals.contribution) > 0) msg += `Aportación: +$${r.totals.contribution}\n`;
  msg += `IVA: $${r.totals.iva}\n*TOTAL: ${r.totals.total}*\n`;
  if (parseMoney(r.totals.advance) > 0) { msg += `\nAnticipo: $${r.totals.advance}\n*SALDO PENDIENTE: ${r.totals.balance}*\n`; }
  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n*CIAO CIAO MX*\nwww.ciaociao.mx\nTel: +52 1 55 9211 2643\n_Garantía de por vida en mano de obra_`;
  const phone = (r.client.phone || '').replace(/\D/g, '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showNotification('Abriendo WhatsApp...', 'success');
}

async function generatePNG() {
  try {
    showNotification('Generando PNG...', 'info');
    updateQR();
    // Ocultar elementos no deseados
    const toHide = $$('.delete-row, .clear-sig, .actions, .btn-back, .mobile-actions, .mobile-summary, .watermark');
    const prevDisplay = new Map();
    toHide.forEach(el => { if (el) { prevDisplay.set(el, el.style.display); el.style.display = 'none'; } });
    const element = document.querySelector('.gilded-frame');
    const canvas = await html2canvas(element, { scale: 3, logging: false, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900, windowHeight: element.scrollHeight });
    // Restaurar
    toHide.forEach(el => { if (el) el.style.display = prevDisplay.get(el) || ''; });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `Recibo_${$('#receiptNumber').textContent}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    showNotification('PNG generado', 'success');
  } catch (e) { console.error(e); showNotification('Error al generar PNG','error'); }
}

function bindUI() {
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
  $('#add-row').addEventListener('click', addRow);
  $('#save-receipt').addEventListener('click', saveReceiptAction);
  $('#new-receipt').addEventListener('click', newReceipt);
  $('#show-history').addEventListener('click', () => openHistory(loadReceiptAction));
  $('#closeHistoryModal').addEventListener('click', () => closeHistory());
  $('#searchHistory').addEventListener('input', e => searchHistory(e.target.value));
  const hFrom = document.getElementById('historyFrom');
  const hTo = document.getElementById('historyTo');
  const expCsv = document.getElementById('exportHistoryCsv');
  if (hFrom) hFrom.addEventListener('change', () => searchHistory(document.getElementById('searchHistory').value));
  if (hTo) hTo.addEventListener('change', () => searchHistory(document.getElementById('searchHistory').value));
  if (expCsv) expCsv.addEventListener('click', () => import('./history.js').then(m => m.exportHistoryCSV()));
  $('#generate-pdf').addEventListener('click', generatePDF);
  $('#share-whatsapp').addEventListener('click', shareWhatsApp);
  const pngBtn = document.getElementById('generate-png');
  if (pngBtn) pngBtn.addEventListener('click', generatePNG);
  const ticketBtn = document.getElementById('open-ticket');
  if (ticketBtn) ticketBtn.addEventListener('click', openTicketPreview);
  const openTplBtn = document.getElementById('open-templates');
  if (openTplBtn) openTplBtn.addEventListener('click', openTemplatesModal);
  const closeTplBtn = document.getElementById('closeTemplatesModal');
  if (closeTplBtn) closeTplBtn.addEventListener('click', closeTemplatesModal);
  const tplSearch = document.getElementById('templatesSearch');
  if (tplSearch) tplSearch.addEventListener('input', e => renderTemplatesTable(e.target.value));
  // Mobile actions
  const ms = document.getElementById('mobileSummary');
  const ma = document.getElementById('mobileActions');
  if (ms && ma) {
    const show = window.matchMedia('(max-width: 768px)').matches;
    ms.style.display = show ? 'flex' : 'none';
    ma.style.display = show ? 'grid' : 'none';
    document.getElementById('ma-add').addEventListener('click', addRow);
    document.getElementById('ma-save').addEventListener('click', saveReceiptAction);
    document.getElementById('ma-pdf').addEventListener('click', generatePDF);
    document.getElementById('ma-png').addEventListener('click', generatePNG);
    document.getElementById('ma-wa').addEventListener('click', shareWhatsApp);
  }
  // QR clickable
  const qr = document.getElementById('qrBox');
  if (qr) qr.addEventListener('click', ()=>{ if (qr.dataset.url) window.open(qr.dataset.url, '_blank'); });
  // Datos modal
  $('#edit-data').addEventListener('click', openDataModal);
  $('#closeDataModal').addEventListener('click', closeDataModal);
  $('#saveDataModal').addEventListener('click', saveDataFromModal);
  const dToday = document.getElementById('dateTodayBtn');
  const dPlus7 = document.getElementById('datePlus7Btn');
  const dPlus30 = document.getElementById('datePlus30Btn');
  if (dToday) dToday.addEventListener('click', () => {
    const t = new Date();
    document.getElementById('formIssueDate').value = t.toISOString().slice(0,10);
  });
  if (dPlus7) dPlus7.addEventListener('click', () => {
    const t = new Date(); t.setDate(t.getDate()+7);
    document.getElementById('formDeliveryDate').value = t.toISOString().slice(0,10);
  });
  if (dPlus30) dPlus30.addEventListener('click', () => {
    const t = new Date(); t.setDate(t.getDate()+30);
    document.getElementById('formValidUntil').value = t.toISOString().slice(0,10);
  });
  // Item modal
  $('#add-item-form').addEventListener('click', openItemModal);
  $('#closeItemModal').addEventListener('click', closeItemModal);
  $('#saveItemModal').addEventListener('click', saveItemFromModal);
  // Clientes
  const pickClient = document.getElementById('pick-client');
  if (pickClient) pickClient.addEventListener('click', openClientsModal);
  const closeClientsBtn = document.getElementById('closeClientsModal');
  if (closeClientsBtn) closeClientsBtn.addEventListener('click', closeClientsModal);
  const clientSearch = document.getElementById('clientSearch');
  if (clientSearch) clientSearch.addEventListener('input', e => renderClientsTable(e.target.value));
  // Ajustes
  const openSettingsBtn = document.getElementById('openSettings');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
  const closeSettingsBtn = document.getElementById('closeSettingsModal');
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
  const saveSettingsBtn = document.getElementById('saveSettingsModal');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsFromModal);

  document.body.addEventListener('click', e => {
    const del = e.target.closest('[data-action="delete-row"]');
    if (del) {
      const tr = del.closest('tr');
      const tbody = tr?.parentElement; if (tbody && tbody.children.length > 1) { tr.remove(); recalc(); showNotification('Producto eliminado','success'); }
      else showNotification('Debe mantener al menos un producto','error');
    }
    const actBtn = e.target.closest('[data-action]');
    if (actBtn) {
      const action = actBtn.getAttribute('data-action');
      const tr = actBtn.closest('tr');
      const tbody = tr?.parentElement;
      if (action === 'row-dup' && tr && tbody) {
        const clone = tr.cloneNode(true);
        tbody.insertBefore(clone, tr.nextSibling);
        recalc();
      }
      if (action === 'row-up' && tr && tbody) {
        const prev = tr.previousElementSibling; if (prev) tbody.insertBefore(tr, prev); recalc();
      }
      if (action === 'row-down' && tr && tbody) {
        const next = tr.nextElementSibling; if (next) tbody.insertBefore(next, tr); recalc();
      }
    }
    const clear = e.target.closest('[data-action="clear-signature"]');
    if (clear) clearSignature(clear.getAttribute('data-type'));
    const sig = e.target.closest('[data-signature]');
    if (sig) openSignatureModal(sig.getAttribute('data-signature'));
  });

  document.getElementById('clearModalSignature').addEventListener('click', clearModalSignature);
  document.getElementById('closeSignatureModal').addEventListener('click', closeSignatureModal);
  document.getElementById('saveSignature').addEventListener('click', () => {
    const res = saveSignatureToTarget();
    if (!res.ok) { showNotification('Por favor dibuje una firma', 'error'); return; }
    closeSignatureModal();
    showNotification('Firma guardada correctamente', 'success');
  });

  document.addEventListener('input', e => { if (e.target.matches('[contenteditable]') || e.target.matches('select')) recalc(); });
  // Formateo automático en blur para celdas numéricas
  document.addEventListener('focusout', e => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches('.qty')) { t.textContent = normalizeIntegerText(t.textContent || '1', { min: 1 }); recalc(); }
    if (t.matches('.price')) { t.textContent = normalizeCurrencyText(t.textContent || '0', { min: 0 }); recalc(); }
    if (t.id === 'descuento' || t.id === 'aportacion' || t.id === 'anticipo') { t.textContent = normalizeCurrencyText(t.textContent || '0', { min: 0 }); recalc(); }
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveReceiptAction(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newReceipt(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); generatePDF(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
      const tr = e.target.closest ? e.target.closest('tr') : null;
      const tbody = tr?.parentElement;
      if (tr && tbody && tbody.children.length > 1) { e.preventDefault(); tr.remove(); recalc(); showNotification('Producto eliminado','success'); }
    }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[contenteditable]')) {
      e.preventDefault();
      const editables = $$('[contenteditable]');
      const idx = editables.indexOf(e.target);
      if (idx >= 0 && idx < editables.length - 1) editables[idx + 1].focus(); else { addRow(); }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const editables = $$('[contenteditable]');
      const idx = editables.indexOf(document.activeElement);
      if (idx >= 0) {
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? Math.min(idx + 1, editables.length - 1) : Math.max(idx - 1, 0);
        editables[next].focus();
      }
    }
    if (e.key === 'Escape') { closeSignatureModal(); closeHistory(); }
  });

  // IVA controls
  const ivaRateInput = document.getElementById('ivaRate');
  const applyIvaInput = document.getElementById('applyIVA');
  if (ivaRateInput) ivaRateInput.addEventListener('input', () => recalc());
  if (applyIvaInput) applyIvaInput.addEventListener('change', () => recalc());
}

function openTicketPreview(){
  try { localStorage.setItem('ticket_preview_data', JSON.stringify(collectReceiptData())); } catch {}
  window.location.href = '../ticket/index.html';
}

function init() {
  // Load defaults
  try {
    const s = JSON.parse(localStorage.getItem('app_settings')||'{}');
    if (s && typeof s === 'object') {
      const applyIvaEl = document.getElementById('applyIVA');
      const ivaRateEl = document.getElementById('ivaRate');
      if (applyIvaEl && typeof s.applyIVA === 'boolean') applyIvaEl.checked = s.applyIVA;
      if (ivaRateEl && typeof s.ivaRate !== 'undefined') ivaRateEl.value = s.ivaRate;
      if (typeof s.validityDays === 'number') {
        const now = new Date(); const v = new Date(now); v.setDate(v.getDate() + s.validityDays);
        $('#validUntil').textContent = formatDate(v);
      }
      if (s.template === 'simple') document.body.classList.add('simple');
    }
  } catch {}
  const number = generateReceiptNumber();
  $('#receiptNumber').textContent = number;
  setCurrentReceiptId(`receipt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  const now = new Date(); const valid = new Date(now); valid.setDate(valid.getDate() + 30);
  $('#issueDate').textContent = formatDate(now);
  $('#deliveryDate').textContent = formatDate(now);
  $('#validUntil').textContent = formatDate(valid);
  initSignature(document.getElementById('signatureCanvas'));
  recalc();
  setInterval(() => { if ($('#receiptNumber').textContent !== '---') saveReceiptAction(); }, 30000);
}

document.addEventListener('DOMContentLoaded', () => { bindUI(); init(); });

// Prefill from a converted quote if present
function prefillFromQuoteIfPresent() {
  const raw = localStorage.getItem('quoteToConvert');
  if (!raw) return;
  localStorage.removeItem('quoteToConvert');
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
          <td class="center">
            <select class="transaction-type-select item-type" style="font-size:11px; padding:4px;">
              <option value="producto" selected>Producto</option>
              <option value="servicio">Servicio</option>
              <option value="reparacion">Reparación</option>
            </select>
          </td>
          <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
        $('#itemsBody').appendChild(tr);
      });
    }
    if (data?.discount) $('#descuento').textContent = data.discount;
    recalc();
    showNotification('Datos precargados desde cotización','success');
  } catch {}
}

// Call after init has laid out the base UI
document.addEventListener('DOMContentLoaded', () => { setTimeout(prefillFromQuoteIfPresent, 50); });

// =============
// Datos modal
// =============
function openDataModal() {
  // Prellenar con valores actuales si es posible
  $('#formClientName').value = $('#clientName').textContent.trim();
  $('#formClientPhone').value = $('#clientPhone').textContent.trim();
  $('#formClientEmail').value = $('#clientEmail').textContent.trim();
  $('#formClientAddress').value = $('#clientAddress').textContent.trim();
  clearAllErrors('#dataModal');
  // Convertir fechas mostradas a YYYY-MM-DD si posible (heurística muy simple)
  const parseShown = (txt) => {
    // Intenta Date.parse directo o deja vacío
    const d = new Date(txt);
    if (!isNaN(d)) return d.toISOString().slice(0,10);
    return '';
  };
  $('#formIssueDate').value = parseShown($('#issueDate').textContent);
  $('#formDeliveryDate').value = parseShown($('#deliveryDate').textContent);
  $('#formValidUntil').value = parseShown($('#validUntil').textContent);
  $('#dataModal').classList.add('active');
}
function closeDataModal() { $('#dataModal').classList.remove('active'); }
function saveDataFromModal() {
  const nameInput = $('#formClientName');
  const phoneInput = $('#formClientPhone');
  const emailInput = $('#formClientEmail');
  const addressInput = $('#formClientAddress');
  const issueInput = $('#formIssueDate');
  const deliveryInput = $('#formDeliveryDate');
  const validInput = $('#formValidUntil');

  let valid = true;
  clearAllErrors('#dataModal');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const issue = issueInput.value;
  const delivery = deliveryInput.value;
  const validUntil = validInput.value;

  if (!name) { setFieldError(nameInput, 'Nombre requerido'); valid = false; }
  if (phone && phone.replace(/\D/g,'').length < 8) { setFieldError(phoneInput, 'Teléfono inválido'); valid = false; }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) { setFieldError(emailInput, 'Correo inválido'); valid = false; }
  if (issue && validUntil && new Date(validUntil) < new Date(issue)) { setFieldError(validInput, '“Válido hasta” debe ser posterior'); valid = false; }
  if (!valid) return;
  $('#clientName').textContent = name;
  $('#clientPhone').textContent = phone || $('#clientPhone').textContent;
  $('#clientEmail').textContent = email || $('#clientEmail').textContent;
  $('#clientAddress').textContent = address || $('#clientAddress').textContent;
  const fmt = (s)=> s? formatDate(new Date(s)) : '';
  if (issue) $('#issueDate').textContent = fmt(issue);
  if (delivery) $('#deliveryDate').textContent = fmt(delivery);
  if (validUntil) $('#validUntil').textContent = fmt(validUntil);
  closeDataModal();
  saveReceiptAction();
}

// =============
// Item modal
// =============
function openItemModal(){
  clearAllErrors('#itemModal');
  $('#formItemDesc').value = '';
  $('#formItemSku').value = '';
  $('#formItemQty').value = '1';
  $('#formItemPrice').value = '0.00';
  $('#formItemType').value = 'producto';
  $('#itemModal').classList.add('active');
}
function closeItemModal(){ $('#itemModal').classList.remove('active'); }
function saveItemFromModal(){
  const descInput = $('#formItemDesc');
  const skuInput = $('#formItemSku');
  const qtyInput = $('#formItemQty');
  const priceInput = $('#formItemPrice');
  const typeInput = $('#formItemType');
  clearAllErrors('#itemModal');
  let ok = true;
  const desc = descInput.value.trim();
  const sku = skuInput.value.trim();
  let qty = parseInt(qtyInput.value || '1', 10); if (!Number.isFinite(qty) || qty < 1) { setFieldError(qtyInput, 'Cantidad mínima 1'); ok = false; }
  let price = parseFloat(priceInput.value || '0'); if (!Number.isFinite(price) || price < 0) { setFieldError(priceInput, 'Precio inválido'); ok = false; }
  const type = typeInput.value;
  if (!desc) { setFieldError(descInput, 'Descripción requerida'); ok = false; }
  if (!ok) return;
  qty = Math.max(1, qty); price = Math.max(0, price);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="editable" contenteditable>${desc}</td>
    <td class="center editable qty" contenteditable>${qty}</td>
    <td class="right editable price" contenteditable>${price.toFixed(2)}</td>
    <td class="right subtotal">0.00</td>
    <td class="center editable" contenteditable>${sku}</td>
    <td class="center">
      <select class="transaction-type-select item-type" style="font-size:11px; padding:4px;">
        <option value="producto" ${type==='producto'?'selected':''}>Producto</option>
        <option value="servicio" ${type==='servicio'?'selected':''}>Servicio</option>
        <option value="reparacion" ${type==='reparacion'?'selected':''}>Reparación</option>
      </select>
    </td>
    <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
  $('#itemsBody').appendChild(tr);
  recalc();
  closeItemModal();
  showNotification('Producto agregado','success');
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
function clearFieldError(input){
  input.classList.remove('is-invalid');
  const msg = input.nextElementSibling;
  if (msg && msg.classList && msg.classList.contains('error-message')) msg.textContent = '';
}
function clearAllErrors(scope){
  const root = typeof scope === 'string' ? document.querySelector(scope) : scope;
  if (!root) return;
  root.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  root.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

// =============
// Plantillas de ítems
// =============
function openTemplatesModal(){ renderTemplatesTable(''); document.getElementById('templatesModal').classList.add('active'); }
function closeTemplatesModal(){ document.getElementById('templatesModal').classList.remove('active'); }
function renderTemplatesTable(query){
  const rows = searchTemplates(query);
  const tbody = document.getElementById('templatesTableBody');
  tbody.innerHTML = '';
  rows.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.description}</td><td>${t.sku||''}</td><td>${t.type||''}</td><td class="right">$${formatNumber(t.price||0)}</td><td class="center"><button class="btn" data-addtpl='${encodeURIComponent(JSON.stringify(t))}'>Agregar</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.onclick = (e)=>{
    const btn = e.target.closest('button[data-addtpl]'); if (!btn) return;
    const t = JSON.parse(decodeURIComponent(btn.getAttribute('data-addtpl')));
    addRowFromTemplate(t);
  };
}
function addRowFromTemplate(t){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="editable" contenteditable>${t.description}</td>
    <td class="center editable qty" contenteditable>1</td>
    <td class="right editable price" contenteditable>${(t.price||0).toFixed(2)}</td>
    <td class="right subtotal">0.00</td>
    <td class="center editable" contenteditable>${t.sku||''}</td>
    <td class="center">
      <select class="transaction-type-select item-type" style="font-size:11px; padding:4px;">
        <option value="producto" ${t.type==='producto'?'selected':''}>Producto</option>
        <option value="servicio" ${t.type==='servicio'?'selected':''}>Servicio</option>
        <option value="reparacion" ${t.type==='reparacion'?'selected':''}>Reparación</option>
      </select>
    </td>
    <td class="center" style="position:relative; white-space:nowrap;">
      <button class="delete-row" title="Eliminar" data-action="delete-row">×</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Duplicar" data-action="row-dup">⎘</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Subir" data-action="row-up">↑</button>
      <button class="btn" style="padding:4px 6px; font-size:12px;" title="Bajar" data-action="row-down">↓</button>
    </td>`;
  $('#itemsBody').appendChild(tr);
  recalc();
  closeTemplatesModal();
}

// =============
// QR code
// =============
function base64url(str){
  const b64 = btoa(unescape(encodeURIComponent(str))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return b64;
}
async function sha256Hex(text){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function getQRPayload(){
  return {
    t: 'R',
    n: $('#receiptNumber').textContent.trim(),
    c: $('#clientName').textContent.trim(),
    d: $('#issueDate').textContent.trim(),
    tot: $('#total').textContent.trim(),
    id: getCurrentReceiptId() || ''
  };
}
function getQRSecret(){ try { const s = localStorage.getItem('qr_secret'); if (s) return s; } catch {} return 'CCMX-QR-2025'; }
async function updateQR(){
  const box = document.getElementById('qrBox');
  if (!box || typeof QRCode === 'undefined') return;
  const payload = JSON.stringify(getQRPayload());
  const p = base64url(payload);
  const h = await sha256Hex(p + '.' + getQRSecret());
  const parts = location.pathname.split('/'); parts.pop(); parts.pop();
  const base = location.origin + (parts.join('/') || '');
  const url = `${base}/verify/index.html?p=${p}&h=${h}`;
  box.innerHTML = '';
  try { new QRCode(box, { text: url, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.M }); } catch {}
  box.dataset.url = url;
}

// =============
// Ajustes (IVA y validez)
// =============
function openSettingsModal(){
  try {
    const s = JSON.parse(localStorage.getItem('app_settings')||'{}');
    if (s) {
      if (typeof s.ivaRate !== 'undefined') document.getElementById('settingsIvaRate').value = s.ivaRate;
      if (typeof s.applyIVA !== 'undefined') document.getElementById('settingsApplyIVA').value = String(!!s.applyIVA);
      if (typeof s.validityDays !== 'undefined') document.getElementById('settingsValidityDays').value = s.validityDays;
      if (typeof s.template !== 'undefined') document.getElementById('settingsTemplate').value = s.template;
      if (typeof s.pdfFormat !== 'undefined') document.getElementById('settingsPdfFormat').value = s.pdfFormat;
    }
  } catch {}
  document.getElementById('settingsModal').classList.add('active');
}
function closeSettingsModal(){ document.getElementById('settingsModal').classList.remove('active'); }
function saveSettingsFromModal(){
  const s = {
    ivaRate: parseFloat(document.getElementById('settingsIvaRate').value || '16') || 16,
    applyIVA: document.getElementById('settingsApplyIVA').value === 'true',
    validityDays: Math.max(0, parseInt(document.getElementById('settingsValidityDays').value || '30', 10)),
    template: document.getElementById('settingsTemplate').value || 'premium',
    pdfFormat: document.getElementById('settingsPdfFormat').value || 'letter'
  };
  try { localStorage.setItem('app_settings', JSON.stringify(s)); } catch {}
  const applyEl = document.getElementById('applyIVA'); if (applyEl) applyEl.checked = s.applyIVA;
  const rateEl = document.getElementById('ivaRate'); if (rateEl) rateEl.value = s.ivaRate;
  if (s.template === 'simple') document.body.classList.add('simple'); else document.body.classList.remove('simple');
  recalc();
  closeSettingsModal();
}

// Export/Import data
document.addEventListener('DOMContentLoaded', () => {
  const expBtn = document.getElementById('exportData');
  const impInput = document.getElementById('importDataInput');
  if (expBtn) expBtn.addEventListener('click', () => {
    try {
      const data = {
        receipts: JSON.parse(localStorage.getItem('premium_receipts_ciaociao')||'[]'),
        quotes: JSON.parse(localStorage.getItem('quotations_ciaociao')||'[]'),
        templates: JSON.parse(localStorage.getItem('item_templates')||'[]'),
        settings: JSON.parse(localStorage.getItem('app_settings')||'{}')
      };
      const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ciaociao-backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch {}
  });
  if (impInput) impInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.receipts) localStorage.setItem('premium_receipts_ciaociao', JSON.stringify(data.receipts));
      if (data.quotes) localStorage.setItem('quotations_ciaociao', JSON.stringify(data.quotes));
      if (data.templates) localStorage.setItem('item_templates', JSON.stringify(data.templates));
      if (data.settings) localStorage.setItem('app_settings', JSON.stringify(data.settings));
      showNotification('Datos importados', 'success');
    } catch { showNotification('Archivo inválido','error'); }
  });
});

// =============
// Clientes recientes
// =============
function openClientsModal(){ renderClientsTable(''); document.getElementById('clientsModal').classList.add('active'); }
function closeClientsModal(){ document.getElementById('clientsModal').classList.remove('active'); }
function renderClientsTable(query){
  const q = (query||'').toLowerCase();
  const tbody = document.getElementById('clientsTableBody');
  const list = aggregateClients().filter(c => (c.name||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q));
  tbody.innerHTML = '';
  list.slice(0,50).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.name||''}</td><td>${c.phone||''}</td><td>${c.email||''}</td><td>${c.address||''}</td><td><button class="btn" data-pick="${encodeURIComponent(JSON.stringify(c))}">Elegir</button></td>`;
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
  out.forEach(c => {
    const key = `${c.name||''}|${c.phone||''}|${c.email||''}|${c.address||''}`;
    if (seen.has(key)) return; seen.add(key); uniq.push(c);
  });
  return uniq;
}
