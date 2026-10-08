/* BULK WALKTHROUGH: snap whole rooms / groups -> AI itemized list -> per-item FBMP + auction values -> report.
 * Photos live in IndexedDB ('ll_bulk') so nothing is lost offline or on reload; job metadata + report in localStorage (LL.state.bulk).
 * AI: POST {mode:'bulk'} batches to the analyze endpoint. If no backend/key (GitHub Pages) -> clearly labeled DEMO estimate. */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
const AREAS = ['Kitchen','Front of house','Walk-in','Storage','Other'];
const CFG = { endpoint: (window.LL_CONFIG && (window.LL_CONFIG.bulkEndpoint || window.LL_CONFIG.analyzeEndpoint)) || 'api/analyze', batch: 8, timeoutMs: 90000 };
const COND = ['Like New','Good','Fair','Workhorse','Unknown'];
const B = () => { const s=S(); if(!s.bulk) s.bulk = {job:'', area:'Kitchen', photos:[], seq:0, report:null, showComm:true, mode:'items', items:[], itemSeq:0}; const b=s.bulk; if(b.showComm===undefined) b.showComm=true;
  if(!b.items) b.items=[]; if(!b.mode) b.mode = b.photos.some(p=>!p.item) ? 'rooms' : 'items'; return b; };
/* SELLER mode is the default for everyone. REP mode (commission, FB/auction ranges, flags, exports, "send to my assistant")
   only on a device unlocked with #/rep/<code> (see LL.views.rep). #/rep/off turns it back off. */
const isRep = LL.isRep = () => { try{ return localStorage.getItem('ll.rep')==='1'; }catch(e){ return false; } };
const LEAD_URL = (window.LL_CONFIG && window.LL_CONFIG.leadEndpoint) || 'https://www.justaskmiggy.com/api/ll-lead';
const MIGGY = { name:'Miggy', phone:'434-227-9544', sms:'+14342279544' };
const money = n => '$' + Math.round(n||0).toLocaleString('en-US');
const rng = (a,b) => (!(a>0) && !(b>0)) ? '—' : (Math.round(a)===Math.round(b)) ? money(a) : money(a)+'–'+money(b);
// An item with no FB and no auction value has no price yet: never show it as $0, and block exports until it's priced.
const unpriced = i => !(i.fb[1] > 0) && !(i.auc[1] > 0);
const vr = (i,a,b) => unpriced(i) ? 'Needs price' : rng(a,b);
const needPrice = rep => { const n = rep.items.filter(unpriced).length; if(!n) return false;
  LL.toast(`${n} item${n===1?' needs':'s need'} a price. Tap the pencil to enter one (or delete it).`); const el = LL.$('.bk-item.noprice'); el && el.scrollIntoView({block:'center'}); return true; };
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
async function addPhoto(src, w, h, meta){
  const b = B(); const id = 'b' + Date.now().toString(36) + LL.uid().slice(0,4); b.seq = (b.seq||0) + 1;
  const rec = { full: canvasURL(src, w, h, 2048, .82), thumb: canvasURL(src, w, h, 360, .7) };
  await store.put(id, rec);
  b.photos.push(Object.assign({ id, n: b.seq, area: b.area || 'Kitchen', ts: Date.now() }, meta||{})); b.report && (b.report.stale = true); LL.save();
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
function grid(){ const b = B(); const rp = b.photos.filter(p=>!p.item); if(!rp.length) return `<div class="bk-empty">${I.grid}<h3>Snap the whole room</h3><p>Stand back, get everything in frame. 3–6 photos per room is plenty. Close-ups of data plates help the AI read models.</p></div>`;
  const groups = AREAS.concat([...new Set(rp.map(p=>p.area))].filter(a=>!AREAS.includes(a)));
  return groups.filter(a => rp.some(p => p.area===a)).map(a => { const ps = rp.filter(p => p.area===a);
    return `<div class="bk-grp"><div class="bk-gh"><b>${esc(a)}</b><span>${ps.length} photo${ps.length===1?'':'s'}</span></div><div class="bk-grid">${ps.map(p => `<button class="bk-th" data-act="bkphoto" data-id="${p.id}" aria-label="Photo ${label(p)}, ${esc(p.area)}"><img src="${thumbs.get(p.id)||''}" alt=""><i>${label(p)}</i></button>`).join('')}</div></div>`; }).join(''); }
LL.views.bulk = () => { const b = B(); if(b.mode==='items') return itemsView(); const n = b.photos.filter(p=>!p.item).length;
  return {html:`${LL.modeToggle('bulk')}${bulkModeSeg('rooms')}
  <section class="bk-hero"><div><span class="badge acc">Bulk walkthrough</span><h2>Shoot rooms, not items.</h2><p>${isRep()?'AI lists everything it sees and estimates what it’s worth at auction. Rep mode adds the full value breakdown.':'AI lists everything it sees and estimates what it’s worth at auction. Miggy reviews it and gets back to you within 24 hours.'}</p></div></section>
  <div class="pad bk-form">
    <label class="field"><span>Job name</span><input type="text" id="bk-job" value="${esc(b.job)}" placeholder="e.g. Husson Bakery - MD" autocomplete="off" enterkeyhint="done"></label>
    <div class="lbl">Area for new photos</div>${areaChips(b.area,'bkarea')}
    <div class="bk-cap">
      <button class="btn accent block bk-big" data-act="bkcam">${I.camera} Take photos</button>
      <label class="btn ghost block bk-big bk-lib">${I.image} Add from Photos<input type="file" accept="image/*" multiple id="bk-lib"></label>
    </div>
    <p class="hint center">Fastest: shoot with your iPhone Camera, then tap <b>Add from Photos</b> and select them all. Saved on this phone, works with no signal.</p>
  </div>
  <div class="sec"><h2>${n} photo${n===1?'':'s'}</h2>${n&&isRep()?`<button class="link" data-act="bkshare">${I.share.replace('<svg','<svg width="16" height="16"')} Send to my assistant</button>`:''}</div>
  <div class="bk-photos">${grid()}</div>
  ${b.report?`<div class="pad"><a class="btn ghost block sm" href="${isRep()?'#/sell/bulk/report':b.report.lead?'#/sell/bulk/thanks':'#/sell/bulk/contact'}">${I.check} ${isRep()?'Open last report':b.report.lead?'Your inventory summary':'Finish: send to Miggy'} (${b.report.items.length} items)${b.report.stale?' · new photos since':''}</a></div>`:''}
  ${b.photos.length?`<div class="pad"><button class="btn danger sm block" data-act="bknew">${I.trash} Start a new walkthrough</button></div>`:''}
  <div style="height:90px"></div>
  <div class="stickyfoot noprint"><button class="btn block bk-go" data-act="bkanalyze" ${n||b.items.length?'':'disabled'}>${I.sparkle} Analyze ${n||''} photo${n===1?'':'s'}${b.items.length?` + ${b.items.length} item${b.items.length===1?'':'s'}`:''}</button></div>`,
  mount(el){ const j = el.querySelector('#bk-job'); j.addEventListener('input', () => { B().job = j.value.trim(); LL.save(); });
    el.querySelector('#bk-lib').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; await addFiles(fs); LL.render(true); }); } }; };
LL.acts.bkarea = btn => { B().area = btn.dataset.v; LL.save(); LL.$$('[data-act=bkarea]').forEach(x => x.setAttribute('aria-pressed', x===btn)); };
LL.acts.bknew = async () => { const b = B(); if(!confirm(`Clear ${b.photos.length} photos and the report from this phone? Send them to your assistant first if you still need them.`)) return;
  await store.clear(); Object.assign(b, {job:'', photos:[], seq:0, report:null, items:[], itemSeq:0, cur:null}); LL.save(); LL.render(); };

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
      if(x.dataset.x==='retake'){ b.area = p.area; LL.save(); ov.onclick=null; ov.classList.remove('bk-tr'); LL.go(p.item ? `#/sell/bulk/item/${p.item}/${p.slot}` : '#/sell/bulk/cam'); return; } LL.toast('Photo deleted'); }
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

/* ---------- ITEM BY ITEM (default): 4–7 photos per item ----------
   Same rule as single items: 4 required angles + data plate + brand logo (+1 optional extra), 7 max.
   Plate / logo can be marked "No plate" / "No logo" when the unit truly has none. */
const SLOTS = [
  {k:'front', n:'Front', h:'Straight on, 3–4 ft back, whole item in frame', req:true, f:'full'},
  {k:'side', n:'Side / angle', h:'Step to the side or a front corner, full side panel', req:true, f:'full'},
  {k:'back', n:'Back / hookups', h:'Back panel, cords, gas or water hookups', req:true, f:'full'},
  {k:'inside', n:'Inside / top', h:'Open it up, show the top, or show it working', req:true, f:'full'},
  {k:'plate', n:'Data plate', h:'Model, serial, volts: get close, fill the frame, hold steady', key:'No plate', f:'plate'},
  {k:'brand', n:'Brand logo', h:'Close-up of the brand name or emblem', key:'No logo', f:'plate'},
  {k:'extra', n:'Extra (optional)', h:'Controls, accessories or wear worth showing', f:'full'}];
const IMIN = 4, IMAX = SLOTS.length; // 7
const AI_ORDER = ['plate','brand','front','side','back','inside','extra'];
const slotOf = k => SLOTS.find(s => s.k===k);
const itemBy = n => B().items.find(x => x.n===+n);
const itemPh = n => B().photos.filter(p => p.item===+n);
const slotPh = (n,k) => B().photos.find(p => p.item===+n && p.slot===k);
function irule(n){ const it = itemBy(n) || {skip:{}}, sk = it.skip || {};
  const st = k => slotPh(n,k) ? 'ok' : sk[k] ? 'skip' : 'need';
  const r = {reqDone: SLOTS.filter(s => s.req && slotPh(n,s.k)).length, min:IMIN, total:itemPh(n).length, max:IMAX, plate:st('plate'), brand:st('brand')};
  r.ok = r.reqDone>=IMIN && r.plate!=='need' && r.brand!=='need'; return r; }
const rtext = r => `${r.reqDone}/${r.min} required · ${r.total} of ${r.max} max`;
const rhtml = r => LL.proto && LL.proto.ruleHTML ? LL.proto.ruleHTML(r) : `<b>${rtext(r)}</b>`;
const nextSlot = (n, after) => { const i = after ? SLOTS.findIndex(s=>s.k===after) : -1; const it = itemBy(n) || {skip:{}};
  const open = s => !slotPh(n,s.k) && !(it.skip||{})[s.k];
  return SLOTS.slice(i+1).find(open) || SLOTS.find(s => (s.req || s.key) && open(s)) || null; };
function newItem(){ const b = B(); b.itemSeq = (b.itemSeq||0) + 1; const it = {n:b.itemSeq, area:b.area||'Kitchen', skip:{}, at:Date.now()}; b.items.push(it); b.cur = it.n; LL.save(); return it; }
const curItem = () => { const b = B(); const it = itemBy(b.cur); return it && irule(it.n).total < IMAX ? it : null; };
const incomplete = () => B().items.filter(it => !irule(it.n).ok);
function bulkModeSeg(m){ return `<div class="pad bk-modeseg noprint"><div class="seg" role="group" aria-label="Walkthrough style">
  <button data-act="bkmode" data-v="items" aria-pressed="${m==='items'}">Item by item · 4–7</button>
  <button data-act="bkmode" data-v="rooms" aria-pressed="${m==='rooms'}">Quick room scan</button></div></div>`; }
LL.acts.bkmode = b => { B().mode = b.dataset.v; LL.save(); LL.render(true); };
function slotTiles(it){ const r = irule(it.n);
  return `<div class="bk-slots">${SLOTS.map((s,i) => { const p = slotPh(it.n, s.k), sk = (it.skip||{})[s.k];
    return `<button class="bk-slot ${s.req?'req':''} ${s.key?'key':''} ${p?'done':''} ${sk?'skip':''}" ${p?`data-act="bkphoto" data-id="${p.id}"`:`data-nav="#/sell/bulk/item/${it.n}/${s.k}"`} aria-label="${esc(s.n)}${p?' (done)':sk?' (marked '+esc(s.key)+')':s.req?' (required)':''}">
      <span class="th">${p?`<img src="${thumbs.get(p.id)||''}" alt="">`:sk?'<b>—</b>':I.camera}</span><span class="nm"><i>${i+1}</i>${esc(s.n.replace(' (optional)',''))}</span><em>${p?'✓':sk?esc(s.key):s.req?'Required':s.key?'Needed':'Optional'}</em></button>`; }).join('')}</div>
   <div class="bk-keys">${['plate','brand'].filter(k => !slotPh(it.n,k)).map(k => `<label class="bk-skip"><input type="checkbox" data-act="bkskip" data-n="${it.n}" data-k="${k}" ${(it.skip||{})[k]?'checked':''}> ${esc(slotOf(k).key)} on this item</label>`).join('')}</div>`; }
function itemCardHTML(it){ const r = irule(it.n), nx = nextSlot(it.n);
  return `<div class="card pad bk-icard ${r.ok?'ok':''}" id="bk-item-${it.n}"><div class="bk-ich"><b>Item ${it.n}</b><span class="small muted">${esc(it.area)}</span>
     <button class="iconbtn sm" data-act="bkdelitem" data-n="${it.n}" aria-label="Delete item ${it.n}">${I.trash}</button></div>
   <div class="bk-irule">${rhtml(r)}</div>${slotTiles(it)}
   ${r.total<IMAX && nx ? `<a class="btn ${r.ok?'ghost':'accent'} sm block" style="margin-top:8px" href="#/sell/bulk/item/${it.n}/${nx.k}">${I.camera} ${r.ok?'Add':'Next'}: ${esc(nx.n)}</a>` : ''}</div>`; }
