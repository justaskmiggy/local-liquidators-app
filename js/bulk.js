/* BULK WALKTHROUGH: snap whole rooms / groups -> AI itemized list -> per-item FBMP + auction values -> report.
 * Photos live in IndexedDB ('ll_bulk') so nothing is lost offline or on reload; job metadata + report in localStorage (LL.state.bulk).
 * AI: POST {mode:'bulk'} batches to the analyze endpoint. If no backend/key (GitHub Pages) -> clearly labeled DEMO estimate. */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
const AREAS = ['Kitchen','Front of house','Walk-in','Storage','Other'];
const CFG = { endpoint: (window.LL_CONFIG && (window.LL_CONFIG.bulkEndpoint || window.LL_CONFIG.analyzeEndpoint)) || 'api/analyze', batch: 8, timeoutMs: 90000 };
const COND = ['Like New','Good','Fair','Workhorse','Unknown'];
const B = () => { const s=S(); if(!s.bulk) s.bulk = {job:'', area:'Kitchen', photos:[], seq:0, report:null, showComm:true}; if(s.bulk.showComm===undefined) s.bulk.showComm=true; return s.bulk; };
const money = n => '$' + Math.round(n||0).toLocaleString('en-US');
const rng = (a,b) => (Math.round(a)===Math.round(b)) ? money(a) : money(a)+'–'+money(b);
const slug = s => (s||'walkthrough').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'walkthrough';

/* ---------- IndexedDB photo store ---------- */
const thumbs = new Map(); let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => { if(!window.indexedDB) return rej(new Error('no idb'));
  const r = indexedDB.open('ll_bulk', 1); r.onupgradeneeded = () => r.result.createObjectStore('ph'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('ph', mode); const q = fn(t.objectStore('ph')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
const store = {
  async put(id, rec){ thumbs.set(id, rec.thumb); await tx('readwrite', s => s.put(rec, id)); },
  async get(id){ try{ return await tx('readonly', s => s.get(id)); }catch(e){ return null; } },
  async del(id){ thumbs.delete(id); try{ await tx('readwrite', s => s.delete(id)); }catch(e){} },
  async clear(){ thumbs.clear(); try{ await tx('readwrite', s => s.clear()); }catch(e){} },
  async init(){ try{ const d = await db(); await new Promise(res => { const t = d.transaction('ph'); const rq = t.objectStore('ph').openCursor();
    rq.onsuccess = () => { const c = rq.result; if(c){ thumbs.set(c.key, c.value && c.value.thumb); c.continue(); } }; t.oncomplete = res; t.onerror = res; }); }catch(e){} }
};
LL.bulkStore = store;
let ready = LL.bulkReady = store.init().then(() => { // drop metadata rows whose photo never made it to disk
  const b = B(); const before = b.photos.length; b.photos = b.photos.filter(p => thumbs.has(p.id)); if(b.photos.length !== before) LL.save(); });
if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});

/* ---------- image helpers ---------- */
const canvasURL = (src, w, h, max, q) => { const r = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w*r); c.height = Math.round(h*r); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
async function bitmapOf(file){ try{ return await createImageBitmap(file, {imageOrientation:'from-image'}); }catch(e){
  return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); } }
async function addPhoto(src, w, h){
  const b = B(); const id = 'b' + Date.now().toString(36) + LL.uid().slice(0,4); b.seq = (b.seq||0) + 1;
  const rec = { full: canvasURL(src, w, h, 2048, .82), thumb: canvasURL(src, w, h, 360, .7) };
  await store.put(id, rec);
  b.photos.push({ id, n: b.seq, area: b.area || 'Kitchen', ts: Date.now() }); b.report && (b.report.stale = true); LL.save();
  return id;
}
async function addFiles(files){
  files = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name)); if(!files.length) return 0;
  let n = 0; LL.toast(`Saving ${files.length} photo${files.length===1?'':'s'}…`);
  for(const f of files){ try{ const bm = await bitmapOf(f); await addPhoto(bm, bm.width || bm.naturalWidth, bm.height || bm.naturalHeight); bm.close && bm.close(); n++; }catch(e){ console.warn('photo failed', e); } }
  LL.toast(`${n} photo${n===1?'':'s'} saved on this phone`); return n;
}
const label = p => 'P' + p.n;

/* ---------- mode toggle (Single item | Bulk walkthrough) on the Sell screen ---------- */
LL.modeToggle = active => `<div class="bk-toggle noprint" role="group" aria-label="Capture mode"><div class="seg">
  <button data-nav="#/sell" aria-pressed="${active==='single'}">${I.camera} Single item</button>
  <button data-nav="#/sell/bulk" aria-pressed="${active==='bulk'}">${I.grid} Bulk walkthrough</button></div></div>`;
const origSell = LL.views.sell;
LL.views.sell = r => { const o = origSell(r) || {html:''}; o.html = LL.modeToggle('single') + o.html; return o; };

