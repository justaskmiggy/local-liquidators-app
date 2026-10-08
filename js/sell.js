/* SELLER side: onboarding, inventory dashboard, guided photo flow, AI Describe, details, submit */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
LL.views = LL.views || {}; LL.acts = LL.acts || {};
/* Photo positions follow the Local Liquidators Auction Inventory Protocol (see js/protocol.js):
   lot sticker → 4 required angles (+1 optional extra) → brand logo → manufacturer plate (4–7 photos per item, max 7) → ≤15s video (→ main items + wide group shot for group / bulk lots). */
const PR = LL.proto;
const TIPS = ['Lot sticker first — it keeps every lot separate','Clean background, good lighting','Stand 3–4 ft back and show the whole item','Light the front of the item; avoid a bright window behind it','Hold steady — brace your elbows'];
LL.shotsOf = it => PR.shots(it);
const has = (it,k) => !!(it.photos && it.photos[k]);
const ARTV = {ctx1:'front',ctx2:'side',ctx3:'side',ctx4:'back',ctx5:'interior',ctx6:'interior',ctx7:'detail',brand:'closeup',plate:'plate',group:'overview',front:'front',back:'back',overview:'overview',closeup:'closeup'};
const artView = k => ARTV[k] || (/-brand$/.test(k)?'closeup':/-plate$/.test(k)?'plate':/-1$/.test(k)?'front':'detail');
const thumb = (it,k) => { if(k==='sticker' && it.stickerMode!=='physical') return has(it,'sticker') ? PR.stickerOf(it) : null;
  if(k==='video') return LL.photos.get(it.id,'videoPoster') || null;
  return LL.photos.get(it.id,k) || (it.sample && it.photos[k] ? LL.art(it.cat==='smallwares'?'pans':LL.cat.find(c=>c.id===it.cat)?.emoji||'other', artView(k), it.seed||0) : null); };
LL.thumb = thumb;
const itemName = (it,i) => it.title || [it.make,it.model].filter(Boolean).join(' ') || (it.type==='lot'?`Lot ${i+1}`:`Item ${i+1}`);
const stats = () => { const items=S().items; let done=0,tot=0,ready=0; items.forEach(it=>{ const sh=LL.shotsOf(it); const d=sh.filter(s=>has(it,s.k)).length; done+=d; tot+=sh.length; if(d===sh.length) ready++; });
  return {n:items.length, done, tot, ready, pct: tot?Math.round(done/tot*100):0}; };
LL.sellStats = stats;
LL.ring = (pct,size=84,sw=9,txt) => { const r=(size-sw)/2, c=2*Math.PI*r; return `<div class="pring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="trk" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}"/><circle class="val" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct/100)}"/></svg><b style="font-size:${size/3.8}px">${txt??pct+'%'}</b></div>`; };
const getItem = id => S().items.find(i=>i.id===id);
const daysTo = d => { if(!d) return null; const t=new Date(d+'T23:59:59').getTime()-Date.now(); return Math.ceil(t/864e5); };

/* ---------- onboarding ---------- */
LL.views.onboard = () => { const p=S().profile;
  const locs = p.locations.length?p.locations:[''];
  return {html:`<div class="pad">
   <div class="sbars" aria-hidden="true"><i class="cur"></i><i></i><i></i></div>
   <h2 style="font-size:34px;font-weight:800;margin:14px 0 4px">Tell us about <span style="color:var(--accent)">your</span> closing</h2>
   <p class="muted" style="margin-bottom:16px">No account or sign-in. Everything stays on this phone until you submit to your rep.</p>
   <form id="obf" autocomplete="on" novalidate>
    <label class="field"><span>Business name <i>*</i></span><input type="text" name="business" required value="${esc(p.business)}" placeholder="e.g., Sunrise Bakery & Café" autocomplete="organization"></label>
    <label class="field"><span>Your name <i>*</i></span><input type="text" name="contact" required value="${esc(p.contact)}" placeholder="First and last name" autocomplete="name"></label>
    <div class="row"><label class="field"><span>Email</span><input type="email" name="email" value="${esc(p.email)}" placeholder="you@business.com" autocomplete="email" inputmode="email"></label>
    <label class="field"><span>Mobile</span><input type="tel" name="phone" value="${esc(p.phone)}" placeholder="Your number" autocomplete="tel" inputmode="tel"></label></div>
    <div class="lbl">Location(s) of equipment <i style="color:var(--accent-ink);font-style:normal">*</i></div>
    <div id="locs">${locs.map((l,i)=>`<div class="row" style="margin-bottom:8px"><input type="text" name="loc" value="${esc(l)}" placeholder="Street, city, state" aria-label="Location ${i+1}" autocomplete="street-address">${locs.length>1?`<button type="button" class="iconbtn" style="flex:none;width:50px" data-act="rmloc" data-i="${i}" aria-label="Remove location ${i+1}">${I.x}</button>`:''}</div>`).join('')}</div>
    <button type="button" class="btn ghost sm" data-act="addloc" style="margin-bottom:16px">${I.plus} Add another location</button>
    <div class="row"><label class="field"><span>Consignor ID</span><input type="text" name="consignorId" value="${esc(p.consignorId)}" placeholder="From your rep" autocomplete="off"></label>
    <label class="field"><span>About how many items?</span><input type="number" name="estItems" min="1" max="999" inputmode="numeric" value="${S().lots.end?S().lots.end-S().lots.start+1:''}" placeholder="e.g., 25"></label></div>
    <div class="hint" style="margin:-8px 0 14px">Consignor ID goes in Column B of your spreadsheet. Your item count reserves a block of lot numbers (e.g., 1001–1025) for your stickers.</div>
    <label class="field"><span>Closing date</span><input type="date" name="closing" value="${esc(p.closing)}"><div class="hint">When do you need the space cleared? Your rep uses this to schedule your auction.</div></label>
    <div class="tintcard" style="margin:6px 0 16px"><b style="font-family:var(--head);font-size:17px">Your rate</b><br>Your rep will confirm your rate.</div>
    <button class="btn accent block" type="submit">Start my inventory ${I.chev}</button>
   </form></div>`,
   mount(el){ el.querySelector('#obf').addEventListener('submit',e=>{ e.preventDefault(); const f=e.target, v=n=>f.elements[n].value.trim();
      const locs=[...f.querySelectorAll('[name=loc]')].map(x=>x.value.trim()).filter(Boolean);
      if(!v('business')||!v('contact')){ LL.toast('Add your business and your name to continue'); (v('business')?f.elements.contact:f.elements.business).focus(); return; }
      if(!locs.length){ LL.toast('Add at least one location'); f.querySelector('[name=loc]').focus(); return; }
      Object.assign(S().profile,{business:v('business'),contact:v('contact'),email:v('email'),phone:v('phone'),closing:v('closing'),consignorId:v('consignorId'),locations:locs,done:true});
      const est=+v('estItems'), L=S().lots, fresh=est>0 && (!L.end || est!==L.end-L.start+1); if(fresh) PR.reserve(est, L.end?L.start:undefined); LL.save(); LL.go(fresh?'#/sell/stickers':'#/sell'); }); } }; };
function syncProfileLocs(){ const f=LL.$('#obf'); if(!f) return; S().profile.locations=[...f.querySelectorAll('[name=loc]')].map(x=>x.value); ['business','contact','email','phone','closing','consignorId'].forEach(n=>S().profile[n]=f.elements[n].value); }
LL.acts.addloc = () => { syncProfileLocs(); S().profile.locations.push(''); LL.render(true); setTimeout(()=>{ const a=[...LL.$$('[name=loc]')]; a[a.length-1]?.focus(); },50); };
LL.acts.rmloc = b => { syncProfileLocs(); S().profile.locations.splice(+b.dataset.i,1); LL.render(true); };

/* ---------- dashboard ---------- */
function post(it,i){ const sh=LL.shotsOf(it); const done=sh.filter(s=>has(it,s.k)).length, ready=done===sh.length;
  const first = sh.map(s=>thumb(it,s.k)).find(Boolean);
  return `<article class="post" aria-label="${esc(itemName(it,i))}">
   <div class="ph"><div class="av"><span>${first?`<img src="${first}" alt="">`:LL.icons.camera.replace('<svg','<svg width="18" height="18"')}</span></div><div style="flex:1;min-width:0"><b><span class="lotchip">#${esc(it.lot)}</span> ${esc(itemName(it,i))}</b><small>${it.type==='lot'?'Group lot · ':''}${esc(LL.catLabel(it.cat))}${it.condition?' · '+esc(it.condition):''}${it.qty>1?' · Qty '+it.qty:''}</small></div>
    <span class="badge ${ready?'ok':'warn'}">${ready?'Photo-ready':done+'/'+sh.length+' photos'}</span></div>
   ${pchk(it,true)}
   <div class="strip" role="group" aria-label="Photos">${sh.map(s=>{ const t=thumb(it,s.k); return t?`<div class="shot"><img loading="lazy" src="${t}" alt="${esc(s.n)}"><em>${esc(s.n)}</em></div>`:`<a class="shot miss" href="#/sell/cam/${it.id}/${s.k}" style="text-decoration:none"><div>${I.camera.replace('<svg','<svg width="38" height="38"')}<br><b>${esc(s.n)}</b><br><span class="small">Tap to add</span></div></a>`; }).join('')}</div>
   <div class="acts"><a class="iconbtn" href="${nextHref(it)}" aria-label="Take photos">${I.camera}</a><a class="iconbtn" href="#/sell/item/${it.id}/ai" aria-label="AI Describe">${I.sparkle}</a><a class="iconbtn" href="#/sell/item/${it.id}/details" aria-label="Edit details">${I.mic}</a>
    ${it.aiConfirmed?`<span class="badge ok" style="margin-left:auto">${I.check.replace('<svg','<svg width="12" height="12"')} Listing ready</span>`:`<span class="badge warn" style="margin-left:auto">Needs details</span>`}</div>
   <div class="cap"><b>${esc(PR.desc(it))}</b> · <span class="muted">${esc(it.guarantee||'')}</span><br>${it.desc?esc(it.desc.slice(0,96))+'…':'<span class="muted">Add details to finish this listing.</span>'}</div></article>`; }