function itemsView(){ const b = B(), items = b.items, bad = incomplete(), cur = curItem();
  const startLbl = cur && !irule(cur.n).ok ? `Continue item ${cur.n}` : `Shoot item ${(b.itemSeq||0)+1}`;
  const startHref = cur && !irule(cur.n).ok ? `#/sell/bulk/item/${cur.n}` : '#/sell/bulk/item/new';
  const roomN = b.photos.filter(p=>!p.item).length;
  return {html:`${LL.modeToggle('bulk')}${bulkModeSeg('items')}
  <section class="bk-hero"><div><span class="badge acc">Bulk · item by item</span><h2>4–7 photos per item.</h2><p>Front, side, back, inside, then the <b>data plate</b> and <b>brand logo</b>. 7 max. ${isRep()?'AI reads each item and estimates what it’s worth at auction. Rep mode adds the full value breakdown.':'AI reads each item and estimates what it’s worth at auction, then Miggy gets back to you within 24 hours.'}</p></div></section>
  <div class="pad bk-form">
    <label class="field"><span>Job name</span><input type="text" id="bk-job" value="${esc(b.job)}" placeholder="e.g. Husson Bakery - MD" autocomplete="off" enterkeyhint="done"></label>
    <div class="lbl">Area for the next item</div>${areaChips(b.area,'bkarea')}
    <div class="bk-cap">
      <a class="btn accent block bk-big" href="${startHref}">${I.camera} ${startLbl}</a>
      <label class="btn ghost block bk-big bk-lib">${I.image} Add photos for ${cur?'item '+cur.n:'a new item'}<input type="file" accept="image/*" multiple id="bk-ilib"></label>
    </div>
    <p class="hint center">From Photos: pick 4 to 7 shots of <b>one</b> item. They fill the slots in order: front, side, back, inside, plate, logo, extra.</p>
  </div>
  <div class="sec"><h2>${items.length} item${items.length===1?'':'s'}</h2>${b.photos.length&&isRep()?`<button class="link" data-act="bkshare">${I.share.replace('<svg','<svg width="16" height="16"')} Send to my assistant</button>`:''}</div>
  <div class="pad bk-items">${items.length ? items.slice().reverse().map(itemCardHTML).join('') : `<div class="bk-empty">${I.camera}<h3>Shoot your first item</h3><p>4 required angles + the data plate + the brand logo. Up to 7 photos per item.</p></div>`}</div>
  ${roomN?`<p class="pad small muted">Plus ${roomN} room-scan photo${roomN===1?'':'s'} (see Quick room scan).</p>`:''}
  ${b.report?`<div class="pad"><a class="btn ghost block sm" href="${isRep()?'#/sell/bulk/report':b.report.lead?'#/sell/bulk/thanks':'#/sell/bulk/contact'}">${I.check} ${isRep()?'Open last report':b.report.lead?'Your inventory summary':'Finish: send to Miggy'} (${b.report.items.length} items)${b.report.stale?' · new photos since':''}</a></div>`:''}
  ${b.photos.length||items.length?`<div class="pad"><button class="btn danger sm block" data-act="bknew">${I.trash} Start a new walkthrough</button></div>`:''}
  <div style="height:90px"></div>
  <div class="stickyfoot noprint"><button class="btn block bk-go" data-act="bkanalyze" ${items.length||roomN?'':'disabled'}>${I.sparkle} ${bad.length?`Item ${bad[0].n}: ${irule(bad[0].n).reqDone<IMIN?`${IMIN-irule(bad[0].n).reqDone} more required`:'needs plate / logo'}`:`Analyze ${items.length} item${items.length===1?'':'s'}`}</button></div>`,
  mount(el){ const j = el.querySelector('#bk-job'); j.addEventListener('input', () => { B().job = j.value.trim(); LL.save(); });
    el.querySelector('#bk-ilib').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; await addItemFiles(fs); LL.render(true); }); } }; }
/* several photos for one item from the library: fill empty slots in order, never past 7 */
async function addItemFiles(files, n){ files = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name)); if(!files.length) return 0;
  const it = (n && itemBy(n)) || curItem() || newItem(); const open = SLOTS.filter(s => !slotPh(it.n, s.k));
  if(!open.length){ LL.toast(`Item ${it.n} already has ${IMAX} photos (the max). Delete one to swap it.`); return 0; }
  const use = files.slice(0, open.length); let k = 0;
  for(const f of use){ try{ const bm = await bitmapOf(f); const s = open[k]; await addPhoto(bm, bm.width || bm.naturalWidth, bm.height || bm.naturalHeight, {item:it.n, slot:s.k, area:it.area}); delete (it.skip||{})[s.k]; bm.close && bm.close(); k++; }catch(e){ console.warn('photo failed', e); } }
  const r = irule(it.n), over = files.length - use.length;
  LL.toast(over ? `Max ${IMAX} photos per item: ${over} extra left out. Item ${it.n}: ${rtext(r)}` : `Item ${it.n}: ${rtext(r)}${r.reqDone<IMIN?` · ${IMIN-r.reqDone} more required`:''}`); LL.save(); return k; }
LL.acts.bkskip = c => { const it = itemBy(c.dataset.n); if(!it) return; it.skip = it.skip || {}; if(c.checked) it.skip[c.dataset.k] = true; else delete it.skip[c.dataset.k]; LL.save(); LL.render(true); };
LL.acts.bkdelitem = async b => { const n = +b.dataset.n, ps = itemPh(n); if(!confirm(`Delete item ${n} and its ${ps.length} photo${ps.length===1?'':'s'}?`)) return;
  for(const p of ps) await store.del(p.id); const bb = B(); bb.photos = bb.photos.filter(p => p.item!==n); bb.items = bb.items.filter(x => x.n!==n); if(bb.cur===n) bb.cur = null; bb.report && (bb.report.stale = true); LL.save(); LL.render(true); };

/* item camera: guided slot by slot, counter on top, 7 max, "Next item" only once the 4 required are in */
LL.views.bulkitem = r => { const b = B();
  if(r.n==='new'){ const it = newItem(); LL.go(`#/sell/bulk/item/${it.n}`, true); return {html:''}; }
  const it = itemBy(r.n); if(!it){ LL.go('#/sell/bulk', true); return {html:''}; } b.cur = it.n;
  const full = irule(it.n).total >= IMAX;
  const cur = (r.slot && slotOf(r.slot)) || nextSlot(it.n) || SLOTS[0];
  return {overlay:true, html:`<div class="cam bk-cam bk-icam"><video playsinline muted autoplay aria-hidden="true"></video><div class="shade"></div><div class="bk-flash"></div>
   <div class="cam-top"><div class="hd"><div class="ti"><span class="pstep">Item ${it.n} · ${esc(it.area)} · photo ${SLOTS.indexOf(cur)+1} of ${IMAX}</span><b id="bi-title">${esc(cur.n)}</b><small id="bi-hint">${esc(cur.h)}</small></div><button class="rbtn" data-x="done" aria-label="Done">${I.x}</button></div>
    <div class="pctr bk-ictr"><b id="bi-count"></b><div class="bk-dots" id="bi-dots"></div><span id="bi-sub"></span></div>
    <div class="cam-x" id="bi-x"></div></div>
   <div class="frame ${cur.f==='plate'?'plate':''}" id="bi-frame" aria-hidden="true"><i></i><i></i><i></i><i></i><div class="sil"></div><div class="gl" id="bi-gl">${cur.f==='plate'?'Fill the frame':'Whole item in frame'}</div></div>
   <div class="cam-fb" hidden><h3>Use your phone camera</h3><p id="bk-fbmsg">Live camera isn’t available here. Tap below: each photo goes into the next slot.</p>
    <label class="btn accent">${I.camera} Take <span id="bi-fbname">${esc(cur.n)}</span><input type="file" accept="image/*" capture="environment" id="bk-fbin" hidden></label>
    <label class="btn ghost">${I.image} Add from Photos (up to ${IMAX})<input type="file" accept="image/*" multiple id="bk-fblib" hidden></label>
    <button class="btn ghost" data-x="done">Done</button></div>
   <div class="cam-bot"><button class="side" data-x="done"><span class="bk-last">${I.image}</span><span>Done</span></button>
    <button class="shutter" aria-label="Take photo" data-x="snap" ${full?'disabled':''}></button>
    <button class="side bk-nextitem" data-x="nextitem"><span class="rbtn">${I.chev}</span><span>Next item</span></button></div></div>`,
  mount(el){ let stream = null, busy = false, slot = cur.k; const video = el.querySelector('video'), fb = el.querySelector('.cam-fb');
    const stop = () => { if(stream) stream.getTracks().forEach(t => t.stop()); stream = null; }; LL.cleanup.push(stop);
    const upd = () => { if(!el.querySelector('#bi-count')) return; const r = irule(it.n), s = slotOf(slot), full = r.total >= IMAX;
      el.querySelector('#bi-count').textContent = rtext(r);
      el.querySelector('#bi-dots').innerHTML = SLOTS.map(x => `<i class="${slotPh(it.n,x.k)?'done':''} ${x.k===slot?'cur':''} ${x.req?'':'opt'}" title="${esc(x.n)}"></i>`).join('');
      el.querySelector('#bi-sub').textContent = r.reqDone<IMIN ? `${IMIN-r.reqDone} more required` : r.plate==='need' && r.brand==='need' ? 'Now the data plate + brand logo' : r.plate==='need' ? 'Now the data plate' : r.brand==='need' ? 'Now the brand logo' : full ? 'Item full (7 of 7). Tap Next item.' : 'Item done. 1 optional extra, or Next item.';
      el.querySelector('.pstep').textContent = `Item ${it.n} · ${it.area} · photo ${SLOTS.indexOf(s)+1} of ${IMAX}`;
      el.querySelector('#bi-title').textContent = full ? `Item ${it.n} is full` : s.n; el.querySelector('#bi-hint').textContent = full ? `${IMAX} photos is the max per item.` : s.h;
      el.querySelector('#bi-frame').classList.toggle('plate', s.f==='plate'); el.querySelector('#bi-gl').textContent = s.f==='plate' ? 'Fill the frame' : 'Whole item in frame';
      const fbn = el.querySelector('#bi-fbname'); if(fbn) fbn.textContent = s.n;
      el.querySelector('[data-x=snap]').disabled = full;
      el.querySelector('#bi-x').innerHTML = (s.key && !full ? `<button class="xbtn" data-x="skipkey">${esc(s.key)} on this item</button>` : '') + (r.reqDone>=IMIN && !full && s.k!=='extra' && r.plate!=='need' && r.brand!=='need' ? `<button class="xbtn" data-x="extra">Add optional extra</button>` : '');
      const nb = el.querySelector('[data-x=nextitem]'); nb.classList.toggle('ready', r.ok); nb.setAttribute('aria-disabled', String(r.reqDone<IMIN));
      const l = itemPh(it.n).slice(-1)[0]; if(l && thumbs.get(l.id)) el.querySelector('.bk-last').innerHTML = `<img src="${thumbs.get(l.id)}" alt="">`; };
    const advance = () => { const n = nextSlot(it.n, slot); slot = n ? n.k : (SLOTS.find(x => !slotPh(it.n,x.k)) || SLOTS[SLOTS.length-1]).k; upd(); };
    const save = async (src, w, h) => { const r = irule(it.n); if(r.total >= IMAX){ LL.toast(`${IMAX} photos max per item`); return; }
      if(slotPh(it.n, slot)){ const old = slotPh(it.n, slot); await store.del(old.id); B().photos = B().photos.filter(p => p!==old); }
      await addPhoto(src, w, h, {item:it.n, slot, area:it.area}); delete (it.skip||{})[slot]; LL.save(); advance(); };
    upd();
    (async () => { if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ fb.hidden = false; return; }
      try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:3840}, height:{ideal:2160}}, audio:false}); video.srcObject = stream; await video.play().catch(()=>{}); }
      catch(e){ fb.hidden = false; if(e.name==='NotAllowedError') el.querySelector('#bk-fbmsg').textContent = 'Camera permission is off for this site. Tap below to use the phone camera: each photo goes into the next slot.'; } })();
    el.querySelector('#bk-fbin').addEventListener('change', async e => { const f = [...e.target.files][0]; e.target.value = ''; if(!f) return; try{ const bm = await bitmapOf(f); await save(bm, bm.width||bm.naturalWidth, bm.height||bm.naturalHeight); bm.close && bm.close(); }catch(err){ LL.toast('Could not save that photo'); } });
    el.querySelector('#bk-fblib').addEventListener('change', async e => { const fs = [...e.target.files]; e.target.value = ''; await addItemFiles(fs, it.n); const n = nextSlot(it.n); slot = n ? n.k : slot; upd(); });
    el.addEventListener('click', async e => { const x = e.target.closest('[data-x]'); if(!x) return; const k = x.dataset.x;
      if(k==='done'){ stop(); LL.go('#/sell/bulk', true); return; }
      if(k==='skipkey'){ it.skip = it.skip || {}; it.skip[slot] = true; LL.save(); LL.toast(`Item ${it.n}: ${slotOf(slot).key.toLowerCase()}`); advance(); return; }
      if(k==='extra'){ slot = 'extra'; upd(); return; }
      if(k==='nextitem'){ const r = irule(it.n);
        if(r.reqDone < IMIN){ LL.toast(`Item ${it.n}: ${IMIN-r.reqDone} more required photo${IMIN-r.reqDone===1?'':'s'} first (${rtext(r)})`); return; }
        if(!r.ok){ const miss = ['plate','brand'].filter(q => r[q]==='need'); const ok = confirm(`Item ${it.n} has no ${miss.map(q => q==='plate'?'data plate':'brand logo').join(' or ')} photo. Those help the AI read the model and serial.\n\nOK = mark "${miss.map(q => slotOf(q).key).join(' / ')}" and go to the next item. Cancel = go back and snap it.`);
          if(!ok){ slot = miss[0]; upd(); return; } it.skip = it.skip || {}; miss.forEach(q => it.skip[q] = true); LL.save(); }
        const nx = newItem(); stop(); LL.go(`#/sell/bulk/item/${nx.n}`, true); return; }
      if(k==='snap'){ if(busy || !video.videoWidth) return; busy = true; const f = el.querySelector('.bk-flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
        try{ navigator.vibrate && navigator.vibrate(30); await save(video, video.videoWidth, video.videoHeight); }catch(err){ LL.toast('Could not save that photo — try again'); } busy = false; }
    }); } }; };
