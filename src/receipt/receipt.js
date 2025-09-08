import { parseMoney, formatNumber, formatMoney } from './money.js';
import { generateReceiptNumber, getCurrentReceiptId, setCurrentReceiptId, getSignatures, setSignature, clearSignature as clearSigState, resetSignatures } from './state.js';
import { initSignature, openSignatureModal, closeSignatureModal, clearModalSignature, saveSignatureToTarget, clearSignature } from './signature.js';
import { saveReceipt, loadReceipt, openHistory, closeHistory, searchHistory } from './history.js';

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
  const iva = baseTotal * 0.16;
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
    <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
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
    $$('.delete-row, .clear-sig, .actions, .watermark, .btn-back').forEach(el => { if (el) el.style.display = 'none'; });
    const element = document.querySelector('.gilded-frame');
    const canvas = await html2canvas(element, { scale: 2, logging: false, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900, windowHeight: element.scrollHeight });
    $$('.delete-row, .clear-sig, .actions, .btn-back').forEach(el => { if (el) el.style.display = ''; });
    const wm = document.querySelector('.watermark'); if (wm) wm.style.display = 'flex';
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
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

function bindUI() {
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
  $('#add-row').addEventListener('click', addRow);
  $('#save-receipt').addEventListener('click', saveReceiptAction);
  $('#new-receipt').addEventListener('click', newReceipt);
  $('#show-history').addEventListener('click', () => openHistory(loadReceiptAction));
  $('#closeHistoryModal').addEventListener('click', () => closeHistory());
  $('#searchHistory').addEventListener('input', e => searchHistory(e.target.value));
  $('#generate-pdf').addEventListener('click', generatePDF);
  $('#share-whatsapp').addEventListener('click', shareWhatsApp);
  // Datos modal
  $('#edit-data').addEventListener('click', openDataModal);
  $('#closeDataModal').addEventListener('click', closeDataModal);
  $('#saveDataModal').addEventListener('click', saveDataFromModal);
  // Item modal
  $('#add-item-form').addEventListener('click', openItemModal);
  $('#closeItemModal').addEventListener('click', closeItemModal);
  $('#saveItemModal').addEventListener('click', saveItemFromModal);

  document.body.addEventListener('click', e => {
    const del = e.target.closest('[data-action="delete-row"]');
    if (del) {
      const tr = del.closest('tr');
      const tbody = tr?.parentElement; if (tbody && tbody.children.length > 1) { tr.remove(); recalc(); showNotification('Producto eliminado','success'); }
      else showNotification('Debe mantener al menos un producto','error');
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
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveReceiptAction(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newReceipt(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); generatePDF(); }
    if (e.key === 'Escape') { closeSignatureModal(); closeHistory(); }
  });
}

function init() {
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
  const name = $('#formClientName').value.trim();
  const phone = $('#formClientPhone').value.trim();
  const email = $('#formClientEmail').value.trim();
  const address = $('#formClientAddress').value.trim();
  const issue = $('#formIssueDate').value;
  const delivery = $('#formDeliveryDate').value;
  const validUntil = $('#formValidUntil').value;
  if (!name) { showNotification('El nombre del cliente es requerido','error'); return; }
  if (phone && phone.replace(/\D/g,'').length < 8) { showNotification('Teléfono inválido','error'); return; }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) { showNotification('Correo inválido','error'); return; }
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
  $('#formItemDesc').value = '';
  $('#formItemSku').value = '';
  $('#formItemQty').value = '1';
  $('#formItemPrice').value = '0.00';
  $('#formItemType').value = 'producto';
  $('#itemModal').classList.add('active');
}
function closeItemModal(){ $('#itemModal').classList.remove('active'); }
function saveItemFromModal(){
  const desc = $('#formItemDesc').value.trim();
  const sku = $('#formItemSku').value.trim();
  const qty = Math.max(1, parseInt($('#formItemQty').value || '1', 10));
  const price = Math.max(0, parseFloat($('#formItemPrice').value || '0'));
  const type = $('#formItemType').value;
  if (!desc) { showNotification('La descripción es requerida','error'); return; }
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