/* ---------- capture screen ---------- */
function areaChips(cur, act){ return `<div class="chips bk-areas" role="group" aria-label="Area">${AREAS.map(a => `<button class="chip" data-act="${act}" data-v="${esc(a)}" aria-pressed="${a===cur}">${esc(a)}</button>`).join('')}</div>`; }
function grid(){ const b = B(); if(!b.photos.length) return `<div class="bk-empty">${I.grid}<h3>Snap the whole room</h3><p>Stand back, get everything in frame. 3–6 photos per room is plenty. Close-ups of data plates help the AI read models.</p></div>`;
  const groups = AREAS.concat([...new Set(b.photos.map(p=>p.area))].filter(a=>!AREAS.includes(a)));
  return groups.filter(a => b.photos.some(p => p.area===a)).map(a => { const ps = b.photos.filter(p => p.area===a);
    return `<div class="bk-grp"><div class="bk-gh"><b>${esc(a)}</b><span>${ps.length} photo${ps.length===1?'':'s'}</span></div><div class="bk-grid">${ps.map(p => `<button class="bk-th" data-act="bkphoto" data-id="${p.id}" aria-label="Photo ${label(p)}, ${esc(p.area)}"><img src="${thumbs.get(p.id)||''}" alt=""><i>${label(p)}</i></button>`).join('')}</div></div>`; }).join(''); }
LL.views.bulk = () => { const b = B(); const n = b.photos.length;
  return {html:`${LL.modeToggle('bulk')}
  <section class="bk-hero"><div><span class="badge acc">Bulk walkthrough</span><h2>Shoot rooms, not items.</h2><p>AI lists everything it sees and prices it for Facebook Marketplace and auction.</p></div></section>
  <div class="pad bk-form">
    <label class="field"><span>Job name</span><input type="text" id="bk-job" value="${esc(b.job)}" placeholder="e.g. Husson Bakery - MD" autocomplete="off" enterkeyhint="done"></label>
    <div class="lbl">Area for new photos</div>${areaChips(b.area,'bkarea')}
    <div class="bk-cap">
      <button class="btn accent block bk-big" data-act="bkcam">${I.camera} Take photos</button>
      <label class="btn ghost block bk-big bk-lib">${I.image} Add from Photos<input type="file" accept="image/*" multiple id="bk-lib"></label>
    </div>
    <p class="hint center">Fastest: shoot with your iPhone Camera, then tap <b>Add from Photos</b> and select them all. Saved on this phone, works with no signal.</p>
  </div>
  <div class="sec"><h2>${n} photo${n===1?'':'s'}</h2>${n?`<button class="link" data-act="bkshare">${I.share.replace('<svg','<svg width="16" height="16"')} Send to my assistant</button>`:''}</div>
  <div class="bk-photos">${grid()}</div>
  ${b.report?`<div class="pad"><a class="btn ghost block sm" href="#/sell/bulk/report">${I.check} Open last report (${b.report.items.length} items)${b.report.stale?' · new photos since':''}</a></div>`:''}
  ${n?`<div class="pad"><button class="btn danger sm block" data-act="bknew">${I.trash} Start a new walkthrough</button></div>`:''}
  <div style="height:90px"></div>
  <div class="stickyfoot noprint"><button class="btn block bk-go" data-act="bkanalyze" ${n?'':'disabled'}>${I.sparkle} Analyze ${n||''} photo${n===1?'':'s'}</button></div>`,
  mount(el){ const j = el.querySelector('#bk-job'); j.addEventListener('input', () => { B().job = j.value.trim(); LL.save(); });
    el.querySelector('#bk-lib').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; await addFiles(fs); LL.render(true); }); } }; };
LL.acts.bkarea = btn => { B().area = btn.dataset.v; LL.save(); LL.$$('[data-act=bkarea]').forEach(x => x.setAttribute('aria-pressed', x===btn)); };
LL.acts.bknew = async () => { const b = B(); if(!confirm(`Clear ${b.photos.length} photos and the report from this phone? Send them to your assistant first if you still need them.`)) return;
  await store.clear(); Object.assign(b, {job:'', photos:[], seq:0, report:null}); LL.save(); LL.render(); };

/* photo sheet: big view, change area, delete, retake */
LL.acts.bkphoto = async btn => { const b = B(), p = b.photos.find(x => x.id===btn.dataset.id); if(!p) return;
  const rec = await store.get(p.id); const ov = LL.$('#overlay');
  ov.innerHTML = `<div class="bk-sheetwrap" data-x="close"><div class="bk-sheet" role="dialog" aria-label="Photo ${label(p)}">
    <div class="bk-sh-img"><img src="${(rec&&rec.full)||thumbs.get(p.id)}" alt="Photo ${label(p)}"><b>${label(p)}</b></div>
    <div class="lbl" style="margin-top:12px">Area</div>${areaChips(p.area,'bkparea')}
    <div class="row" style="margin-top:10px"><button class="btn ghost" data-x="retake">${I.camera} Retake</button><button class="btn danger" data-x="del">${I.trash} Delete</button></div>
    <button class="btn block" style="margin-top:10px" data-x="close">Done</button></div></div>`;
  ov.classList.add('on','bk-tr');
  const close = () => { ov.classList.remove('on','bk-tr'); ov.innerHTML=''; LL.render(true); };
  ov.onclick = async e => { const a = e.target.closest('[data-act=bkparea]'); if(a){ e.stopPropagation(); p.area = a.dataset.v; b.report && (b.report.stale=true); LL.save(); ov.querySelectorAll('[data-act=bkparea]').forEach(x=>x.setAttribute('aria-pressed',x===a)); return; }
    const x = e.target.closest('[data-x]'); if(!x) return; if(x.dataset.x==='close' && e.target!==x && !x.classList.contains('btn')) return;
    if(x.dataset.x==='del' || x.dataset.x==='retake'){ await store.del(p.id); b.photos = b.photos.filter(q => q!==p); LL.save();
      if(x.dataset.x==='retake'){ b.area = p.area; LL.save(); ov.onclick=null; ov.classList.remove('bk-tr'); LL.go('#/sell/bulk/cam'); return; } LL.toast('Photo deleted'); }
    ov.onclick=null; close(); };
};
LL.acts.bkparea = () => {}; // handled inside the sheet