LL.bulkRule = { SLOTS, IMIN, IMAX, irule, rtext };

/* ---------- analyze ---------- */
let running = false;
LL.acts.bkanalyze = async () => { const b = B(); if(running || (!b.photos.length && !b.items.length)) return;
  if(b.mode==='items'){ const bad = incomplete(); if(bad.length){ const it = bad[0], r = irule(it.n);
      if(r.reqDone < IMIN){ LL.toast(`Item ${it.n} needs ${IMIN-r.reqDone} more required photo${IMIN-r.reqDone===1?'':'s'} (${rtext(r)})`); LL.$('#bk-item-'+it.n)?.scrollIntoView({block:'center'}); return; }
      if(!confirm(`${bad.length} item${bad.length===1?' has':'s have'} no data plate or brand logo photo (item ${bad.map(x=>x.n).join(', ')}). Mark them "No plate / No logo" and analyze anyway?`)){ LL.$('#bk-item-'+it.n)?.scrollIntoView({block:'center'}); return; }
      bad.forEach(x => { const rr = irule(x.n); x.skip = x.skip || {}; if(rr.plate==='need') x.skip.plate = true; if(rr.brand==='need') x.skip.brand = true; }); LL.save(); }
    if(!b.items.some(x => itemPh(x.n).length) && !b.photos.some(p => !p.item)){ LL.toast('No photos yet'); return; } }
  else if(!b.photos.some(p => !p.item)){ LL.toast('No room photos yet'); return; }
  running = true; await ready;
  const ov = LL.$('#overlay'); const tn = b.photos.slice(0, 9).map(p => `<div><img src="${thumbs.get(p.id)||''}" alt=""></div>`).join('');
  ov.innerHTML = `<div class="bk-analyzing"><div class="scan"><div class="imgs">${tn}</div><p id="bk-step">Looking at your photos…</p></div>
    <div class="bk-steps"><div data-s="0" class="on"><i class="spin"></i>Spotting every item in ${b.photos.length} photo${b.photos.length===1?'':'s'}</div><div data-s="1"><i></i>Reading brands &amp; model plates</div><div data-s="2"><i></i>${isRep()?'Researching used values: Marketplace &amp; auction':'Estimating new and used values'}</div><div data-s="3"><i></i>Building your report</div></div>
    <p class="small center muted" style="margin-top:14px">Keep this screen open. Your photos stay saved on this phone.</p></div>`;
  ov.classList.remove('bk-tr'); ov.classList.add('on');
  const step = (i, txt) => { ov.querySelectorAll('[data-s]').forEach(d => { const k=+d.dataset.s; d.className = k<i?'done':k===i?'on':''; d.querySelector('i').className = k<i?'ok':k===i?'spin':''; }); if(txt) ov.querySelector('#bk-step').textContent = txt; };
  let rep;
  try{ rep = b.mode==='items' ? await runItems(b, step) : await runReal(b, step); }
  catch(e){ console.info('[Bulk] backend unavailable:', e.message); rep = isRep() ? await runDemo(b, step, e) : sellerFallback(b); }
  step(4); if(b.report && b.report.lead) rep.prevLead = b.report.lead; b.report = rep; LL.save(); running = false;
  await new Promise(r => setTimeout(r, 400)); ov.classList.remove('on'); ov.innerHTML = ''; LL.go(isRep() ? '#/sell/bulk/report' : '#/sell/bulk/contact');
};
async function imgOf(p){ const rec = await store.get(p.id); if(!rec) return null; const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = rec.full; });
  return canvasURL(img, img.naturalWidth, img.naturalHeight, 1280, .72); }
const wait = ms => new Promise(r => setTimeout(r, ms));
/* item-by-item: one AI call per item (<=7 photos, data plate first so the model/serial gets read), paced under the 12/min server limit */
async function runItems(b, step){ const list = b.items.filter(x => itemPh(x.n).length); const out = []; let notes = [], ok = 0, room = [];
  for(let i = 0; i < list.length; i++){ const it = list[i], ps = AI_ORDER.map(k => slotPh(it.n, k)).filter(Boolean);
    step(i ? 1 : 0, `Reading item ${it.n} (${i+1} of ${list.length})…`);
    const images = []; for(const p of ps){ const d = await imgOf(p); if(d) images.push({ id: label(p), area: `${it.area} · item ${it.n} · ${slotOf(p.slot).n}`.slice(0,40), dataUrl: d }); }
    const job = `${(b.job||'Walkthrough').slice(0,30)} | ITEM ${it.n}: ALL photos = ONE unit`;
    let j = null, status = 0;
    for(let attempt = 0; attempt < 2 && !j; attempt++){
      const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), CFG.timeoutMs);
      try{ const r = await fetch(CFG.endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, signal: ctrl.signal, body: JSON.stringify({mode:'bulk', job, images})}); status = r.status;
        if(r.ok){ const x = await r.json(); if(x && Array.isArray(x.items)) j = x; } }
      catch(e){ status = status || 0; } finally { clearTimeout(to); }
      if(!j && status===429){ step(1, `Speedy AI is busy. Waiting a moment before item ${it.n}…`); await wait(20000); }
      else if(!j) break; }
    if(!j){ if(!ok && i===0) throw Object.assign(new Error('backend ' + status), {status}); // nothing worked: labeled example report
      out.push(norm({name:`Item ${it.n}`, area:it.area, qty:1, confidence:'low', photos:ps.map(label), flags:['AI couldn’t finish this item. Tap Analyze again or enter a price.']})); continue; }
    ok++; if(j.notes) notes.push(`Item ${it.n}: ${j.notes}`);
    const lines = j.items.map(norm); const main = lines.slice().sort((a,c) => (c.auc[1]||c.fb[1]) - (a.auc[1]||a.fb[1]))[0] || norm({name:`Item ${it.n}`, confidence:'low'});
    main.area = it.area; main.photos = ps.map(label); main.itemNo = it.n;
    const sk = it.skip || {}; if(sk.plate) main.flags = ['No data plate photo: confirm model/serial'].concat(main.flags).slice(0,4); if(sk.brand && !main.brand) main.flags = ['No brand logo photo'].concat(main.flags).slice(0,4);
    out.push(main);
    if(list.length > 10 && i < list.length - 1) await wait(5200); }
  const roomPh = b.photos.filter(p => !p.item);
  if(roomPh.length){ try{ const rr = await runReal(b, step, roomPh); room = rr.items; if(rr.notes) notes.push(rr.notes); }catch(e){ notes.push('Room-scan photos could not be read this time.'); } }
  step(2, 'Researching values…');
  return { source:'ai', at: Date.now(), job: b.job, photos: b.photos.length, mode:'items', items: out.concat(room), notes: notes.join(' ') }; }
