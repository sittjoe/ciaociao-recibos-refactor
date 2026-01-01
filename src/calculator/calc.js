import { formatNumber } from '../receipt/money.js';

const $ = (s, c = document) => c.querySelector(s);

function money(n){ return '$' + formatNumber(n || 0); }

function calc() {
  const precioGramo = parseFloat($('#precioGramo').value || '0');
  const peso = parseFloat($('#peso').value || '0');
  const horas = parseFloat($('#horas').value || '0');
  const tarifa = parseFloat($('#tarifa').value || '0');
  const gemas = parseFloat($('#gemas').value || '0');
  const margenPct = parseFloat($('#margen').value || '0');
  const conIVA = $('#aplicaIVA').value === 'si';

  const metal = precioGramo * peso;
  const mano = horas * tarifa;
  const subtotal = metal + mano + gemas;
  const margen = subtotal * (margenPct / 100);
  const base = subtotal + margen;
  const iva = conIVA ? base * 0.16 : 0;
  const total = base + iva;

  $('#sumMetal').textContent = money(metal);
  $('#sumMano').textContent = money(mano);
  $('#sumGemas').textContent = money(gemas);
  $('#sumSubtotal').textContent = money(subtotal);
  $('#sumMargen').textContent = money(margen);
  $('#sumBase').textContent = money(base);
  $('#sumIva').textContent = money(iva);
  $('#sumTotal').textContent = money(total);

  return { metal, mano, gemas, subtotal, margen, base, iva, total };
}

function guardar() {
  const data = calc();
  const project = {
    id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    createdAt: new Date().toISOString(),
    client: { name: $('#cliNombre').value, phone: $('#cliTel').value },
    description: $('#descripcion').value,
    inputs: {
      metal: $('#metal').value,
      precioGramo: $('#precioGramo').value,
      peso: $('#peso').value,
      horas: $('#horas').value,
      tarifa: $('#tarifa').value,
      gemas: $('#gemas').value,
      margen: $('#margen').value,
      aplicaIVA: $('#aplicaIVA').value,
    },
    summary: data,
  };
  const list = JSON.parse(localStorage.getItem('calculator_projects') || '[]');
  list.push(project);
  localStorage.setItem('calculator_projects', JSON.stringify(list));
  alert('Proyecto guardado');
}

function exportarACotizacion() {
  const data = calc();
  const items = [];
  const precioGramo = parseFloat($('#precioGramo').value || '0');
  const peso = parseFloat($('#peso').value || '0');
  const horas = parseFloat($('#horas').value || '0');
  const tarifa = parseFloat($('#tarifa').value || '0');
  const gemas = parseFloat($('#gemas').value || '0');
  const margenPct = parseFloat($('#margen').value || '0');

  if (peso > 0 && precioGramo > 0) items.push({ description: `Metal (${peso}g a $${formatNumber(precioGramo)}/g)`, qty: '1', price: formatNumber(precioGramo * peso), subtotal: formatNumber(precioGramo * peso) });
  if (horas > 0 && tarifa > 0) items.push({ description: `Mano de obra (${horas}h a $${formatNumber(tarifa)}/h)`, qty: '1', price: formatNumber(horas * tarifa), subtotal: formatNumber(horas * tarifa) });
  if (gemas > 0) items.push({ description: `Gemas / Insumos`, qty: '1', price: formatNumber(gemas), subtotal: formatNumber(gemas) });
  if (data.margen > 0) items.push({ description: `Margen (${margenPct}%)`, qty: '1', price: formatNumber(data.margen), subtotal: formatNumber(data.margen) });

  const payload = {
    client: { name: $('#cliNombre').value, phone: $('#cliTel').value, email: '', address: '' },
    items: items.map(it => ({ ...it, sku: '' })),
  };
  localStorage.setItem('calculatorToQuote', JSON.stringify(payload));
  window.location.href = '../quotation/index.html';
}

function bind() {
  const dCalc = debounce(calc, 50);
  ['metal','precioGramo','peso','horas','tarifa','gemas','margen','aplicaIVA'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e)=>{ sanitizeNumber(e.target); dCalc(); persist(); });
    document.getElementById(id).addEventListener('change', ()=>{ dCalc(); persist(); });
  });
  document.getElementById('guardar').addEventListener('click', guardar);
  document.getElementById('aCotizacion').addEventListener('click', exportarACotizacion);
  document.getElementById('m-guardar').addEventListener('click', guardar);
  document.getElementById('m-cot').addEventListener('click', exportarACotizacion);
  // Cargar estado previo
  restore();
  calc();
}

document.addEventListener('DOMContentLoaded', bind);

function sanitizeNumber(input){
  if (!input) return;
  const id = input.id;
  const val = input.value;
  if (['peso','precioGramo','horas','tarifa','gemas','margen'].includes(id)){
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    if (cleaned !== val) input.value = cleaned;
  }
}

function persist(){
  try {
    const s = {
      metal: $('#metal').value,
      precioGramo: $('#precioGramo').value,
      peso: $('#peso').value,
      horas: $('#horas').value,
      tarifa: $('#tarifa').value,
      gemas: $('#gemas').value,
      margen: $('#margen').value,
      aplicaIVA: $('#aplicaIVA').value,
      cliente: { nombre: $('#cliNombre').value, tel: $('#cliTel').value, desc: $('#descripcion').value }
    };
    localStorage.setItem('calc_state', JSON.stringify(s));
  } catch (e) { void e; }
}

function restore(){
  try {
    const s = JSON.parse(localStorage.getItem('calc_state')||'{}');
    if (!s) return;
    if (s.metal) $('#metal').value = s.metal;
    if (s.precioGramo) $('#precioGramo').value = s.precioGramo;
    if (s.peso) $('#peso').value = s.peso;
    if (s.horas) $('#horas').value = s.horas;
    if (s.tarifa) $('#tarifa').value = s.tarifa;
    if (s.gemas) $('#gemas').value = s.gemas;
    if (s.margen) $('#margen').value = s.margen;
    if (s.aplicaIVA) $('#aplicaIVA').value = s.aplicaIVA;
    if (s.cliente){ $('#cliNombre').value = s.cliente.nombre||''; $('#cliTel').value = s.cliente.tel||''; $('#descripcion').value = s.cliente.desc||''; }
  } catch (e) { void e; }
}

function debounce(fn, wait=50){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
