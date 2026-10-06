/* App shell: hash router, tabs, welcome, profile, theme, install, service worker */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
LL.cleanup = [];
const view = LL.$('#view'), overlay = LL.$('#overlay');
let installEvt = null;

LL.go = (h, replace) => { if(location.hash === h){ LL.render(); return; } if(replace) location.replace(h); else location.hash = h; };

function parse(){
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if(!p.length) return {name: S().mode ? (S().mode==='buy'?'buy':'sell') : 'welcome', tab: S().mode==='buy'?'buy':'sell'};
  const [a,b,c,d] = p;
  if(a==='welcome') return {name:'welcome'};
  if(a==='sell'){ if(b==='item') return {name:'item', tab:'sell', id:c, step:d||'photos'}; if(b==='cam') return {name:'cam', tab:'sell', id:c, shot:d, under:'#/sell/item/'+c+'/photos'};
    if(b==='submit') return {name:'submit', tab:'sell'}; if(b==='done') return {name:'done', tab:'sell'}; if(b==='onboard') return {name:'onboard', tab:'sell'}; return {name:'sell', tab:'sell'}; }
  if(a==='buy'){ if(b==='reels') return {name:'reels', tab:'buy', scope:c||'all', lotId:d, under:'#/buy'}; return {name:'buy', tab:'buy'}; }
  if(a==='alerts') return {name:'alerts', tab:'alerts', sub:b, arg:c};
  if(a==='profile') return {name:'profile', tab:'profile'};
  return {name:'sell', tab:'sell'};
}
const TITLES = {welcome:'Welcome',sell:'Sell',onboard:'Your closing',item:'Item',cam:'Camera',submit:'Submit',done:'Submitted',buy:'Buy',reels:'Lots',alerts:'Alerts',profile:'Profile'};
let lastUnder = '';
LL.render = function(keep){
  LL.cleanup.splice(0).forEach(f=>{ try{f();}catch(e){} });
  const r = parse(); const fn = LL.views[r.name];
  document.title = (TITLES[r.name]||'') + ' · Just Ask Miggy (prototype)';
  const welcome = r.name==='welcome';
  LL.$('.topbar').hidden = LL.$('.protostrip').hidden = LL.$('.tabbar').hidden = welcome;
  LL.$$('.tab').forEach(t=>t.removeAttribute('aria-current')); if(r.tab) LL.$(`.tab[data-tab=${r.tab}]`)?.setAttribute('aria-current','page');
  LL.$('#themebtn').innerHTML = document.documentElement.dataset.theme==='dark' ? I.sun : I.moon;
  const out = fn(r) || {html:''};
  if(out.overlay){
    if(r.under && lastUnder !== r.under && !view.innerHTML.trim()){ const save=location.hash; const rr = parseHash(r.under); const o=LL.views[rr.name](rr); view.innerHTML=o.html; o.mount&&o.mount(view); }
    overlay.innerHTML = out.html; overlay.classList.add('on'); out.mount && out.mount(overlay);
    const f = overlay.querySelector('[data-back],.rbtn,.cam'); return;
  }
  overlay.classList.remove('on'); overlay.innerHTML='';
  const top = keep ? view.scrollTop : 0;
  view.classList.remove('enter'); view.innerHTML = out.html; if(!keep){ void view.offsetWidth; view.classList.add('enter'); }
  view.scrollTop = top; lastUnder = location.hash;
  out.mount && out.mount(view);
  if(!keep){ view.setAttribute('tabindex','-1'); view.focus({preventScroll:true}); }
  LL.badges();
};
function parseHash(h){ const save=location.hash; const p=h.replace(/^#\/?/,'').split('/'); // lightweight: reuse parse via temporary
  const [a,b,c,d]=p; if(a==='sell'&&b==='item') return {name:'item',id:c,step:d||'photos'}; return {name:a==='buy'?'buy':'sell'}; }
window.addEventListener('hashchange', ()=>LL.render());

LL.badges = () => { const n=S().watch.length; const t=LL.$('.tab[data-tab=alerts]'); let d=t.querySelector('.dot'); if(n){ if(!d){ d=document.createElement('span'); d.className='dot'; t.appendChild(d); } d.textContent=n; d.setAttribute('aria-label',n+' watched'); } else if(d) d.remove(); };

/* delegated actions */
document.addEventListener('click', e=>{
  const nav = e.target.closest('[data-nav]'); if(nav){ e.preventDefault(); LL.go(nav.dataset.nav); return; }
  const el = e.target.closest('[data-act]'); if(!el) return; const act = LL.acts[el.dataset.act]; if(!act) return;
  if(el.tagName==='A' && el.dataset.act!=='mailrep') e.preventDefault();
  act(el, e);
});

/* theme */
LL.acts.theme = () => { const dark = document.documentElement.dataset.theme==='dark'; S().theme = dark?'light':'dark'; LL.save(); LL.applyTheme(); LL.render(true); };
LL.acts.themeset = b => { S().theme=b.dataset.v; LL.save(); LL.applyTheme(); LL.render(true); };
LL.acts.mode = b => { S().mode=b.dataset.v; LL.save(); LL.go(b.dataset.v==='buy'?'#/buy':'#/sell'); };

/* welcome */
LL.views.welcome = () => ({html:`<div class="welcome"><div style="display:flex;justify-content:flex-end"><button class="iconbtn" data-act="theme" aria-label="Toggle dark mode">${document.documentElement.dataset.theme==='dark'?I.sun:I.moon}</button></div>
  <div class="logo"><img src="assets/logo.jpg" alt="Local Liquidators — Auctions, Tag Sales, Buyouts" width="250" height="58"></div>
  <h2>Just Ask <b>Miggy</b></h2><p class="tag">Your Go-To Guy</p>
  <p class="center muted" style="margin:10px 8px 6px">Snap your inventory. Swipe the sales. One app for sellers and buyers.</p>
  <button class="mode sell" data-act="mode" data-v="sell">${I.camera}<div><b>I’m selling</b><span>Photograph your equipment — AI writes the listing</span></div>${I.chev.replace('<svg','<svg class="chev"')}</button>
  <button class="mode buy" data-act="mode" data-v="buy">${I.play}<div><b>I’m buying</b><span>Swipe lots, set alerts, watch what you want</span></div>${I.chev.replace('<svg','<svg class="chev"')}</button>
  <div style="flex:1"></div>
  <p class="center small muted" style="margin-top:20px"><span class="badge" style="margin-right:4px">Prototype</span> concept for Local Liquidators — not an official app. Sample data throughout.</p></div>`});

/* profile */
LL.views.profile = () => { const p=S().profile, st=LL.sellStats(), ios=/iphone|ipad|ipod/i.test(navigator.userAgent), standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const th=S().theme;
  return {html:`<div class="profhead"><div class="av"><span><img src="assets/logo-icon.png" alt="Local Liquidators logo"></span></div><div class="stats"><div><b>${st.n}</b><small>Items</small></div><div><b>${st.pct}%</b><small>Photo-ready</small></div><div><b>${S().watch.length}</b><small>Watching</small></div></div></div>
  <div style="padding:0 16px"><h2 style="font-size:26px;font-weight:800">${esc(p.business||'Guest')}</h2><p class="muted small">${esc(p.contact||'No sign-in needed')}</p></div>
  <p class="tagline" style="margin:12px 0 4px">Just Ask <b>Miggy</b> — Your Go-To Guy</p>
  <p class="small muted" style="padding:0 16px 6px">A <b>PROTOTYPE concept</b> for Local Liquidators (Phoenix, AZ; auctions on localauctions.com). Not an official app.</p>
  <div class="pad"><div class="lbl">I’m using this app to</div><div class="seg" style="margin-bottom:14px"><button data-act="mode" data-v="sell" aria-pressed="${S().mode!=='buy'}">Sell</button><button data-act="mode" data-v="buy" aria-pressed="${S().mode==='buy'}">Buy</button></div>
   <div class="lbl">Appearance</div><div class="seg" style="margin-bottom:14px"><button data-act="themeset" data-v="light" aria-pressed="${th==='light'}">Light</button><button data-act="themeset" data-v="dark" aria-pressed="${th==='dark'}">Dark</button><button data-act="themeset" data-v="auto" aria-pressed="${th==='auto'}">Auto</button></div>
   ${p.done?`<div class="card pad" style="margin-bottom:12px"><div class="lbl">Your closing</div><dl class="kv"><dt>Business</dt><dd>${esc(p.business)}</dd><dt>Location(s)</dt><dd>${esc(p.locations.join('; '))}</dd><dt>Closing date</dt><dd>${esc(p.closing||'—')}</dd></dl><a class="btn ghost sm" style="margin-top:12px" href="#/sell/onboard">Edit details</a></div>`:''}
   ${standalone?'':`<div class="card pad" style="margin-bottom:12px"><b style="font-family:var(--head);font-size:20px">Install on your phone</b>
     ${installEvt?`<p class="small muted" style="margin:4px 0 10px">Add it to your home screen for a full-screen app.</p><button class="btn accent block" data-act="install">${I.download} Install app</button>`
      : ios?`<ol class="tips"><li><i>1</i><span>Tap the <b>Share</b> button in Safari</span></li><li><i>2</i><span>Choose <b>Add to Home Screen</b></span></li><li><i>3</i><span>Open it from your home screen</span></li></ol>`
      : `<p class="small muted" style="margin-top:4px">In Chrome, open the menu and tap <b>Install app</b> / <b>Add to Home screen</b>.</p>`}</div>`}
   <div class="card pad" style="margin-bottom:12px"><div class="lbl">Local Liquidators</div>
    <a class="listrow" href="mailto:${LL.EMAIL}" style="text-decoration:none;color:inherit">${I.mail.replace('<svg','<svg width="22" height="22"')}<div><b>Email</b><span class="small muted">${LL.EMAIL}</span></div></a>
    <a class="listrow" href="tel:${LL.TEL}" style="text-decoration:none;color:inherit">${I.phone.replace('<svg','<svg width="22" height="22"')}<div><b>Call</b><span class="small muted">${LL.PHONE}</span></div></a>
    <a class="listrow" href="${LL.SITE}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${I.ext.replace('<svg','<svg width="22" height="22"')}<div><b>localauctions.com</b><span class="small muted">Open the live auction site</span></div></a></div>
   <div class="card pad" style="margin-bottom:12px"><div class="lbl">Prototype data</div><p class="small muted" style="margin-bottom:10px">Everything is stored on this device (localStorage + IndexedDB). Nothing is uploaded.</p>
    <div style="display:grid;gap:8px"><button class="btn ghost sm" data-act="sample">${I.sparkle} Load sample inventory</button><button class="btn ghost sm" data-act="exportjson">${I.download} Export my data (JSON)</button><button class="btn danger sm" data-act="resetall">${I.trash} Reset prototype</button></div></div>
   <p class="small muted center" style="padding:6px 0 18px">Just Ask Miggy × Local Liquidators · prototype v2<br>Photo art &amp; lots are generated samples.</p></div>`}; };
LL.acts.install = async () => { if(!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt=null; LL.render(true); };
LL.acts.exportjson = () => LL.download('ask-miggy-prototype-data.json', JSON.stringify(S(),null,2), 'application/json');
LL.acts.resetall = async () => { if(!confirm('Erase all prototype data on this device?')) return; await LL.reset(); LL.applyTheme(); LL.go('#/welcome'); };
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); installEvt=e; if(parse().name==='profile') LL.render(true); });

/* boot */
(async function boot(){
  LL.applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{ if(S().theme==='auto'){ LL.applyTheme(); LL.render(true); } });
  await LL.photos.init();
  if(S().mode===null && !location.hash) location.replace('#/welcome');
  LL.render();
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW',e));
})();
})();