async function runReal(b, step, only){
  const ph = (only || b.photos.filter(p => !p.item)).slice(); const items = []; let notes = [];
  for(let i = 0; i < ph.length; i += CFG.batch){
    const part = ph.slice(i, i + CFG.batch); step(i ? 1 : 0, `Looking at photos ${i+1}–${i+part.length} of ${ph.length}…`);
    const images = [];
    for(const p of part){ const d = await imgOf(p); if(d) images.push({ id: label(p), area: p.area, dataUrl: d }); }
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

/* ======================= SELLER SIDE: contact step → lead to Miggy → thank-you + inventory + tips =======================
   Sellers never see commission, FB Marketplace ranges, rep flags or the example report. */
/* AI unreachable in seller mode: never show example data. List what they shot; Miggy values it by hand. */
function sellerFallback(b){ const items = [];
  if(b.mode==='items') b.items.filter(x => itemPh(x.n).length).forEach(x => items.push(norm({name:`Item ${x.n}`, area:x.area, qty:1, confidence:'low', photos:AI_ORDER.map(k => slotPh(x.n,k)).filter(Boolean).map(label), flags:['AI could not read this item: price by hand']})));
  const room = b.photos.filter(p => !p.item); areasOf(room).forEach(a => { const ps = room.filter(p => p.area===a); items.push(norm({name:`${a}: ${ps.length} photo${ps.length===1?'':'s'}`, area:a, qty:1, confidence:'low', photos:ps.map(label), flags:['AI could not read these photos: price by hand']})); });
  items.forEach((it, i) => { if(b.mode==='items' && i < b.items.length){ const m = /^Item (\d+)$/.exec(it.name); if(m) it.itemNo = +m[1]; } });
  return { source:'none', at: Date.now(), job: b.job, photos: b.photos.length, mode: b.mode, items, notes: '' }; }
const byLabel = l => B().photos.find(p => label(p)===l);
const thumbOf = it => { const p = (it.photos||[]).map(byLabel).find(Boolean); return p ? thumbs.get(p.id) : ''; };
const usedOf = i => i.auc[1] > 0 ? i.auc : i.fb[1] > 0 ? i.fb : [0,0];
/* Reserve (rep only, never shown or advertised to sellers): '' = No reserve (default) | '25' | '50' | '75' = % of the auction estimate (midpoint × qty) | 'custom' = $ amount */
const RES_OPTS = [['','No reserve'],['25','25% of auction est.'],['50','50% of auction est.'],['75','75% of auction est.'],['custom','Custom $']];
const resMode = i => i.reserveMode || (i.reserve > 0 ? 'custom' : '');
const reserveOf = i => { const m = resMode(i); if(m==='custom') return i.reserve > 0 ? Math.round(i.reserve) : 0; if(!m) return 0; return Math.round((i.auc[0]+i.auc[1])/2 * i.qty * (+m)/100); };
const resLabel = i => { const m = resMode(i), v = reserveOf(i); return !m || !v ? '' : m==='custom' ? `Reserve ${money(v)} (custom)` : `Reserve ${money(v)} (${m}% of auction est.)`; };
function sellerTotals(items){ let nw = 0, nwMissing = 0, u = [0,0];
  items.forEach(i => { if(i.newRetail > 0) nw += i.newRetail*i.qty; else nwMissing++; const v = usedOf(i); u[0] += v[0]*i.qty; u[1] += v[1]*i.qty; }); return {nw, nwMissing, used:u}; }
const TIMELINES = ['ASAP','2-4 weeks','1-3 months'];
const SITUATIONS = ['Closing','Remodeling','Upgrading','Other'];
LL.views.bulkcontact = () => { const b = B(), rep = b.report; if(!rep){ LL.go('#/sell/bulk', true); return {html:''}; }
  const c = b.contact || {}, n = rep.items.length, again = !!(rep.lead || rep.prevLead);
  const opt = (list, v, ph) => `<option value="">${ph}</option>` + list.map(x => `<option ${x===v?'selected':''}>${esc(x)}</option>`).join('');
  return {html:`<div class="pad sl-contact">
   <div class="sl-brand"><img src="assets/logo.jpg" alt="LocalLiquidators.com" width="150" height="35"><span>Just Ask Miggy × LocalLiquidators.com</span></div>
   <h2 class="sl-h">${again?'Send Miggy your update':'Almost done. Where can Miggy reach you?'}</h2>
   <p class="muted">Your ${n} item${n===1?'':'s'} and photos go straight to Miggy. He’ll be in touch within 24 hours with next steps.</p>
   <form id="sl-form" novalidate autocomplete="on">
    <label class="field"><span>Your name <i>*</i></span><input name="name" required autocomplete="name" value="${esc(c.name||'')}"></label>
    <div class="row"><label class="field"><span>Mobile phone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(c.phone||'')}" placeholder="10 digits"></label>
     <label class="field"><span>Email</span><input name="email" type="email" inputmode="email" autocomplete="email" value="${esc(c.email||'')}"></label></div>
    <p class="hint" style="margin:-6px 0 12px">Phone or email, whichever you check first.</p>
    <label class="field"><span>Business name</span><input name="business" autocomplete="organization" value="${esc(c.business||b.job||'')}"></label>
    <label class="field"><span>Where is the equipment? (city, state)</span><input name="city" autocomplete="address-level2" value="${esc(c.city||'')}" placeholder="e.g., Baltimore, MD"></label>
    <div class="row"><label class="field"><span>Situation</span><select name="situation">${opt(SITUATIONS, c.situation, 'Pick one')}</select></label>
     <label class="field"><span>Needs to be gone</span><select name="timeline">${opt(TIMELINES, c.timeline, 'Pick one')}</select></label></div>
    <div class="row"><label class="field"><span>Lease ending / move-out date <small class="muted">(optional)</small></span><input name="leaseEnd" type="date" value="${esc(c.leaseEnd||'')}"></label>
     <label class="field"><span>Is the landlord involved?</span><select name="landlord">${opt(['Yes','No','Not sure'], c.landlord, 'Pick one')}</select></label></div>
    <label class="field sl-ll"${c.landlord==='Yes'||c.landlord==='Not sure'?'':' hidden'}><span>Landlord name / contact <small class="muted">(optional)</small></span><input name="landlordContact" autocomplete="off" value="${esc(c.landlordContact||'')}" placeholder="Name, phone or email"></label>
    <label class="field"><span>Anything else you want us to know?</span><textarea name="notes" rows="3" placeholder="Last day open, items not for sale, access or parking…">${esc(c.notes||'')}</textarea></label>
    <input type="text" name="company_site" tabindex="-1" autocomplete="off" aria-hidden="true" class="sl-hp">
    <p class="sl-err" id="sl-err" role="alert" hidden></p>
    <button class="btn accent block bk-big" type="submit" id="sl-send">${I.check} Send to Miggy</button>
    <p class="hint center" style="margin-top:8px">Questions? Text Miggy <a href="sms:${MIGGY.sms}">${MIGGY.phone}</a></p>
   </form></div><div style="height:30px"></div>`,
  mount(el){ const f = el.querySelector('#sl-form'), err = el.querySelector('#sl-err'), btn = el.querySelector('#sl-send');
    f.elements.landlord.addEventListener('change', () => { el.querySelector('.sl-ll').hidden = !/^(Yes|Not sure)$/.test(f.elements.landlord.value); });
    f.addEventListener('submit', async e => { e.preventDefault(); const v = k => (f.elements[k].value || '').trim();
      const show = m => { err.textContent = m; err.hidden = false; err.scrollIntoView({block:'center'}); };
      const c = {name:v('name'), phone:v('phone'), email:v('email'), business:v('business'), city:v('city'), situation:v('situation'), timeline:v('timeline'), leaseEnd:v('leaseEnd'), landlord:v('landlord'), landlordContact:/^(Yes|Not sure)$/.test(v('landlord'))?v('landlordContact'):'', notes:v('notes')};
      b.contact = c; LL.save();
      if(!c.name) return show('Please enter your name.');
      if(!c.phone && !c.email) return show('Please add a phone number or email so Miggy can reach you.');
      if(c.phone && c.phone.replace(/\D/g,'').length < 10) return show('Please enter a 10-digit phone number.');
      if(c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return show('That email address doesn’t look right.');
      err.hidden = true; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Sending your photos to Miggy…';
      try{ const r = await sendLead(b, c, v('company_site')); rep.lead = {id:r.id, at:Date.now(), notified:r.notified}; rep.stale = false; LL.save(); LL.go('#/sell/bulk/thanks'); }
      catch(ex){ btn.disabled = false; btn.innerHTML = `${I.check} Try again`;
        show((ex && ex.message && ex.user ? ex.message : 'That didn’t go through. Check your signal and tap Try again.') + ` Or text Miggy at ${MIGGY.phone}.`); } }); } }; };
async function smallPhoto(p, max){ const rec = await store.get(p.id); if(!rec) return null; const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = rec.full; });
  return canvasURL(img, img.naturalWidth, img.naturalHeight, max||720, .7); }
async function sendLead(b, contact, hp){ const rep = b.report, t = totals(rep.items), st = sellerTotals(rep.items);
  /* photos for Miggy: per item the front + data plate first, then the rest, max 30 */
  const pick = []; const firsts = rep.items.map(i => (i.photos||[]).map(byLabel).filter(Boolean));
  firsts.forEach(ps => { const f = ps.find(p => p.slot==='front') || ps[0]; if(f) pick.push(f); });
  firsts.forEach(ps => { const pl = ps.find(p => p.slot==='plate'); if(pl && !pick.includes(pl)) pick.push(pl); });
  b.photos.forEach(p => { if(!pick.includes(p)) pick.push(p); });
  const photos = []; for(const p of pick.slice(0, 30)){ const d = await smallPhoto(p, 720).catch(() => null); if(d) photos.push({name:`${p.item?'item'+p.item+'-'+p.slot:slug(p.area)}-${label(p)}.jpg`, dataUrl:d}); }
  let repPdf = ''; try{ const pdf = await reportPDF({rep:true, comm:false, q:.7}); if(pdf.size < 5.5e6) repPdf = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(pdf); }); }catch(e){ console.info('[lead] pdf', e); }
  const deal = dealScore(rep.items, contact);
  const body = { company_site: hp||'', job: b.job, mode: b.mode, aiSource: rep.source, photoCount: b.photos.length, contact, deal: {score: deal.score, reason: deal.reason}, repPdf,
    totals: {newTotal: st.nw, aucLow: t.auc[0], aucHigh: t.auc[1], fbLow: t.fb[0], fbHigh: t.fb[1]},
    items: rep.items.map(i => ({itemNo:i.itemNo||null, name:i.name, brand:i.brand, model:i.model, qty:i.qty, condition:i.condition, area:i.area, newRetail:i.newRetail||0, aucLow:i.auc[0], aucHigh:i.auc[1], fbLow:i.fb[0], fbHigh:i.fb[1], reserve:reserveOf(i), photos:i.photos, flags:i.flags})),
    photos };
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 60000);
  let r; try{ r = await fetch(LEAD_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal}); } finally { clearTimeout(to); }
  let j = null; try{ j = await r.json(); }catch(e){}
  if(!r.ok || !j || !j.ok) throw Object.assign(new Error((j && j.error) || 'lead ' + r.status), {user: !!(j && j.error)});
  return j; }
const TIPS = [
  ['Clean it up','Degrease cooking equipment, wipe down stainless, and clean door gaskets and filters. Clean equipment photographs better and bids higher.'],
  ['Empty and clear','Empty reach-ins, coolers and shelves so buyers see the full unit and its condition.'],
  ['Move small items off the shelves','Pull pans, utensils and smallwares down and group like items together. Grouped smallwares sell as lots instead of getting lost.'],
  ['Keep it plugged in and running','Coolers holding temp and equipment that powers on show buyers it works. Working units bring stronger bids.'],
  ['Photograph the data plates','Model, serial and voltage let buyers search for exactly what they need.'],
  ['Gather the paperwork','Manuals, receipts, warranty or service records and model info all help buyers bid with confidence.'],
  ['Clear the path for pickup','Open walkways and doors to the loading area so pickup day goes fast and nothing gets damaged.'],
  ['Note what’s bolted down or hardwired','Tell Miggy what is hardwired, gas-connected or bolted down so removal is planned ahead.'],
  ['Tell us what’s staying','Point out anything that belongs to the landlord, is leased, or that you’re keeping, so it never gets listed.'],
  ['Be available on pickup days','Someone on site (or a lockbox plan) keeps pickups smooth and on schedule.']];
const WHY = [
  ['Competitive bidding','Buyers bid against each other, which often beats a single lowball buyout offer.'],
  ['Buyers from everywhere','Your equipment reaches buyers across the country, not just whoever is local this week.'],
  ['No Marketplace headaches','No no-shows, endless haggling, strangers texting at all hours, or scam payments.'],
  ['One sale clears it all','Big equipment, furniture and smallwares lots all go in the same sale.'],
  ['We handle the work','Listing, buyer questions, payment and pickup scheduling are handled for you.'],
  ['A clear timeline','A set auction date and pickup window, so you know when the space will be empty.'],
  ['Beat the lease deadline','Auctions move fast, so your equipment can be sold and out before your lease ends or the landlord takes possession of what’s left.']];
const WHYUS = [
  ['One person, start to finish','You deal with Miggy the whole way, and he knows restaurant equipment.'],
  ['Fast response','Miggy gets back to you within 24 hours.'],
  ['Out before your lease ends','We move fast, so your equipment can be sold and picked up before your lease ends or the landlord takes possession of what’s left.'],
  ['See what you have','An AI-powered inventory and valuation report with estimated new and used values, like this one.'],
  ['Nationwide buyers','LocalLiquidators.com reaches buyers across the country, with a large team handling closeouts across the US.'],
  ['We do the work','Listing, photos, buyer communication, payment and pickup scheduling.'],
  ['Flexible options','Auction, consignment, or an outright buy. Whatever fits your situation.'],
  ['Local service','Based in Virginia (Waynesboro), not a faceless call center.']];
