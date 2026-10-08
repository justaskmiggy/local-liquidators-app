/* BUYER side: browse, swipe viewer (reels), alerts & watchlist */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
LL.views = LL.views || {}; LL.acts = LL.acts || {};
const emoji = c => (LL.cat.find(x=>x.id===c)||{}).emoji || 'other';
const img = (l,v,j) => LL.art(emoji(l.cat), v, (l.seed||0)+(j||0), 'EXAMPLE');
const cover = l => img(l, l.views[0]);
const watching = id => S().watch.includes(id), belled = id => S().lotAlerts.includes(id);
const heartBtn = (l,cls='hbtn') => `<button class="${cls} ${watching(l.id)?'on':''}" data-act="heart" data-heart="${l.id}" data-id="${l.id}" aria-pressed="${watching(l.id)}" aria-label="${watching(l.id)?'Remove from':'Add to'} watchlist: ${esc(l.t)}">${watching(l.id)?I.heartFill:I.heart}</button>`;
/* ---------- buyer value snapshot (AI estimate; SAMPLE data in the prototype). Live lots only — never on results, never seller-side ---------- */
const hasValue = l => !l.result && l.newPrice>0 && l.usedRange && l.usedRange.high>0;
const kfmt = n => { const k=Math.round(n/100)/10; return (k%1?k.toFixed(1):String(k)); };
const short = n => n>=1000 ? '$'+kfmt(n)+'k' : '$'+Math.round(n);
const shortRange = r => (r.low>=1000 && r.high>=1000) ? '$'+kfmt(r.low)+'–'+kfmt(r.high)+'k' : short(r.low)+'–'+short(r.high);
const fullRange = r => LL.money(r.low)+'–'+LL.money(r.high);
const valueAria = l => `AI estimate${l.valueSource==='sample'?' (example)':''}: new about ${LL.money(l.newPrice)}, used ${LL.money(l.usedRange.low)} to ${LL.money(l.usedRange.high)}`;
LL.valueText = l => hasValue(l) ? {newPrice:'~'+LL.money(l.newPrice), used:fullRange(l.usedRange)} : null;
const vmini = l => hasValue(l) ? `<div class="vmini" role="group" aria-label="${esc(valueAria(l))}"><small class="vai" aria-hidden="true">${I.sparkle}AI estimate</small><div class="vcols" aria-hidden="true"><span><small>New</small><b>~${short(l.newPrice)}</b></span><span><small>Used</small><b>${shortRange(l.usedRange)}</b></span></div></div>` : '';
const vsnap = l => hasValue(l) ? `<div class="vsnap" role="group" aria-label="${esc(valueAria(l))}"><div class="vchips"><span class="vchip"><small>New</small><b>~${LL.money(l.newPrice)}</b></span><span class="vchip"><small>Used</small><b>${fullRange(l.usedRange)}</b></span></div><button class="vinfo" data-act="valueinfo" data-id="${l.id}" aria-haspopup="dialog" aria-label="About this AI estimate"><span>AI estimate</span>${I.info}</button></div>` : '';
const lcard = (l,scope='all') => `<div class="lcard"><a class="im" href="#/buy/reels/${scope}/${l.id}" style="display:block" aria-label="View ${esc(l.t)}"><img loading="lazy" src="${cover(l)}" alt="Illustration: ${esc(LL.catLabel(l.cat))}"><span class="tm"><span data-ends="${l.ends}">${LL.fmtLeft(l.ends-Date.now())}</span></span></a>${heartBtn(l)}<a class="b" href="#/buy/reels/${scope}/${l.id}" style="display:block;text-decoration:none;color:inherit"><h4>${esc(l.t)}</h4><div class="pr">${LL.money(l.bid)} <small>· ${l.bids} bids</small></div><div class="small muted">${esc(l.city)}, ${l.st}</div>${vmini(l)}</a></div>`;

