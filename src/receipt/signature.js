import { getSignatures, setSignature, clearSignature as clearSigState } from './state.js';

let signatureCanvas, ctx, isDrawing = false, currentType = null;

export function initSignature(canvasEl) {
  signatureCanvas = canvasEl;
  scaleCanvasForDPR();
  ctx = signatureCanvas.getContext('2d');
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  signatureCanvas.addEventListener('mousedown', start);
  signatureCanvas.addEventListener('mousemove', move);
  signatureCanvas.addEventListener('mouseup', stop);
  signatureCanvas.addEventListener('mouseout', stop);

  signatureCanvas.addEventListener('touchstart', touch);
  signatureCanvas.addEventListener('touchmove', touch);
  signatureCanvas.addEventListener('touchend', stop);
}

function scaleCanvasForDPR(){
  if (!signatureCanvas) return;
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const cssWidth = signatureCanvas.clientWidth || 450;
  const cssHeight = signatureCanvas.clientHeight || 200;
  signatureCanvas.width = Math.floor(cssWidth * dpr);
  signatureCanvas.height = Math.floor(cssHeight * dpr);
  const c = signatureCanvas.getContext('2d');
  if (c) c.setTransform(dpr,0,0,dpr,0,0);
}

window.addEventListener('resize', ()=>{ if (signatureCanvas) scaleCanvasForDPR(); });

export function openSignatureModal(type) {
  currentType = type;
  document.getElementById('signatureTitle').textContent = type === 'client' ? 'Firma del Cliente' : 'Firma del Responsable';
  clearModalSignature();
  const modal = document.getElementById('signatureModal');
  modal.classList.add('active');

  const existing = getSignatures()[type];
  if (existing) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = existing;
  }
}

export function closeSignatureModal() {
  currentType = null;
  document.getElementById('signatureModal').classList.remove('active');
}

export function clearModalSignature() {
  if (!ctx) return;
  ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
}

export function saveSignatureToTarget() {
  if (!signatureCanvas || !currentType) return { ok: false, reason: 'no-type-or-canvas' };
  const data = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
  const pixels = data.data;
  let has = false;
  for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 0) { has = true; break; } }
  if (!has) return { ok: false, reason: 'empty-signature' };

  const dataUrl = signatureCanvas.toDataURL();
  setSignature(currentType, dataUrl);

  const targetId = currentType === 'client' ? 'clientSigCanvas' : 'companySigCanvas';
  const target = document.getElementById(targetId);
  const tctx = target.getContext('2d');
  target.style.display = 'block';
  tctx.clearRect(0, 0, target.width, target.height);
  const img = new Image();
  img.onload = () => tctx.drawImage(img, 0, 0, target.width, target.height);
  img.src = dataUrl;

  const holder = document.querySelector(`[data-signature="${currentType}"]`);
  if (holder) holder.classList.add('signed');
  return { ok: true };
}

export function clearSignature(type) {
  clearSigState(type);
  const canvas = document.getElementById(type === 'client' ? 'clientSigCanvas' : 'companySigCanvas');
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = 'none';
  const holder = document.querySelector(`[data-signature="${type}"]`);
  if (holder) holder.classList.remove('signed');
}

function start(e) {
  isDrawing = true;
  const r = signatureCanvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
}
function move(e) {
  if (!isDrawing) return;
  const r = signatureCanvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
  ctx.stroke();
}
function stop() { isDrawing = false; }
function touch(e) {
  e.preventDefault();
  const t = e.touches[0];
  const ev = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : e.type === 'touchmove' ? 'mousemove' : 'mouseup', { clientX: t.clientX, clientY: t.clientY });
  signatureCanvas.dispatchEvent(ev);
}
