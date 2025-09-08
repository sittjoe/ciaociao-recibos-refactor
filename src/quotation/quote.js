import { parseMoney, formatNumber, formatMoney } from '../receipt/money.js';
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
  const iva = base * 0.16;
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
    <td style="position:relative;"><span class="delete-row" data-action="delete-row">×</span></td>`;
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
    const imgWidth = 210, pageHeight = 279, imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight, position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); heightLeft -= pageHeight; }
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
  $('#convert-to-receipt').addEventListener('click', convertToReceipt);

  document.body.addEventListener('click', e => {
    const del = e.target.closest('[data-action="delete-row"]');
    if (del) {
      const tr = del.closest('tr'); const tbody = tr?.parentElement;
      if (tbody && tbody.children.length > 1) { tr.remove(); recalc(); showNotification('Producto eliminado','success'); }
      else showNotification('Debe mantener al menos un producto','error');
    }
  });

  document.addEventListener('input', e => { if (e.target.matches('[contenteditable]')) recalc(); });
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