LL.views.bulkthanks = () => { const b = B(), rep = b.report; if(!rep || !rep.lead){ LL.go(rep ? '#/sell/bulk/contact' : '#/sell/bulk', true); return {html:''}; }
  const st = sellerTotals(rep.items), first = ((b.contact||{}).name||'').split(/\s+/)[0];
  const row = i => { const u = usedOf(i), tn = thumbOf(i);
    return `<div class="sl-item"><div class="sl-th">${tn?`<img src="${tn}" alt="">`:I.camera}</div><div class="sl-it"><b>${i.itemNo?`<span class="bk-ino">#${i.itemNo}</span> `:''}${esc(i.name)}${i.qty>1?` <span class="bk-q">×${i.qty}</span>`:''}</b>
      ${(i.brand||i.model)?`<small>${esc([i.brand,i.model].filter(Boolean).join(' '))}</small>`:''}<span class="sl-cond">${esc(i.condition==='Unknown'?'Condition: Miggy will confirm':i.condition)}</span>
      <div class="sl-vals"><div><small>Est. value NEW</small><b>${i.newRetail>0?'~'+money(i.newRetail*i.qty):'Miggy will confirm'}</b></div><div><small>Est. value USED</small><b>${u[1]>0?rng(u[0]*i.qty,u[1]*i.qty):'Miggy will confirm'}</b></div></div></div></div>`; };
  return {html:`<div class="sl-rep">
  <section class="sl-hero"><div class="sl-brand light"><img src="assets/logo.jpg" alt="LocalLiquidators.com" width="150" height="35"><span>Just Ask Miggy × LocalLiquidators.com</span></div>
   <div class="sl-check">${I.check}</div><h2>Thank you${first?', '+esc(first):''}!</h2><p>Miggy will be in touch within 24 hours.</p>
   <p class="sl-sub">Your ${rep.items.length} item${rep.items.length===1?'':'s'} and photos were sent to Miggy. Questions before then? Text Miggy at <a href="sms:${MIGGY.sms}">${MIGGY.phone}</a>.</p></section>
  <div class="pad"><div class="card pad sl-tot"><div class="lbl">Your inventory · estimated value</div>
    <div class="sl-vals big"><div><small>Est. value NEW</small><b>${st.nw>0?'~'+money(st.nw):'Miggy will confirm'}</b>${st.nw>0&&st.nwMissing?`<em>${st.nwMissing} item${st.nwMissing===1?'':'s'} still to price</em>`:''}</div><div><small>Est. value USED</small><b>${st.used[1]>0?rng(st.used[0],st.used[1]):'Miggy will confirm'}</b></div></div>
    <p class="small muted" style="margin-top:8px">NEW = about what it would cost to replace. USED = what we valued it at for auction. Photo-based estimates, not an appraisal or a guarantee. Miggy confirms everything with you.</p></div></div>
  ${shareBlock(false)}
  <div class="sec"><h2>Inventory list</h2><span class="small muted">${rep.items.length} line${rep.items.length===1?'':'s'}</span></div>
  <div class="pad sl-list">${rep.items.map(row).join('')}</div>
  <div class="pad"><div class="card pad sl-tips" id="sl-tips"><div class="lbl">How to get the most from your auction (hassle free)</div>
    <ol class="sl-ol">${TIPS.map(t => `<li><b>${esc(t[0])}</b><span>${esc(t[1])}</span></li>`).join('')}</ol></div></div>
  <div class="pad"><div class="card pad sl-why"><div class="lbl">Why auction instead of a buyout or Facebook Marketplace</div>
    <ul class="sl-ul">${WHY.map(t => `<li>${I.check}<div><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div></li>`).join('')}</ul></div></div>
  <div class="pad"><div class="card pad sl-why sl-us"><div class="lbl">Why Just Ask Miggy + LocalLiquidators.com</div>
    <ul class="sl-ul">${WHYUS.map(t => `<li>${I.check}<div><b>${esc(t[0])}</b><span>${esc(t[1])}</span></div></li>`).join('')}</ul></div></div>
  <div class="pad"><div class="card pad sl-q"><b>Questions?</b> Text Miggy at <a href="sms:${MIGGY.sms}">${MIGGY.phone}</a>.<br><span class="small muted">Just Ask Miggy · LocalLiquidators.com</span></div>
   <div class="row noprint" style="margin-top:12px"><a class="btn ghost sm" href="#/sell/bulk">${I.camera} Add more items</a><button class="btn ghost sm" data-act="slshare">${I.share} Share my report</button></div></div>
  <div style="height:40px"></div></div>`}; };
LL.acts.bkpdfs = () => setTimeout(() => window.print(), 150);

/* ---------- reports: share / email / text / Excel / CSV / PDF ----------
   Seller versions: NEW + USED only (never commission, FB, reserves, deal score or flags).
   Rep versions (rep mode only): + FB Marketplace, auction, reserves, deal score, commission at the chosen rate + net to seller. */
const enc8 = new TextEncoder();
const RATE_OPTS = [20, 25, 30, 35, 40];
const commRate = () => { const r = +B().commRate; return RATE_OPTS.includes(r) ? r : 35; };
function commOf(items, rate){ const t = totals(items), r = (rate ?? commRate())/100; return {rate: rate ?? commRate(), gross: t.auc, comm: [t.auc[0]*r, t.auc[1]*r], net: [t.auc[0]*(1-r), t.auc[1]*(1-r)]}; }
/* Deal score 1-10 (rep only): auction value, item count, condition, sought-after brands/categories, urgency (lease date / timeline), pickup complexity */
const HOT_BRANDS = /\b(true|hobart|rational|vulcan|traulsen|hoshizaki|manitowoc|scotsman|turbochef|merrychef|alto.?shaam|garland|southbend|blodgett|beverage.?air|delfield|frymaster|pitco|imperial|wolf|vollrath|robot.?coupe|berkel|henny.?penny|ice.?o.?matic|taylor|hatco|cleveland|groen|middleby|lincoln|unox|perlick|continental|atosa|globe|bunn|fetco|la marzocco|nuova simonelli|mazzer|kitchenaid|cambro)\b/i;
const HOT_CATS = /(mixer|reach.?in|refrigerat|freezer|ice (machine|maker)|combi|convection|oven|range|fryer|griddle|charbroil|prep table|sandwich|pizza|slicer|espresso|dish ?machine|dishwasher|steam|kettle|proofer|display case|merchandiser|walk.?in|hood|smoker|sheeter)/i;
const HARD = /(walk.?in|hood|hardwir|gas.?connect|gas line|bolted|built.?in|plumbed|3.?phase|three.?phase|remote condens|cooler box|install)/i;
function dealScore(items, contact){ contact = contact || {}; const priced = items.filter(i => !unpriced(i)), t = totals(items);
  const mid = i => { const u = i.auc[1] > 0 ? i.auc : i.fb.map(v => v*0.6); return (u[0]+u[1])/2*i.qty; };
  const aucMid = items.reduce((a,i) => a + mid(i), 0);
  const vPts = aucMid >= 30000 ? 4 : aucMid >= 15000 ? 3.5 : aucMid >= 7500 ? 3 : aucMid >= 3000 ? 2.2 : aucMid >= 1000 ? 1.4 : aucMid > 0 ? 0.6 : 0;
  const n = priced.length, nPts = n >= 15 ? 1.5 : n >= 8 ? 1.25 : n >= 4 ? 1 : n >= 2 ? 0.7 : n ? 0.4 : 0;
  const CW = {'Like New':1, 'Good':.8, 'Fair':.5, 'Workhorse':.45, 'Unknown':.6};
  const cAvg = items.length ? items.reduce((a,i) => a + (CW[i.condition] ?? .6), 0) / items.length : 0, cPts = 1.5 * cAvg;
  const hot = i => HOT_BRANDS.test(i.brand + ' ' + i.name) || HOT_CATS.test(i.name), hotItems = items.filter(hot);
  const hotShare = aucMid > 0 ? items.filter(hot).reduce((a,i) => a + mid(i), 0) / aucMid : (items.length ? hotItems.length/items.length : 0), hPts = 1.5 * hotShare;
  let days = null; if(contact.leaseEnd){ const d = new Date(contact.leaseEnd + 'T12:00:00'); if(!isNaN(d)) days = Math.round((d - Date.now()) / 864e5); }
  const uPts = days !== null ? (days <= 14 ? 1 : days <= 45 ? .85 : days <= 90 ? .55 : .3) : ({'ASAP':.75, '2-4 weeks':.6, '1-3 months':.4}[contact.timeline] ?? .3);
  const hard = items.filter(i => HARD.test(i.name + ' ' + (i.flags||[]).join(' ')));
  const pPts = hard.length ? Math.max(0, .5 - hard.length*.2) : .5; // easy pickup = full 0.5
  const raw = vPts + nPts + cPts + hPts + uPts + pPts, score = Math.max(1, Math.min(10, Math.round(raw)));
  const conds = items.map(i => i.condition).filter(c => c && c !== 'Unknown'), topCond = conds.sort((a,b) => conds.filter(x=>x===b).length - conds.filter(x=>x===a).length)[0];
  const brands = [...new Set(hotItems.map(i => (HOT_BRANDS.exec(i.brand + ' ' + i.name)||[])[0]).filter(Boolean).map(x => x.replace(/\b\w/g, c => c.toUpperCase())))].slice(0, 3);
  const bits = [ t.auc[1] > 0 ? `auction ${rng(t.auc[0], t.auc[1])}` : 'no auction value yet', `${items.length} item${items.length===1?'':'s'}`, topCond ? `mostly ${topCond.toLowerCase()}` : 'condition unknown',
    hotShare >= .5 ? `easy sellers${brands.length ? ' (' + brands.join(', ') + ')' : ''}` : hotShare > 0 ? `some easy sellers${brands.length ? ' (' + brands.join(', ') + ')' : ''}` : 'few in-demand brands',
    days !== null ? (days < 0 ? `lease ended ${-days} day${days===-1?'':'s'} ago` : `lease ends in ${days} day${days===1?'':'s'}`) : contact.timeline ? `timeline ${contact.timeline}` : 'no deadline given',
    hard.length ? `${hard.length} hard pickup${hard.length===1?'':'s'} (${hard.slice(0,2).map(i => i.name.toLowerCase()).join(', ')})` : 'simple pickup' ];
  return {score, reason: bits.join(' · '), parts: {value:vPts, count:nPts, condition:+cPts.toFixed(2), demand:+hPts.toFixed(2), urgency:uPts, pickup:pPts}, days}; }

const fileBase = rep => (rep ? 'rep-report-' : 'just-ask-miggy-inventory-') + slug(B().job || (B().contact||{}).business || 'summary') + '-' + new Date().toISOString().slice(0,10);
const SHEAD = ['Item #','Item','Brand','Model','Qty','Condition','Area','Est. value NEW ($)','Est. value USED low ($)','Est. value USED high ($)'];
const RHEAD = ['Item #','Item','Brand','Model','Qty','Condition','Area','Est. NEW ($)','USED low ($)','USED high ($)','FB Marketplace low ($)','FB Marketplace high ($)','Auction low ($)','Auction high ($)','Reserve ($)','Check on site','Photos'];
const $n = v => v > 0 ? Math.round(v) : '';
function sheetData(isRepX){ const rep = B().report, items = rep.items;
  if(!isRepX){ const st = sellerTotals(items);
    const rows = items.map(i => { const u = usedOf(i); return [i.itemNo ? '#'+i.itemNo : '', i.name, i.brand||'', i.model||'', i.qty, i.condition==='Unknown'?'':i.condition, i.area||'', $n(i.newRetail*i.qty), u[1]>0 ? Math.round(u[0]*i.qty) : '', u[1]>0 ? Math.round(u[1]*i.qty) : '']; });
    return {head: SHEAD, rows, total: ['','TOTAL','','','','','', $n(st.nw), st.used[1]>0?Math.round(st.used[0]):'', st.used[1]>0?Math.round(st.used[1]):''],
      extra: [], notes: ['Estimates from photos only, not an appraisal. NEW = about what it would cost to replace. USED = what we valued it at for auction.', 'Just Ask Miggy × LocalLiquidators.com · Questions? Text Miggy ' + MIGGY.phone]}; }
  const st = sellerTotals(items), t = totals(items), cm = commOf(items), d = dealScore(items, B().contact), c = B().contact || {};
  const rows = items.map(i => { const u = usedOf(i); return [i.itemNo ? '#'+i.itemNo : '', i.name, i.brand||'', i.model||'', i.qty, i.condition, i.area||'', $n(i.newRetail*i.qty), u[1]>0?Math.round(u[0]*i.qty):'', u[1]>0?Math.round(u[1]*i.qty):'', $n(i.fb[0]*i.qty), $n(i.fb[1]*i.qty), $n(i.auc[0]*i.qty), $n(i.auc[1]*i.qty), $n(reserveOf(i)), (i.flags||[]).join('; '), (i.photos||[]).join(' ')]; });
  const blank = n => Array(n).fill('');
  return {head: RHEAD, rows, total: ['','TOTAL','','','','','', $n(st.nw), Math.round(st.used[0])||'', Math.round(st.used[1])||'', $n(t.fb[0]), $n(t.fb[1]), $n(t.auc[0]), $n(t.auc[1]), $n(items.reduce((a,i)=>a+reserveOf(i),0)), '', ''],
    extra: [['', `Our commission (${cm.rate}% of auction)`, ...blank(10), Math.round(cm.comm[0]), Math.round(cm.comm[1])], ['', 'Net to seller (auction minus commission)', ...blank(10), Math.round(cm.net[0]), Math.round(cm.net[1])]],
    notes: [`Deal score ${d.score}/10: ${d.reason}`, `Seller: ${[c.name, c.business, c.phone, c.email, c.city].filter(Boolean).join(' · ') || '—'}`,
      `Lease end: ${c.leaseEnd || '—'} · Landlord involved: ${c.landlord || '—'}${c.landlordContact ? ' (' + c.landlordContact + ')' : ''} · Situation: ${c.situation || '—'} · Timeline: ${c.timeline || '—'}`,
      c.notes ? `Seller notes: ${c.notes}` : '', 'REP ONLY: contains commission. Do not send to the seller. Photo-based AI estimates, not an appraisal.'].filter(Boolean)}; }
function toCSV(isRepX){ const d = sheetData(isRepX), q = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  return '\ufeff' + [d.head, ...d.rows, d.total, ...d.extra, [], ...d.notes.map(x => [x])].map(r => r.map(q).join(',')).join('\r\n'); }
function toXLSX(isRepX){ const d = sheetData(isRepX), X = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
  const col = i => { let s = ''; i++; while(i){ const m = (i-1)%26; s = String.fromCharCode(65+m) + s; i = Math.floor((i-1)/26); } return s; };
  const cell = (v, r, c, st) => v === '' || v == null ? '' : (typeof v === 'number' && isFinite(v)) ? `<c r="${col(c)}${r}" s="${st===3?3:(c===4?0:2)}"><v>${v}</v></c>` : `<c r="${col(c)}${r}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  const all = [d.head, ...d.rows, d.total, ...d.extra, [], ...d.notes.map(x => [x])], boldFrom = d.rows.length + 1, boldTo = boldFrom + d.extra.length;
  const xmlRows = all.map((r, i) => `<row r="${i+1}">${r.map((v, c) => cell(v, i+1, c, i===0 ? 1 : (i>=boldFrom && i<=boldTo) ? 3 : 0)).join('')}</row>`).join('');
  const widths = isRepX ? [8,36,14,14,6,11,14,14,13,13,15,15,13,13,12,40,24] : [8,38,16,14,6,12,16,18,20,20];
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${xmlRows}</sheetData></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD9C2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${isRepX?'Rep report':'Inventory'}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': sheet, 'xl/styles.xml': styles };
  const z = LL.exportLL.zip(Object.entries(files).map(([name, t]) => ({name, data: enc8.encode(t)})));
  return new Blob([z], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }
function summaryText(isRepX, maxItems){ const rep = B().report, st = sellerTotals(rep.items), L = [];
  if(!isRepX){ L.push(`My inventory summary from Just Ask Miggy × LocalLiquidators.com${B().job?` (${B().job})`:''}: ${rep.items.length} item${rep.items.length===1?'':'s'}.`,
      `Est. value NEW: ${st.nw>0?'~'+money(st.nw):'Miggy will confirm'}`, `Est. value USED: ${st.used[1]>0?rng(st.used[0],st.used[1]):'Miggy will confirm'}`, '');
    rep.items.slice(0, maxItems||200).forEach((i, k) => { const u = usedOf(i); L.push(`${k+1}. ${i.qty>1?i.qty+'x ':''}${i.name}${(i.brand||i.model)?' ('+[i.brand,i.model].filter(Boolean).join(' ')+')':''} · ${i.condition==='Unknown'?'condition TBD':i.condition} · New ${i.newRetail>0?'~'+money(i.newRetail*i.qty):'TBD'} · Used ${u[1]>0?rng(u[0]*i.qty,u[1]*i.qty):'TBD'}`); });
    if(maxItems && rep.items.length > maxItems) L.push(`…and ${rep.items.length-maxItems} more.`);
    L.push('', 'Photo-based estimates, not an appraisal. Miggy will be in touch within 24 hours.', `Questions? Text Miggy ${MIGGY.phone}`); return L.join('\n'); }
  const t = totals(rep.items), cm = commOf(rep.items), c = B().contact || {}, d = dealScore(rep.items, c);
  L.push(`REP REPORT (internal, includes commission): ${rep.job || B().job || c.business || 'Walkthrough'}`, `Deal score ${d.score}/10: ${d.reason}`);
  if(c.name) L.push(`Seller: ${[c.name, c.business, c.phone, c.email, c.city].filter(Boolean).join(' · ')}`);
  if(c.leaseEnd || c.landlord) L.push(`Lease end: ${c.leaseEnd||'—'} · Landlord: ${c.landlord||'—'}${c.landlordContact?' ('+c.landlordContact+')':''}`);
  L.push(`Totals: New ~${money(st.nw)} · Used ${rng(st.used[0],st.used[1])} · FB ${rng(t.fb[0],t.fb[1])} · Auction ${rng(t.auc[0],t.auc[1])}`,
    `Commission ${cm.rate}%: ${rng(cm.comm[0],cm.comm[1])} · Net to seller ${rng(cm.net[0],cm.net[1])}`, '');
  rep.items.slice(0, maxItems||300).forEach((i, k) => L.push(`${k+1}. ${i.qty>1?i.qty+'x ':''}${i.name}${(i.brand||i.model)?' ('+[i.brand,i.model].filter(Boolean).join(' ')+')':''} · ${i.condition} · New ${i.newRetail>0?'~'+money(i.newRetail*i.qty):'—'} · FB ${rng(i.fb[0]*i.qty,i.fb[1]*i.qty)} · Auction ${rng(i.auc[0]*i.qty,i.auc[1]*i.qty)}${resLabel(i)?' · '+resLabel(i):''}`));
  if(maxItems && rep.items.length > maxItems) L.push(`…and ${rep.items.length-maxItems} more.`);
  if(c.notes) L.push('', 'Seller notes: ' + c.notes);
  return L.join('\n'); }
/* PDF: pages drawn on canvas, embedded as JPEG pages (no library). opts: {rep, comm, q} */
async function reportPDF(opts){ opts = opts || {}; const R = !!opts.rep, rep = B().report, items = rep.items, st = sellerTotals(items), t = totals(items), c = B().contact || {}, W = 1224, H = 1584, M = 72;
  const pages = []; let cv, x, y;
  const loadImg = u => new Promise(res => { if(!u) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
  const logo = await loadImg('assets/logo.jpg');
  const font = (sz, w) => { x.font = `${w||400} ${sz}px Barlow, Arial, sans-serif`; };
  const wrap = (tx, maxW) => { const out = []; let line = ''; String(tx).split(/\s+/).forEach(w => { const tt = line ? line + ' ' + w : w; if(x.measureText(tt).width > maxW && line){ out.push(line); line = w; } else line = tt; }); if(line) out.push(line); return out; };
  const newPage = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0,0,W,H);
    x.fillStyle = R ? '#1f2937' : '#091747'; x.fillRect(0,0,W,110); if(logo){ const lh = Math.min(46, 216*logo.naturalHeight/logo.naturalWidth); x.fillStyle='#fff'; x.fillRect(M-8,26,232,58); x.drawImage(logo, M, 55-lh/2, 216, lh); }
    font(28, 800); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(R ? 'REP REPORT · internal' : 'Just Ask Miggy × LocalLiquidators.com', W-M, 66); x.textAlign = 'left';
    font(20, 600); x.fillStyle = '#6b7280'; x.fillText(R ? `Just Ask Miggy × LocalLiquidators.com · ${opts.comm ? 'Contains commission: do not send to seller' : 'Internal: not for the seller'} · Page ${pages.length+1}` : `Questions? Text Miggy ${MIGGY.phone}  ·  Page ${pages.length+1}`, M, H-40); y = 160; pages.push(cv); };
  const need = h => { if(y + h > H - 90) newPage(); };
  const text = (tx, sz, w, color, gap) => { font(sz, w); x.fillStyle = color || '#111827'; wrap(tx, W-2*M).forEach(l => { need(sz*1.3); x.fillText(l, M, y + sz); y += sz*1.3; }); y += gap||0; };
  const boxes = (list, h) => { need(h + 20); const n = list.length, gap = 14, bw = (W-2*M-gap*(n-1))/n; list.forEach((b, k) => { const bx = M + k*(bw+gap);
      x.fillStyle = b[2] || '#fff1e8'; x.fillRect(bx, y, bw, h); font(n>3?16:20, 800); x.fillStyle = '#9a3412'; x.fillText(b[0].toUpperCase(), bx+16, y+32); font(n>3?28:40, 800); x.fillStyle = '#091747';
      wrap(b[1], bw-28).slice(0,2).forEach((l, j) => x.fillText(l, bx+16, y + (n>3?66:88) + j*32)); }); y += h + 20; };
  newPage();
  const when = new Date(rep.at||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  if(R){ const d = dealScore(items, c);
    text(`${c.business || rep.job || B().job || 'Walkthrough'}`, 40, 800, '#091747', 2);
    text(`${when} · ${items.length} item${items.length===1?'':'s'} · ${rep.photos||B().photos.length} photos · ${rep.source==='ai'?'AI estimate':rep.source==='demo'?'EXAMPLE ONLY':'AI could not value: price by hand'}`, 22, 600, '#4b5563', 14);
    need(130); x.fillStyle = d.score >= 8 ? '#dcfce7' : d.score >= 5 ? '#fef9c3' : '#fee2e2'; x.fillRect(M, y, W-2*M, 116); font(56, 800); x.fillStyle = '#111827'; x.fillText(`Deal score ${d.score}/10`, M+20, y+64);
    font(20, 400); x.fillStyle = '#374151'; wrap(d.reason, W-2*M-40).slice(0,2).forEach((l, j) => x.fillText(l, M+20, y+94+j*24)); y += 140;
    text('Seller', 28, 800, '#091747', 2);
    [[`Name: ${c.name||'—'}${c.business?' · '+c.business:''}`], [`Phone: ${c.phone||'—'} · Email: ${c.email||'—'}`], [`Location: ${c.city||'—'} · Situation: ${c.situation||'—'} · Timeline: ${c.timeline||'—'}`],
     [`Lease ending / move-out: ${c.leaseEnd ? new Date(c.leaseEnd+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + (d.days!==null?` (${d.days<0?-d.days+' days ago':'in '+d.days+' days'})`:'') : '—'} · Landlord involved: ${c.landlord||'—'}${c.landlordContact?' ('+c.landlordContact+')':''}`],
     c.notes ? [`Notes: ${c.notes}`] : null].filter(Boolean).forEach(l => text(l[0], 22, 400, '#111827', 2)); y += 14;
    boxes([['Est. NEW', st.nw>0?'~'+money(st.nw):'—'], ['Est. USED', rng(st.used[0],st.used[1])], ['FB Marketplace', rng(t.fb[0],t.fb[1])], ['Auction', rng(t.auc[0],t.auc[1])]], 120);
    if(opts.comm){ const cm = commOf(items); boxes([[`Our commission (${cm.rate}%)`, rng(cm.comm[0],cm.comm[1]), '#e0e7ff'], ['Net to seller', rng(cm.net[0],cm.net[1]), '#e0e7ff']], 110); }
    const rs = items.reduce((a,i)=>a+reserveOf(i),0); if(rs) text(`Reserves set on ${items.filter(i=>reserveOf(i)>0).length} item(s): ${money(rs)} total`, 20, 600, '#4b5563', 6);
    text('Estimates from photos only (AI), not an appraisal. Confirm models, counts, condition and ownership (leases/liens) on site.', 18, 400, '#6b7280', 14);
  } else {
    text('Thank you! Miggy will be in touch within 24 hours.', 40, 800, '#091747', 6);
    text(`Inventory summary${B().job?' · '+B().job:''} · ${when} · ${items.length} item${items.length===1?'':'s'}`, 22, 600, '#4b5563', 18);
    boxes([['Est. value NEW', st.nw>0?'~'+money(st.nw):'Miggy will confirm'], ['Est. value USED', st.used[1]>0?rng(st.used[0],st.used[1]):'Miggy will confirm']], 110);
    text('NEW = about what it would cost to replace. USED = what we valued it at for auction. Photo-based estimates, not an appraisal or a guarantee.', 19, 400, '#4b5563', 16);
  }
  text('Inventory list', 30, 800, '#091747', 6);
  for(const i of items){ const fl = R && (i.flags||[]).length ? (i.flags||[]).join('; ') : '', rowH = R ? (fl ? 168 : 140) : 132; need(rowH); const im = await loadImg(thumbOf(i)), TS = R ? 128 : 112;
    x.fillStyle = '#f3f4f6'; x.fillRect(M, y, TS, TS); if(im){ const s2 = Math.max(TS/im.naturalWidth, TS/im.naturalHeight), w2 = im.naturalWidth*s2, h2 = im.naturalHeight*s2; x.save(); x.beginPath(); x.rect(M, y, TS, TS); x.clip(); x.drawImage(im, M+(TS-w2)/2, y+(TS-h2)/2, w2, h2); x.restore(); }
    const u = usedOf(i), tx = M + TS + 20, q = i.qty; font(26, 800); x.fillStyle = '#111827'; x.fillText(wrap(`${i.itemNo?'#'+i.itemNo+' ':''}${i.name}${q>1?' ×'+q:''}`, R ? W-2*M-TS-20 : 600)[0], tx, y+30);
    font(20, 400); x.fillStyle = '#4b5563'; x.fillText(wrap([[i.brand,i.model].filter(Boolean).join(' '), i.condition==='Unknown'?(R?'Condition unknown':'Condition: Miggy will confirm'):i.condition, R?resLabel(i):''].filter(Boolean).join(' · '), R ? W-2*M-TS-20 : 600)[0] || '', tx, y+60);
    if(R){ const cols = [['NEW', i.newRetail>0?'~'+money(i.newRetail*q):'—'], ['USED', u[1]>0?rng(u[0]*q,u[1]*q):'—'], ['FB MARKET', rng(i.fb[0]*q,i.fb[1]*q)], ['AUCTION', rng(i.auc[0]*q,i.auc[1]*q)]], cw = (W-2*M-TS-20)/4;
      cols.forEach((cc, k) => { font(16, 800); x.fillStyle = '#6b7280'; x.fillText(cc[0], tx + k*cw, y+92); font(22, 800); x.fillStyle = '#091747'; x.fillText(cc[1], tx + k*cw, y+120); });
      if(fl){ font(17, 400); x.fillStyle = '#b45309'; x.fillText(wrap('Check: ' + fl, W-2*M-TS-20)[0], tx, y+150); } }
    else { font(18, 800); x.fillStyle = '#6b7280'; x.textAlign = 'right'; x.fillText('NEW', W-M-230, y+30); x.fillText('USED', W-M, y+30); font(24, 800); x.fillStyle = '#091747';
      x.fillText(i.newRetail>0?'~'+money(i.newRetail*q):'TBD', W-M-230, y+64); x.fillText(u[1]>0?rng(u[0]*q,u[1]*q):'TBD', W-M, y+64); x.textAlign = 'left'; }
    x.strokeStyle = '#e5e7eb'; x.lineWidth = 2; x.beginPath(); x.moveTo(M, y+rowH-8); x.lineTo(W-M, y+rowH-8); x.stroke(); y += rowH; }
  y += 14;
  if(!R){ const section = (title, list, numbered) => { need(80); text(title, 30, 800, '#091747', 4); list.forEach((tt, k) => { need(70); text(`${numbered?(k+1)+'. ':'✓ '}${tt[0]}`, 22, 800, '#111827', 0); text(tt[1], 20, 400, '#4b5563', 10); }); y += 10; };
    section('How to get the most from your auction (hassle free)', TIPS, true); section('Why auction instead of a buyout or Facebook Marketplace', WHY); section('Why Just Ask Miggy + LocalLiquidators.com', WHYUS); }
  // assemble PDF: one JPEG image per page
  const parts = [], offs = []; let len = 0; const push = d => { const u = typeof d === 'string' ? enc8.encode(d) : d; parts.push(u); len += u.length; };
  const jpgs = pages.map(pg => { const bin = atob(pg.toDataURL('image/jpeg', opts.q || .85).split(',')[1]), u = new Uint8Array(bin.length); for(let k=0;k<bin.length;k++) u[k] = bin.charCodeAt(k); return u; });
  const N = pages.length, obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${N} /Kids [${pages.map((_, k) => `${3+k*3} 0 R`).join(' ')}] >>`));
  pages.forEach((_, k) => { const pn = 3+k*3, im = pn+1, cs = pn+2, content = `q 612 0 0 792 0 0 cm /Im0 Do Q`;
    obj(pn, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cs} 0 R >>`));
    obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgs[k].length} >>\nstream\n`); push(jpgs[k]); push('\nendstream'); });
    obj(cs, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)); });
  const total = 3 + N*3, xref = len; push(`xref\n0 ${total}\n0000000000 65535 f \n`); for(let k=1;k<total;k++) push(String(offs[k]).padStart(10,'0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, {type:'application/pdf'}); }
const dl = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
/* data-r="1" on a button = rep version (only honored in rep mode). Seller buttons never carry it. */
const wantRep = el => !!(el && el.dataset.r === '1' && isRep());
LL.acts.slshare = async btn => { if(!B().report) return; const R = wantRep(btn), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Getting the report ready…';
  try{ const pdf = new File([await reportPDF({rep:R, comm:R})], fileBase(R) + '.pdf', {type:'application/pdf'}); const text = summaryText(R, 12);
    const d = {files:[pdf], title: R ? 'Rep report' : 'My inventory summary · Just Ask Miggy', text};
    if(navigator.share && navigator.canShare && navigator.canShare({files:[pdf]})){ await navigator.share(d).catch(e => { if(e.name!=='AbortError') throw e; }); }
    else if(navigator.share){ dl(pdf.name, pdf); await navigator.share({title:d.title, text}).catch(e => { if(e.name!=='AbortError') throw e; }); }
    else { dl(pdf.name, pdf); LL.toast('PDF saved. Use Email or Text to send it.'); } }
  catch(e){ LL.toast('Sharing didn’t work here. Try Email or Text.'); }
  finally{ btn.disabled = false; btn.innerHTML = old; } };
LL.acts.slmail = a => { const R = wantRep(a); a.href = `mailto:?subject=${encodeURIComponent(R ? `Rep report: ${(B().contact||{}).business || B().job || 'walkthrough'}` : 'My inventory summary · Just Ask Miggy × LocalLiquidators.com')}&body=${encodeURIComponent(summaryText(R, 60) + '\n\n(Tip: tap Save PDF or Excel in the app to attach the full report.)')}`; location.href = a.href; };
LL.acts.slsms = a => { const R = wantRep(a); a.href = `sms:?&body=${encodeURIComponent(summaryText(R, 8))}`; location.href = a.href; };
LL.acts.slxlsx = b => { const R = wantRep(b); dl(fileBase(R) + '.xlsx', toXLSX(R)); LL.toast('Excel file downloaded'); };
LL.acts.slcsv = b => { const R = wantRep(b); dl(fileBase(R) + '.csv', new Blob([toCSV(R)], {type:'text/csv'})); LL.toast('CSV downloaded'); };
LL.acts.slpdf = async btn => { const R = wantRep(btn), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> PDF…'; try{ dl(fileBase(R) + '.pdf', await reportPDF({rep:R, comm:R})); LL.toast('PDF downloaded'); }catch(e){ window.print(); } finally{ btn.disabled = false; btn.innerHTML = old; } };
const shareBlock = R => `<div class="pad noprint sl-share"><button class="btn accent block bk-big" data-act="slshare"${R?' data-r="1"':''}>${I.share} ${R?'Share rep report':'Share my report'}</button>
    <p class="hint center" style="margin:6px 0 10px">${R?'Rep version: includes FB, auction, reserves, deal score and commission.':'Send the PDF to yourself, a partner or your landlord.'}</p>
    <div class="sl-more"><a class="btn ghost sm" href="#" data-act="slmail"${R?' data-r="1"':''}>${I.mail} Email</a><a class="btn ghost sm" href="#" data-act="slsms"${R?' data-r="1"':''}>${I.phone} Text</a>
     <button class="btn ghost sm" data-act="slxlsx"${R?' data-r="1"':''}>${I.download} Excel (.xlsx)</button><button class="btn ghost sm" data-act="slcsv"${R?' data-r="1"':''}>${I.download} CSV (Google Sheets)</button>
     <button class="btn ghost sm" data-act="slpdf"${R?' data-r="1"':''}>${I.download} ${R?'Rep PDF':'Save as PDF'}</button></div>
    <p class="small muted center" style="margin-top:6px">Open in Google Sheets: upload the CSV or XLSX at sheets.google.com.</p></div>`;
LL.reports = { toCSV, toXLSX, reportPDF, summaryText, dealScore, commOf };

/* REP unlock: open #/rep/<code> once on Michael's phone. Only a SHA-256 of the code ships in this file. */
const REP_HASH = '0940d20821c97b12cbb72b207777ea3e4be97ff83ca587d270b177d473b71e8d';
LL.views.rep = r => ({html:`<div class="pad"><p class="muted">One moment…</p></div>`, mount(el){ (async () => {
  if(r.code==='off'){ try{ localStorage.removeItem('ll.rep'); }catch(e){} LL.toast('Rep mode off on this phone'); LL.go('#/sell/bulk', true); return; }
  if(r.code==='lead') return openLead(el, r.arg);
  let ok = false; try{ const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(r.code||'').trim().toLowerCase())); ok = [...new Uint8Array(h)].map(x => x.toString(16).padStart(2,'0')).join('') === REP_HASH; }catch(e){}
  if(ok){ try{ localStorage.setItem('ll.rep','1'); }catch(e){} LL.toast('Rep mode on for this phone'); }
  let pend = ''; try{ pend = sessionStorage.getItem('ll.pendingLead') || ''; sessionStorage.removeItem('ll.pendingLead'); }catch(e){}
  LL.go(ok && pend ? '#/rep/lead/' + pend : '#/sell/bulk', true); })(); } });
/* #/rep/lead/<key>.<token> (link in Michael's lead alert): load a seller's saved report into rep mode on this phone,
   so reserves + commission can be set after the fact and the rep PDF / Excel / CSV re-exported. */
async function openLead(el, arg){ const m = /^([a-f0-9]{16})\.([a-f0-9]{32})$/.exec(arg||''); const say = h => { el.innerHTML = `<div class="pad">${h}</div>`; };
  if(!m) return say('<p>That report link looks incomplete.</p>');
  if(!isRep()){ try{ sessionStorage.setItem('ll.pendingLead', arg); }catch(e){} return say('<h2>Rep mode needed</h2><p class="muted">Turn on rep mode on this phone with your rep link, then open this report link again.</p>'); }
  const b = B(); if(b.report && b.report.remote && b.report.remote.id===m[1]){ LL.go('#/sell/bulk/report', true); return; }
  if((b.photos.length || b.report) && !confirm('Replace the walkthrough on this phone with this seller’s report? (Send or export the current one first if you still need it.)')){ LL.go('#/sell/bulk', true); return; }
  say('<p class="muted"><span class="spin"></span> Loading the seller’s report…</p>');
  let j = null; try{ const res = await fetch(`${LEAD_URL}?id=${m[1]}&k=${m[2]}`); j = await res.json(); if(!res.ok || !j.ok) throw new Error(j && j.error || res.status); }
  catch(e){ return say(`<p>Couldn’t load that report (${esc(String(e.message||e))}). Check your signal and tap the link again.</p>`); }
  await ready; await store.clear(); b.photos = []; b.items = []; b.seq = 0; b.itemSeq = 0;
  for(const p of j.photos||[]){ const n = +((/^P(\d+)$/.exec(p.label)||[])[1]) || (b.seq + 1); const id = 'r' + Date.now().toString(36) + LL.uid().slice(0,4);
    await store.put(id, {full: p.dataUrl, thumb: p.dataUrl}); b.photos.push({id, n, area: 'Kitchen', ts: Date.now(), remote: true}); b.seq = Math.max(b.seq, n); }
  const items = (j.items||[]).map(x => { const o = norm(Object.assign({confidence:'medium'}, x)); if(x.itemNo) o.itemNo = x.itemNo; if(x.newRetail === 0) o.newRetail = null; return o; });
  b.job = j.job || (j.contact||{}).business || ''; b.contact = j.contact || {}; b.mode = j.mode || 'items';
  b.report = { source: j.aiSource || 'ai', at: Date.parse(j.createdAt) || Date.now(), job: b.job, photos: j.photoCount || b.photos.length, mode: b.mode, items, notes: '',
    lead: { id: j.id, at: Date.parse(j.createdAt) || Date.now(), notified: 'sent' }, remote: { id: m[1] } };
  LL.save(); LL.toast('Seller report loaded: set reserves + commission, then export'); LL.go('#/sell/bulk/report', true); }

/* ---------- report ---------- */
function totals(items){ const t = {fb:[0,0], auc:[0,0], n:0, units:0};
  items.forEach(i => { t.fb[0]+=i.fb[0]*i.qty; t.fb[1]+=i.fb[1]*i.qty; t.auc[0]+=i.auc[0]*i.qty; t.auc[1]+=i.auc[1]*i.qty; t.n++; t.units+=i.qty; }); return t; }
const areasOf = items => { const seen = AREAS.filter(a => items.some(i => i.area===a)); items.forEach(i => { if(!seen.includes(i.area)) seen.push(i.area); }); return seen; };
let editing = null;
function itemCard(it, rep){ const tag = it.qty>1 ? `<span class="bk-q">×${it.qty}</span>` : '';
  if(editing===it.id) return `<div class="card pad bk-item editing" data-id="${it.id}"><form class="bk-edit" data-id="${it.id}">
    <label class="field"><span>Item</span><input type="text" name="name" value="${esc(it.name)}"></label>
    <div class="row"><label class="field"><span>Brand</span><input type="text" name="brand" value="${esc(it.brand)}"></label><label class="field"><span>Model</span><input type="text" name="model" value="${esc(it.model)}"></label></div>
    <div class="row"><label class="field"><span>Qty</span><input type="number" inputmode="numeric" min="1" name="qty" value="${it.qty}"></label><label class="field"><span>Area</span><select name="area">${areasOf(rep.items).concat(AREAS).filter((a,i,s)=>s.indexOf(a)===i).map(a=>`<option ${a===it.area?'selected':''}>${esc(a)}</option>`).join('')}</select></label></div>
    <label class="field"><span>Condition</span><select name="condition">${COND.map(c=>`<option ${c===it.condition?'selected':''}>${c}</option>`).join('')}</select></label>
    <div class="lbl">Value each ($)</div>
    <div class="row"><label class="field"><span>FB low</span><input type="number" inputmode="numeric" name="fb0" value="${it.fb[0]||''}" placeholder="Enter price"></label><label class="field"><span>FB high</span><input type="number" inputmode="numeric" name="fb1" value="${it.fb[1]||''}" placeholder="Enter price"></label></div>
    <div class="row"><label class="field"><span>Auction low</span><input type="number" inputmode="numeric" name="auc0" value="${it.auc[0]||''}" placeholder="Enter price"></label><label class="field"><span>Auction high</span><input type="number" inputmode="numeric" name="auc1" value="${it.auc[1]||''}" placeholder="Enter price"></label></div>
    <div class="row"><label class="field"><span>New retail each ($)</span><input type="number" inputmode="numeric" name="nr" value="${it.newRetail||''}" placeholder="Replacement cost"></label><label class="field"><span>Reserve (rep only)</span><select name="resmode">${RES_OPTS.map(o => `<option value="${o[0]}" ${o[0]===resMode(it)?'selected':''}>${o[1]}</option>`).join('')}</select></label></div>
    <label class="field bk-rescustom"${resMode(it)==='custom'?'':' hidden'}><span>Custom reserve ($)</span><input type="number" inputmode="numeric" name="reserve" value="${resMode(it)==='custom'&&it.reserve||''}" placeholder="Amount for this line"></label>
    <div class="row"><button type="button" class="btn danger sm" data-act="bkdel" data-id="${it.id}">${I.trash} Delete</button><button type="submit" class="btn sm">${I.check} Save</button></div></form></div>`;
  return `<div class="card bk-item${unpriced(it)?' noprice':''}" data-id="${it.id}"><div class="bk-ih"><div class="bk-it"><b>${it.itemNo?`<span class="bk-ino">#${it.itemNo}</span> `:''}${esc(it.name)} ${tag}</b>${(it.brand||it.model)?`<small>${esc([it.brand,it.model].filter(Boolean).join(' '))}</small>`:''}</div>
    <button class="iconbtn sm noprint" data-act="bkedit" data-id="${it.id}" aria-label="Edit ${esc(it.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button></div>
   <div class="bk-meta"><span class="bk-chip">${esc(it.condition)}</span><span class="bk-chip conf-${it.confidence}">${it.confidence} confidence</span>${it.photos.length?`<span class="bk-chip ph">${I.image.replace('<svg','<svg width="13" height="13"')} ${it.photos.join(', ')}</span>`:''}</div>
   <div class="bk-vals four"><div><small>New${it.qty>1?' (total)':''}</small><b>${it.newRetail?'~'+money(it.newRetail*it.qty):'—'}</b></div><div><small>Used</small><b>${vr(it, usedOf(it)[0]*it.qty, usedOf(it)[1]*it.qty)}</b></div><div><small>FB Market</small><b>${vr(it, it.fb[0]*it.qty, it.fb[1]*it.qty)}</b></div><div><small>Auction</small><b>${vr(it, it.auc[0]*it.qty, it.auc[1]*it.qty)}</b></div></div>
   <p class="bk-res">${resLabel(it) ? `<b>${esc(resLabel(it))}</b>` : 'No reserve'}</p>
   ${unpriced(it)?`<p class="bk-need">No value from the photos. Tap the pencil and enter a price.</p>`:''}
   ${it.qty>1&&!unpriced(it)?`<p class="bk-each">Each: FB ${rng(it.fb[0],it.fb[1])} · Auction ${rng(it.auc[0],it.auc[1])}</p>`:''}
   ${it.basis?`<p class="bk-basis">${esc(it.basis)}</p>`:''}
   ${it.flags.length?`<ul class="bk-flags">${it.flags.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}</div>`; }
LL.views.bulkreport = () => { const b = B(), rep = b.report; if(!rep){ LL.go('#/sell/bulk', true); return {html:''}; }
  if(!isRep()){ LL.go(rep.lead ? '#/sell/bulk/thanks' : '#/sell/bulk/contact', true); return {html:''}; }
  const t = totals(rep.items), demo = rep.source==='demo', d = new Date(rep.at);
  const banner = demo ? `<div class="bk-demo" role="note"><b>Example only</b> ${rep.why==='offline'?'You were offline, so this is an example bakery report, not read from your photos. Re-run Analyze with signal.':'Speedy AI couldn’t be reached, so this is an example bakery report, not read from your photos. Tap Analyze again.'} Or tap <b>Send to my assistant</b>.</div>`
    : `<div class="bk-ai" role="note"><b>AI estimate</b> from your ${rep.photos} photos. Photo-based, not an appraisal. Check the flagged items on site.</div>`;
  const cm = commOf(rep.items), st = sellerTotals(rep.items), c = b.contact || {}, deal = dealScore(rep.items, c);
  const comm = `<div class="card pad bk-comm"><div class="bk-commh"><div class="lbl">Commission (rep only)</div><label class="bk-rate"><span class="sr-only">Commission rate</span><select id="bk-rate" aria-label="Commission rate">${RATE_OPTS.map(r => `<option value="${r}" ${r===cm.rate?'selected':''}>${r}%</option>`).join('')}</select></label></div>
    <div class="bk-trow"><span>Auction total (hammer)</span><b>${rng(cm.gross[0], cm.gross[1])}</b></div>
    <div class="bk-trow"><span>Our commission (${cm.rate}%)</span><b>${rng(cm.comm[0], cm.comm[1])}</b></div>
    <div class="bk-trow net"><span>Net to seller</span><b>${rng(cm.net[0], cm.net[1])}</b></div></div>`;
  const dd = deal.days, dealCard = `<div class="pad"><div class="card pad bk-deal s${deal.score>=8?'hi':deal.score>=5?'mid':'lo'}"><div class="bk-dealn"><b>${deal.score}</b><small>/10</small></div><div><div class="lbl">Deal score</div><p>${esc(deal.reason)}</p></div></div></div>`;
  const sellerCard = c.name ? `<div class="pad"><div class="card pad bk-seller"><div class="lbl">Seller${rep.lead?` · lead sent ${new Date(rep.lead.at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:''}</div>
    <p><b>${esc(c.name)}</b>${c.business?` · ${esc(c.business)}`:''}</p>
    <p>${c.phone?`<a href="tel:${esc(c.phone.replace(/[^\d+]/g,''))}">${esc(c.phone)}</a>`:''}${c.phone&&c.email?' · ':''}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}</p>
    <p class="small">${esc(c.city||'—')} · ${esc(c.situation||'—')} · needs to be gone: ${esc(c.timeline||'—')}</p>
    <p class="small">Lease end: <b>${c.leaseEnd?esc(c.leaseEnd)+(dd!==null?` (${dd<0?-dd+' days ago':'in '+dd+' days'})`:''):'—'}</b> · Landlord involved: <b>${esc(c.landlord||'—')}</b>${c.landlordContact?` (${esc(c.landlordContact)})`:''}</p>
    ${c.notes?`<p class="small muted">“${esc(c.notes)}”</p>`:''}</div></div>` : '';
  return {html:`<div class="bk-rep">
  <div class="bk-rephead"><img class="bk-plogo" src="assets/logo.jpg" alt="Local Liquidators" width="170" height="40"><div><span class="badge ${demo?'demo':'ok'}">${demo?'Example only':'AI estimate'}</span></div>
   <h2>${esc(rep.job || b.job || 'Walkthrough')}</h2><p>${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${rep.photos} photos · ${t.n} lines · ${t.units} units</p>
   <div class="bk-sum four"><div><small>New</small><b>${st.nw>0?'~'+money(st.nw):'—'}</b></div><div><small>Used</small><b>${rng(st.used[0],st.used[1])}</b></div><div><small>FB Marketplace</small><b>${rng(t.fb[0],t.fb[1])}</b></div><div><small>Auction</small><b>${rng(t.auc[0],t.auc[1])}</b></div></div></div>
  ${banner}
  ${dealCard}
  ${sellerCard}
  ${rep.items.some(unpriced)?`<div class="bk-needbar" role="status"><b>${rep.items.filter(unpriced).length} ${rep.items.filter(unpriced).length===1?'item needs':'items need'} a price.</b> Enter one before you copy, download or print the report.</div>`:''}
  ${areasOf(rep.items).map(a => { const its = rep.items.filter(i => i.area===a), at = totals(its);
    return `<section class="bk-area"><div class="sec"><h2>${esc(a)}</h2><span class="small muted">${its.length} item${its.length===1?'':'s'} · auction ${rng(at.auc[0],at.auc[1])}</span></div><div class="bk-list">${its.map(i => itemCard(i, rep)).join('')}</div></section>`; }).join('')}
  <div class="pad noprint"><button class="btn ghost block sm" data-act="bkadd">${I.plus} Add an item the AI missed</button></div>
  <div class="pad"><div class="card pad bk-tot"><div class="lbl">Totals</div>
    <div class="bk-trow"><span>Est. NEW (replacement)</span><b>${st.nw>0?'~'+money(st.nw):'—'}</b></div>
    <div class="bk-trow"><span>Est. USED (seller sees this)</span><b>${rng(st.used[0],st.used[1])}</b></div>
    <div class="bk-trow"><span>FB Marketplace (used, local)</span><b>${rng(t.fb[0],t.fb[1])}</b></div>
    <div class="bk-trow"><span>Auction (hammer)</span><b>${rng(t.auc[0],t.auc[1])}</b></div></div>
   ${comm}
   ${rep.notes?`<p class="small muted" style="margin-top:10px">AI note: ${esc(rep.notes)}</p>`:''}
   <p class="small muted bk-disc">${demo?'EXAMPLE ONLY: not read from your photos. ':''}Estimates from photos only, not an appraisal. Confirm models, counts, condition and ownership (leases/liens) on site.</p></div>
  ${shareBlock(true)}
  <div class="pad noprint"><div class="bk-exp">
    <button class="btn ghost sm" data-act="bkcopy">${I.check} Copy as text</button><button class="btn ghost sm" data-act="bkpdf">${I.download} Print</button>
    ${rep.lead?`<a class="btn ghost sm" href="#/sell/bulk/thanks">${I.eye||I.check} Seller view</a>`:''}<a class="btn ghost sm" href="#/sell/bulk">${I.camera} Back to photos</a></div></div>
  <div style="height:90px"></div>
  <div class="stickyfoot noprint"><button class="btn accent block" data-act="bkshare">${I.share} Send photos + list to my assistant</button></div></div>`,
  mount(el){ el.querySelector('#bk-rate')?.addEventListener('change', e => LL.acts.bkrate(e.target)); el.querySelectorAll('form.bk-edit').forEach(f => f.elements.resmode && f.elements.resmode.addEventListener('change', () => { const box = f.querySelector('.bk-rescustom'); box.hidden = f.elements.resmode.value!=='custom'; if(!box.hidden) f.elements.reserve.focus(); }));
    el.querySelectorAll('form.bk-edit').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const it = rep.items.find(i => i.id===f.dataset.id); const v = n => f.elements[n].value;
      Object.assign(it, {name: v('name').trim()||it.name, brand: v('brand').trim(), model: v('model').trim(), qty: Math.max(1, Math.round(+v('qty')||1)), area: v('area'), condition: v('condition'), fb:[num(v('fb0')), num(v('fb1'))].sort((a,b)=>a-b), auc:[num(v('auc0')), num(v('auc1'))].sort((a,b)=>a-b), newRetail: num(v('nr')) || 0, reserveMode: v('resmode'), reserve: v('resmode')==='custom' ? (num(v('reserve')) || 0) : 0, edited:true});
      editing = null; LL.save(); LL.render(true); LL.toast('Saved'); })); } }; };
LL.acts.bkedit = b => { editing = b.dataset.id; LL.render(true); setTimeout(() => LL.$('.bk-item.editing')?.scrollIntoView({block:'center'}), 60); };
LL.acts.bkdel = b => { const rep = B().report, i = rep.items.findIndex(x => x.id===b.dataset.id); if(i<0) return; const [gone] = rep.items.splice(i,1); editing = null; LL.save(); LL.render(true);
  LL.toast('Item removed', 'Undo', () => { rep.items.splice(i, 0, gone); LL.save(); LL.render(true); }); };
LL.acts.bkadd = () => { const rep = B().report; const it = norm({name:'New item', qty:1, area: B().area || areasOf(rep.items)[0] || 'Kitchen', condition:'Good', confidence:'low', fbLow:0, fbHigh:0, aucLow:0, aucHigh:0, basis:'Added by hand'}); rep.items.push(it); editing = it.id; LL.save(); LL.render(true); setTimeout(() => LL.$('.bk-item.editing')?.scrollIntoView({block:'center'}), 60); };
LL.acts.bkrate = sel => { if(!isRep()) return; B().commRate = +sel.value; LL.save(); LL.render(true); };

/* exports */
function asText(withPhotosNote){ const b = B(), rep = b.report; const t = rep ? totals(rep.items) : null; const L = [];
  L.push(`${rep&&rep.job || b.job || 'Walkthrough'}: walkthrough ${rep ? (rep.source==='demo'?'(EXAMPLE ONLY, not from photos)':'(AI estimate)') : ''}`.trim());
  L.push(`${b.photos.length} photos: ` + areasOf(b.photos).map(a => `${a} ${b.photos.filter(p=>p.area===a).map(label).join(' ')}`).join(' | '));
  if(rep){ areasOf(rep.items).forEach(a => { L.push('', a.toUpperCase());
      rep.items.filter(i => i.area===a).forEach(i => L.push(`- ${i.qty>1?i.qty+'x ':''}${i.name}${(i.brand||i.model)?' ('+[i.brand,i.model].filter(Boolean).join(' ')+')':''} | ${i.condition} | ${unpriced(i)?'NEEDS PRICE':`FB ${rng(i.fb[0]*i.qty,i.fb[1]*i.qty)} | Auction ${rng(i.auc[0]*i.qty,i.auc[1]*i.qty)}`}${i.photos.length?' | '+i.photos.join(','):''}${i.flags.length?' | Check: '+i.flags.join('; '):''}`)); });
    L.push('', `TOTAL FB Marketplace ${rng(t.fb[0],t.fb[1])} | Auction ${rng(t.auc[0],t.auc[1])}`);
    if(isRep()){ const cm = commOf(rep.items); L.push(`Commission ${cm.rate}%: ${rng(cm.comm[0],cm.comm[1])} | Net to seller ${rng(cm.net[0],cm.net[1])}`); } }
  if(withPhotosNote) L.push('', 'Please research each item (models, used FBMP + auction values) from the attached photos.');
  return L.join('\n'); }
LL.acts.bkcopy = async () => { if(needPrice(B().report)) return; const s = asText(false); try{ await navigator.clipboard.writeText(s); LL.toast('Copied: paste it anywhere'); }catch(e){ const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); LL.toast('Copied'); } };
LL.acts.bkcsv = () => { const b = B(), rep = b.report; if(needPrice(rep)) return; const q = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const head = ['Area','Item','Brand','Model','Qty','Condition','Confidence','Photos','New retail (each)','FBMP low (each)','FBMP high (each)','FBMP low (total)','FBMP high (total)','Auction low (each)','Auction high (each)','Auction low (total)','Auction high (total)','Basis','Check on site','Source'];
  const rows = rep.items.map(i => [i.area,i.name,i.brand,i.model,i.qty,i.condition,i.confidence,i.photos.join(' '),i.newRetail??'',i.fb[0],i.fb[1],i.fb[0]*i.qty,i.fb[1]*i.qty,i.auc[0],i.auc[1],i.auc[0]*i.qty,i.auc[1]*i.qty,i.basis,i.flags.join('; '),rep.source==='demo'?'Example only':'AI estimate']);
  const t = totals(rep.items); rows.push(['TOTAL','','','',t.units,'','','','','','',t.fb[0],t.fb[1],'','',t.auc[0],t.auc[1],'','','']);
  if(isRep()){ const cm = commOf(rep.items); rows.push([`Commission ${cm.rate}%`,'','','','','','','','','','','','','','',Math.round(cm.comm[0]),Math.round(cm.comm[1]),'','','']); }
  LL.download(slug(rep.job||b.job) + '-walkthrough.csv', [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n'), 'text/csv'); LL.toast('CSV downloaded'); };
LL.acts.bkpdf = () => { if(needPrice(B().report)) return; editing = null; LL.render(true); setTimeout(() => window.print(), 250); };
LL.acts.bkshare = async () => { const b = B(); if(!isRep()) return; if(!b.photos.length){ LL.toast('No photos yet'); return; }
  const text = asText(true), name = slug(b.job); const ov = LL.$('#overlay');
  ov.innerHTML = `<div class="bk-sheetwrap" data-x="close"><div class="bk-sheet bk-share" role="dialog" aria-label="Send to my assistant"><h3>Send to my assistant</h3><p class="small muted" id="bk-shmsg">Getting ${b.photos.length} photos ready…</p><div id="bk-shbtns"></div>
    <button class="btn ghost block sm" style="margin-top:10px" data-x="copy">${I.check} Copy the list only</button><button class="btn block sm" style="margin-top:8px" data-x="close">Done</button></div></div>`;
  ov.classList.add('on','bk-tr');
  const files = [];
  for(const p of b.photos){ const rec = await store.get(p.id); if(!rec) continue; const bin = atob(rec.full.split(',')[1]); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
    files.push(new File([u], p.item ? `${name}-item${String(p.item).padStart(2,'0')}-${SLOTS.findIndex(s=>s.k===p.slot)+1}-${p.slot}-${label(p)}.jpg` : `${name}-${label(p)}-${slug(p.area)}.jpg`, {type:'image/jpeg'})); }
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
