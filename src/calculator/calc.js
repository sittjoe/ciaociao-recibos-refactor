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
  ['metal','precioGramo','peso','horas','tarifa','gemas','margen','aplicaIVA'].forEach(id => {
    document.getElementById(id).addEventListener('input', calc);
    document.getElementById(id).addEventListener('change', calc);
  });
  document.getElementById('guardar').addEventListener('click', guardar);
  document.getElementById('aCotizacion').addEventListener('click', exportarACotizacion);
  calc();
}

document.addEventListener('DOMContentLoaded', bind);