/* ---------- rapid camera: tap tap tap, no review step ---------- */
LL.acts.bkcam = () => LL.go('#/sell/bulk/cam');
LL.views.bulkcam = () => { const b = B();
  return {overlay:true, html:`<div class="cam bk-cam"><video playsinline muted autoplay></video><div class="shade"></div><div class="bk-flash"></div>
   <div class="cam-top"><div class="hd"><div class="ti"><b>Walkthrough</b><small>Step back · whole room or group in frame</small></div><button class="rbtn" data-x="done" aria-label="Done">${I.x}</button></div>
    <div class="chips bk-areas dark">${AREAS.map(a=>`<button class="chip" data-a="${esc(a)}" aria-pressed="${a===b.area}">${esc(a)}</button>`).join('')}</div></div>
   <div class="cam-fb" hidden><h3>Use your iPhone camera</h3><p id="bk-fbmsg">Live camera isn’t available here. Tap below — each photo is saved right away.</p>
    <label class="btn accent">${I.camera} Take a photo<input type="file" accept="image/*" capture="environment" id="bk-fbin" hidden></label>
    <label class="btn ghost">${I.image} Add from Photos<input type="file" accept="image/*" multiple id="bk-fblib" hidden></label>
    <button class="btn ghost" data-x="done">Done</button></div>
   <div class="cam-bot"><button class="side" data-x="done"><span class="bk-last">${(()=>{ const l=b.photos[b.photos.length-1]; return l&&thumbs.get(l.id)?`<img src="${thumbs.get(l.id)}" alt="">`:I.image; })()}</span><span>Done</span></button>
    <button class="shutter" aria-label="Take photo" data-x="snap"></button>
    <div class="side bk-count"><b>${b.photos.length}</b><span>photos</span></div></div></div>`,
  mount(el){ let stream = null, busy = false; const video = el.querySelector('video'), fb = el.querySelector('.cam-fb');
    const upd = () => { const l = B().photos[B().photos.length-1]; el.querySelector('.bk-count b').textContent = B().photos.length; if(l) el.querySelector('.bk-last').innerHTML = `<img src="${thumbs.get(l.id)}" alt="">`; };
    const stop = () => { if(stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
    LL.cleanup.push(stop);
    (async () => { if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ fb.hidden = false; return; }
      try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:3840}, height:{ideal:2160}}, audio:false}); video.srcObject = stream; await video.play().catch(()=>{}); }
      catch(e){ fb.hidden = false; if(e.name==='NotAllowedError') el.querySelector('#bk-fbmsg').textContent = 'Camera permission is off for this site. Tap below to use the iPhone camera — each photo is saved right away.'; } })();
    const onFiles = async e => { const fs=[...e.target.files]; e.target.value=''; await addFiles(fs); upd(); };
    el.querySelector('#bk-fbin').addEventListener('change', onFiles); el.querySelector('#bk-fblib').addEventListener('change', onFiles);
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-a]'); if(a){ B().area = a.dataset.a; LL.save(); el.querySelectorAll('[data-a]').forEach(x => x.setAttribute('aria-pressed', x===a)); return; }
      const x = e.target.closest('[data-x]'); if(!x) return;
      if(x.dataset.x==='done'){ stop(); LL.go('#/sell/bulk', true); return; }
      if(x.dataset.x==='snap'){ if(busy || !video.videoWidth) return; busy = true; const f = el.querySelector('.bk-flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
        try{ navigator.vibrate && navigator.vibrate(30); await addPhoto(video, video.videoWidth, video.videoHeight); upd(); }catch(err){ LL.toast('Could not save that photo — try again'); } busy = false; }
    }); } }; };