/* protocol checklist chips (5 parameters) */
function pchk(it,mini){ return `<div class="pchk ${mini?'mini':''}" aria-label="Protocol checklist">${PR.checklist(it).filter(c=>!mini||!c.na).map((c,i)=>`<span class="${c.na?'na':c.ok?'ok':'no'}" title="${esc(c.detail)}">${c.na?'–':c.ok?I.check:(i+1)} ${c.n}</span>`).join('')}</div>`; }
const nextHref = it => { const n=PR.next(it,null); return n?`#/sell/cam/${it.id}/${n.k}`:`#/sell/item/${it.id}/photos`; };
LL.views.sell = () => { const p=S().profile; if(!p.done) return LL.views.onboard();
  const st=stats(), d=daysTo(p.closing);
  const stories = `<div class="stories" role="list"><a class="story" role="listitem" href="#/sell/item/new/photos" aria-label="Add item"><div class="ringw add"><div class="in" style="color:var(--accent)">${I.plus.replace('<svg','<svg width="30" height="30"')}</div></div><span class="nm">Add item</span></a><a class="story" role="listitem" href="#/sell/item/newlot/photos"><div class="ringw add"><div class="in" style="color:var(--link)">${I.grid.replace('<svg','<svg width="28" height="28"')}</div></div><span class="nm">Add lot</span></a>
   ${S().items.map((it,i)=>{ const sh=LL.shotsOf(it), rdy=sh.every(s=>has(it,s.k)), t=sh.map(s=>thumb(it,s.k)).find(Boolean); return `<a class="story" role="listitem" href="#/sell/item/${it.id}/photos"><div class="ringw ${rdy?'':'todo'}"><div class="in">${t?`<img src="${t}" alt="">`:I.camera.replace('<svg','<svg width="26" height="26"')}</div></div><span class="nm">#${esc(it.lot)} ${esc((it.make||it.title||(it.type==='lot'?'Group':'Item')).slice(0,7))}</span></a>`; }).join('')}</div>`;
  const hero = `<section class="hero" aria-label="Progress">${LL.ring(st.pct,92,10)}<div><h2>Inventory ${st.n} item${st.n===1?'':'s'},<br>${st.pct}% photo-ready</h2><p>${st.n?`${st.ready} of ${st.n} lots hit every protocol step${d!=null?` · closing ${d>0?'in '+d+' day'+(d===1?'':'s'):d===0?'today':'date passed'}`:''}`:'Photograph each item in under a minute.'}</p></div></section>`;
  const llbar = `<div class="llbar">${PR.stickerStatusHTML()}<a class="protolink" href="#/sell/protocol">${I.info} Protocol</a></div>`;
  const body = st.n ? `${llbar}<div style="padding:4px 16px 0;display:flex;gap:10px"><a class="btn accent block sm" href="#/sell/item/new/photos">${I.camera} Add item</a><a class="btn ghost block sm" href="#/sell/item/newlot/photos">${I.grid} Add group lot</a></div>${S().items.map(post).join('')}<div style="height:84px"></div>
     <div class="stickyfoot"><a class="btn accent" style="flex:0 0 auto" href="#/sell/export">${I.download} Export</a><a class="btn block" href="#/sell/submit">Submit to my rep ${I.chev}</a></div>`
   : `<div class="empty">${I.camera}<h3>Let’s shoot your first item</h3><p>You take the photos, your rep does the rest. We follow Local Liquidators’ inventory protocol: lot sticker, 4–7 photos per item (4 required angles + brand logo + data plate, 7 max), working video — and we coach you on lighting and framing.</p>
      <div style="display:grid;gap:10px;margin-top:18px"><a class="btn accent block" href="#/sell/item/new/photos">${I.camera} Add first item</a><button class="btn ghost block" data-act="sample">${I.sparkle} Load example inventory (12 items)</button></div></div>${llbar}`;
  return {html:`${hero}${stories}${body}`}; };
LL.acts.sample = () => { LL.loadSample(); LL.render(true); LL.toast('Example inventory loaded — 12 items'); };
LL.loadSample = function(){
  S().items=[]; S().lots.next=S().lots.start||1001;
  const D=LL.DEMO, mk=(cat,over={},miss=[],type='item')=>{ const d=D[cat]; const it=Object.assign({id:LL.uid(),pv:4,lot:PR.nextLot(),guarantee:'On Site Guarantee',stickerMode:'digital',itemKind:cat==='refrig'||cat==='prep'?'cooler':(cat==='oven'||cat==='mixer'||cat==='pos'?'machine':'other'),skip:{},created:Date.now(),type,cat,make:d.make,model:d.model,size:d.size,power:d.power,condition:d.cond,conditionReason:d.reason,qty:1,notes:'',serial:'',title:d.title,desc:d.desc,included:d.included,confidence:d.conf,aiConfirmed:true,ai:{source:'demo',confidence:d.conf,confidenceNote:d.conf==='high'?'Model/data plate looked readable.':'Some details could not be confirmed from the photos.',needsReview:d.review},photos:{},sample:true,seed:Math.floor(Math.random()*4),repOnly:{low:d.value[0],high:d.value[1],share:true}},over);
    if(type==='lot'){ it.parts=[{id:LL.uid().slice(0,5),name:over.partName||'Sample piece',make:'',model:''}]; it.skip[it.parts[0].id+'-brand']=true; it.skip[it.parts[0].id+'-plate']=true; it.countNote=over.countNote||''; }
    if(!it.make || it.make==='Unbranded'){ it.skip.brand=true; } if(it.power==='n/a'){ it.skip.plate=true; }
    PR.slots(it).forEach(s=>{ if(s.req && !miss.includes(s.k) && !PR.skipped(it,s)) it.photos[s.k]= s.k==='sticker'?'digital':(s.k==='video'?false:true); });
    if(PR.videoReq(it) && !miss.includes('video') && !it.photos.video){ it.skip.video=true; it.guarantee=it.guarantee||'AS IS'; } // sample: treat as “doesn’t power on” so checklist is complete without a real clip
    if(miss.length){ it.aiConfirmed=false; it.ai=null; } return it; };
  S().items = [ mk('oven'), mk('mixer'), mk('mixer',{make:'Hobart',model:'HL600',title:'Hobart HL600 60-Quart Planetary Mixer',size:'60-qt bowl'},['ctx4']), mk('refrig'), mk('refrig',{title:'True T-23 Single-Door Reach-In Refrigerator',model:'T-23',guarantee:'AS IS'},['plate','ctx4']),
    mk('prep'), mk('racks',{qty:4}), mk('furniture',{qty:6}), mk('pos',{},['plate']), mk('other',{title:'Bunn Commercial Coffee Brewer',make:'Bunn',model:'CWTF15',typeName:'Commercial Coffee Brewer'},['ctx4']),
    mk('smallwares',{type:'lot',qty:24,model:'',make:'',title:'Lot of 24 Aluminum Full-Size Sheet Pans',partName:'Full-size sheet pan',countNote:'24 sheet pans'},[],'lot'), mk('smallwares',{type:'lot',qty:1,model:'',make:'',title:'Smallwares Lot: Pots, Pans & Utensils',cat:'smallwares',partName:'Stock pot',countNote:'Pots, pans and utensils (one lot)'},[],'lot') ];
  if(!S().profile.done) Object.assign(S().profile,{business:'Sunrise Bakery & Café',contact:'Alex Rivera',email:'',phone:'',locations:['Phoenix, AZ'],closing:new Date(Date.now()+21*864e5).toISOString().slice(0,10),done:true});
  LL.save(); };

/* ---------- item editor ---------- */
function newItem(type){ const it={id:LL.uid(),pv:4,lot:PR.nextLot(),guarantee:'On Site Guarantee',stickerMode:'digital',itemKind:type==='lot'?'other':'machine',skip:{},parts:type==='lot'?[{id:LL.uid().slice(0,5),name:''}]:[],type,cat:type==='lot'?'smallwares':'other',make:'',model:'',size:'',power:'',condition:'Good',conditionReason:'',qty:1,notes:'',serial:'',title:'',desc:'',included:'',photos:{sticker:'digital'},aiConfirmed:false,repOnly:{share:true},created:Date.now()}; S().items.push(it); LL.save(); return it; }
const STEPS = ['photos','ai','details'], STEPN = ['Protocol photos','AI Describe','Data row'];
function stepbar(it,step){ const si=STEPS.indexOf(step);
  return `<div class="stepbar"><div class="sbars" role="tablist" aria-label="Steps">${STEPS.map((s,i)=>`<button role="tab" aria-selected="${i===si}" aria-label="${STEPN[i]}" data-nav="#/sell/item/${it.id}/${s}"><i class="${i<si?'done':i===si?'cur':''}"></i></button>`).join('')}</div></div><div class="stepnames">${STEPN.map((n,i)=>`<span class="${i===si?'on':''}">${n}</span>`).join('')}</div>`; }
LL.views.item = ({id,step='photos'}) => {
  if(id==='new'||id==='newlot'){ const it=newItem(id==='new'?'item':'lot'); LL.go(`#/sell/item/${it.id}/photos`, true); return {html:''}; }
  const it=getItem(id); if(!it){ LL.go('#/sell',true); return {html:''}; }
  const idx=S().items.indexOf(it), sh=LL.shotsOf(it), done=sh.filter(s=>has(it,s.k)).length, all=done===sh.length;
  const head = `<div class="pad" style="padding-bottom:6px"><div style="display:flex;align-items:center;gap:10px"><a class="iconbtn" href="#/sell" aria-label="Back to inventory">${I.back}</a><span class="lotchip big">#${esc(it.lot)}</span><b style="font-family:var(--head);font-size:22px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(itemName(it,idx))}</b>${it.type==='lot'?'<span class="badge">Group</span>':''}</div></div>${stepbar(it,step)}`;
  let body='', mount=null;
  if(step==='photos'){ body = protoPage(it); mount = el => bindFields(el,it);
  } else if(step==='ai'){ const r=LL.aiView(it); body=r.html; mount=r.mount; }
  else { body = detailsHTML(it); mount=el=>{ bindFields(el,it); bindDataRow(el,it); }; }
  return {html:head+body, mount};
};
function bindFields(el,it){
  el.addEventListener('input',e=>{ const t=e.target;
    if(t.dataset.pf){ S().profile[t.dataset.pf]=t.value.trim(); LL.save(); return; }
    if(t.dataset.part){ const p=PR.partOf(it,t.dataset.part); if(p){ p[t.dataset.pk]=t.value; LL.save(); } return; }
    const f=t.dataset.f; if(!f) return; if(f==='tempF'){ it.tempF=t.value===''?null:+t.value; LL.save(); const h=t.parentElement.querySelector('.hint'); if(h){ const w=it.tempF!=null&&it.tempF>=41; h.className='hint'+(w?' warnt':''); h.textContent=w?`⚠️ ${it.tempF}°F is at or above 41°F — coolers should read under 41°F.`:'Coolers should show under 41°F.'; } return; }
    it[f]= t.type==='number'? Math.max(1,+t.value||1) : t.value; if(f==='title'||f==='desc') it.aiConfirmed=it.aiConfirmed; LL.save(); });
  el.addEventListener('change',e=>{ const t=e.target; if(t.dataset.f==='lot'||t.dataset.pf==='consignorId'||t.dataset.rr) LL.render(true); });
}
/* ---------- protocol photo page (Visual Protocol funnel) ---------- */
const tile = (it,s,label,opt) => { const t=thumb(it,s.k), sk=PR.skipped(it,s);
  return `<a class="ptile ${t?'done':''} ${sk?'skip':''}" href="#/sell/cam/${it.id}/${s.k}" aria-label="${esc(label||s.n)}${t?' (done)':sk?' (skipped)':''}"><div class="th">${t?`<img src="${t}" alt="">`:sk?'<b>—</b>':I.camera}</div><span>${esc(label||s.n)}${opt?'<em>optional</em>':''}</span>${t?`<i class="tick">${I.check}</i>`:''}</a>`; };