/* ---------- browse ---------- */
function browseBody(){
  const {q,cat}=S().ui, filt = (q&&q.trim()) || cat!=='all', lots = LL.filterLots(q,cat);
  if(filt) return `<div class="sec"><h2>${lots.length} example lot${lots.length===1?'':'s'}</h2>${lots.length?`<a href="#/buy/reels/all">Swipe them ${I.chev.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')}</a>`:''}</div>${lots.length?`<div class="grid2">${lots.map(l=>lcard(l)).join('')}</div>`:`<div class="empty">${I.search}<h3>No matches</h3><p>Try a different word or category — or set up an alert and we’ll tell you when something shows up.</p><a class="btn accent" style="margin-top:12px" href="#/alerts/new">${I.bell} Create alert</a></div>`}`;
  const live = LL.AUCTIONS.filter(a=>a.live), res = LL.AUCTIONS.filter(a=>!a.live);
  return `<div class="sec"><h2>Featured auctions</h2><a href="#/buy/reels/all">Swipe all ${I.chev.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')}</a></div>
   ${live.map(a=>{ const ls=LL.LOTS.filter(l=>l.a===a.id), soon=Math.min(...ls.map(l=>l.ends)), c=ls[0]; return `<article class="acard"><a class="cover" href="#/buy/reels/${a.id}" aria-label="Swipe lots in ${esc(a.title)}" style="text-decoration:none"><img loading="lazy" src="${LL.art(a.art,'front',a.seed,'EXAMPLE')}" alt=""><span class="shade"></span><span class="tl"><span class="badge acc">Live · example</span></span><span class="bl"><h3>${esc(a.title)}</h3><small>${esc(a.loc)} · ${ls.length} lots · first ends <span data-ends="${soon}">${LL.fmtLeft(soon-Date.now())}</span></small></span></a>
     <div class="cb"><p class="small muted">${esc(a.blurb)} <i>(Example lot.)</i></p><div style="display:flex;gap:8px;margin-top:10px"><a class="btn sm block" href="#/buy/reels/${a.id}">${I.play} Swipe lots</a><a class="btn sm ghost" style="flex:none" target="_blank" rel="noopener" href="${LL.SITE}" aria-label="Open localauctions.com">${I.ext}</a></div></div></article>`; }).join('')}
   <div class="sec"><h2>Recent results</h2><span class="badge">Real examples</span></div>
   ${res.map(a=>`<article class="acard"><div class="cb" style="padding-top:14px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><h3 style="font-size:23px;font-weight:800">${esc(a.title)}</h3><span class="small muted">${esc(a.closed)} · ${a.lots} lots</span></div><div class="bigstat" style="text-align:right">${a.total}<small style="display:block;margin:2px 0 0">winning bids</small></div></div>
     <ul class="hl">${a.hl.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>
     <div style="display:flex;gap:8px;margin-top:12px"><a class="btn sm block" href="#/buy/reels/${a.id}">${I.play} Highlights</a><a class="btn sm ghost block" target="_blank" rel="noopener" href="${a.url}">${I.ext} Open on localauctions.com</a></div></div></article>`).join('')}
   <p class="small muted" style="padding:0 16px 8px">Results are winning bids before buyer’s premium and tax. Photos are generated illustrations, not the actual lots.</p>
   <div class="sec"><h2>Lots ending soon</h2><span class="badge">Examples</span></div><div class="grid2">${[...LL.LOTS].sort((a,b)=>a.ends-b.ends).slice(0,6).map(l=>lcard(l)).join('')}</div>`;
}
LL.views.buy = () => { const {q,cat}=S().ui;
  const stories = `<div class="stories" role="list">${LL.AUCTIONS.map(a=>`<a class="story" role="listitem" href="#/buy/reels/${a.id}"><div class="ringw"><div class="in"><img src="${LL.art(a.art,'front',a.seed,a.live?'EXAMPLE':'RESULT')}" alt=""></div></div><span class="nm">${esc(a.live?a.loc.split(',')[0]:({cary:'Cary ✓',wsp:'W. St. Paul ✓'})[a.id])}</span></a>`).join('')}</div>`;
  return {html:`<div class="search"><label class="sr" for="q">Search example lots</label>${I.search}<input id="q" type="search" placeholder="Search ovens, mixers, Phoenix…" value="${esc(q)}" enterkeyhint="search" autocomplete="off"></div>
   <div class="chips" role="group" aria-label="Categories"><button class="chip" aria-pressed="${cat==='all'}" data-act="cat" data-v="all">All</button>${LL.cat.map(c=>`<button class="chip" aria-pressed="${cat===c.id}" data-act="cat" data-v="${c.id}">${esc(c.label)}</button>`).join('')}</div>
   ${stories}<div id="bb">${browseBody()}</div>`,
   mount(el){ el.querySelector('#q').addEventListener('input',e=>{ S().ui.q=e.target.value; LL.save(); el.querySelector('#bb').innerHTML=browseBody(); }); }}; };
LL.acts.cat = b => { S().ui.cat=b.dataset.v; LL.save(); LL.$$('[data-act=cat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); LL.$('#bb').innerHTML=browseBody(); };
LL.acts.heart = b => { const id=b.dataset.id, w=S().watch, on=!w.includes(id); if(on) w.push(id); else w.splice(w.indexOf(id),1); LL.save();
  LL.$$(`[data-heart="${id}"]`).forEach(x=>{ x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); x.innerHTML=on?I.heartFill:I.heart; x.classList.remove('pop'); void x.offsetWidth; if(on) x.classList.add('pop'); const lab=x.querySelector('.lab'); });
  LL.$$(`[data-heart-lab="${id}"]`).forEach(x=>x.textContent=on?'Saved':'Watch');
  LL.toast(on?'Added to watchlist':'Removed from watchlist'); LL.badges(); };
LL.acts.bell = b => { const id=b.dataset.id, a=S().lotAlerts, on=!a.includes(id); if(on) a.push(id); else a.splice(a.indexOf(id),1); LL.save();
  LL.$$(`[data-bell="${id}"]`).forEach(x=>{ x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); x.innerHTML=on?I.bellFill:I.bell; });
  const l=LL.lot(id); if(on) LL.toast('Alert on for this lot','More like this',()=>LL.go('#/alerts/new/'+l.cat)); else LL.toast('Alert off'); };

/* ---------- swipe viewer ---------- */
function reelHTML(l,i,n){
  const slides = l.views.map((v,j)=>`<div class="sl" data-j="${j}"><img data-src="${img(l,v,j)}" alt="Illustration — ${esc(l.t)}, ${esc(v)} view" draggable="false" decoding="async"></div>`).join('');
  const nums = l.result ? `<div><small>Result</small><b style="font-size:24px">${esc(l.res)}</b></div>` : `<div><small>Current bid</small><b>${LL.money(l.bid)}</b></div><div class="tmr"><small>Ends in</small><b data-ends="${l.ends}">${LL.fmtLeft(l.ends-Date.now())}</b></div>`;
  const a = LL.auction(l.a);
  return `<section class="reel" data-id="${l.id}" data-i="${i}" aria-label="Lot ${i+1} of ${n}: ${esc(l.t)}">
   <div class="car" data-car tabindex="-1">${slides}</div><div class="vig"></div>
   <div class="rail">${l.result?'':`<div>${heartBtn(l,'rbtn')}<span class="lab" data-heart-lab="${l.id}">${watching(l.id)?'Saved':'Watch'}</span></div>`}
    <div><button class="rbtn bell ${belled(l.id)?'on':''}" data-act="bell" data-bell="${l.id}" data-id="${l.id}" aria-pressed="${belled(l.id)}" aria-label="Alert me about this lot">${belled(l.id)?I.bellFill:I.bell}</button><span class="lab">Alert</span></div>
    <div><a class="rbtn" href="${l.url}" target="_blank" rel="noopener" aria-label="Open on localauctions.com">${I.ext}</a><span class="lab">Open</span></div></div>
   <div class="meta"><span class="srcs">${esc(a?a.title:'')} · ${l.result?'Recent result':'Example lot'}</span><h3>${esc(l.t)}</h3>
    <div class="sub">${l.result?esc(a.loc):esc(l.city)+', '+l.st+' · '+esc(LL.catLabel(l.cat))}</div>
    <div class="nums">${nums}</div>${vsnap(l)}<div class="dots" aria-hidden="true">${l.views.map((_,j)=>`<i class="${j?'':'on'}"></i>`).join('')}</div>
    <a class="btn accent block" href="${l.url}" target="_blank" rel="noopener">${I.ext} Open on localauctions.com</a></div>
   <div class="sampletag"><span class="badge sample">${l.result?'Result · illustration':'Example lot'}</span></div></section>`;
}
LL.views.reels = ({scope='all',lotId}) => {
  const lots = LL.scopeLots(scope);
  if(!lots.length) return {overlay:true, html:`<div class="reels"><div class="reels-top"><a class="rbtn" href="#/buy" aria-label="Back">${I.back}</a></div><div class="empty" style="padding-top:35%;color:#fff">${I.heart}<h3 style="color:#fff">Nothing here yet</h3><p>Tap the heart on any lot to watch it.</p><a class="btn accent" style="margin-top:14px" href="#/buy">Browse lots</a></div></div>`};
  const start = Math.max(0, lots.findIndex(l=>l.id===lotId));
  const first = !S().ui.zoomHint;
  return {overlay:true, html:`<div class="reels"><div class="reels-top"><a class="rbtn" href="#/buy" aria-label="Back to browse" data-back>${I.back}</a><div class="ttl"><b>${esc(LL.scopeTitle(scope))}</b><small id="rcount">${start+1} of ${lots.length} · swipe up/down for lots, left/right for photos</small></div></div>
   <div class="reels-feed" id="feed" role="feed" aria-label="Lots">${lots.map((l,i)=>reelHTML(l,i,lots.length)).join('')}</div>${first?`<div class="hintz" role="status">Double-tap or pinch to zoom</div>`:''}</div>`,
   mount(el){
     S().ui.zoomHint=true; LL.save();
     const feed=el.querySelector('#feed'), reels=[...feed.querySelectorAll('.reel')], cnt=el.querySelector('#rcount');
     const load = r => { if(!r) return; r.querySelectorAll('img[data-src]').forEach(im=>{ im.src=im.dataset.src; im.removeAttribute('data-src'); const done=()=>im.classList.add('ld'); im.decode?im.decode().then(done,done):(im.onload=done); }); };
     feed.scrollTop = start*feed.clientHeight; load(reels[start]); load(reels[start+1]); load(reels[start-1]);
     const near = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting) load(e.target); }),{root:feed,rootMargin:'100% 0px 100% 0px'}); reels.forEach(r=>near.observe(r));
     const act = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting && e.intersectionRatio>=.6){ const r=e.target, i=+r.dataset.i; cnt.textContent=`${i+1} of ${lots.length} · swipe up/down for lots, left/right for photos`; load(reels[i+1]); load(reels[i-1]); history.replaceState(null,'',`#/buy/reels/${scope}/${r.dataset.id}`); } }),{root:feed,threshold:[.6]}); reels.forEach(r=>act.observe(r));
     LL.cleanup.push(()=>{ near.disconnect(); act.disconnect(); });
     reels.forEach(r=>{ const car=r.querySelector('.car'), dots=[...r.querySelectorAll('.dots i')]; let raf=0;
       car.addEventListener('scroll',()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ const j=Math.round(car.scrollLeft/car.clientWidth); dots.forEach((d,k)=>d.classList.toggle('on',k===j)); }); },{passive:true});
       r.querySelectorAll('.sl').forEach(sl=>zoom(sl,r,feed)); });
     el.addEventListener('keydown',e=>{ const car=reels.find(r=>Math.abs(r.getBoundingClientRect().top)<10)?.querySelector('.car'); if(e.key==='ArrowDown') feed.scrollBy({top:feed.clientHeight,behavior:'smooth'}); else if(e.key==='ArrowUp') feed.scrollBy({top:-feed.clientHeight,behavior:'smooth'}); else if(e.key==='ArrowRight'&&car) car.scrollBy({left:car.clientWidth}); else if(e.key==='ArrowLeft'&&car) car.scrollBy({left:-car.clientWidth}); });
   }};
};
/* pinch + double-tap zoom with pan (pointer events) */
function zoom(sl,reel,feed){
  const im=sl.querySelector('img'); let s=1,tx=0,ty=0; const ptr=new Map(); let d0=0,s0=1,last=0,lx=0,ly=0,moved=false;
  const apply=(anim)=>{ const w=sl.clientWidth,h=sl.clientHeight; tx=Math.min(0,Math.max(w*(1-s),tx)); ty=Math.min(0,Math.max(h*(1-s),ty)); im.style.transition=anim?'transform .26s cubic-bezier(.2,.8,.2,1)':'none'; im.style.transform=`translate(${tx}px,${ty}px) scale(${s})`; const z=s>1.02; reel.classList.toggle('zoomed',z); sl.classList.toggle('zm',z); feed.classList.toggle('lock',z); };
  const rel=e=>{ const b=sl.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  const zoomAt=(x,y,ns,anim)=>{ const px=(x-tx)/s, py=(y-ty)/s; s=Math.min(4,Math.max(1,ns)); tx=x-px*s; ty=y-py*s; if(s<=1.01){s=1;tx=ty=0;} apply(anim); };
  sl.addEventListener('pointerdown',e=>{ ptr.set(e.pointerId,[e.clientX,e.clientY]); moved=false; if(ptr.size===2){ const [a,b]=[...ptr.values()]; d0=Math.hypot(a[0]-b[0],a[1]-b[1]); s0=s; } if(s>1) sl.setPointerCapture(e.pointerId); lx=e.clientX; ly=e.clientY; });
  sl.addEventListener('pointermove',e=>{ if(!ptr.has(e.pointerId)) return; const prev=ptr.get(e.pointerId); ptr.set(e.pointerId,[e.clientX,e.clientY]);
    if(ptr.size===2){ const [a,b]=[...ptr.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); const bb=sl.getBoundingClientRect(); zoomAt((a[0]+b[0])/2-bb.left,(a[1]+b[1])/2-bb.top,s0*d/d0,false); moved=true; e.preventDefault(); }
    else if(s>1){ tx+=e.clientX-prev[0]; ty+=e.clientY-prev[1]; apply(false); moved=true; }
    if(Math.hypot(e.clientX-lx,e.clientY-ly)>8) moved=true; });
  const up=e=>{ if(!ptr.has(e.pointerId)) return; const n=ptr.size; ptr.delete(e.pointerId);
    if(n===1 && !moved && (e.pointerType!=='mouse'||e.type==='pointerup')){ const t=Date.now(); if(t-last<320){ const [x,y]=rel(e); if(s>1) { s=1;tx=ty=0; apply(true);} else zoomAt(x,y,2.6,true); last=0; } else last=t; }
    if(s<1.05 && s!==1){ s=1;tx=ty=0; apply(true); } };
  sl.addEventListener('pointerup',up); sl.addEventListener('pointercancel',e=>{ ptr.delete(e.pointerId); });
  sl.addEventListener('dblclick',e=>e.preventDefault());
  sl.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); const [x,y]=rel(e); zoomAt(x,y,s*(e.deltaY<0?1.15:.87),false); },{passive:false});
}