/* ---------- analyze ---------- */
let running = false;
LL.acts.bkanalyze = async () => { const b = B(); if(running || !b.photos.length) return; running = true; await ready;
  const ov = LL.$('#overlay'); const tn = b.photos.slice(0, 9).map(p => `<div><img src="${thumbs.get(p.id)||''}" alt=""></div>`).join('');
  ov.innerHTML = `<div class="bk-analyzing"><div class="scan"><div class="imgs">${tn}</div><p id="bk-step">Looking at your photos…</p></div>
    <div class="bk-steps"><div data-s="0" class="on"><i class="spin"></i>Spotting every item in ${b.photos.length} photo${b.photos.length===1?'':'s'}</div><div data-s="1"><i></i>Reading brands &amp; model plates</div><div data-s="2"><i></i>Researching used values: Marketplace &amp; auction</div><div data-s="3"><i></i>Building your report</div></div>
    <p class="small center muted" style="margin-top:14px">Keep this screen open. Your photos stay saved on this phone.</p></div>`;
  ov.classList.remove('bk-tr'); ov.classList.add('on');
  const step = (i, txt) => { ov.querySelectorAll('[data-s]').forEach(d => { const k=+d.dataset.s; d.className = k<i?'done':k===i?'on':''; d.querySelector('i').className = k<i?'ok':k===i?'spin':''; }); if(txt) ov.querySelector('#bk-step').textContent = txt; };
  let rep;
  try{ rep = await runReal(b, step); }catch(e){ console.info('[Bulk] backend unavailable → DEMO:', e.message); rep = await runDemo(b, step, e); }
  step(4); b.report = rep; LL.save(); running = false;
  await new Promise(r => setTimeout(r, 400)); ov.classList.remove('on'); ov.innerHTML = ''; LL.go('#/sell/bulk/report');
};
async function runReal(b, step){
  const ph = b.photos.slice(); const items = []; let notes = [];
  for(let i = 0; i < ph.length; i += CFG.batch){
    const part = ph.slice(i, i + CFG.batch); step(i ? 1 : 0, `Looking at photos ${i+1}–${i+part.length} of ${ph.length}…`);
    const images = [];
    for(const p of part){ const rec = await store.get(p.id); if(!rec) continue; const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = rec.full; });
      images.push({ id: label(p), area: p.area, dataUrl: canvasURL(img, img.naturalWidth, img.naturalHeight, 1280, .72) }); }
    const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), CFG.timeoutMs);
    let r; try{ r = await fetch(CFG.endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, signal: ctrl.signal, body: JSON.stringify({mode:'bulk', job: b.job, images})}); } finally { clearTimeout(to); }
    if(!r.ok) throw Object.assign(new Error('backend ' + r.status), {status: r.status});
    const j = await r.json(); if(!j || !Array.isArray(j.items)) throw new Error('bad json');
    items.push(...j.items); if(j.notes) notes.push(j.notes);
  }
  step(2, 'Researching values…');
  return { source:'ai', at: Date.now(), job: b.job, photos: ph.length, items: merge(items.map(norm)), notes: notes.join(' ') };
}
const num = v => { v = +v; return Number.isFinite(v) && v >= 0 ? Math.round(v) : 0; };
function norm(x){ const o = { id: LL.uid(), name: String(x.name||'Item').slice(0,90), brand: String(x.brand||'').slice(0,40), model: String(x.model||'').slice(0,40),
  qty: Math.max(1, Math.round(+x.qty||1)), condition: COND.includes(x.condition) ? x.condition : 'Unknown', area: String(x.area||'Other').slice(0,40),
  photos: (Array.isArray(x.photos)?x.photos:[]).map(String).filter(s => /^P\d+$/.test(s)).slice(0,12), confidence: ['high','medium','low'].includes(x.confidence) ? x.confidence : 'low',
  newRetail: x.newRetail==null ? null : num(x.newRetail), fb:[num(x.fbLow), num(x.fbHigh)], auc:[num(x.aucLow), num(x.aucHigh)], basis: String(x.basis||'').slice(0,240),
  flags: (Array.isArray(x.flags)?x.flags:[]).map(s=>String(s).slice(0,80)).slice(0,4) };
  o.fb.sort((a,b)=>a-b); o.auc.sort((a,b)=>a-b); return o; }