function plateCard(it,t,pid){ const pr=t.plateRead, pa=pid?` data-part="${pid}"`:'', f=(k,l,ph)=>`<label class="field"><span>${l}</span><input type="text" ${pid?`data-part="${pid}" data-pk="${k}"`:`data-f="${k}"`} value="${esc(t[k])}" placeholder="${ph}" autocomplete="off"></label>`;
  return `${pr&&pr.status==='reading'?`<div class="pread" role="status"><span class="spin"></span> Reading the plate…</div>`:''}
   ${pr&&pr.status==='done'?`<div class="ai-banner ${pr.source==='demo'?'':'live'}" role="note" style="margin-bottom:10px">${I.info.replace('<svg','<svg width="20" height="20" style="flex:none"')}<div>${pr.source==='demo'?'<b>Placeholder</b>: Speedy AI couldn’t be reached, so this was <u>not</u> read from your photo.':'<b>AI draft</b> from your plate photo.'} ${pr.filled.length?'Filled: '+pr.filled.join(', ')+'.':'Nothing new to fill.'} Check every field.</div></div>`:''}
   <div class="row">${f('make','Brand','e.g., Hobart')}${f('model','Model','e.g., HL600')}</div><div class="row">${f('serial','Serial','Optional')}${f('power','Volts / specs','e.g., 208V 3-ph')}</div>`; }
