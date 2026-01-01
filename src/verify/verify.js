function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const str = atob(b64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function bytesToHex(buf){ return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

async function sha256Hex(text){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bytesToHex(buf);
}

function setValue(id, val){ const el = document.getElementById(id); if (el) el.textContent = val; }

function getSecret(){
  // Permite override por localStorage para instalaciones privadas
  try { const custom = localStorage.getItem('qr_secret'); if (custom) return custom; } catch (e) { void e; }
  return 'CCMX-QR-2025';
}

async function main(){
  document.getElementById('year').textContent = new Date().getFullYear();
  const params = new URLSearchParams(window.location.search);
  const p = params.get('p');
  const h = params.get('h');
  const badge = document.getElementById('statusBadge');
  const toBad = (m)=>{ badge.className='status bad'; badge.textContent=m; };
  const toOk = (m)=>{ badge.className='status ok'; badge.textContent=m; };
  if (!p || !h) { toBad('QR inválido'); return; }
  try {
    const json = new TextDecoder().decode(b64urlToBytes(p));
    const payload = JSON.parse(json);
    const expected = await sha256Hex(p + '.' + getSecret());
    if (expected !== h) { toBad('No verificado'); } else { toOk('Verificado'); }
    setValue('vType', payload.t === 'R' ? 'Recibo' : (payload.t === 'Q' ? 'Cotización' : payload.t||'-'));
    setValue('vNumber', payload.n || '-');
    setValue('vClient', payload.c || '-');
    setValue('vDate', payload.d || '-');
    setValue('vTotal', payload.tot || '-');
    setValue('vId', payload.id || '-');
  } catch (e) {
    toBad('QR inválido');
  }

  document.getElementById('copyUrl').addEventListener('click', async ()=>{
    try { await navigator.clipboard.writeText(window.location.href); } catch (e) { void e; }
  });
  document.getElementById('openHome').addEventListener('click', ()=>{
    const parts = location.pathname.split('/'); parts.pop(); parts.pop();
    let base = location.origin + (parts.join('/') || '');
    if (!base) base = 'https://sittjoe.github.io/ciaociao-recibos-refactor';
    window.location.href = base + '/index.html';
  });
}

main();