function merge(list){ const out = []; const k = i => [i.area, (i.brand+' '+i.model+' '+i.name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()].join('|');
  for(const it of list){ const m = out.find(o => k(o)===k(it)); if(m){ m.qty = Math.max(m.qty, it.qty); m.photos = [...new Set(m.photos.concat(it.photos))]; } else out.push(it); } return out; }

/* DEMO: realistic bakery/cafe example, mapped onto the areas + photo numbers actually taken. Clearly labeled. */
const DEMO_ITEMS = [
 ['Kitchen','80-qt planetary mixer','Hobart','M-802',1,'Good','high',38000,[6000,9500],[4000,7500],'Used M-802s list $6–9.5K; auction lower because buyer pays rigging.',['Confirm 3-phase voltage','Bowl, hook, whip included?']],
 ['Kitchen','Gas rotating rack oven','Baxter','OV310G',1,'Good','medium',48000,[9000,16000],[6000,12000],'Single-rack Baxters resell $9–16K; auction buyers discount for removal/hood.',['Read model plate','Gas type + hood needs','Needs rigging']],
 ['Kitchen','Convection oven (Jet Air)','Doyon','JA14',1,'Good','medium',16500,[3000,5500],[2000,4000],'Doyon JA14 used $3–5.5K on Marketplace.',['Gas or electric?']],
 ['Kitchen','Proofer cabinet','Doyon','',1,'Good','low',9000,[1200,2500],[800,1800],'Bakery proofers resell $1.2–2.5K.',['Model plate not seen']],
 ['Kitchen','Full-size aluminum sheet pans','','',150,'Workhorse','medium',22,[3,6],[2,4],'Bulk pans go $3–6 each locally; lots sell lower at auction.',['Count','Side deal: $500 offer — pull from auction?']],
 ['Kitchen','Bun pan speed racks (20-tier)','','',6,'Good','medium',300,[80,150],[50,100],'Speed racks $80–150 each used.',['Count']],
 ['Kitchen','Stainless steel worktables','','',4,'Good','medium',450,[100,200],[60,140],'Standard 30x72 tables $100–200 used.',['Sizes']],
 ['Kitchen','3-compartment sink with drainboards','','',1,'Good','medium',1600,[500,900],[300,600],'3-comp sinks $500–900 used.',['Plumbing disconnect']],
 ['Kitchen','Gas flat-top griddle','','',1,'Good','low',3500,[700,1200],[400,800],'36" griddles $700–1.2K used.',['Side deal: Michael buying for store — pull from auction?']],
 ['Front of house','2-group espresso machine','La Marzocco','GB5',1,'Good','high',19000,[6000,9500],[4000,7000],'Used GB5 2-groups $6–9.5K; auction lower without warranty.',['Leased or financed?','Water filter included?']],
 ['Front of house','Coffee grinder','Mahlkönig','EK43',1,'Good','medium',3200,[1500,2200],[1000,1700],'EK43s hold value: $1.5–2.2K used.',[]],
 ['Front of house','Refrigerated bakery display case','Structural Concepts','',1,'Good','low',9000,[1500,3000],[900,2000],'Curved-glass bakery cases $1.5–3K used.',['Model + length']],
 ['Front of house','Coffee brewer','Bunn','ICB',2,'Good','medium',1800,[400,700],[250,500],'Bunn ICB used $400–700.',[]],
 ['Front of house','POS terminals','Toast','',2,'Good','medium',900,[150,300],[75,200],'Toast hardware has low resale; often tied to contract.',['Likely leased: confirm ownership']],
 ['Front of house','Café tables','','',8,'Good','medium',250,[40,80],[25,55],'Café tables $40–80 each.',['Count']],
 ['Front of house','Café chairs','','',24,'Good','medium',120,[15,35],[10,25],'Café chairs $15–35 each.',['Count']],
 ['Walk-in','Walk-in cooler 8×10 with condensing unit','Amerikooler','',1,'Good','medium',14000,[3000,6000],[1500,4000],'Walk-ins resell $3–6K; buyer pays disassembly.',['Box size','Condenser age','Disassembly/removal']],
 ['Walk-in','Wire shelving units (Metro-style)','Metro','',6,'Good','medium',350,[100,200],[60,140],'Metro 4-tier units $100–200 used.',['Count']],
 ['Storage','Reach-in refrigerator, 2-door','True','T-49',1,'Good','medium',6000,[1500,2500],[900,1800],'True T-49s $1.5–2.5K used.',['Holds temp?']],
 ['Storage','Ice machine with bin','Hoshizaki','KM-515',1,'Good','low',5500,[1200,2200],[800,1500],'Hoshizaki 500-lb units $1.2–2.2K used.',['Leased?','Model plate']],
 ['Storage','Lot of hotel pans, mixing bowls & smallwares','','',1,'Workhorse','low',1200,[300,600],[150,400],'Mixed smallwares lots $300–600.',['What is included']],
];
async function runDemo(b, step, err){
  const areas = [...new Set(b.photos.map(p => p.area))]; const byArea = a => b.photos.filter(p => p.area===a);
  let pick = DEMO_ITEMS.filter(d => areas.includes(d[0]));
  if(pick.length < 8) pick = DEMO_ITEMS; // few areas covered: show the whole example, spread over the areas he used
  const rr = {}; const items = pick.map((d, i) => { let area = areas.includes(d[0]) ? d[0] : areas[i % areas.length]; const ps = byArea(area);
    rr[area] = (rr[area]||0); const p1 = ps.length ? label(ps[rr[area]++ % ps.length]) : null;
    return { id: LL.uid(), area, name: d[1], brand: d[2], model: d[3], qty: d[4], condition: d[5], confidence: d[6], newRetail: d[7], fb: d[8].slice(), auc: d[9].slice(), basis: d[10], flags: d[11].slice(), photos: p1 ? [p1] : [] }; });
  const msgs = ['Looking at your photos…','Reading brands & model plates…','Researching used values…','Building your report…'];
  for(let i = 0; i < 4; i++){ step(i, msgs[i]); await new Promise(r => setTimeout(r, 1100)); }
  const why = !navigator.onLine ? 'offline' : (err && err.status ? 'no_backend' : 'no_backend');
  return { source:'demo', why, at: Date.now(), job: b.job, photos: b.photos.length, items, notes: '' };
}

/* ---------- report ---------- */
function totals(items){ const t = {fb:[0,0], auc:[0,0], n:0, units:0};
  items.forEach(i => { t.fb[0]+=i.fb[0]*i.qty; t.fb[1]+=i.fb[1]*i.qty; t.auc[0]+=i.auc[0]*i.qty; t.auc[1]+=i.auc[1]*i.qty; t.n++; t.units+=i.qty; }); return t; }
const RATES = [35, 30, 25];
const areasOf = items => { const seen = AREAS.filter(a => items.some(i => i.area===a)); items.forEach(i => { if(!seen.includes(i.area)) seen.push(i.area); }); return seen; };
let editing = null;
function itemCard(it, rep){ const tag = it.qty>1 ? `<span class="bk-q">×${it.qty}</span>` : '';
  if(editing===it.id) return `<div class="card pad bk-item editing" data-id="${it.id}"><form class="bk-edit" data-id="${it.id}">
    <label class="field"><span>Item</span><input type="text" name="name" value="${esc(it.name)}"></label>
    <div class="row"><label class="field"><span>Brand</span><input type="text" name="brand" value="${esc(it.brand)}"></label><label class="field"><span>Model</span><input type="text" name="model" value="${esc(it.model)}"></label></div>
    <div class="row"><label class="field"><span>Qty</span><input type="number" inputmode="numeric" min="1" name="qty" value="${it.qty}"></label><label class="field"><span>Area</span><select name="area">${areasOf(rep.items).concat(AREAS).filter((a,i,s)=>s.indexOf(a)===i).map(a=>`<option ${a===it.area?'selected':''}>${esc(a)}</option>`).join('')}</select></label></div>
    <label class="field"><span>Condition</span><select name="condition">${COND.map(c=>`<option ${c===it.condition?'selected':''}>${c}</option>`).join('')}</select></label>
    <div class="lbl">Value each ($)</div>
    <div class="row"><label class="field"><span>FB low</span><input type="number" inputmode="numeric" name="fb0" value="${it.fb[0]}"></label><label class="field"><span>FB high</span><input type="number" inputmode="numeric" name="fb1" value="${it.fb[1]}"></label></div>
    <div class="row"><label class="field"><span>Auction low</span><input type="number" inputmode="numeric" name="auc0" value="${it.auc[0]}"></label><label class="field"><span>Auction high</span><input type="number" inputmode="numeric" name="auc1" value="${it.auc[1]}"></label></div>
    <div class="row"><button type="button" class="btn danger sm" data-act="bkdel" data-id="${it.id}">${I.trash} Delete</button><button type="submit" class="btn sm">${I.check} Save</button></div></form></div>`;
  return `<div class="card bk-item" data-id="${it.id}"><div class="bk-ih"><div class="bk-it"><b>${esc(it.name)} ${tag}</b>${(it.brand||it.model)?`<small>${esc([it.brand,it.model].filter(Boolean).join(' '))}</small>`:''}</div>
    <button class="iconbtn sm noprint" data-act="bkedit" data-id="${it.id}" aria-label="Edit ${esc(it.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button></div>
   <div class="bk-meta"><span class="bk-chip">${esc(it.condition)}</span><span class="bk-chip conf-${it.confidence}">${it.confidence} confidence</span>${it.photos.length?`<span class="bk-chip ph">${I.image.replace('<svg','<svg width="13" height="13"')} ${it.photos.join(', ')}</span>`:''}</div>
   <div class="bk-vals"><div><small>FB Market</small><b>${rng(it.fb[0]*it.qty, it.fb[1]*it.qty)}</b></div><div><small>Auction</small><b>${rng(it.auc[0]*it.qty, it.auc[1]*it.qty)}</b></div><div><small>New${it.qty>1?' (each)':''}</small><b>${it.newRetail?'~'+money(it.newRetail):'—'}</b></div></div>
   ${it.qty>1?`<p class="bk-each">Each: FB ${rng(it.fb[0],it.fb[1])} · Auction ${rng(it.auc[0],it.auc[1])}</p>`:''}
   ${it.basis?`<p class="bk-basis">${esc(it.basis)}</p>`:''}
   ${it.flags.length?`<ul class="bk-flags">${it.flags.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}</div>`; }
LL.views.bulkreport = () => { const b = B(), rep = b.report; if(!rep){ LL.go('#/sell/bulk', true); return {html:''}; }
  const t = totals(rep.items), demo = rep.source==='demo', d = new Date(rep.at);
  const banner = demo ? `<div class="bk-demo" role="note"><b>Example only</b> ${rep.why==='offline'?'You were offline, so this is an example bakery report, not read from your photos. Re-run Analyze with signal.':'Speedy AI couldn’t be reached, so this is an example bakery report, not read from your photos. Tap Analyze again.'} Or tap <b>Send to my assistant</b>.</div>`
    : `<div class="bk-ai" role="note"><b>AI estimate</b> from your ${rep.photos} photos. Photo-based, not an appraisal. Check the flagged items on site.</div>`;
  const comm = b.showComm ? `<div class="card pad bk-comm"><div class="lbl">LL commission on auction total</div>${RATES.map(r=>`<div class="bk-trow"><span>${r}%</span><b>${rng(t.auc[0]*r/100, t.auc[1]*r/100)}</b></div>`).join('')}</div>` : '';
  return {html:`<div class="bk-rep">
  <div class="bk-rephead"><img class="bk-plogo" src="assets/logo.jpg" alt="Local Liquidators" width="170" height="40"><div><span class="badge ${demo?'demo':'ok'}">${demo?'Example only':'AI estimate'}</span></div>
   <h2>${esc(rep.job || b.job || 'Walkthrough')}</h2><p>${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${rep.photos} photos · ${t.n} lines · ${t.units} units</p>
   <div class="bk-sum"><div><small>FB Marketplace</small><b>${rng(t.fb[0],t.fb[1])}</b></div><div><small>Auction</small><b>${rng(t.auc[0],t.auc[1])}</b></div></div></div>
  ${banner}
  ${areasOf(rep.items).map(a => { const its = rep.items.filter(i => i.area===a), at = totals(its);
    return `<section class="bk-area"><div class="sec"><h2>${esc(a)}</h2><span class="small muted">${its.length} item${its.length===1?'':'s'} · auction ${rng(at.auc[0],at.auc[1])}</span></div><div class="bk-list">${its.map(i => itemCard(i, rep)).join('')}</div></section>`; }).join('')}
  <div class="pad noprint"><button class="btn ghost block sm" data-act="bkadd">${I.plus} Add an item the AI missed</button></div>
  <div class="pad"><div class="card pad bk-tot"><div class="lbl">Totals</div>
    <div class="bk-trow"><span>FB Marketplace (used, local)</span><b>${rng(t.fb[0],t.fb[1])}</b></div>
    <div class="bk-trow"><span>Auction (hammer)</span><b>${rng(t.auc[0],t.auc[1])}</b></div></div>
   ${comm}
   <label class="bk-switch noprint"><span>Show commission (rep only)</span><span class="switch"><input type="checkbox" data-act="bkcomm" ${b.showComm?'checked':''}><i></i></span></label>
   ${rep.notes?`<p class="small muted" style="margin-top:10px">AI note: ${esc(rep.notes)}</p>`:''}
   <p class="small muted bk-disc">${demo?'EXAMPLE ONLY: not read from your photos. ':''}Estimates from photos only, not an appraisal. Confirm models, counts, condition and ownership (leases/liens) on site.</p></div>
  <div class="pad noprint"><div class="lbl">Export</div><div class="bk-exp">
    <button class="btn ghost sm" data-act="bkcopy">${I.check} Copy as text</button><button class="btn ghost sm" data-act="bkcsv">${I.download} Download CSV</button>
    <button class="btn ghost sm" data-act="bkpdf">${I.download} Print / PDF</button><a class="btn ghost sm" href="#/sell/bulk">${I.camera} Back to photos</a></div></div>
  <div style="height:90px"></div>
  <div class="stickyfoot noprint"><button class="btn accent block" data-act="bkshare">${I.share} Send photos + list to my assistant</button></div></div>`,
  mount(el){ el.querySelectorAll('form.bk-edit').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const it = rep.items.find(i => i.id===f.dataset.id); const v = n => f.elements[n].value;
      Object.assign(it, {name: v('name').trim()||it.name, brand: v('brand').trim(), model: v('model').trim(), qty: Math.max(1, Math.round(+v('qty')||1)), area: v('area'), condition: v('condition'), fb:[num(v('fb0')), num(v('fb1'))].sort((a,b)=>a-b), auc:[num(v('auc0')), num(v('auc1'))].sort((a,b)=>a-b), edited:true});
      editing = null; LL.save(); LL.render(true); LL.toast('Saved'); })); } }; };
LL.acts.bkedit = b => { editing = b.dataset.id; LL.render(true); setTimeout(() => LL.$('.bk-item.editing')?.scrollIntoView({block:'center'}), 60); };
LL.acts.bkdel = b => { const rep = B().report, i = rep.items.findIndex(x => x.id===b.dataset.id); if(i<0) return; const [gone] = rep.items.splice(i,1); editing = null; LL.save(); LL.render(true);
  LL.toast('Item removed', 'Undo', () => { rep.items.splice(i, 0, gone); LL.save(); LL.render(true); }); };
LL.acts.bkadd = () => { const rep = B().report; const it = norm({name:'New item', qty:1, area: B().area || areasOf(rep.items)[0] || 'Kitchen', condition:'Good', confidence:'low', fbLow:0, fbHigh:0, aucLow:0, aucHigh:0, basis:'Added by hand'}); rep.items.push(it); editing = it.id; LL.save(); LL.render(true); setTimeout(() => LL.$('.bk-item.editing')?.scrollIntoView({block:'center'}), 60); };
LL.acts.bkcomm = c => { B().showComm = c.checked; LL.save(); LL.render(true); };

/* exports */
function asText(withPhotosNote){ const b = B(), rep = b.report; const t = rep ? totals(rep.items) : null; const L = [];
  L.push(`${rep&&rep.job || b.job || 'Walkthrough'}: walkthrough ${rep ? (rep.source==='demo'?'(EXAMPLE ONLY, not from photos)':'(AI estimate)') : ''}`.trim());
  L.push(`${b.photos.length} photos: ` + areasOf(b.photos).map(a => `${a} ${b.photos.filter(p=>p.area===a).map(label).join(' ')}`).join(' | '));
  if(rep){ areasOf(rep.items).forEach(a => { L.push('', a.toUpperCase());
      rep.items.filter(i => i.area===a).forEach(i => L.push(`- ${i.qty>1?i.qty+'x ':''}${i.name}${(i.brand||i.model)?' ('+[i.brand,i.model].filter(Boolean).join(' ')+')':''} | ${i.condition} | FB ${rng(i.fb[0]*i.qty,i.fb[1]*i.qty)} | Auction ${rng(i.auc[0]*i.qty,i.auc[1]*i.qty)}${i.photos.length?' | '+i.photos.join(','):''}${i.flags.length?' | Check: '+i.flags.join('; '):''}`)); });
    L.push('', `TOTAL FB Marketplace ${rng(t.fb[0],t.fb[1])} | Auction ${rng(t.auc[0],t.auc[1])}`);
    if(b.showComm) L.push('LL commission: ' + RATES.map(r => `${r}% ${rng(t.auc[0]*r/100,t.auc[1]*r/100)}`).join(' | ')); }
  if(withPhotosNote) L.push('', 'Please research each item (models, used FBMP + auction values) from the attached photos.');
  return L.join('\n'); }
LL.acts.bkcopy = async () => { const s = asText(false); try{ await navigator.clipboard.writeText(s); LL.toast('Copied: paste it anywhere'); }catch(e){ const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); LL.toast('Copied'); } };
LL.acts.bkcsv = () => { const b = B(), rep = b.report; const q = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const head = ['Area','Item','Brand','Model','Qty','Condition','Confidence','Photos','New retail (each)','FBMP low (each)','FBMP high (each)','FBMP low (total)','FBMP high (total)','Auction low (each)','Auction high (each)','Auction low (total)','Auction high (total)','Basis','Check on site','Source'];
  const rows = rep.items.map(i => [i.area,i.name,i.brand,i.model,i.qty,i.condition,i.confidence,i.photos.join(' '),i.newRetail??'',i.fb[0],i.fb[1],i.fb[0]*i.qty,i.fb[1]*i.qty,i.auc[0],i.auc[1],i.auc[0]*i.qty,i.auc[1]*i.qty,i.basis,i.flags.join('; '),rep.source==='demo'?'Example only':'AI estimate']);
  const t = totals(rep.items); rows.push(['TOTAL','','','',t.units,'','','','','','',t.fb[0],t.fb[1],'','',t.auc[0],t.auc[1],'','','']);
  if(b.showComm) RATES.forEach(r => rows.push([`LL commission ${r}%`,'','','','','','','','','','','','','','',Math.round(t.auc[0]*r/100),Math.round(t.auc[1]*r/100),'','','']));
  LL.download(slug(rep.job||b.job) + '-walkthrough.csv', [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n'), 'text/csv'); LL.toast('CSV downloaded'); };
LL.acts.bkpdf = () => { editing = null; LL.render(true); setTimeout(() => window.print(), 250); };
LL.acts.bkshare = async () => { const b = B(); if(!b.photos.length){ LL.toast('No photos yet'); return; }
  const text = asText(true), name = slug(b.job); const ov = LL.$('#overlay');
  ov.innerHTML = `<div class="bk-sheetwrap" data-x="close"><div class="bk-sheet bk-share" role="dialog" aria-label="Send to my assistant"><h3>Send to my assistant</h3><p class="small muted" id="bk-shmsg">Getting ${b.photos.length} photos ready…</p><div id="bk-shbtns"></div>
    <button class="btn ghost block sm" style="margin-top:10px" data-x="copy">${I.check} Copy the list only</button><button class="btn block sm" style="margin-top:8px" data-x="close">Done</button></div></div>`;
  ov.classList.add('on','bk-tr');
  const files = [];
  for(const p of b.photos){ const rec = await store.get(p.id); if(!rec) continue; const bin = atob(rec.full.split(',')[1]); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
    files.push(new File([u], `${name}-${label(p)}-${slug(p.area)}.jpg`, {type:'image/jpeg'})); }
  const listFile = new File([text], `${name}-list.txt`, {type:'text/plain'});
  const can = d => !!(navigator.canShare && navigator.canShare(d));
  const SIZE = 10, chunks = []; for(let i=0;i<files.length;i+=SIZE) chunks.push(files.slice(i,i+SIZE));
  const fileShare = !!navigator.share && files.length && can({files:[files[0]]});
  const msg = ov.querySelector('#bk-shmsg'), box = ov.querySelector('#bk-shbtns');
  if(fileShare){ msg.textContent = chunks.length>1 ? `Tap each batch and pick Messages (or your assistant chat). ${files.length} photos in ${chunks.length} batches of up to ${SIZE}.` : `Tap below and pick Messages (or your assistant chat).`;
    box.innerHTML = chunks.map((c,i)=>`<button class="btn accent block bk-batch" data-x="b${i}">${I.share} ${chunks.length>1?`Send batch ${i+1} of ${chunks.length} · `:'Send '}${c.length} photo${c.length===1?'':'s'}${i===0?' + list':''}</button>`).join(''); }
  else { msg.textContent = 'This browser can’t share photos directly. Tap below: the list is copied and the photos download, then send them to your assistant.';
    box.innerHTML = `<button class="btn accent block bk-batch" data-x="dl">${I.download} Copy list + download ${files.length} photos</button>`; }
  ov.onclick = async e => { const x = e.target.closest('[data-x]'); if(!x) return; const k = x.dataset.x;
    if(k==='close'){ if(e.target!==x && !x.classList.contains('btn')) return; ov.onclick=null; ov.classList.remove('on','bk-tr'); ov.innerHTML=''; return; }
    if(k==='copy'){ try{ await navigator.clipboard.writeText(text); LL.toast('List copied'); }catch(err){ LL.toast('Copy failed'); } return; }
    if(k==='dl'){ try{ await navigator.clipboard.writeText(text); }catch(err){}
      files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); }, i*350));
      LL.toast('List copied + photos downloading'); return; }
    const i = +k.slice(1), c = chunks[i]; if(!c) return;
    const d = {files: i===0 ? c.concat(listFile) : c, title: `${b.job||'Walkthrough'}${chunks.length>1?` (${i+1}/${chunks.length})`:''}`, text: i===0 ? text : `${b.job||'Walkthrough'}: photos batch ${i+1} of ${chunks.length}`};
    try{ await navigator.share(can(d) ? d : {files: c}); x.classList.remove('accent'); x.classList.add('ghost'); x.innerHTML = `${I.check} Batch ${i+1} sent`; }
    catch(err){ if(err.name!=='AbortError') LL.toast('Share failed: try again'); } };
};
})();