function protoPage(it){ const grp=it.type==='lot', all=PR.slots(it), by=k=>all.find(s=>s.k===k), ck=PR.checklist(it), need=ck.filter(c=>!c.na), ok=need.filter(c=>c.ok).length, nx=PR.next(it,null), cid=S().profile.consignorId;
  const dup = S().items.some(x=>x!==it && String(x.lot)===String(it.lot));
  const skipBtn = (k,lbl) => `<button type="button" class="btn line sm" data-act="pskip" data-id="${it.id}" data-k="${k}">${lbl}</button>`;
  const unskip = k => `<button type="button" class="linkbtn" data-act="punskip" data-id="${it.id}" data-k="${k}">Undo</button>`;
  const sec = (n,title,sub,inner,done) => `<section class="psec ${done?'done':''}"><h3><i>${done?I.check:n}</i>${title}<small>${sub}</small></h3>${inner}</section>`;
  const videoSec = (ck) => { const sk=!!it.skip?.video, hasV=!!has(it,'video'), kind=PR.kindOf(it), req=PR.videoReq(it);
    const poster = hasV ? (LL.photos.get(it.id,'videoPoster')||'') : '';
    const warn = it.tempF!=null && +it.tempF>=41;
    const body = sk
      ? `<p class="small"><b>Item doesn’t power on</b> — Guarantee set to <b>AS IS</b>. ${unskip('video')}</p>`
      : hasV
      ? `<div class="prow"><a class="ptile done" href="#/sell/cam/${it.id}/video"><div class="th">${poster?`<img src="${poster}" alt="Video thumbnail">`:'▶'}</div><span>Working video</span><i class="tick">${I.check}</i></a>
          <div>${kind==='cooler'?`<label class="field"><span>Temp shown (°F)</span><input type="number" inputmode="decimal" step="0.1" data-f="tempF" value="${it.tempF??''}" placeholder="e.g., 38"><div class="hint ${warn?'warnt':''}">${warn?`⚠️ ${esc(it.tempF)}°F is at or above 41°F — coolers should read under 41°F.`:'Coolers should show under 41°F.'}</div></label>`:`<p class="small muted">Up to 15 seconds · ${it.videoDur?esc(it.videoDur.toFixed(1))+'s':'clip saved'}</p>`}
          <button type="button" class="btn ghost sm" data-act="rmvideo" data-id="${it.id}">Retake / remove</button></div></div>`
      : `<div class="prow"><a class="ptile" href="#/sell/cam/${it.id}/video"><div class="th">▶</div><span>${req?'Record video':'Optional video'}</span></a>
          <div><p class="small muted">${esc(PR.videoPrompt(it))}</p>
          ${req?`<button type="button" class="btn line sm" data-act="nopower" data-id="${it.id}">Item doesn’t power on</button>`:'<p class="hint">Video is optional for Other.</p>'}</div></div>`;
    return sec(6,'Video', req?'Required · ≤15 seconds':'Optional · ≤15 seconds', body, ck?ck.ok:!req); };
  // 1 bookmark
  let h = `<label class="listrow grouprow"><div><b>Group / bulk lot</b><span class="small muted">Several pieces sold together: shoot the main pieces one by one, then a wide group shot.</span></div><span class="switch"><input type="checkbox" data-act="grouplot" data-id="${it.id}" ${grp?'checked':''} aria-label="Group / bulk lot"><i></i></span></label>
   <div class="card pad pcard"><div class="pc-h"><b>${ok===need.length?'All '+need.length+' parameters hit':ok+' of '+need.length+' parameters done'}</b><a class="small tlink" href="#/sell/protocol">What’s this?</a></div>${pchk(it)}</div>`;
  if(!grp) h += `<div class="card pad prulecard" aria-live="polite"><div class="lbl">Photos for this item · 4–7</div>${PR.ruleHTML(PR.photoRule(it))}<p class="small muted" style="margin-top:6px">4 required angles + the data plate + the brand logo. 1 optional extra. ${PR.PHOTO_MAX} max.</p></div>`;
  h += sec(1,'Bookmark','Lot sticker — photo #1', `<div class="stkrow"><a class="stkthumb" href="${it.stickerMode==='physical'?`#/sell/cam/${it.id}/sticker`:'#'}" ${it.stickerMode==='physical'?'':'data-act="noop"'}>${thumb(it,'sticker')?`<img src="${thumb(it,'sticker')}" alt="Lot sticker ${esc(it.lot)}">`:`<div class="th">${I.camera}<span>Photograph your sticker</span></div>`}</a>
     <div class="stkf"><label class="field"><span>Lot #</span><input type="number" min="1" inputmode="numeric" data-f="lot" value="${esc(it.lot)}" aria-label="Lot number"></label>${dup?'<p class="warnt small">Another lot already uses this number.</p>':''}
     ${cid?`<p class="small muted">Consignor <b>${esc(cid)}</b></p>`:`<label class="field"><span>Consignor ID</span><input type="text" data-pf="consignorId" placeholder="Set once" autocomplete="off"></label>`}</div></div>
     <p class="small muted" style="margin:8px 0">${it.stickerMode==='physical'?'Using your photo of a real lot sticker.':'Digital lot sticker added automatically as photo #1. Every exported photo also gets a small “LOT '+esc(it.lot)+'” badge.'}</p>
     <div class="row">${it.stickerMode==='physical'?`<button type="button" class="btn ghost sm" data-act="digisticker" data-id="${it.id}">Use digital sticker</button>`:`<button type="button" class="btn ghost sm" data-act="physsticker" data-id="${it.id}">${I.camera} Photograph a real sticker</button>`}<a class="btn line sm" href="#/sell/stickers">Paper stickers</a></div>`, ck[0].ok);
  // item kind selector (Machine / Cooler / Other) — drives video prompt + requirement
  h += `<div class="card pad" style="margin-bottom:12px"><div class="lbl">What is this item?</div><div class="seg kindseg">${PR.KINDS.map(k=>`<button type="button" aria-pressed="${PR.kindOf(it)===k.id}" data-act="setkind" data-id="${it.id}" data-v="${k.id}">${k.n}</button>`).join('')}</div><p class="hint" style="margin-top:8px">${esc(PR.KINDS.find(k=>k.id===PR.kindOf(it)).h)}</p></div>`;
  if(!grp){ const c=PR.ctxCount(it), extra=Math.max(0,c-PR.MIN);
    const ctxSub = c<PR.MIN?`${c} of ${PR.MIN} required`:`${PR.MIN} required${extra?` + ${extra} of ${PR.EXTRA} extras`:''}`;
    h += sec(2,'Context',ctxSub, `<div class="pbar" aria-label="${ctxSub}">${PR.ANGLES.map((a,i)=>`<i class="${has(it,a.k)?'done':''} ${i>=PR.MIN?'opt':''}"></i>`).join('')}</div><p class="small muted" style="margin:6px 0 10px">${c<PR.MIN?`${PR.MIN-c} more required · clean background, good lighting`:c<PR.MAX?`Required met · 1 optional extra`:`All ${PR.MAX} angles taken`}</p>
      <div class="ptiles ten">${PR.ANGLES.map((a,i)=>tile(it,by(a.k),(i+1)+'. '+a.n.replace(' (optional)',''),i>=PR.MIN)).join('')}</div>`, ck[1].ok);
    const bs=by('brand'), bsk=PR.skipped(it,bs);
    h += sec(3,'Brand','Logo close-up', `<div class="prow">${tile(it,bs,'Brand logo')}<div>${bsk?`<p class="small"><b>No brand logo</b> ${unskip('brand')}</p><label class="field"><span>Brand (if you know it)</span><input type="text" data-f="make" value="${esc(it.make)}" placeholder="Leave blank if unknown" autocomplete="off"></label>`:has(it,'brand')?'<p class="small muted">Logo photographed.</p>':`<p class="small muted">Zoom in on the brand name or emblem.</p>${skipBtn('brand','No brand logo')}`}</div></div>`, ck[2].ok);
    const ps=by('plate'), psk=PR.skipped(it,ps);
    h += sec(4,'Specs','Manufacturer plate', `<div class="prow">${tile(it,ps,'Scan the plate')}<div>${psk?`<p class="small"><b>No manufacturer plate</b> ${unskip('plate')}</p><p class="small muted">Type the model / specs below or leave them blank.</p>`:has(it,'plate')?'<p class="small muted">Plate photographed.</p>':`<p class="small muted">Model, serial and electrical specs — tight and in focus.</p>${skipBtn('plate','I don’t have a plate')}`}</div></div>${plateCard(it,it)}`, ck[3].ok);
    h += videoSec(ck.find(c=>c.k==='video'));
  } else { const parts=it.parts||[];
    h += sec(2,'Main items','High-value pieces, one at a time', parts.map((p,j)=>{ const nm=PR.partName(it,p,j), b=by(p.id+'-brand'), pl=by(p.id+'-plate');
      return `<div class="part"><div class="part-h"><b>Item ${j+1}</b><input type="text" data-part="${p.id}" data-pk="name" data-rr="1" value="${esc(p.name)}" placeholder="Name, e.g., Hobart mixer" aria-label="Main item ${j+1} name">${parts.length>1?`<button type="button" class="iconbtn" data-act="rmpart" data-id="${it.id}" data-p="${p.id}" aria-label="Remove main item ${j+1}">${I.x}</button>`:''}</div>
       <div class="prulerow">${PR.ruleHTML(PR.photoRule(it,p.id))}</div>
       <div class="ptiles">${PR.PART_ANGLES.map((a,i)=>tile(it,by(p.id+'-'+a.s),a.n.replace(' (optional)',''),i>=PR.MIN)).join('')}${tile(it,b,PR.skipped(it,b)?'No logo':'Brand logo')}${tile(it,pl,PR.skipped(it,pl)?'No plate':'Data plate')}</div>
       <div class="row" style="margin:8px 0">${PR.skipped(it,b)?`<span class="small muted">No logo ${unskip(p.id+'-brand')}</span>`:has(it,b.k)?'':skipBtn(p.id+'-brand','No brand logo')}${PR.skipped(it,pl)?`<span class="small muted">No plate ${unskip(p.id+'-plate')}</span>`:has(it,pl.k)?'':skipBtn(p.id+'-plate','No plate')}</div>
       ${plateCard(it,p,p.id)}</div>`; }).join('')+`<button type="button" class="btn ghost sm block" data-act="addpart" data-id="${it.id}">${I.plus} Add main item</button>`, ck[1].ok&&ck[2].ok&&ck[3].ok);
    h += sec(5,'Scale','Wide overall group shot', `<div class="prow">${tile(it,by('group'),'Wide group shot')}<p class="small muted">Step back and get the whole lot in one frame — after the main pieces.</p></div>
      <div class="row" style="margin-top:10px"><label class="field" style="flex:0 0 120px"><span>Total pieces</span><input type="number" min="1" inputmode="numeric" data-f="qty" value="${it.qty||1}"></label><label class="field"><span>Count note</span><input type="text" data-f="countNote" value="${esc(it.countNote)}" placeholder="e.g., 24 sheet pans, 3 racks" autocomplete="off"></label></div>`, ck.find(c=>c.k==='scale').ok);
    h += videoSec(ck.find(c=>c.k==='video'));
  }
  h += `<div class="card pad" style="margin-top:12px"><b style="font-family:var(--head);font-size:19px">Photo coaching</b><ul class="tips">${['Lot sticker first, every time','Clean background — clear clutter around the item','Good light on the front — turn lights on or move near a window','Logo and plate: get close, fill the frame, hold steady'].map((t,i)=>`<li><i>${i+1}</i><span>${t}</span></li>`).join('')}</ul></div>`;
  return `<div class="pad">${h}</div><div style="height:90px"></div><div class="stickyfoot"><a class="btn ${nx?'ghost':'accent'} block" href="${nx?`#/sell/cam/${it.id}/${nx.k}`:`#/sell/item/${it.id}/ai`}">${nx?I.camera+' Next: '+esc(nx.n):I.sparkle+' Next: AI Describe'}</a></div>`; }
LL.acts.noop = () => {};
LL.acts.setkind = b => { const it=getItem(b.dataset.id); it.itemKind=b.dataset.v;
  if(it.itemKind==='cooler' && (it.cat==='other'||it.cat==='oven'||it.cat==='mixer')) it.cat='refrig';
  if(it.itemKind==='machine' && (it.cat==='refrig'||it.cat==='prep')) it.cat='other';
  if(it.skip?.video && PR.videoReq(it)===false){ /* keep */ }
  if(!PR.videoReq(it) && it.skip?.video) delete it.skip.video;
  LL.save(); LL.render(true); };
LL.acts.nopower = async b => { const it=getItem(b.dataset.id); it.skip=it.skip||{}; it.skip.video=true; it.guarantee='AS IS';
  await LL.photos.del(it.id,'video'); await LL.photos.del(it.id,'videoPoster'); delete it.photos.video; delete it.videoDur; delete it.videoMime;
  LL.save(); LL.toast('Doesn’t power on → Guarantee set to AS IS');
  if(location.hash.includes('/cam/') && location.hash.includes('/video')){ const n=PR.next(it,'video',true); LL.go(n?`#/sell/cam/${it.id}/${n.k}`:`#/sell/item/${it.id}/photos`,true); } else LL.render(true); };
LL.acts.rmvideo = async b => { const it=getItem(b.dataset.id); await LL.photos.del(it.id,'video'); await LL.photos.del(it.id,'videoPoster'); delete it.photos.video; delete it.videoDur; delete it.videoMime; LL.save(); LL.render(true); };
LL.acts.grouplot = b => { const it=getItem(b.dataset.id); it.type=b.checked?'lot':'item'; if(it.type==='lot' && !(it.parts||[]).length) it.parts=[{id:LL.uid().slice(0,5),name:''}]; if(it.type==='lot'&&it.cat==='other') it.cat='smallwares'; it.ai=null; it.aiConfirmed=false; LL.save(); LL.render(true); LL.toast(b.checked?'Group / bulk lot: 4–7 photos per main item, then a wide group shot':'Single item: 4–7 photos (4 angles + logo + plate), then video'); };
LL.acts.addpart = b => { const it=getItem(b.dataset.id); it.parts=(it.parts||[]).concat({id:LL.uid().slice(0,5),name:''}); LL.save(); LL.render(true); };
LL.acts.rmpart = async b => { const it=getItem(b.dataset.id); if(!confirm('Remove this main item and its photos?')) return; const pid=b.dataset.p; for(const s of PR.slots(it).filter(s=>s.part===pid)){ await LL.photos.del(it.id,s.k); delete it.photos[s.k]; } it.parts=it.parts.filter(p=>p.id!==pid); LL.save(); LL.render(true); };
LL.acts.pskip = b => { const it=getItem(b.dataset.id); it.skip=it.skip||{}; it.skip[b.dataset.k]=true; LL.save(); LL.render(true); };
LL.acts.punskip = b => { const it=getItem(b.dataset.id); delete it.skip[b.dataset.k]; LL.save(); LL.render(true); };
LL.acts.physsticker = b => { const it=getItem(b.dataset.id); it.stickerMode='physical'; if(!LL.photos.get(it.id,'sticker')) delete it.photos.sticker; LL.save(); LL.go(`#/sell/cam/${it.id}/sticker`); };
LL.acts.digisticker = b => { const it=getItem(b.dataset.id); it.stickerMode='digital'; it.photos.sticker='digital'; LL.save(); if(location.hash.includes('/cam/')){ const n=PR.next(it,'sticker'); LL.go(n?`#/sell/cam/${it.id}/${n.k}`:`#/sell/item/${it.id}/photos`,true); } else LL.render(true); };
LL.acts.setcat = b => { const it=getItem(b.dataset.id); it.cat=b.dataset.v; LL.save(); LL.$$('[data-act=setcat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); const s=LL.$('select[data-f=cat]'); if(s) s.value=it.cat; };
LL.acts.setcond = b => { const it=getItem(b.dataset.id); it.condition=b.dataset.v; LL.save(); LL.$$('[data-act=setcond]').forEach(x=>x.setAttribute('aria-pressed',x===b)); };
function dataRowHTML(it){ const cid=S().profile.consignorId, auto=!(it.descC&&it.descC.trim());
  return `<div class="card pad drow"><div class="lbl" style="display:flex;justify-content:space-between;gap:8px"><span>Local Liquidators data row</span><a class="small tlink" href="#/sell/protocol" style="text-transform:none;letter-spacing:0">Protocol</a></div>
   <div class="row"><label class="field" style="flex:0 0 112px"><span>A · Lot #</span><input type="number" min="1" inputmode="numeric" data-f="lot" value="${esc(it.lot)}"></label>
    ${cid?`<div class="field"><span>B · Consignor ID</span><div class="roval">${esc(cid)} <a class="small tlink" href="#/profile">Edit</a></div></div>`:`<label class="field"><span>B · Consignor ID</span><input type="text" data-pf="consignorId" placeholder="Set once" autocomplete="off"></label>`}</div>
   ${it.type==='lot'?'':`<div class="row"><label class="field"><span>Brand</span><input type="text" data-f="make" data-dc="1" value="${esc(it.make)}" placeholder="${it.skip?.brand?'Unknown':'e.g., Hobart'}" autocomplete="off"></label><label class="field"><span>Type</span><input type="text" data-f="typeName" data-dc="1" value="${esc(it.typeName||'')}" placeholder="${esc(PR.typeOf(Object.assign({},it,{typeName:''})))}" autocomplete="off"></label></div>
   <label class="field"><span>Model / dimensions</span><input type="text" data-f="model" data-dc="1" value="${esc(it.model)}" placeholder="e.g., HL600 (or 60&quot; W)" autocomplete="off"></label>`}
   <label class="field"><span>C · Description</span><textarea data-f="descC" rows="2" id="descC">${esc(PR.desc(it))}</textarea><div class="hint" id="descHint">${auto?'Auto-built: [Brand] + [Type] + [Model / Dimensions]. Edit if needed.':'Edited by you.'} <button type="button" class="linkbtn" data-act="descrebuild" data-id="${it.id}">Rebuild</button></div></label>
   <label class="field"><span>D · Guarantee type</span><select data-f="guarantee">${PR.GUAR.map(g=>`<option value="${g.v}" ${it.guarantee===g.v?'selected':''}>${g.v} — ${g.d}</option>`).join('')}</select></label>
   <div class="xtable four" aria-label="Row preview"><div class="xh"><span>A</span><span>B</span><span>C</span><span>D</span></div><div id="drprev">${drPrev(it)}</div></div></div>`; }
const drPrev = it => `<span>${esc(it.lot)}</span><span>${esc(S().profile.consignorId||'—')}</span><span>${esc(PR.desc(it))}</span><span>${esc(it.guarantee)}</span>`;
function bindDataRow(el,it){ const ta=el.querySelector('#descC'), pv=el.querySelector('#drprev');
  el.addEventListener('input',e=>{ const t=e.target; if(t===ta){ it.descC=ta.value; LL.save(); } else if(t.dataset.dc && !(it.descC&&it.descC.trim()) && ta){ ta.value=PR.descAuto(it); } if(pv) pv.innerHTML=drPrev(it); }); }
LL.acts.descrebuild = b => { const it=getItem(b.dataset.id); it.descC=''; LL.save(); LL.render(true); };
function finishWarn(it){ const short=photoShort(it);
  if(short){ LL.toast(short.msg); LL.go(`#/sell/cam/${it.id}/${short.k}`); return false; }
  const m=PR.missing(it); return !m.length || confirm(`Lot #${it.lot} is missing: ${m.map(c=>c.detail).join(' · ')}.\n\nFinish anyway? You can come back to it later.`); }
/* 4 required angles per item (and per group-lot main piece) before an item can be finished or analyzed */
function photoShort(it){ const pids = it.type==='lot' ? (it.parts||[]).map(p=>p.id) : [null];
  for(const pid of pids){ const r=PR.photoRule(it,pid); if(r.reqDone<r.min){ const s=PR.slots(it).find(x=>x.step==='context' && x.req && (pid?x.part===pid:!x.part) && !has(it,x.k));
    return {k:s.k, msg:`Add ${r.min-r.reqDone} more required photo${r.min-r.reqDone===1?'':'s'}${pid?' for '+s.pn:''} (${PR.ruleText(r)})`}; } }
  return null; }
LL.photoShort = photoShort;
LL.acts.finishitem = (b,e) => { const it=getItem(b.dataset.id); e && e.preventDefault && e.preventDefault(); if(finishWarn(it)) LL.go('#/sell'); };
function detailsHTML(it){ const idx=S().items.indexOf(it);
  return `<div class="pad">${dataRowHTML(it)}<div style="height:6px"></div>
   <div class="lbl">Quick-pick category</div><div class="chips wrap">${LL.cat.map(c=>`<button type="button" class="chip" aria-pressed="${it.cat===c.id}" data-act="setcat" data-id="${it.id}" data-v="${c.id}">${esc(c.label)}</button>`).join('')}</div>
   <div class="row" style="margin-top:6px"><label class="field"><span>${it.type==='lot'?'Pieces in lot':'Quantity'}</span><input type="number" min="1" inputmode="numeric" data-f="qty" value="${it.qty||1}"></label><label class="field"><span>Serial # (optional)</span><input type="text" data-f="serial" value="${esc(it.serial)}" autocomplete="off"></label></div>
   <div class="lbl">Condition</div><div class="segcond" style="margin-bottom:6px">${LL.CONDS.map(c=>`<button type="button" aria-pressed="${it.condition===c}" data-act="setcond" data-id="${it.id}" data-v="${c}">${c}</button>`).join('')}</div>
   <p class="hint" style="margin-bottom:14px">Like New = barely used · Good = works well, normal wear · Workhorse = heavy use, still earning its keep.</p>
   <label class="field"><span>Notes — talk or type</span><textarea data-f="notes" placeholder="Anything buyers should know? Works great, one burner out, comes with 3 racks…" rows="4">${esc(it.notes)}</textarea><div class="hint">${I.mic.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')} Tip: tap the microphone on your phone keyboard to dictate instead of typing.</div></label>
   ${it.title?`<div class="card pad"><div class="lbl">Listing preview</div><b style="font-family:var(--head);font-size:20px">${esc(it.title)}</b><p class="small muted" style="margin-top:6px">${esc(it.desc)}</p><a class="btn ghost sm" style="margin-top:10px" href="#/sell/item/${it.id}/ai">${I.sparkle} Edit with AI Describe</a></div>`:`<a class="btn accent block" href="#/sell/item/${it.id}/ai">${I.sparkle} Run AI Describe</a>`}
   <div style="height:12px"></div></div><div style="height:90px"></div>
   <div class="stickyfoot"><button class="btn danger" style="flex:0 0 56px;padding:0" data-act="delitem" data-id="${it.id}" aria-label="Delete item">${I.trash}</button><a class="btn block" href="#/sell" data-act="finishitem" data-id="${it.id}">${I.check} Done — back to inventory</a></div>`; }
LL.acts.delitem = async b => { if(!confirm('Delete this item and its photos?')) return; const it=getItem(b.dataset.id); for(const s of PR.slots(it)) await LL.photos.del(it.id,s.k); S().items=S().items.filter(x=>x!==it); LL.save(); LL.go('#/sell'); };

/* ---------- AI Describe step ---------- */
const running = new Set();
LL.aiView = function(it){
  const sh=LL.shotsOf(it), all=sh.every(s=>has(it,s.k));
  if(!all) return {html:`<div class="empty">${I.camera}<h3>Photos first</h3><p>AI Describe reads your photos, so finish the protocol shots first (sticker, angles, logo and plate — or mark “no logo / no plate”).</p><a class="btn accent block" style="margin-top:14px" href="#/sell/item/${it.id}/photos">${I.camera} Back to photos</a><p style="margin-top:14px"><a href="#/sell/item/${it.id}/details">Skip AI — I’ll type the details</a></p></div>`};
  if(running.has(it.id)){
    const ims = aiShots(it).slice(0,6).map(s=>`<div><img src="${thumb(it,s.k)}" alt=""></div>`).join('');
    return {html:`<div class="pad"><div class="scan" role="status" aria-live="polite"><div class="imgs">${ims}</div><p id="scanmsg">Reading the model plate…</p></div><p class="muted center small" style="margin-top:12px">Identifying make, model and size, then writing your listing.</p></div>`,
      mount(el){ const msgs=['Reading the model plate…','Identifying make & model…','Checking condition…','Writing your listing…']; let i=0; const t=setInterval(()=>{ const m=el.querySelector('#scanmsg'); if(!m) return clearInterval(t); m.textContent=msgs[++i%msgs.length]; },1100); LL.cleanup.push(()=>clearInterval(t)); }};
  }
  if(!it.ai){
    return {html:`<div class="pad center"><div class="check" style="margin-bottom:16px">${I.sparkle.replace('<svg','<svg width="46" height="46" style="stroke-dasharray:none;animation:none"')}</div><h2 style="font-size:30px;font-weight:800">AI Describe</h2><p class="muted" style="margin:8px 0 18px">We’ll read your protocol photos and draft the make, model, size, power, condition and a ready-to-post listing. You review and edit everything.</p><button class="btn accent block" data-act="runai" data-id="${it.id}">${I.sparkle} Describe my item</button><p style="margin-top:14px"><a href="#/sell/item/${it.id}/details">Skip — I’ll type the details</a></p></div>`,
      mount(){ if(!it._auto){ it._auto=true; LL.acts.runai({dataset:{id:it.id}}); } }};
  }
  const a=it.ai, demo=a.source==='demo';
  const rv=(a.needsReview||[]);
  const flag = k => rv.some(r=>r.toLowerCase().includes(k)) ? 'flag':'';
  return {html:`<div class="pad">
   <div class="ai-banner ${demo?'':'live'}" role="note">${I.info.replace('<svg','<svg width="22" height="22" style="flex:none"')}<div>${demo?'<b>Placeholder</b>: Speedy AI couldn’t be reached, so this example was <u>not</u> read from your photos. Re-run when you have signal, or edit every field.':'<b>AI-generated draft</b> from your photos. Please check every field before confirming.'}</div></div>
   <div style="display:flex;align-items:center;gap:10px;margin:14px 0 6px;flex-wrap:wrap"><span class="conf ${a.confidence}">${a.confidence} confidence</span><span class="small muted" style="flex:1">${esc(a.confidenceNote||'')}</span></div>
   ${rv.length?`<div class="chips wrap" aria-label="Fields to double-check" style="padding-top:0">${rv.map(r=>`<span class="badge warn">Check: ${esc(r)}</span>`).join('')}</div>`:''}
   <label class="field"><span>Listing title</span><input type="text" data-f="title" value="${esc(it.title)}" maxlength="120"></label>
   <label class="field"><span>Description</span><textarea data-f="desc" rows="8">${esc(it.desc)}</textarea><div class="hint">3–5 sentences. Pickup note is added automatically.</div></label>
   <div class="row"><label class="field"><span>Make</span><input type="text" data-f="make" class="${flag('make')}" value="${esc(it.make)}"></label><label class="field"><span>Model</span><input type="text" data-f="model" class="${flag('model')}" value="${esc(it.model)}"></label></div>
   <label class="field"><span>Size / dimensions</span><input type="text" data-f="size" class="${flag('dimension')||flag('size')}" value="${esc(it.size)}"></label>
   <label class="field"><span>Voltage / fuel</span><input type="text" data-f="power" class="${flag('gas')||flag('voltage')}" value="${esc(it.power)}"></label>
   <label class="field"><span>Category</span><select data-f="cat">${LL.cat.map(c=>`<option value="${c.id}" ${it.cat===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label>
   <div class="lbl">Condition guess</div><div class="segcond">${LL.CONDS.map(c=>`<button type="button" aria-pressed="${it.condition===c}" data-act="setcond" data-id="${it.id}" data-v="${c}">${c}</button>`).join('')}</div>
   <label class="field" style="margin-top:10px"><span>Why</span><input type="text" data-f="conditionReason" value="${esc(it.conditionReason)}"></label>
   <label class="field"><span>What’s included</span><input type="text" data-f="included" value="${esc(it.included)}"></label>
   <label class="listrow" style="border:0"><div><b>Share a private estimate with my rep</b><span class="small muted">Stored internally for your rep. It isn’t shown in your listing.</span></div><span class="switch"><input type="checkbox" data-act="share" data-id="${it.id}" ${it.repOnly?.share!==false?'checked':''} aria-label="Share a private estimate with my rep"><i></i></span></label>
   </div><div style="height:96px"></div>
   <div class="stickyfoot"><button class="btn ghost" style="flex:0 0 auto" data-act="runai" data-id="${it.id}" data-force="1">Re-run</button><button class="btn accent block" data-act="confirmai" data-id="${it.id}">${I.check} Looks right — confirm</button></div>`,
   mount(el){ bindFields(el,it); const sel=el.querySelector('select[data-f=cat]'); }};
};
/* photos sent to AI Describe: data plate first (model/serial), then logo, then angles; never the lot sticker (server max 6) */
function aiShots(it){ const sh=PR.shots(it).filter(s=>s.k!=='sticker'&&s.k!=='video'&&has(it,s.k)); const pri=s=>s.step==='specs'?0:s.step==='brand'?1:s.k==='ctx1'||s.k==='group'||/-1$/.test(s.k)?2:3; return sh.slice().sort((a,b)=>pri(a)-pri(b)); }
LL.acts.share = b => { const it=getItem(b.dataset.id); it.repOnly=it.repOnly||{}; it.repOnly.share=b.checked; LL.save(); };
LL.acts.runai = async b => { const it=getItem(b.dataset.id); if(!it || running.has(it.id)) return;
  if(b.dataset.force && it.ai && !confirm('Re-run AI Describe? This replaces the title, description and details above.')) return;
  running.add(it.id); LL.render(true);
  const images = aiShots(it).slice(0,6).map(s=>({role:s.role||'closeup',dataUrl:thumb(it,s.k)})).filter(x=>x.dataUrl && /^data:image\/(jpeg|png|webp)/.test(x.dataUrl));
  const hints = {type:it.type,category:(it.cat!=='other'?it.cat:undefined),make:it.make||undefined,model:it.model||undefined,qty:it.qty,notes:it.notes||undefined};
  let r; try{ r = await LL.analyzePhotos(images, hints); }catch(e){ r=null; }
  running.delete(it.id);
  if(r){ Object.assign(it,{title:r.title,desc:r.description,make:r.make,model:r.model,size:r.size,power:r.power,cat:r.category,condition:r.condition,conditionReason:r.conditionReason,included:r.included,serial:it.serial||r.serial||''});
    it.ai={source:r.source,confidence:r.confidence,confidenceNote:r.confidenceNote,needsReview:r.needsReview};
    it.repOnly=Object.assign({share:true},it.repOnly,r.valueRange?{low:r.valueRange.low,high:r.valueRange.high}:{},{newPrice:r.newPrice||null,usedRange:r.usedRange||null,comps:r.comps||[],valueBasis:r.valueBasis||'unknown'}); /* rep-only: never rendered to the seller */ it.aiConfirmed=false; LL.save(); }
  else LL.toast('AI Describe hit a snag — you can type details instead');
  if(location.hash.includes('/'+it.id+'/ai')) LL.render(true); };
LL.acts.confirmai = b => { const it=getItem(b.dataset.id); if(!/buyer arranges pickup/i.test(it.desc||'')) it.desc=((it.desc||'')+' '+LL.PICKUP).trim(); it.aiConfirmed=true; LL.save(); LL.toast('Listing confirmed'); LL.go(`#/sell/item/${it.id}/details`); };

/* ---------- camera ---------- */
LL.views.cam = ({id,shot}) => {
  const it=getItem(id); if(!it){ LL.go('#/sell',true); return {html:''}; }
  const all=PR.slots(it), cur=all.find(s=>s.k===shot) || PR.next(it,null) || all[0], grp=it.type==='lot';
  const steps=PR.STEPS.filter(x=>(grp||x.k!=='scale') && (PR.videoReq(it)||x.k!=='video'||has(it,'video')||it.skip?.video||cur.step==='video')), si=Math.max(0,steps.findIndex(x=>x.k===cur.step)), ck=PR.checklist(it);
  const tgt = cur.part ? PR.partOf(it,cur.part) : it;
  /* step header + counters */
  let counter='', extra='';
  if(cur.step==='context' && !cur.part){ const c=PR.ctxCount(it), extraN=Math.max(0,cur.i-PR.MIN);
    const title = cur.i<=PR.MIN ? `Photo ${cur.i} of ${PR.MIN} required` : `Extra photo (optional) · ${PR.PHOTO_MAX} max`;
    counter = `<div class="pctr"><b>${title}</b><div class="pbar" aria-hidden="true">${PR.ANGLES.map((a,i)=>`<i class="${has(it,a.k)?'done':''} ${i+1===cur.i?'cur':''} ${i>=PR.MIN?'opt':''}"></i>`).join('')}</div><span>${PR.ruleText(PR.photoRule(it))}${c<PR.MIN?` · ${PR.MIN-c} more required`:c<PR.MAX?' · 1 optional extra left':' · all angles in'}</span></div>`;
    if(c>=PR.MIN) extra = `<button class="xbtn go" data-x="doneangles">Done with angles ${I.chev}</button>`; }
  else if(cur.step==='context'){ const n=all.filter(s=>s.grp===cur.grp && has(it,s.k)).length;
    const pr=PR.photoRule(it,cur.part);
    counter = `<div class="pctr"><b>Main item ${cur.pj+1} of ${(it.parts||[]).length} · ${cur.i<=PR.MIN?`photo ${cur.i} of ${PR.MIN} required`:'extra photo (optional)'}</b><span>${esc(cur.pn)} · ${PR.ruleText(pr)}</span></div>`;
    if(pr.reqDone>=PR.MIN) extra = `<button class="xbtn go" data-x="doneangles">Done with this item ${I.chev}</button>`; }
  else if(cur.step==='bookmark') extra = `<button class="xbtn" data-act="digisticker" data-id="${it.id}">Use digital sticker instead</button>`;
  else if(cur.step==='brand') extra = `<button class="xbtn" data-x="skip">No brand logo</button>`;
  else if(cur.step==='specs') extra = `<button class="xbtn" data-x="skip">I don’t have a manufacturer plate</button>`;
  else if(cur.step==='video'){ extra = PR.videoReq(it)?`<button class="xbtn" data-act="nopower" data-id="${it.id}">Item doesn’t power on</button>`:`<button class="xbtn go" data-x="skipvid">Skip video ${I.chev}</button>`; }
  else if(cur.step==='scale') extra = `<button class="xbtn" data-act="addpartcam" data-id="${it.id}">${I.plus} Add another main item first</button>`;
  const title = cur.step==='specs' ? 'Scan the manufacturer plate' : cur.step==='video' ? (PR.kindOf(it)==='cooler'?'Cooler video · under 41°F':PR.kindOf(it)==='machine'?'Working video · running / moving':'Optional working video') : cur.step==='context'&&!cur.part ? cur.n : cur.n;
  if(cur.media==='video') return videoCam({it,cur,title,counter,extra,steps,si,ck});
  const html = `<div class="cam" role="dialog" aria-label="Camera: ${esc(title)}">
   <video playsinline muted autoplay aria-hidden="true"></video><img class="still" alt="" hidden>
   <div class="cam-fb" hidden><div style="width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center">${I.camera.replace('<svg','<svg width="34" height="34"')}</div><h3>Use your phone’s camera</h3><p id="fbmsg">Live preview isn’t available here. Tap below to open the camera and take the photo — you can still get lighting and sharpness checks.</p><label class="btn accent" style="position:relative">${I.camera} Open camera<input type="file" accept="image/*" capture="environment" data-cap style="position:absolute;inset:0;opacity:0;width:100%"></label></div>
   <div class="shade"></div>
   <div class="cam-top"><div class="sbars" aria-label="Protocol step ${si+1} of ${steps.length}">${steps.map((x,i)=>`<i class="${i===si?'cur':ck.find(c=>c.k===x.k)?.ok?'done':''}"></i>`).join('')}</div>
    <div class="hd"><div class="ti"><span class="pstep">Step ${PR.STEPS.findIndex(x=>x.k===cur.step)+1} · ${esc(PR.STEPS.find(x=>x.k===cur.step).n)} <em>Lot #${esc(it.lot)}</em></span><b>${esc(title)}</b><small>${esc(cur.h)}</small></div><a class="rbtn" href="#/sell/item/${it.id}/photos" aria-label="Close camera">${I.x}</a></div>
    ${counter}${extra?`<div class="cam-x">${extra}</div>`:''}</div>
   <div class="frame ${cur.f==='plate'?'plate':''}" aria-hidden="true"><i></i><i></i><i></i><i></i><div class="sil"></div><div class="gl">${esc(cur.g)}</div></div>
   <div class="coach"><div class="chips" aria-live="polite"><span class="cchip ok" id="cl">${I.sun2} Checking light…</span><span class="cchip ok" id="cs">${I.focus} Checking focus…</span></div><div class="cam-tip" id="ctip">${TIPS[cur.step==='bookmark'?0:1]}</div></div>
   <div class="cam-bot"><label class="side"><span class="rbtn">${I.image}</span>Library<input type="file" accept="image/*" data-lib aria-label="Choose from library"></label>
    <button class="shutter" id="shut" aria-label="Take photo"></button>
    <label class="side"><span class="rbtn">${I.camera}</span>Phone cam<input type="file" accept="image/*" capture="environment" data-cap aria-label="Use phone camera app"></label></div>
   <div class="flash"></div></div>`;
  return {overlay:true, html, mount(el){
    const video=el.querySelector('video'), still=el.querySelector('.still'), fb=el.querySelector('.cam-fb'), cl=el.querySelector('#cl'), cs=el.querySelector('#cs'), tip=el.querySelector('#ctip');
    let stream, timer, tipT, ti=cur.step==='bookmark'?0:1, live=null, reviewing=false;
    const setChip=(c,ok,okT,badT,ic)=>{ c.className='cchip '+(ok?'ok':'warn'); c.innerHTML=ic+' '+(ok?okT:badT); };
    const stop=()=>{ clearInterval(timer); clearInterval(tipT); stream&&stream.getTracks().forEach(t=>t.stop()); };
    LL.cleanup.push(stop);
    const goNext = leave => { const n=PR.next(it,cur.k,leave); if(n) LL.go(`#/sell/cam/${it.id}/${n.k}`,true); else { LL.toast(PR.missing(it).length?'Photos saved — check the protocol list':'All protocol photos done'); LL.go(`#/sell/item/${it.id}/photos`,true); } };
    tipT=setInterval(()=>{ if(live && !live.ok || reviewing) return; ti=(ti+1)%TIPS.length; tip.textContent=TIPS[ti]; },3800);
    const showVerdict=v=>{ setChip(cl,v.light==='ok','Light looks good',v.light==='dark'?'Too dark':'Too bright / glare',I.sun2); setChip(cs,v.sharp==='ok','Sharp','Hold steady',I.focus); tip.textContent = v.msgs.length? v.msgs[0] : TIPS[ti]; };
    /* “No brand logo” / “I don’t have a manufacturer plate” — record the skip, let them type what they know */
    const xb=el.querySelector('[data-x=doneangles]'); if(xb) xb.onclick=()=>goNext(true);
    const sb=el.querySelector('[data-x=skip]'); if(sb) sb.onclick=()=>{ const brand=cur.step==='brand', f=(k,l,ph)=>`<label class="field"><span>${l}</span><input type="text" name="${k}" value="${esc(tgt[k]||'')}" placeholder="${ph}" autocomplete="off"></label>`;
      const sh=document.createElement('div'); sh.className='cam-sheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-label',brand?'No brand logo':'No manufacturer plate');
      sh.innerHTML=`<form><h3>${brand?'No brand logo? That’s OK.':'No manufacturer plate? That’s OK.'}</h3><p class="small">${brand?'Type the brand if you know it, or leave it blank — we’ll record it as unknown.':'Type the model or specs if you know them, or leave them blank.'}</p>
        ${brand?f('make','Brand','Leave blank if unknown'):`<div class="row">${f('model','Model','e.g., HL600')}${f('serial','Serial','Optional')}</div>${f('power','Volts / specs','e.g., 115V 1-ph, natural gas')}`}
        <div class="row"><button type="button" class="btn ghost" data-c>Back to camera</button><button type="submit" class="btn accent">Save &amp; continue</button></div></form>`;
      el.querySelector('.cam').appendChild(sh); reviewing=true;
      sh.querySelector('[data-c]').onclick=()=>{ sh.remove(); reviewing=false; };
      sh.querySelector('form').onsubmit=e=>{ e.preventDefault(); [...e.target.querySelectorAll('input')].forEach(i=>{ tgt[i.name]=i.value.trim(); }); it.skip=it.skip||{}; it.skip[cur.skip]=true; LL.save(); LL.toast(brand?(tgt.make?'Brand saved: '+tgt.make:'Recorded: brand unknown'):'Recorded: no manufacturer plate'); goNext(false); }; };
    async function start(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ fb.hidden=false; cl.hidden=cs.hidden=true; return; }
      try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}); video.srcObject=stream; await video.play().catch(()=>{});
        timer=setInterval(()=>{ if(reviewing||!video.videoWidth) return; live=LL.vision.verdict(LL.vision.analyze(video,video.videoWidth,video.videoHeight)); showVerdict(live); },550);
      }catch(e){ fb.hidden=false; cl.hidden=cs.hidden=true; el.querySelector('#fbmsg').textContent = (e.name==='NotAllowedError'?'Camera permission was blocked. ':'Live preview isn’t available. ')+'Tap below to open your phone’s camera app instead — you’ll still get lighting and sharpness checks.'; }
    }
    function review(url,a){
      reviewing=true; const v=LL.vision.verdict(a); still.src=url; still.hidden=false; video.hidden=true; fb.hidden=true;
      const r=document.createElement('div'); r.className='review';
      r.innerHTML=`<div class="vr">${v.msgs.length?v.msgs.map(m=>`<div class="vmsg warn">${I.info.replace('<svg','<svg width="20" height="20" style="flex:none"')}<span>${esc(m)}</span></div>`).join(''):`<div class="vmsg ok">${I.check.replace('<svg','<svg width="20" height="20" style="flex:none"')}<span>Lighting and focus look good</span></div>`}</div>
        <div class="acts"><button class="btn ${v.ok?'ghost':'accent'}" data-r="retake">Retake</button><button class="btn ${v.ok?'accent':'ghost'}" data-r="use">${v.ok?'Use photo':'Use anyway'}</button></div>`;
      el.querySelector('.cam').appendChild(r); el.querySelector('.cam-bot').hidden=true; el.querySelector('.coach').hidden=true; const cx=el.querySelector('.cam-x'); if(cx) cx.hidden=true;
      r.querySelector('[data-r=retake]').onclick=()=>{ r.remove(); still.hidden=true; video.hidden=false; el.querySelector('.cam-bot').hidden=false; el.querySelector('.coach').hidden=false; if(cx) cx.hidden=false; reviewing=false; };
      r.querySelector('[data-r=use]').onclick=async()=>{ await LL.photos.set(it.id,cur.k,url); it.photos[cur.k]=true; if(cur.skip && it.skip) delete it.skip[cur.skip]; if(cur.k==='sticker') it.stickerMode='physical';
        it.ai=null; it.aiConfirmed=false; LL.save();
        if(cur.step==='specs') PR.readPlate(it,cur); /* DEMO/AI draft of Brand / Model / Serial / Volts */
        goNext(false); };
    }
    el.querySelector('#shut').onclick=async()=>{ if(!video.videoWidth){ LL.toast('Camera not ready yet'); return; } const f=el.querySelector('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); if(navigator.vibrate) navigator.vibrate(12);
      const w=video.videoWidth,h=video.videoHeight; review(await LL.vision.toDataURL(video,w,h), LL.vision.analyze(video,w,h)); };
    el.querySelectorAll('input[type=file]').forEach(inp=>inp.addEventListener('change',async()=>{ const f=inp.files[0]; if(!f) return; try{ const r=await LL.vision.fromFile(f); review(r.url,r.a); }catch(e){ LL.toast('Could not read that photo'); } inp.value=''; }));
    start();
  }};
};

/* ---------- 15-second working video (MediaRecorder) ---------- */
function videoCam({it,cur,title,extra,steps,si,ck}){
  const kind=PR.kindOf(it), MAXS=15;
  const html = `<div class="cam vidcam" role="dialog" aria-label="Video: ${esc(title)}">
   <video class="prev" playsinline muted autoplay aria-hidden="true"></video>
   <video class="replay" playsinline controls hidden></video>
   <div class="cam-fb" hidden><div style="width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center">▶</div><h3>Use your phone’s camera</h3><p>Live video isn’t available here. Upload a short clip (≤15 seconds) instead.</p>
    <label class="btn accent" style="position:relative">${I.image||''} Choose video<input type="file" accept="video/*" data-vfile style="position:absolute;inset:0;opacity:0;width:100%"></label></div>
   <div class="shade"></div>
   <div class="cam-top"><div class="sbars" aria-label="Protocol step">${steps.map((x,i)=>`<i class="${i===si?'cur':ck.find(c=>c.k===x.k)?.ok?'done':''}"></i>`).join('')}</div>
    <div class="hd"><div class="ti"><span class="pstep">Step ${PR.STEPS.findIndex(x=>x.k==='video')+1} · Video <em>Lot #${esc(it.lot)}</em></span><b>${esc(title)}</b><small>${esc(cur.h)}</small></div><a class="rbtn" href="#/sell/item/${it.id}/photos" aria-label="Close">${I.x}</a></div>
    ${extra?`<div class="cam-x">${extra}</div>`:''}</div>
   <div class="vid-ring" aria-live="polite"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52" pathLength="100"/></svg><b id="vsec">15</b><small>sec</small></div>
   <div class="coach"><div class="cam-tip">${esc(PR.videoPrompt(it))}${kind==='cooler'?' · Confirm the reading under 41°F after.':''}</div></div>
   <div class="cam-bot vid-bot">
    <label class="side"><span class="rbtn">${I.image}</span>Upload<input type="file" accept="video/*" data-vfile aria-label="Upload a short video"></label>
    <button class="shutter rec" id="vrec" aria-label="Start recording"><i></i></button>
    <button class="side" id="vstop" hidden type="button"><span class="rbtn">${I.check}</span>Stop</button>
    <span class="side" id="vph" aria-hidden="true"></span>
   </div>
   <div class="vid-review" hidden>
     ${kind==='cooler'?`<label class="field"><span>Temp shown (°F)</span><input type="number" inputmode="decimal" step="0.1" id="vtemp" placeholder="e.g., 38"><div class="hint" id="vtempw">Coolers should read under 41°F.</div></label>`:''}
     <div class="acts"><button class="btn ghost" data-r="retake">Retake</button><button class="btn accent" data-r="use">Use video</button></div>
   </div>
  </div>`;
  return {overlay:true, html, mount(el){
    const prev=el.querySelector('video.prev'), replay=el.querySelector('video.replay'), fb=el.querySelector('.cam-fb');
    const ring=el.querySelector('.vid-ring .val'), secEl=el.querySelector('#vsec'), recBtn=el.querySelector('#vrec'), stopBtn=el.querySelector('#vstop'), ph=el.querySelector('#vph');
    const rev=el.querySelector('.vid-review'), bot=el.querySelector('.vid-bot'), coach=el.querySelector('.coach');
    let stream=null, rec=null, chunks=[], timer=null, started=0, blob=null, mime='video/webm', url=null, reviewing=false;
    const stopTracks=()=>{ stream&&stream.getTracks().forEach(t=>t.stop()); stream=null; };
    LL.cleanup.push(()=>{ clearInterval(timer); try{rec&&rec.state!=='inactive'&&rec.stop();}catch(e){} stopTracks(); if(url) URL.revokeObjectURL(url); });
    const setRing = left => { const p=Math.max(0,Math.min(1,left/MAXS)); ring.style.strokeDashoffset=String(100*(1-p)); secEl.textContent=String(Math.ceil(left)); };
    setRing(MAXS);
    const pickMime = () => { for(const m of ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']){ if(window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; } return ''; };
    async function startCam(){
      if(!navigator.mediaDevices?.getUserMedia){ fb.hidden=false; return; }
      try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:true});
        prev.srcObject=stream; await prev.play().catch(()=>{});
      }catch(e){ try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}); prev.srcObject=stream; await prev.play().catch(()=>{}); }
        catch(e2){ fb.hidden=false; } }
    }
    function finishBlob(b, m, dur){ blob=b; mime=m||blob.type||'video/webm'; if(url) URL.revokeObjectURL(url); url=URL.createObjectURL(blob);
      prev.hidden=true; replay.hidden=false; replay.src=url; bot.hidden=true; coach.hidden=true; rev.hidden=false; reviewing=true;
      el.querySelector('.vid-ring').classList.add('done');
      const tw=el.querySelector('#vtempw'); const ti=el.querySelector('#vtemp');
      if(ti){ ti.value=it.tempF??''; ti.oninput=()=>{ const v=+ti.value; tw.className='hint'+(v>=41?' warnt':''); tw.textContent=v>=41?`⚠️ ${v}°F is at or above 41°F — coolers should read under 41°F.`:'Coolers should read under 41°F.'; }; }
      it._pendingVid={blob,mime,dur}; }
    function startRec(){ if(!stream || reviewing) return; mime=pickMime()||'video/webm'; chunks=[];
      try{ rec=new MediaRecorder(stream, mime?{mimeType:mime,videoBitsPerSecond:2500000}:{videoBitsPerSecond:2500000}); }catch(e){ try{ rec=new MediaRecorder(stream); }catch(e2){ LL.toast('Recording isn’t supported here — upload a clip instead'); return; } }
      mime=rec.mimeType||mime; rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      rec.onstop=()=>{ const b=new Blob(chunks,{type:mime}); const dur=Math.min(MAXS,(Date.now()-started)/1000); finishBlob(b,mime,dur); };
      started=Date.now(); rec.start(200); recBtn.hidden=true; stopBtn.hidden=false; ph.hidden=true; el.querySelector('.vid-ring').classList.add('live');
      clearInterval(timer); timer=setInterval(()=>{ const left=MAXS-(Date.now()-started)/1000; setRing(left); if(left<=0) stopRec(); },100);
      if(navigator.vibrate) navigator.vibrate(10); }
    function stopRec(){ clearInterval(timer); if(rec && rec.state!=='inactive') try{rec.stop();}catch(e){} recBtn.hidden=false; stopBtn.hidden=true; }
    recBtn.onclick=()=>startRec(); stopBtn.onclick=()=>stopRec();
    el.querySelectorAll('input[data-vfile]').forEach(inp=>inp.addEventListener('change',async()=>{ const f=inp.files[0]; if(!f) return;
      if(!/^video\//.test(f.type)){ LL.toast('Choose a video file'); inp.value=''; return; }
      const tmp=URL.createObjectURL(f); const v=document.createElement('video'); v.preload='metadata'; v.src=tmp;
      await new Promise((res,rej)=>{ v.onloadedmetadata=res; v.onerror=rej; });
      const dur=v.duration; URL.revokeObjectURL(tmp);
      if(isFinite(dur) && dur>MAXS+0.4){ if(!confirm(`This clip is ${dur.toFixed(1)}s — over the 15-second limit. Use it anyway? (Buyers only need ≤15s.)`)){ inp.value=''; return; } }
      finishBlob(f, f.type||'video/mp4', isFinite(dur)?Math.min(dur,MAXS):MAXS); inp.value=''; }));
    const skip=el.querySelector('[data-x=skipvid]'); if(skip) skip.onclick=()=>{ const n=PR.next(it,cur.k,true); if(n) LL.go(`#/sell/cam/${it.id}/${n.k}`,true); else LL.go(`#/sell/item/${it.id}/photos`,true); };
    rev.querySelector('[data-r=retake]').onclick=()=>{ reviewing=false; rev.hidden=true; bot.hidden=false; coach.hidden=false; replay.hidden=true; prev.hidden=false; setRing(MAXS); el.querySelector('.vid-ring').classList.remove('done','live'); blob=null; };
    rev.querySelector('[data-r=use]').onclick=async()=>{ if(!blob) return;
      const ti=el.querySelector('#vtemp'); if(kind==='cooler' && ti){ const v=ti.value===''?null:+ti.value; it.tempF=v; if(v!=null && v>=41 && !confirm(`${v}°F is at or above 41°F. Coolers should show under 41°F. Save this video anyway?`)) return; }
      // store as data URL (IndexedDB) + poster frame
      const dataUrl = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); });
      let poster=''; try{ const v=document.createElement('video'); v.src=url||URL.createObjectURL(blob); v.muted=true; await v.play().catch(()=>{}); v.pause(); v.currentTime=Math.min(0.4,(it._pendingVid?.dur||1)/2);
        await new Promise(r=>{ v.onseeked=r; setTimeout(r,600); });
        const c=document.createElement('canvas'); c.width=v.videoWidth||640; c.height=v.videoHeight||360; c.getContext('2d').drawImage(v,0,0,c.width,c.height); poster=c.toDataURL('image/jpeg',.7); }catch(e){}
      await LL.photos.set(it.id,'video',dataUrl); if(poster) await LL.photos.set(it.id,'videoPoster',poster);
      it.photos.video=true; it.videoDur=it._pendingVid?.dur||null; it.videoMime=mime; if(it.skip) delete it.skip.video; it.ai=null; it.aiConfirmed=false; LL.save();
      const n=PR.next(it,cur.k,false); if(n) LL.go(`#/sell/cam/${it.id}/${n.k}`,true); else { LL.toast('Working video saved'); LL.go(`#/sell/item/${it.id}/photos`,true); } };
    startCam();
  }};
}