/* ---------- value info sheet ---------- */
LL.sheet = (html, label) => {
  LL.closeSheet && LL.closeSheet(true);
  const opener = document.activeElement, wrap = document.createElement('div');
  wrap.className='sheetwrap'; wrap.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${label}" tabindex="-1"><div class="grab" aria-hidden="true"></div>${html}</div>`;
  LL.$('#app').appendChild(wrap); requestAnimationFrame(()=>wrap.classList.add('on'));
  const close = instant => { if(!wrap.isConnected) return; document.removeEventListener('keydown',key,true); window.removeEventListener('hashchange',hc); LL.closeSheet=null;
    if(instant) wrap.remove(); else { wrap.classList.remove('on'); setTimeout(()=>wrap.remove(),260); } if(opener && opener.isConnected && opener.focus) opener.focus({preventScroll:true}); };
  const key = e => { if(e.key==='Escape'){ e.stopPropagation(); close(); } else if(e.key==='Tab'){ const f=[...wrap.querySelectorAll('button,a[href]')]; if(!f.length) return; const a=f[0], z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } } };
  const hc = () => close(true);
  wrap.addEventListener('click', e => { if(e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown',key,true); window.addEventListener('hashchange',hc);
  LL.closeSheet = close; (wrap.querySelector('.sheet [data-close]')||wrap.querySelector('.sheet')).focus({preventScroll:true});
  return close;
};
LL.VALUE_NOTE = 'Estimated from comparable new and used listings online. For reference only, not a guarantee. Final price is set by bidding.';
LL.acts.valueinfo = b => { const l=LL.lot(b.dataset.id); if(!l || !hasValue(l)) return; const sample=l.valueSource==='sample';
  const comps=(l.comps||[]).slice(0,3);
  LL.sheet(`<div class="sh-hd"><h3 id="vs-t">${I.sparkle}AI estimate</h3><button class="iconbtn" data-close aria-label="Close">${I.x}</button></div>
   <p class="sh-lot">${esc(l.t)}</p>
   <div class="vbig"><div><small>New price</small><b>~${LL.money(l.newPrice)}</b><span>Typical retail, new</span></div><div><small>Used value</small><b>${fullRange(l.usedRange)}</b><span>Comparable used listings</span></div></div>
   <p class="vnote">${LL.VALUE_NOTE}</p>
   ${comps.length?`<div class="comps-h"><b>Comparable listings</b>${sample?'<span class="badge demo">Example</span>':''}</div>
   <ul class="comps">${comps.map(c=>`<li><span><b>${esc(c.src)}</b><small>${c.kind==='new'?'New':'Used'} listing</small></span><b>${LL.money(c.price)}</b></li>`).join('')}</ul>`:''}
   ${sample?'<p class="small muted sh-foot">These figures and comparables are example estimates, not live quotes.</p>':''}
   <button class="btn ghost block" data-close>Got it</button>`, 'vs-t'); };

/* ---------- alerts ---------- */
function notifState(){ if(!('Notification' in window)) return 'unsupported'; return Notification.permission; }
async function showNote(title,body){ try{ const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if(reg && reg.showNotification){ await reg.showNotification(title,{body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'ll-test'}); return true; } new Notification(title,{body,icon:'icons/icon-192.png'}); return true; }catch(e){ return false; } }
LL.acts.notif = async b => {
  if(!b.checked){ S().notify=false; LL.save(); LL.render(true); return; }
  const ns=notifState();
  if(ns==='unsupported'){ b.checked=false; LL.toast('Notifications aren’t available in this browser'); return; }
  let p = ns; if(p==='default') p = await Notification.requestPermission();
  if(p==='granted'){ S().notify=true; LL.save(); LL.render(true); await showNote('Alerts are on','This is a test notification from Speedy List AI.'); }
  else { b.checked=false; S().notify=false; LL.save(); LL.render(true); LL.toast('Notifications are blocked — enable them in browser settings'); }
};
LL.acts.testalert = async b => { const s=S().searches.find(x=>x.id===b.dataset.id); const n=LL.matchSearch(s).length; const t=s.name||'Saved search'; if(S().notify && notifState()==='granted'){ const ok=await showNote('New match: '+t, n+' example lot'+(n===1?'':'s')+' match your alert (test).'); LL.toast(ok?'Test notification sent':'Could not show notification'); } else LL.toast('Turn on notifications first'); };
LL.acts.delsearch = b => { S().searches=S().searches.filter(x=>x.id!==b.dataset.id); LL.save(); LL.render(true); LL.toast('Alert deleted'); };
LL.acts.togsearch = b => { const s=S().searches.find(x=>x.id===b.dataset.id); s.on=b.checked; LL.save(); };
const desc = s => [s.kw&&`“${s.kw}”`, s.cat&&s.cat!=='any'&&LL.catLabel(s.cat), s.state&&s.state!=='any'&&s.state, s.miles&&`≤${s.miles} mi of Phoenix`, (s.min||s.max)&&`${s.min?LL.money(s.min):'$0'}–${s.max?LL.money(s.max):'any'}`].filter(Boolean).join(' · ') || 'Any lot';
LL.views.alerts = ({sub,arg}) => {
  if(sub==='new') return newSearch(arg);
  const w = sub==='watch', ns=notifState();
  const status = ns==='unsupported' ? 'Not supported here. On iPhone, add this app to your Home Screen first (iOS 16.4+).' : ns==='denied' ? 'Blocked in your browser settings.' : S().notify && ns==='granted' ? 'On — you’ll see alerts on this device.' : 'Off — turn on to get notified.';
  const head = `<div class="pad" style="padding-bottom:4px"><div class="seg" role="tablist" aria-label="Alerts sections"><button role="tab" aria-selected="${!w}" data-nav="#/alerts">Saved searches</button><button role="tab" aria-selected="${w}" data-nav="#/alerts/watch">Watchlist${S().watch.length?' ('+S().watch.length+')':''}</button></div></div>`;
  if(w){ const ls=LL.scopeLots('watch');
    return {html: head + (ls.length? `<div class="sec"><h2>Watching ${ls.length}</h2><a href="#/buy/reels/watch">Swipe ${I.chev.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')}</a></div><div class="pad" style="padding-top:0">${ls.map(l=>`<div class="listrow"><a href="#/buy/reels/watch/${l.id}" style="width:72px;height:72px;border-radius:14px;overflow:hidden;flex:none"><img src="${cover(l)}" alt="" style="width:100%;height:100%;object-fit:cover"></a><div><b>${esc(l.t)}</b><span class="small muted">${LL.money(l.bid)} · ends <span data-ends="${l.ends}">${LL.fmtLeft(l.ends-Date.now())}</span></span></div>${heartBtn(l,'iconbtn').replace('class="iconbtn on"','class="iconbtn on" style="color:#e0245e"')}</div>`).join('')}</div>`
      : `<div class="empty">${I.heart}<h3>Nothing on your watchlist</h3><p>Tap the heart on any example lot to keep an eye on it.</p><a class="btn accent" style="margin-top:12px" href="#/buy">Browse lots</a></div>`)}; }
  return {html: head + `<div class="pad"><div class="card pad"><div class="listrow" style="padding:0;border:0"><div><b>Push notifications</b><span class="small muted">${status}</span></div><span class="switch"><input type="checkbox" data-act="notif" ${S().notify&&ns==='granted'?'checked':''} aria-label="Enable notifications" ${ns==='unsupported'?'disabled':''}><i></i></span></div></div>
   <div class="sec" style="padding-left:0;padding-right:0"><h2>My alerts</h2><a href="#/alerts/new">${I.plus.replace('<svg','<svg width="14" height="14" style="vertical-align:-2px"')} New</a></div>
   ${S().searches.length? S().searches.map(s=>{ const n=LL.matchSearch(s).length; return `<div class="card pad" style="margin-bottom:12px"><div class="listrow" style="padding:0;border:0"><div><b>${esc(s.name||'Saved search')}</b><span class="small muted">${esc(desc(s))}</span></div><span class="switch"><input type="checkbox" data-act="togsearch" data-id="${s.id}" ${s.on?'checked':''} aria-label="Alert on"><i></i></span></div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center"><span class="badge ${n?'ok':''}">${n} example match${n===1?'':'es'}</span><span style="flex:1"></span>${n?`<a class="btn sm ghost" href="#/buy/reels/s:${s.id}">View</a>`:''}<button class="btn sm ghost" data-act="testalert" data-id="${s.id}">Test</button><button class="iconbtn" data-act="delsearch" data-id="${s.id}" aria-label="Delete alert">${I.trash}</button></div></div>`; }).join('')
     : `<div class="empty">${I.bell}<h3>No alerts yet</h3><p>Tell us what you’re hunting for — keywords, category, location and price — and we’ll watch for it.</p><a class="btn accent" style="margin-top:12px" href="#/alerts/new">${I.plus} Create an alert</a></div>`}
   <p class="small muted" style="margin-top:8px">Alerts match against the example lots on this device for now.</p></div>`};
};
function newSearch(preCat){
  const f={name:'',kw:'',cat:LL.cat.some(c=>c.id===preCat)?preCat:'any',loc:'any',state:'AZ',miles:100,min:'',max:''};
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><a class="iconbtn" href="#/alerts" aria-label="Back">${I.back}</a><h2 style="font-size:30px;font-weight:800">New alert</h2></div>
   <label class="field"><span>Keywords</span><input type="text" id="s-kw" placeholder="e.g., Hobart mixer, reach-in" autocomplete="off"></label>
   <div class="lbl">Category</div><div class="chips wrap" id="s-cat"><button type="button" class="chip" data-v="any">Any</button>${LL.cat.map(c=>`<button type="button" class="chip" data-v="${c.id}">${esc(c.label)}</button>`).join('')}</div>
   <div class="lbl" style="margin-top:8px">Where</div><div class="seg" id="s-loc" style="margin-bottom:10px"><button type="button" data-v="any">Anywhere</button><button type="button" data-v="state">State</button><button type="button" data-v="miles">Distance</button></div>
   <div id="s-state" hidden><label class="field"><span>State</span><select id="s-st">${LL.STATES.map(s=>`<option ${s==='AZ'?'selected':''}>${s}</option>`).join('')}</select></label></div>
   <div id="s-miles" hidden><label class="field"><span>Within <b id="s-mv">100</b> miles of Phoenix, AZ</span><input type="range" id="s-mi" min="25" max="500" step="25" value="100" style="width:100%;accent-color:var(--accent);height:44px"></label></div>
   <div class="row"><label class="field"><span>Min price</span><input type="number" id="s-min" inputmode="numeric" min="0" placeholder="$0"></label><label class="field"><span>Max price</span><input type="number" id="s-max" inputmode="numeric" min="0" placeholder="No limit"></label></div>
   <label class="field"><span>Name (optional)</span><input type="text" id="s-nm" placeholder="e.g., Mixers under $5k" autocomplete="off"></label>
   <div class="tintcard" id="s-prev" style="margin-bottom:14px" aria-live="polite"></div>
   <button class="btn accent block" id="s-save">${I.bell} Save alert</button></div>`,
   mount(el){ const $=s=>el.querySelector(s);
     const sync=()=>{ [...$('#s-cat').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===f.cat)); [...$('#s-loc').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===f.loc)); $('#s-state').hidden=f.loc!=='state'; $('#s-miles').hidden=f.loc!=='miles';
       const s=build(); const n=LL.matchSearch(s).length; $('#s-prev').innerHTML=`<b>${n} example lot${n===1?'':'s'}</b> match right now.<br><span class="small muted">${esc(desc(s))}</span>`; };
     const build=()=>({kw:$('#s-kw').value.trim(),cat:f.cat,state:f.loc==='state'?$('#s-st').value:'any',miles:f.loc==='miles'?+$('#s-mi').value:0,min:+$('#s-min').value||0,max:+$('#s-max').value||0});
     $('#s-cat').onclick=e=>{ const b=e.target.closest('button'); if(b){ f.cat=b.dataset.v; sync(); } };
     $('#s-loc').onclick=e=>{ const b=e.target.closest('button'); if(b){ f.loc=b.dataset.v; sync(); } };
     el.addEventListener('input',e=>{ if(e.target.id==='s-mi') $('#s-mv').textContent=e.target.value; sync(); });
     $('#s-save').onclick=()=>{ const s=Object.assign(build(),{id:LL.uid(),name:$('#s-nm').value.trim(),on:true}); S().searches.unshift(s); LL.save(); LL.toast('Alert saved'); LL.go('#/alerts'); };
     sync(); }};
}
})();
