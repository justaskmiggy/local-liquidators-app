/* SELLER side: onboarding, inventory dashboard, guided photo flow, AI Describe, details, submit */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
LL.views = LL.views || {}; LL.acts = LL.acts || {};
const SHOTS = {
  item:[{k:'front',n:'Front of item',h:'Stand 3–4 ft back and show the whole item.',f:'full',g:'Whole item in frame'},
        {k:'plate',n:'Model / serial plate',h:'Get close — fill the frame with the data plate.',f:'plate',g:'Fill the frame with the plate'},
        {k:'back',n:'Interior or back',h:'Open the door, or show the back panel and hookups.',f:'full',g:'Show inside / back'}],
  lot:[{k:'overview',n:'Whole lot',h:'Lay everything out together, from above or at an angle.',f:'full',g:'Whole lot in frame'},
       {k:'closeup',n:'Close-up of contents',h:'A tighter shot so buyers can see the condition.',f:'full',g:'Show contents up close'}]
};
const TIPS = ['Clear clutter from around the item','Stand 3–4 ft back and show the whole item','Include the model / serial plate','Light the front of the item; avoid a bright window behind it','Hold steady — brace your elbows'];
LL.shotsOf = it => SHOTS[it.type==='lot'?'lot':'item'];
const has = (it,k) => !!(it.photos && it.photos[k]);
const thumb = (it,k) => LL.photos.get(it.id,k) || (it.sample && it.photos[k] ? LL.art(it.cat==='smallwares'?'pans':LL.cat.find(c=>c.id===it.cat)?.emoji||'other', k==='back'?'back':k==='plate'?'plate':k==='overview'?'overview':k==='closeup'?'closeup':'front', it.seed||0) : null);
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
    <label class="field"><span>Closing date</span><input type="date" name="closing" value="${esc(p.closing)}"><div class="hint">When do you need the space cleared? Your rep uses this to schedule your auction.</div></label>
    <div class="tintcard" style="margin:6px 0 16px"><b style="font-family:var(--head);font-size:17px">Your rate</b><br>Your rep will confirm your rate.</div>
    <button class="btn accent block" type="submit">Start my inventory ${I.chev}</button>
   </form></div>`,
   mount(el){ el.querySelector('#obf').addEventListener('submit',e=>{ e.preventDefault(); const f=e.target, v=n=>f.elements[n].value.trim();
      const locs=[...f.querySelectorAll('[name=loc]')].map(x=>x.value.trim()).filter(Boolean);
      if(!v('business')||!v('contact')){ LL.toast('Add your business and your name to continue'); (v('business')?f.elements.contact:f.elements.business).focus(); return; }
      if(!locs.length){ LL.toast('Add at least one location'); f.querySelector('[name=loc]').focus(); return; }
      Object.assign(S().profile,{business:v('business'),contact:v('contact'),email:v('email'),phone:v('phone'),closing:v('closing'),locations:locs,done:true}); LL.save(); LL.go('#/sell'); }); } }; };
function syncProfileLocs(){ const f=LL.$('#obf'); if(!f) return; S().profile.locations=[...f.querySelectorAll('[name=loc]')].map(x=>x.value); ['business','contact','email','phone','closing'].forEach(n=>S().profile[n]=f.elements[n].value); }
LL.acts.addloc = () => { syncProfileLocs(); S().profile.locations.push(''); LL.render(true); setTimeout(()=>{ const a=[...LL.$$('[name=loc]')]; a[a.length-1]?.focus(); },50); };
LL.acts.rmloc = b => { syncProfileLocs(); S().profile.locations.splice(+b.dataset.i,1); LL.render(true); };

/* ---------- dashboard ---------- */
function post(it,i){ const sh=LL.shotsOf(it); const done=sh.filter(s=>has(it,s.k)).length, ready=done===sh.length;
  const first = sh.map(s=>thumb(it,s.k)).find(Boolean);
  return `<article class="post" aria-label="${esc(itemName(it,i))}">
   <div class="ph"><div class="av"><span>${first?`<img src="${first}" alt="">`:LL.icons.camera.replace('<svg','<svg width="18" height="18"')}</span></div><div style="flex:1;min-width:0"><b>${esc(itemName(it,i))}</b><small>${esc(LL.catLabel(it.cat))}${it.condition?' · '+esc(it.condition):''}${it.qty>1?' · Qty '+it.qty:''}</small></div>
    <span class="badge ${ready?'ok':'warn'}">${ready?'Photo-ready':done+'/'+sh.length+' photos'}</span></div>
   <div class="strip" role="group" aria-label="Photos">${sh.map(s=>{ const t=thumb(it,s.k); return t?`<div class="shot"><img loading="lazy" src="${t}" alt="${esc(s.n)}"><em>${esc(s.n)}</em></div>`:`<a class="shot miss" href="#/sell/cam/${it.id}/${s.k}" style="text-decoration:none"><div>${I.camera.replace('<svg','<svg width="38" height="38"')}<br><b>${esc(s.n)}</b><br><span class="small">Tap to add</span></div></a>`; }).join('')}</div>
   <div class="acts"><a class="iconbtn" href="#/sell/cam/${it.id}/${(sh.find(s=>!has(it,s.k))||sh[0]).k}" aria-label="Take photos">${I.camera}</a><a class="iconbtn" href="#/sell/item/${it.id}/ai" aria-label="AI Describe">${I.sparkle}</a><a class="iconbtn" href="#/sell/item/${it.id}/details" aria-label="Edit details">${I.mic}</a>
    ${it.aiConfirmed?`<span class="badge ok" style="margin-left:auto">${I.check.replace('<svg','<svg width="12" height="12"')} Listing ready</span>`:`<span class="badge warn" style="margin-left:auto">Needs details</span>`}</div>
   <div class="cap"><b>${esc(it.make||'')} ${esc(it.model||'')}</b> ${it.desc?esc(it.desc.slice(0,96))+'…':'<span class="muted">Add details to finish this listing.</span>'}</div></article>`; }
LL.views.sell = () => { const p=S().profile; if(!p.done) return LL.views.onboard();
  const st=stats(), d=daysTo(p.closing);
  const stories = `<div class="stories" role="list"><a class="story" role="listitem" href="#/sell/item/new/photos" aria-label="Add item"><div class="ringw add"><div class="in" style="color:var(--accent)">${I.plus.replace('<svg','<svg width="30" height="30"')}</div></div><span class="nm">Add item</span></a><a class="story" role="listitem" href="#/sell/item/newlot/photos"><div class="ringw add"><div class="in" style="color:var(--link)">${I.grid.replace('<svg','<svg width="28" height="28"')}</div></div><span class="nm">Add lot</span></a>
   ${S().items.map((it,i)=>{ const sh=LL.shotsOf(it), rdy=sh.every(s=>has(it,s.k)), t=sh.map(s=>thumb(it,s.k)).find(Boolean); return `<a class="story" role="listitem" href="#/sell/item/${it.id}/photos"><div class="ringw ${rdy?'':'todo'}"><div class="in">${t?`<img src="${t}" alt="">`:I.camera.replace('<svg','<svg width="26" height="26"')}</div></div><span class="nm">${esc((it.make||it.title||(it.type==='lot'?'Lot ':'Item ')+(i+1)).slice(0,12))}</span></a>`; }).join('')}</div>`;
  const hero = `<section class="hero" aria-label="Progress">${LL.ring(st.pct,92,10)}<div><h2>Inventory ${st.n} item${st.n===1?'':'s'},<br>${st.pct}% photo-ready</h2><p>${st.n?`${st.ready} of ${st.n} fully shot${d!=null?` · closing ${d>0?'in '+d+' day'+(d===1?'':'s'):d===0?'today':'date passed'}`:''}`:'Photograph each item in under a minute.'}</p></div></section>`;
  const body = st.n ? `<div style="padding:4px 16px 0;display:flex;gap:10px"><a class="btn accent block sm" href="#/sell/item/new/photos">${I.camera} Add item</a><a class="btn ghost block sm" href="#/sell/item/newlot/photos">${I.grid} Add lot</a></div>${S().items.map(post).join('')}<div style="height:84px"></div>
     <div class="stickyfoot"><a class="btn block" href="#/sell/submit">Submit to my rep ${I.chev}</a></div>`
   : `<div class="empty">${I.camera}<h3>Let’s shoot your first item</h3><p>You take the photos, your rep does the rest. Three quick shots per item — we’ll coach you on lighting and framing.</p>
      <div style="display:grid;gap:10px;margin-top:18px"><a class="btn accent block" href="#/sell/item/new/photos">${I.camera} Add first item</a><button class="btn ghost block" data-act="sample">${I.sparkle} Load sample inventory (12 items)</button></div></div>`;
  return {html:`${hero}${stories}${body}`}; };
LL.acts.sample = () => { LL.loadSample(); LL.render(true); LL.toast('Sample inventory loaded — 12 items'); };
LL.loadSample = function(){
  const D=LL.DEMO, mk=(cat,over={},miss=[],type='item')=>{ const d=D[cat]; const it=Object.assign({id:LL.uid(),type,cat,make:d.make,model:d.model,size:d.size,power:d.power,condition:d.cond,conditionReason:d.reason,qty:1,notes:'',serial:'',title:d.title,desc:d.desc,included:d.included,confidence:d.conf,aiConfirmed:true,ai:{source:'demo',confidence:d.conf,confidenceNote:d.conf==='high'?'Model/data plate looked readable.':'Some details could not be confirmed from the photos.',needsReview:d.review},photos:{},sample:true,seed:Math.floor(Math.random()*4),repOnly:{low:d.value[0],high:d.value[1],share:true}},over);
    LL.shotsOf(it).forEach(s=>{ if(!miss.includes(s.k)) it.photos[s.k]=true; }); if(miss.length){ it.aiConfirmed=false; it.ai=null; } return it; };
  S().items = [ mk('oven'), mk('mixer'), mk('mixer',{make:'Hobart',model:'HL600',title:'Hobart HL600 60-Quart Planetary Mixer',size:'60-qt bowl'},['back']), mk('refrig'), mk('refrig',{title:'True T-23 Single-Door Reach-In Refrigerator',model:'T-23'},['plate','back']),
    mk('prep'), mk('racks',{qty:4}), mk('furniture',{qty:6}), mk('pos',{},['plate']), mk('other',{title:'Bunn Commercial Coffee Brewer',make:'Bunn',model:'CWTF15'},['back']),
    mk('smallwares',{type:'lot',qty:24,model:'',make:'',title:'Lot of 24 Aluminum Full-Size Sheet Pans'},[],'lot'), mk('smallwares',{type:'lot',qty:1,model:'',make:'',title:'Smallwares Lot: Pots, Pans & Utensils',cat:'smallwares'},[],'lot') ];
  if(!S().profile.done) Object.assign(S().profile,{business:'Sunrise Bakery & Café',contact:'Alex Rivera',email:'',phone:'',locations:['Phoenix, AZ'],closing:new Date(Date.now()+21*864e5).toISOString().slice(0,10),done:true});
  LL.save(); };

/* ---------- item editor ---------- */
function newItem(type){ const it={id:LL.uid(),type,cat:type==='lot'?'smallwares':'other',make:'',model:'',size:'',power:'',condition:'Good',conditionReason:'',qty:1,notes:'',serial:'',title:'',desc:'',included:'',photos:{},aiConfirmed:false,repOnly:{share:true},created:Date.now()}; S().items.push(it); LL.save(); return it; }
const STEPS = ['photos','ai','details'], STEPN = ['Photos','AI Describe','Details'];
function stepbar(it,step){ const si=STEPS.indexOf(step);
  return `<div class="stepbar"><div class="sbars" role="tablist" aria-label="Steps">${STEPS.map((s,i)=>`<button role="tab" aria-selected="${i===si}" aria-label="${STEPN[i]}" data-nav="#/sell/item/${it.id}/${s}"><i class="${i<si?'done':i===si?'cur':''}"></i></button>`).join('')}</div></div><div class="stepnames">${STEPN.map((n,i)=>`<span class="${i===si?'on':''}">${n}</span>`).join('')}</div>`; }
LL.views.item = ({id,step='photos'}) => {
  if(id==='new'||id==='newlot'){ const it=newItem(id==='new'?'item':'lot'); LL.go(`#/sell/item/${it.id}/photos`, true); return {html:''}; }
  const it=getItem(id); if(!it){ LL.go('#/sell',true); return {html:''}; }
  const idx=S().items.indexOf(it), sh=LL.shotsOf(it), done=sh.filter(s=>has(it,s.k)).length, all=done===sh.length;
  const head = `<div class="pad" style="padding-bottom:6px"><div style="display:flex;align-items:center;gap:10px"><a class="iconbtn" href="#/sell" aria-label="Back to inventory">${I.back}</a><b style="font-family:var(--head);font-size:22px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(itemName(it,idx))}</b>${it.type==='lot'?'<span class="badge">Lot</span>':''}</div></div>${stepbar(it,step)}`;
  let body='', mount=null;
  if(step==='photos'){
    body = `<div class="pad"><div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">${LL.ring(Math.round(done/sh.length*100),76,9,done+'/'+sh.length)}<div><h2 style="font-size:26px;font-weight:800">${all?'All required photos done':'Required shots'}</h2><p class="muted small">${all?'Nice work. Next, let AI write the listing.':'Tap a shot — we’ll check light and focus as you shoot.'}</p></div></div>
     ${sh.map((s,i)=>{ const t=thumb(it,s.k); return `<a class="shot-t ${t?'done':''}" href="#/sell/cam/${it.id}/${s.k}" style="text-decoration:none;color:inherit"><div class="th">${t?`<img src="${t}" alt="Photo of ${esc(s.n)}">`:I.camera}</div><div><b>${i+1}. ${esc(s.n)}</b><span class="small muted">${esc(s.h)}</span></div>${t?`<span class="tick">${I.check}</span>`:''}</a>`; }).join('')}
     <div class="card pad" style="margin-top:14px"><b style="font-family:var(--head);font-size:19px">Photo coaching</b><ul class="tips">${['Clear clutter around the item','Stand 3–4 ft back and show the whole item','Include the model / serial plate','Good light on the front — turn lights on or move near a window'].map((t,i)=>`<li><i>${i+1}</i><span>${t}</span></li>`).join('')}</ul></div></div>
     <div style="height:90px"></div><div class="stickyfoot"><a class="btn ${all?'accent':'ghost'} block" href="${all?`#/sell/item/${it.id}/ai`:`#/sell/cam/${it.id}/${(sh.find(s=>!has(it,s.k))||sh[0]).k}`}">${all?I.sparkle+' Next: AI Describe':I.camera+' Take next photo'}</a></div>`;
  } else if(step==='ai'){ const r=LL.aiView(it); body=r.html; mount=r.mount; }
  else { body = detailsHTML(it); mount=el=>bindFields(el,it); }
  return {html:head+body, mount};
};
function bindFields(el,it){
  el.addEventListener('input',e=>{ const f=e.target.dataset.f; if(!f) return; it[f]= e.target.type==='number'? Math.max(1,+e.target.value||1) : e.target.value; if(f==='title'||f==='desc') it.aiConfirmed=it.aiConfirmed; LL.save(); });
}
LL.acts.setcat = b => { const it=getItem(b.dataset.id); it.cat=b.dataset.v; LL.save(); LL.$$('[data-act=setcat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); const s=LL.$('select[data-f=cat]'); if(s) s.value=it.cat; };
LL.acts.setcond = b => { const it=getItem(b.dataset.id); it.condition=b.dataset.v; LL.save(); LL.$$('[data-act=setcond]').forEach(x=>x.setAttribute('aria-pressed',x===b)); };
function detailsHTML(it){ const idx=S().items.indexOf(it);
  return `<div class="pad">
   <div class="lbl">Quick-pick category</div><div class="chips wrap">${LL.cat.map(c=>`<button type="button" class="chip" aria-pressed="${it.cat===c.id}" data-act="setcat" data-id="${it.id}" data-v="${c.id}">${esc(c.label)}</button>`).join('')}</div>
   <div class="row" style="margin-top:6px"><label class="field"><span>Brand</span><input type="text" data-f="make" value="${esc(it.make)}" placeholder="e.g., Hobart" autocomplete="off"></label><label class="field"><span>Model</span><input type="text" data-f="model" value="${esc(it.model)}" placeholder="e.g., HL200" autocomplete="off"></label></div>
   <div class="row"><label class="field"><span>${it.type==='lot'?'Pieces in lot':'Quantity'}</span><input type="number" min="1" inputmode="numeric" data-f="qty" value="${it.qty||1}"></label><label class="field"><span>Serial # (optional)</span><input type="text" data-f="serial" value="${esc(it.serial)}" autocomplete="off"></label></div>
   <div class="lbl">Condition</div><div class="segcond" style="margin-bottom:6px">${LL.CONDS.map(c=>`<button type="button" aria-pressed="${it.condition===c}" data-act="setcond" data-id="${it.id}" data-v="${c}">${c}</button>`).join('')}</div>
   <p class="hint" style="margin-bottom:14px">Like New = barely used · Good = works well, normal wear · Workhorse = heavy use, still earning its keep.</p>
   <label class="field"><span>Notes — talk or type</span><textarea data-f="notes" placeholder="Anything buyers should know? Works great, one burner out, comes with 3 racks…" rows="4">${esc(it.notes)}</textarea><div class="hint">${I.mic.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')} Tip: tap the microphone on your phone keyboard to dictate instead of typing.</div></label>
   ${it.title?`<div class="card pad"><div class="lbl">Listing preview</div><b style="font-family:var(--head);font-size:20px">${esc(it.title)}</b><p class="small muted" style="margin-top:6px">${esc(it.desc)}</p><a class="btn ghost sm" style="margin-top:10px" href="#/sell/item/${it.id}/ai">${I.sparkle} Edit with AI Describe</a></div>`:`<a class="btn accent block" href="#/sell/item/${it.id}/ai">${I.sparkle} Run AI Describe</a>`}
   <div style="height:12px"></div></div><div style="height:90px"></div>
   <div class="stickyfoot"><button class="btn danger" style="flex:0 0 56px;padding:0" data-act="delitem" data-id="${it.id}" aria-label="Delete item">${I.trash}</button><a class="btn block" href="#/sell">${I.check} Done — back to inventory</a></div>`; }
LL.acts.delitem = async b => { if(!confirm('Delete this item and its photos?')) return; const it=getItem(b.dataset.id); for(const s of LL.shotsOf(it)) await LL.photos.del(it.id,s.k); S().items=S().items.filter(x=>x!==it); LL.save(); LL.go('#/sell'); };

/* ---------- AI Describe step ---------- */
const running = new Set();
LL.aiView = function(it){
  const sh=LL.shotsOf(it), all=sh.every(s=>has(it,s.k));
  if(!all) return {html:`<div class="empty">${I.camera}<h3>Photos first</h3><p>AI Describe reads your photos, so it needs all ${sh.length} required shots.</p><a class="btn accent block" style="margin-top:14px" href="#/sell/item/${it.id}/photos">${I.camera} Back to photos</a><p style="margin-top:14px"><a href="#/sell/item/${it.id}/details">Skip AI — I’ll type the details</a></p></div>`};
  if(running.has(it.id)){
    const ims = sh.map(s=>`<div><img src="${thumb(it,s.k)}" alt=""></div>`).join('');
    return {html:`<div class="pad"><div class="scan" role="status" aria-live="polite"><div class="imgs">${ims}</div><p id="scanmsg">Reading the model plate…</p></div><p class="muted center small" style="margin-top:12px">Identifying make, model and size, then writing your listing.</p></div>`,
      mount(el){ const msgs=['Reading the model plate…','Identifying make & model…','Checking condition…','Writing your listing…']; let i=0; const t=setInterval(()=>{ const m=el.querySelector('#scanmsg'); if(!m) return clearInterval(t); m.textContent=msgs[++i%msgs.length]; },1100); LL.cleanup.push(()=>clearInterval(t)); }};
  }
  if(!it.ai){
    return {html:`<div class="pad center"><div class="check" style="margin-bottom:16px">${I.sparkle.replace('<svg','<svg width="46" height="46" style="stroke-dasharray:none;animation:none"')}</div><h2 style="font-size:30px;font-weight:800">AI Describe</h2><p class="muted" style="margin:8px 0 18px">We’ll read your three photos and draft the make, model, size, power, condition and a ready-to-post listing. You review and edit everything.</p><button class="btn accent block" data-act="runai" data-id="${it.id}">${I.sparkle} Describe my item</button><p style="margin-top:14px"><a href="#/sell/item/${it.id}/details">Skip — I’ll type the details</a></p></div>`,
      mount(){ if(!it._auto){ it._auto=true; LL.acts.runai({dataset:{id:it.id}}); } }};
  }
  const a=it.ai, demo=a.source==='demo';
  const rv=(a.needsReview||[]);
  const flag = k => rv.some(r=>r.toLowerCase().includes(k)) ? 'flag':'';
  return {html:`<div class="pad">
   <div class="ai-banner ${demo?'':'live'}" role="note">${I.info.replace('<svg','<svg width="22" height="22" style="flex:none"')}<div>${demo?'<b>DEMO MODE</b> — sample output so you can preview the experience. No AI backend is connected, so this was <u>not</u> read from your photos.':'<b>AI-generated draft</b> from your photos. Please check every field before confirming.'}</div></div>
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
LL.acts.share = b => { const it=getItem(b.dataset.id); it.repOnly=it.repOnly||{}; it.repOnly.share=b.checked; LL.save(); };
LL.acts.runai = async b => { const it=getItem(b.dataset.id); if(!it || running.has(it.id)) return;
  if(b.dataset.force && it.ai && !confirm('Re-run AI Describe? This replaces the title, description and details above.')) return;
  running.add(it.id); LL.render(true);
  const images = LL.shotsOf(it).map(s=>({role:s.k,dataUrl:thumb(it,s.k)})).filter(x=>x.dataUrl);
  const hints = {type:it.type,category:(it.cat!=='other'?it.cat:undefined),make:it.make||undefined,model:it.model||undefined,qty:it.qty,notes:it.notes||undefined};
  let r; try{ r = await LL.analyzePhotos(images, hints); }catch(e){ r=null; }
  running.delete(it.id);
  if(r){ Object.assign(it,{title:r.title,desc:r.description,make:r.make,model:r.model,size:r.size,power:r.power,cat:r.category,condition:r.condition,conditionReason:r.conditionReason,included:r.included,serial:it.serial||r.serial||''});
    it.ai={source:r.source,confidence:r.confidence,confidenceNote:r.confidenceNote,needsReview:r.needsReview};
    it.repOnly=Object.assign({share:true},it.repOnly,r.valueRange?{low:r.valueRange.low,high:r.valueRange.high}:{}); it.aiConfirmed=false; LL.save(); }
  else LL.toast('AI Describe hit a snag — you can type details instead');
  if(location.hash.includes('/'+it.id+'/ai')) LL.render(true); };
LL.acts.confirmai = b => { const it=getItem(b.dataset.id); if(!/buyer arranges pickup/i.test(it.desc||'')) it.desc=((it.desc||'')+' '+LL.PICKUP).trim(); it.aiConfirmed=true; LL.save(); LL.toast('Listing confirmed'); LL.go(`#/sell/item/${it.id}/details`); };

/* ---------- camera ---------- */
LL.views.cam = ({id,shot}) => {
  const it=getItem(id); if(!it){ LL.go('#/sell',true); return {html:''}; }
  const sh=LL.shotsOf(it), si=Math.max(0,sh.findIndex(s=>s.k===shot)), cur=sh[si];
  const html = `<div class="cam" role="dialog" aria-label="Camera: ${esc(cur.n)}">
   <video playsinline muted autoplay aria-hidden="true"></video><img class="still" alt="" hidden>
   <div class="cam-fb" hidden><div style="width:68px;height:68px;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center">${I.camera.replace('<svg','<svg width="34" height="34"')}</div><h3>Use your phone’s camera</h3><p id="fbmsg">Live preview isn’t available here. Tap below to open the camera and take the photo — you can still get lighting and sharpness checks.</p><label class="btn accent" style="position:relative">${I.camera} Open camera<input type="file" accept="image/*" capture="environment" data-cap style="position:absolute;inset:0;opacity:0;width:100%"></label></div>
   <div class="shade"></div>
   <div class="cam-top"><div class="sbars" aria-label="Shot ${si+1} of ${sh.length}">${sh.map((s,i)=>`<i class="${has(it,s.k)&&i!==si?'done':i===si?'cur':''}"></i>`).join('')}</div>
    <div class="hd"><div class="ti"><b>${esc(cur.n)}</b><small>${si+1} of ${sh.length} · ${esc(itemName(it,S().items.indexOf(it)))}</small></div><a class="rbtn" href="#/sell/item/${it.id}/photos" aria-label="Close camera">${I.x}</a></div></div>
   <div class="frame ${cur.f==='plate'?'plate':''}" aria-hidden="true"><i></i><i></i><i></i><i></i><div class="sil"></div><div class="gl">${esc(cur.g)}</div></div>
   <div class="coach"><div class="chips" aria-live="polite"><span class="cchip ok" id="cl">${I.sun2} Checking light…</span><span class="cchip ok" id="cs">${I.focus} Checking focus…</span></div><div class="cam-tip" id="ctip">${TIPS[0]}</div></div>
   <div class="cam-bot"><label class="side"><span class="rbtn">${I.image}</span>Library<input type="file" accept="image/*" data-lib aria-label="Choose from library"></label>
    <button class="shutter" id="shut" aria-label="Take photo"></button>
    <label class="side"><span class="rbtn">${I.camera}</span>Phone cam<input type="file" accept="image/*" capture="environment" data-cap aria-label="Use phone camera app"></label></div>
   <div class="flash"></div></div>`;
  return {overlay:true, html, mount(el){
    const video=el.querySelector('video'), still=el.querySelector('.still'), fb=el.querySelector('.cam-fb'), cl=el.querySelector('#cl'), cs=el.querySelector('#cs'), tip=el.querySelector('#ctip');
    let stream, timer, tipT, ti=0, live=null, reviewing=false;
    const setChip=(c,ok,okT,badT,ic)=>{ c.className='cchip '+(ok?'ok':'warn'); c.innerHTML=ic+' '+(ok?okT:badT); };
    const stop=()=>{ clearInterval(timer); clearInterval(tipT); stream&&stream.getTracks().forEach(t=>t.stop()); };
    LL.cleanup.push(stop);
    tipT=setInterval(()=>{ if(live && !live.ok || reviewing) return; ti=(ti+1)%TIPS.length; tip.textContent=TIPS[ti]; },3800);
    const showVerdict=v=>{ setChip(cl,v.light==='ok','Light looks good',v.light==='dark'?'Too dark':'Too bright / glare',I.sun2); setChip(cs,v.sharp==='ok','Sharp','Hold steady',I.focus); tip.textContent = v.msgs.length? v.msgs[0] : TIPS[ti]; };
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
      el.querySelector('.cam').appendChild(r); el.querySelector('.cam-bot').hidden=true; el.querySelector('.coach').hidden=true;
      r.querySelector('[data-r=retake]').onclick=()=>{ r.remove(); still.hidden=true; video.hidden=false; el.querySelector('.cam-bot').hidden=false; el.querySelector('.coach').hidden=false; reviewing=false; };
      r.querySelector('[data-r=use]').onclick=async()=>{ await LL.photos.set(it.id,cur.k,url); it.photos[cur.k]=true; it.ai=null; it.aiConfirmed=false; LL.save();
        const nxt=sh.find(s=>!has(it,s.k)); if(nxt) LL.go(`#/sell/cam/${it.id}/${nxt.k}`,true); else { LL.toast('All required photos done'); LL.go(`#/sell/item/${it.id}/photos`,true); } };
    }
    el.querySelector('#shut').onclick=async()=>{ if(!video.videoWidth){ LL.toast('Camera not ready yet'); return; } const f=el.querySelector('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); if(navigator.vibrate) navigator.vibrate(12);
      const w=video.videoWidth,h=video.videoHeight; review(await LL.vision.toDataURL(video,w,h), LL.vision.analyze(video,w,h)); };
    el.querySelectorAll('input[type=file]').forEach(inp=>inp.addEventListener('change',async()=>{ const f=inp.files[0]; if(!f) return; try{ const r=await LL.vision.fromFile(f); review(r.url,r.a); }catch(e){ LL.toast('Could not read that photo'); } inp.value=''; }));
    start();
  }};
};

/* ---------- submit ---------- */
function csv(){ const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"'; const cols=['item_no','type','category','title','make','model','size','voltage_fuel','condition','condition_note','qty','serial','included','seller_notes','description','photo_front_or_overview','photo_plate_or_closeup','photo_back','photo_ready','ai_source','ai_confidence'];
  const rows=S().items.map((it,i)=>{ const sh=LL.shotsOf(it); return [i+1,it.type,LL.catLabel(it.cat),it.title,it.make,it.model,it.size,it.power,it.condition,it.conditionReason,it.qty,it.serial,it.included,it.notes,it.desc,...sh.map(s=>has(it,s.k)?'yes':'no'),...(sh.length<3?['n/a']:[]),sh.every(s=>has(it,s.k))?'yes':'no',it.ai?.source||'',it.ai?.confidence||''].map(q).join(','); });
  return [cols.join(','),...rows].join('\r\n'); }
function summary(){ const p=S().profile,st=stats(); return `LOCAL LIQUIDATORS — SELLER INVENTORY SUMMARY (PROTOTYPE)\nBusiness: ${p.business}\nContact: ${p.contact}${p.email?' · '+p.email:''}${p.phone?' · '+p.phone:''}\nLocation(s): ${p.locations.join(' | ')}\nClosing date: ${p.closing||'not set'}\nItems: ${st.n}  ·  Photo-ready: ${st.pct}%\n\n`+S().items.map((it,i)=>`${i+1}. ${it.title||'(untitled)'} — ${LL.catLabel(it.cat)}, ${it.condition}${it.qty>1?', qty '+it.qty:''}${LL.shotsOf(it).every(s=>has(it,s.k))?'':'  [needs photos]'}`).join('\n')+'\n\nRate: your rep will confirm.\nPhotos stay in the app until a real backend uploads them.\n'; }
LL.views.submit = () => { const st=stats(), p=S().profile; if(!p.done||!st.n){ LL.go('#/sell',true); return {html:''}; }
  const miss=st.tot-st.done;
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><a class="iconbtn" href="#/sell" aria-label="Back">${I.back}</a><h2 style="font-size:30px;font-weight:800">Submit to my rep</h2></div>
   <div class="card pad"><dl class="kv"><dt>Business</dt><dd>${esc(p.business)}</dd><dt>Contact</dt><dd>${esc(p.contact)}</dd><dt>Location(s)</dt><dd>${esc(p.locations.join('; '))}</dd><dt>Closing</dt><dd>${esc(p.closing||'—')}</dd><dt>Inventory</dt><dd>${st.n} items</dd><dt>Photo-ready</dt><dd>${st.pct}%</dd></dl></div>
   ${miss?`<div class="ai-banner" style="margin-top:12px">${I.info.replace('<svg','<svg width="22" height="22" style="flex:none"')}<div><b>${miss} photo${miss===1?'':'s'} still missing.</b> You can submit now and finish later, but complete photos help your rep list faster.</div></div>`:''}
   <label class="field" style="margin-top:14px"><span>Note for your rep (optional)</span><textarea id="repnote" rows="3" placeholder="Loading dock hours, items to skip, access notes…"></textarea></label>
   <div class="tintcard" style="margin-bottom:16px">Your rep will confirm your rate.</div>
   <button class="btn accent block" data-act="dosubmit">${I.check} Submit to my rep</button></div>`}; };
LL.acts.dosubmit = () => { S().submitted={at:Date.now(),count:S().items.length,pct:stats().pct,note:(LL.$('#repnote')||{}).value||''}; LL.save(); LL.go('#/sell/done'); };
LL.views.done = () => { const sub=S().submitted; if(!sub){ LL.go('#/sell',true); return {html:''}; } const p=S().profile;
  return {html:`<div class="pad center" style="padding-top:28px"><div class="check">${I.check.replace('<svg','<svg viewBox="0 0 24 24"')}</div><h2 style="font-size:36px;font-weight:800;margin-top:18px">Submitted!</h2><p class="muted" style="margin:6px 0 18px">${sub.count} items saved on this device for <b>${esc(p.business)}</b>. Your rep will review and confirm your rate.</p>
   <div style="display:grid;gap:10px;text-align:left"><button class="btn block" data-act="dlcsv">${I.download} Download CSV</button><button class="btn ghost block" data-act="dltxt">${I.download} Download summary</button><a class="btn line block" data-act="mailrep" href="#">${I.mail} Email my rep</a></div>
   <p class="small muted" style="margin-top:14px">Prototype: nothing is sent automatically. Email opens your mail app with a summary — attach the CSV. A real backend would upload photos and data straight to your rep.</p><a class="btn ghost block" style="margin-top:14px" href="#/sell">Back to inventory</a></div>`}; };
LL.acts.dlcsv = () => LL.download('inventory-'+(S().profile.business||'seller').replace(/\W+/g,'-').toLowerCase()+'.csv', csv(), 'text/csv');
LL.acts.dltxt = () => LL.download('inventory-summary.txt', summary());
LL.acts.mailrep = b => { const body=summary().slice(0,1600); b.href=`mailto:${LL.EMAIL}?subject=${encodeURIComponent('Inventory from '+S().profile.business+' (prototype)')}&body=${encodeURIComponent(body+'\n\n(Attach the downloaded CSV.)')}`; };
})();