LL.acts.addpartcam = b => { const it=getItem(b.dataset.id); const p={id:LL.uid().slice(0,5),name:''}; it.parts=(it.parts||[]).concat(p); LL.save(); LL.go(`#/sell/cam/${it.id}/${p.id}-1`,true); };

/* ---------- submit ---------- */
function csv(){ const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const cols=['lot_number','consignor_id','description','guarantee_type','type','category','title','make','model','size','voltage_fuel','condition','condition_note','qty','serial','included','seller_notes','listing_description','photos','protocol_missing','ai_source','ai_confidence'];
  const rows=S().items.map(it=>{ const m=PR.missing(it); return [it.lot,S().profile.consignorId||'',PR.desc(it),it.guarantee,it.type==='lot'?'group lot':'item',LL.catLabel(it.cat),it.title,it.make,it.model,it.size,it.power,it.condition,it.conditionReason,it.qty,it.serial,it.included,[it.countNote,it.notes].filter(Boolean).join(' · '),it.desc,PR.slots(it).filter(s=>has(it,s.k)).length,m.map(c=>c.n).join('; '),it.ai?.source||'',it.ai?.confidence||''].map(q).join(','); });
  return [cols.join(','),...rows].join('\r\n'); }
function summary(){ const p=S().profile,st=stats(); return `LOCAL LIQUIDATORS — SELLER INVENTORY SUMMARY\nBusiness: ${p.business}\nConsignor ID: ${p.consignorId||'not set'}\nContact: ${p.contact}${p.email?' · '+p.email:''}${p.phone?' · '+p.phone:''}\nLocation(s): ${p.locations.join(' | ')}\nClosing date: ${p.closing||'not set'}\nItems: ${st.n}  ·  Photo-ready: ${st.pct}%\n\n`+S().items.map((it,i)=>`Lot ${it.lot}. ${PR.desc(it)} — ${it.guarantee}${it.qty>1?', qty '+it.qty:''}${PR.missing(it).length?'  [missing: '+PR.missing(it).map(c=>c.n).join(', ')+']':''}`).join('\n')+'\n\nRate: your rep will confirm.\nPhotos stay in the app until a real backend uploads them.\n'; }
LL.views.submit = () => { const st=stats(), p=S().profile; if(!p.done||!st.n){ LL.go('#/sell',true); return {html:''}; }
  const miss=st.tot-st.done;
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><a class="iconbtn" href="#/sell" aria-label="Back">${I.back}</a><h2 style="font-size:30px;font-weight:800">Submit to my rep</h2></div>
   <div class="card pad"><dl class="kv"><dt>Business</dt><dd>${esc(p.business)}</dd><dt>Contact</dt><dd>${esc(p.contact)}</dd><dt>Location(s)</dt><dd>${esc(p.locations.join('; '))}</dd><dt>Closing</dt><dd>${esc(p.closing||'—')}</dd><dt>Inventory</dt><dd>${st.n} items</dd><dt>Photo-ready</dt><dd>${st.pct}%</dd></dl></div>
   ${miss?`<div class="ai-banner" style="margin-top:12px">${I.info.replace('<svg','<svg width="22" height="22" style="flex:none"')}<div><b>${miss} photo${miss===1?'':'s'} still missing.</b> You can submit now and finish later, but complete photos help your rep list faster.</div></div>`:''}
   ${(()=>{ const bad=S().items.filter(it=>PR.missing(it).length); return `<div class="card pad" style="margin-top:12px"><div class="lbl">Protocol check</div>${bad.length?`<p class="small"><b class="warnt">${bad.length} of ${st.n} lots</b> are missing a protocol parameter:</p><ul class="small" style="margin:6px 0 0;padding-left:18px">${bad.slice(0,8).map(it=>`<li><a href="#/sell/item/${it.id}/photos">#${esc(it.lot)}</a> — ${PR.missing(it).map(c=>esc(c.detail)).join(' · ')}</li>`).join('')}</ul>`:`<p class="small okt">All ${st.n} lots hit every protocol parameter.</p>`}<a class="btn ghost sm block" style="margin-top:10px" href="#/sell/export">${I.download} Export for Local Liquidators</a></div>`; })()}
   <label class="field" style="margin-top:14px"><span>Note for your rep (optional)</span><textarea id="repnote" rows="3" placeholder="Loading dock hours, items to skip, access notes…"></textarea></label>
   <div class="tintcard" style="margin-bottom:16px">Your rep will confirm your rate.</div>
   <button class="btn accent block" data-act="dosubmit">${I.check} Submit to my rep</button></div>`}; };
LL.acts.dosubmit = () => { const bad=S().items.filter(it=>PR.missing(it).length); if(bad.length && !confirm(`${bad.length} lot${bad.length===1?' is':'s are'} missing protocol parameters (${bad.slice(0,5).map(it=>'#'+it.lot).join(', ')}). Submit anyway?`)) return; S().submitted={at:Date.now(),count:S().items.length,pct:stats().pct,note:(LL.$('#repnote')||{}).value||''}; LL.save(); LL.go('#/sell/done'); };
LL.views.done = () => { const sub=S().submitted; if(!sub){ LL.go('#/sell',true); return {html:''}; } const p=S().profile;
  return {html:`<div class="pad center" style="padding-top:28px"><div class="check">${I.check.replace('<svg','<svg viewBox="0 0 24 24"')}</div><h2 style="font-size:36px;font-weight:800;margin-top:18px">Submitted!</h2><p class="muted" style="margin:6px 0 18px">${sub.count} items saved on this device for <b>${esc(p.business)}</b>. Your rep will review and confirm your rate.</p>
   <div style="display:grid;gap:10px;text-align:left"><a class="btn accent block" href="#/sell/export">${I.download} Export for Local Liquidators</a><button class="btn block" data-act="dlcsv">${I.download} Download CSV</button><button class="btn ghost block" data-act="dltxt">${I.download} Download summary</button><a class="btn line block" data-act="mailrep" href="#">${I.mail} Email my rep</a></div>
   <p class="small muted" style="margin-top:14px">Nothing is sent automatically. Email opens your mail app with a summary — attach the CSV.</p><a class="btn ghost block" style="margin-top:14px" href="#/sell">Back to inventory</a></div>`}; };
LL.acts.dlcsv = () => LL.download('inventory-'+(S().profile.business||'seller').replace(/\W+/g,'-').toLowerCase()+'.csv', csv(), 'text/csv');
LL.acts.dltxt = () => LL.download('inventory-summary.txt', summary());
LL.acts.mailrep = b => { const body=summary().slice(0,1600); b.href=`mailto:${LL.EMAIL}?subject=${encodeURIComponent('Inventory from '+S().profile.business)}&body=${encodeURIComponent(body+'\n\n(Attach the downloaded CSV.)')}`; };
})();
