(function(){
  // --- Auth gate (inline, no external deps) ---
  (function(){
    try {
      var path = location.pathname;
      if (path.indexOf('/verify/') !== -1 || path.indexOf('/auth/') !== -1) return;
      var ok = localStorage.getItem('isAuthenticated') === 'true';
      var exp = parseInt(localStorage.getItem('sessionExpiry') || '0', 10);
      if (!(ok && Date.now() < exp)) {
        var parts = location.pathname.split('/').filter(Boolean);
        var base = (location.host.indexOf('github.io') !== -1 && parts.length) ? ('/' + parts[0]) : '';
        var target = encodeURIComponent(location.pathname + location.search + location.hash);
        location.replace(base + '/auth/index.html?redirect=' + target);
      }
    } catch {}
  })();

  // --- money.js ---
  function parseMoney(v){ if (!v) return 0; return parseFloat(String(v).replace(/[^0-9.\-]/g,'')) || 0; }
  function formatNumber(n){ return new Intl.NumberFormat('es-MX',{ minimumFractionDigits:2, maximumFractionDigits:2 }).format(n); }
  function formatMoney(n){ return '$' + formatNumber(n); }
  function normalizeCurrencyText(text, opts){ opts=opts||{}; var min=opts.min||0; var num=parseMoney(text); var clamped=Math.max(min, isFinite(num)?num:0); return formatNumber(clamped); }
  function normalizeIntegerText(text, opts){ opts=opts||{}; var min=opts.min||0; var only=String(text).replace(/[^0-9-]/g,''); var v=parseInt(only||'0',10); if(!isFinite(v)) v=0; if(typeof min==='number') v=Math.max(min,v); return String(v); }

  // --- state.js ---
  var currentReceiptId=null; var signatures={ client:null, company:null };
  function getCurrentReceiptId(){ return currentReceiptId; }
  function setCurrentReceiptId(id){ currentReceiptId=id; }
  function getSignatures(){ return signatures; }
  function setSignature(type, dataUrl){ signatures[type]=dataUrl; }
  function clearSignature(type){ signatures[type]=null; }
  function resetSignatures(){ signatures={ client:null, company:null }; }
  function generateReceiptNumber(){ var d=new Date(); var y=d.getFullYear(); var m=String(d.getMonth()+1).padStart(2,'0'); var day=String(d.getDate()).padStart(2,'0'); var dateKey='CCI-'+y+m+day; var daily=(parseInt(localStorage.getItem(dateKey)||'0',10)+1).toString(); localStorage.setItem(dateKey,daily); (function(){ var limit=new Date(); limit.setDate(limit.getDate()-30); Object.keys(localStorage).forEach(function(k){ if(k.indexOf('CCI-')!==0) return; var parts=k.split('-'); if(parts.length<2) return; var ds=parts[1]; if(ds.length!==8) return; var dd=new Date(ds.slice(0,4), parseInt(ds.slice(4,6))-1, ds.slice(6,8)); if(dd<limit) localStorage.removeItem(k); }); })(); var num='CCI-'+y+'-'+m+day+'-'+daily.padStart(3,'0'); currentReceiptId='receipt_'+Date.now()+'_'+Math.random().toString(36).slice(2,11); return num; }

  // --- signature.js ---
  var signatureCanvas, ctx, isDrawing=false, currentType=null;
  function initSignature(canvasEl){ signatureCanvas=canvasEl; scaleCanvasForDPR(); ctx=signatureCanvas.getContext('2d'); ctx.strokeStyle='#1f2937'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round'; signatureCanvas.addEventListener('mousedown', start); signatureCanvas.addEventListener('mousemove', move); signatureCanvas.addEventListener('mouseup', stop); signatureCanvas.addEventListener('mouseout', stop); signatureCanvas.addEventListener('touchstart', touch); signatureCanvas.addEventListener('touchmove', touch); signatureCanvas.addEventListener('touchend', stop); }
  function scaleCanvasForDPR(){ if(!signatureCanvas) return; var dpr=Math.max(window.devicePixelRatio||1,1); var cssW=signatureCanvas.clientWidth||450; var cssH=signatureCanvas.clientHeight||200; signatureCanvas.width=Math.floor(cssW*dpr); signatureCanvas.height=Math.floor(cssH*dpr); var c=signatureCanvas.getContext('2d'); if(c) c.setTransform(dpr,0,0,dpr,0,0); }
  window.addEventListener('resize', function(){ if(signatureCanvas) scaleCanvasForDPR(); });
  function openSignatureModal(type){ currentType=type; document.getElementById('signatureTitle').textContent= type==='client'?'Firma del Cliente':'Firma del Responsable'; clearModalSignature(); var modal=document.getElementById('signatureModal'); modal.classList.add('active'); var existing=getSignatures()[type]; if(existing){ var img=new Image(); img.onload=function(){ ctx.drawImage(img,0,0); }; img.src=existing; } }
  function closeSignatureModal(){ currentType=null; document.getElementById('signatureModal').classList.remove('active'); }
  function clearModalSignature(){ if(!ctx) return; ctx.clearRect(0,0,signatureCanvas.width, signatureCanvas.height); }
  function saveSignatureToTarget(){ if(!signatureCanvas||!currentType) return {ok:false}; var data=ctx.getImageData(0,0,signatureCanvas.width, signatureCanvas.height); var pix=data.data; var has=false; for(var i=0;i<pix.length;i+=4){ if(pix[i+3]>0){ has=true; break; } } if(!has) return {ok:false}; var url=signatureCanvas.toDataURL(); setSignature(currentType,url); var tid=currentType==='client'?'clientSigCanvas':'companySigCanvas'; var t=document.getElementById(tid); var tctx=t.getContext('2d'); t.style.display='block'; tctx.clearRect(0,0,t.width,t.height); var img=new Image(); img.onload=function(){ tctx.drawImage(img,0,0,t.width,t.height); }; img.src=url; var holder=document.querySelector('[data-signature="'+currentType+'"]'); if(holder) holder.classList.add('signed'); return {ok:true}; }
  function clearSignatureUI(type){ clearSignature(type); var canvas=document.getElementById(type==='client'?'clientSigCanvas':'companySigCanvas'); var c=canvas.getContext('2d'); c.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; var holder=document.querySelector('[data-signature="'+type+'"]'); if(holder) holder.classList.remove('signed'); }
  function start(e){ isDrawing=true; var r=signatureCanvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX-r.left, e.clientY-r.top); }
  function move(e){ if(!isDrawing) return; var r=signatureCanvas.getBoundingClientRect(); ctx.lineTo(e.clientX-r.left, e.clientY-r.top); ctx.stroke(); }
  function stop(){ isDrawing=false; }
  function touch(e){ e.preventDefault(); var t=e.touches[0]; var ev=new MouseEvent(e.type==='touchstart'?'mousedown': e.type==='touchmove'?'mousemove':'mouseup',{ clientX:t.clientX, clientY:t.clientY }); signatureCanvas.dispatchEvent(ev); }

  // --- history.js ---
  var STORAGE_KEY='premium_receipts_ciaociao'; var sortDir=localStorage.getItem('receipts_sort_dir')||'desc';
  function listReceipts(){ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }
  function saveReceipt(data){ var arr=listReceipts(); var i=arr.findIndex(function(r){ return r.id===data.id; }); if(i>=0) arr[i]=data; else arr.push(data); if(arr.length>1000) arr.shift(); localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
  function loadReceipt(id){ return listReceipts().find(function(r){ return r.id===id; })||null; }
  function deleteReceipt(id){ var next=listReceipts().filter(function(r){ return r.id!==id; }); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  function renderHistoryTable(onLoad){ var tbody=document.getElementById('historyTableBody'); tbody.innerHTML=''; listReceipts().slice().sort(function(a,b){ var da=new Date(a?.dates?.issue||a?.date||0).getTime(); var db=new Date(b?.dates?.issue||b?.date||0).getTime(); return sortDir==='asc'? da-db : db-da; }).forEach(function(r){ var tr=document.createElement('tr'); tr.innerHTML='<td>'+ (r.number||'') +'</td><td>'+ (r.dates?.issue||'') +'</td><td>'+ (r.client?.name||'') +'</td><td>'+ (r.totals?.total||'') +'</td><td>'+ (r.transactionType||'') +'</td><td><button data-action="load" data-id="'+r.id+'">Cargar</button> <button data-action="delete" data-id="'+r.id+'">Eliminar</button></td>'; tbody.appendChild(tr); }); tbody.addEventListener('click', function(e){ var btn=e.target.closest('button'); if(!btn) return; var id=btn.getAttribute('data-id'); var action=btn.getAttribute('data-action'); if(action==='load') onLoad(id); if(action==='delete'){ deleteReceipt(id); renderHistoryTable(onLoad); } }, { once:true }); var sortTh=document.getElementById('historySortDate'); var dirSpan=document.getElementById('historySortDateDir'); if(dirSpan) dirSpan.textContent= sortDir==='asc'?'↑':'↓'; if(sortTh){ sortTh.onclick=function(){ sortDir= sortDir==='asc'?'desc':'asc'; localStorage.setItem('receipts_sort_dir', sortDir); renderHistoryTable(onLoad); }; } }
  function searchHistory(query){ var q=String(query||'').toLowerCase(); var tbody=document.getElementById('historyTableBody'); var from=document.getElementById('historyFrom')?.value; var to=document.getElementById('historyTo')?.value; var items=listReceipts().slice().sort(function(a,b){ var da=new Date(a?.dates?.issue||a?.date||0).getTime(); var db=new Date(b?.dates?.issue||b?.date||0).getTime(); return sortDir==='asc'? da-db: db-da; }).filter(function(r){ return (r.number||'').toLowerCase().includes(q) || (r.client?.name||'').toLowerCase().includes(q) || (r.dates?.issue||'').toLowerCase().includes(q); }).filter(function(r){ var d=new Date(r?.dates?.issue||r?.date||0); if(from && d<new Date(from)) return false; if(to && d>new Date(to)) return false; return true; }); tbody.innerHTML=''; items.forEach(function(r){ var tr=document.createElement('tr'); tr.innerHTML='<td>'+ (r.number||'') +'</td><td>'+ (r.dates?.issue||'') +'</td><td>'+ (r.client?.name||'') +'</td><td>'+ (r.totals?.total||'') +'</td><td>'+ (r.transactionType||'') +'</td><td><button data-action="load" data-id="'+r.id+'">Cargar</button> <button data-action="delete" data-id="'+r.id+'">Eliminar</button></td>'; tbody.appendChild(tr); }); }
  function exportHistoryCSV(){ var q=document.getElementById('searchHistory')?.value||''; var from=document.getElementById('historyFrom')?.value; var to=document.getElementById('historyTo')?.value; var items=listReceipts().slice().sort(function(a,b){ var da=new Date(a?.dates?.issue||a?.date||0).getTime(); var db=new Date(b?.dates?.issue||b?.date||0).getTime(); return sortDir==='asc'? da-db: db-da; }).filter(function(r){ var ok=(r.number||'').toLowerCase().includes(q.toLowerCase()) || (r.client?.name||'').toLowerCase().includes(q.toLowerCase()) || (r.dates?.issue||'').toLowerCase().includes(q.toLowerCase()); if(!ok) return false; var d=new Date(r?.dates?.issue||r?.date||0); if(from && d<new Date(from)) return false; if(to && d>new Date(to)) return false; return true; }); var rows=[['Folio','Fecha','Cliente','Total','Tipo']]; items.forEach(function(r){ rows.push([r.number, r.dates?.issue||'', r.client?.name||'', r.totals?.total||'', r.transactionType||'']); }); var csv=rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n'); var blob=new Blob([csv],{ type:'text/csv;charset=utf-8;' }); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='recibos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function openHistory(onLoad){ renderHistoryTable(onLoad); document.getElementById('historyModal').classList.add('active'); document.body.classList.add('modal-open'); }
  function closeHistory(){ document.getElementById('historyModal').classList.remove('active'); document.body.classList.remove('modal-open'); }

  // --- templates.js ---
  var DEFAULT_TEMPLATES=[{description:'Anillo oro 14K', sku:'AN-ORO14', price:8500.0, type:'producto'}, {description:'Cadena plata .925', sku:'CAD-PL925', price:1200.0, type:'producto'}, {description:'Aretes oro 18K', sku:'AR-ORO18', price:9800.0, type:'producto'}, {description:'Limpieza profesional', sku:'SERV-LIMP', price:300.0, type:'servicio'},{description:'Ajuste de talla', sku:'SERV-AJUSTE', price:600.0, type:'servicio'},{description:'Soldadura plata', sku:'SERV-SOLD-PL', price:450.0, type:'servicio'},{description:'Soldadura oro', sku:'SERV-SOLD-OR', price:1200.0, type:'servicio'}];
  function getTemplates(){ try{ var raw=localStorage.getItem('item_templates'); if(!raw) return DEFAULT_TEMPLATES.slice(); var arr=JSON.parse(raw); if(Array.isArray(arr)&&arr.length) return arr; }catch{} return DEFAULT_TEMPLATES.slice(); }
  function searchTemplates(query){ var q=(query||'').toLowerCase(); return getTemplates().filter(function(t){ return (t.description||'').toLowerCase().includes(q) || (t.sku||'').toLowerCase().includes(q) || (t.type||'').toLowerCase().includes(q); }); }
  function saveTemplates(list){ try{ localStorage.setItem('item_templates', JSON.stringify(list)); }catch{} }
  function upsertTemplate(tpl){ var list=getTemplates(); var id=tpl.id||(tpl.id='tpl_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)); var idx=list.findIndex(function(x){ return x.id===id; }); if(idx>=0) list[idx]=tpl; else list.push(tpl); saveTemplates(list); return tpl; }
  function removeTemplate(id){ var list=getTemplates().filter(function(x){ return x.id!==id; }); saveTemplates(list); }
  function exportTemplatesCSV(){ var rows=[['description','sku','type','price']]; getTemplates().forEach(function(t){ rows.push([t.description||'', t.sku||'', t.type||'', String(t.price||0)]); }); var csv=rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n'); var blob=new Blob([csv],{ type:'text/csv;charset=utf-8;' }); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='plantillas.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function importTemplatesCSV(text){ var lines=String(text).split(/\r?\n/).filter(Boolean); if(!lines.length) return; var out=[]; for(var i=1;i<lines.length;i++){ var cols=(function(line){ var res=[]; var cur=''; var inq=false; for(var j=0;j<line.length;j++){ var ch=line[j]; if(ch==='"'){ if(inq && line[j+1]==='"'){ cur+='"'; j++; } else { inq=!inq; } } else if(ch===',' && !inq){ res.push(cur); cur=''; } else { cur+=ch; } } res.push(cur); return res.map(function(s){ return s.trim(); }); })(lines[i]); if(!cols.length) continue; var description=cols[0], sku=cols[1], type=cols[2], price=cols[3]; out.push({ id:'tpl_'+Date.now()+'_'+i, description:description, sku:sku, type:type||'producto', price: parseFloat(price||'0')||0 }); }
    var merged=getTemplates().concat(out); saveTemplates(merged); }

  // --- receipt.js (lightly adapted) ---
  // The original file is large; we include it via a <script type="module"> in repo build; here we assume it is loaded separately.
})();

