/* Core: namespace, helpers, icons, store (localStorage), photo store (IndexedDB), placeholder art */
(function(){
const LL = window.LL = {};
LL.$ = (s, r=document) => r.querySelector(s);
LL.$$ = (s, r=document) => [...r.querySelectorAll(s)];
LL.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LL.uid = () => Math.random().toString(36).slice(2, 9);
LL.EMAIL = 'chris@localliquidators.com';
LL.PHONE = '(602) 348-4607'; LL.TEL = '+16023484607';
LL.SITE = 'https://online.localauctions.com/';

const P = (d, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
LL.icons = {
  sell: P('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9h18"/>'),
  buy: P('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
  bell: P('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  bellFill: P('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z" fill="currentColor"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  user: P('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  heart: P('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  heartFill: P('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" fill="currentColor"/>'),
  camera: P('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  image: P('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: P('<path d="m15 18-6-6 6-6"/>'),
  chev: P('<path d="m9 18 6-6-6-6"/>'),
  check: P('<path d="M20 6 9 17l-5-5"/>'),
  moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  search: P('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  ext: P('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>'),
  sparkle: P('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  sun2: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>'),
  hand: P('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>'),
  trash: P('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  download: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  mail: P('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  share: P('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>'),
  mic: P('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>'),
  grid: P('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
  play: P('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m10 8 6 4-6 4z" fill="currentColor"/>'),
  focus: P('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>'),
  info: P('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  pin: P('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  phone: P('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
};
LL.cat = [
  {id:'oven',label:'Ovens',emoji:'oven'},{id:'mixer',label:'Mixers',emoji:'mixer'},{id:'refrig',label:'Refrigeration',emoji:'refrig'},
  {id:'prep',label:'Prep tables',emoji:'prep'},{id:'smallwares',label:'Smallwares',emoji:'pans'},{id:'racks',label:'Racks',emoji:'racks'},
  {id:'furniture',label:'Furniture',emoji:'furniture'},{id:'pos',label:'POS / Electronics',emoji:'pos'},{id:'other',label:'Other',emoji:'other'}
];
LL.catLabel = id => (LL.cat.find(c=>c.id===id)||{label:'Other'}).label;

/* ---------- store ---------- */
const KEY = 'll_proto_v2';
const defaults = () => ({v:2,theme:'auto',mode:null,
  profile:{business:'',contact:'',email:'',phone:'',locations:[''],closing:'',done:false},
  items:[],submitted:null,watch:[],lotAlerts:[],searches:[],notify:false,
  ui:{q:'',cat:'all',coachSeen:false,zoomHint:false}});
function load(){ try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.v===2) return Object.assign(defaults(), s, {profile:Object.assign(defaults().profile,s.profile), ui:Object.assign(defaults().ui,s.ui)}); }catch(e){} return defaults(); }
LL.state = load();
LL.save = () => { try{ localStorage.setItem(KEY, JSON.stringify(LL.state)); }catch(e){ console.warn('save failed',e); } };
LL.reset = async () => { localStorage.removeItem(KEY); await LL.photos.clear(); LL.state = defaults(); };

/* ---------- photos in IndexedDB (kept out of localStorage to avoid the 5MB quota) ---------- */
const cache = new Map();
let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => {
  if(!window.indexedDB) return rej(new Error('no idb'));
  const r = indexedDB.open('ll_proto_photos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('p', mode); const out = fn(t.objectStore('p')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); };
LL.photos = {
  key:(id,shot)=>id+':'+shot,
  get(id,shot){ return cache.get(id+':'+shot) || null; },
  async set(id,shot,url){ cache.set(id+':'+shot,url); try{ await tx('readwrite', s=>s.put(url,id+':'+shot)); }catch(e){ console.warn('idb put failed (kept in memory only)',e);} },
  async del(id,shot){ cache.delete(id+':'+shot); try{ await tx('readwrite', s=>s.delete(id+':'+shot)); }catch(e){} },
  async clear(){ cache.clear(); try{ await tx('readwrite', s=>s.clear()); }catch(e){} },
  async init(){ try{ const d = await db(); await new Promise(res=>{ const t=d.transaction('p'); const st=t.objectStore('p'); const rq=st.openCursor(); rq.onsuccess=()=>{ const c=rq.result; if(c){ cache.set(c.key,c.value); c.continue(); } }; t.oncomplete=res; t.onerror=res; }); }catch(e){} }
};

/* ---------- placeholder art (generated SVG; always labeled sample) ---------- */
const ICON = { // 200x200 pictograms, stainless / navy palette
  oven:'<rect x="40" y="50" width="120" height="110" rx="8" fill="#c9d3dc"/><rect x="40" y="50" width="120" height="22" rx="8" fill="#aab6c2"/><rect x="52" y="82" width="96" height="66" rx="5" fill="#2a3a52"/><rect x="58" y="88" width="84" height="54" rx="3" fill="#ff9d5c" opacity=".55"/><circle cx="62" cy="61" r="4.5" fill="#091747"/><circle cx="82" cy="61" r="4.5" fill="#091747"/><circle cx="102" cy="61" r="4.5" fill="#091747"/><rect x="62" y="152" width="76" height="5" rx="2.5" fill="#8b99a8"/><rect x="48" y="160" width="10" height="10" fill="#6a7886"/><rect x="142" y="160" width="10" height="10" fill="#6a7886"/>',
  mixer:'<rect x="62" y="154" width="86" height="14" rx="4" fill="#6a7886"/><rect x="108" y="48" width="42" height="108" rx="10" fill="#b9c4cf"/><rect x="62" y="46" width="76" height="30" rx="14" fill="#9fb0bf"/><path d="M70 90h56v28c0 18-12 30-28 30s-28-12-28-30z" fill="#dbe3ea"/><path d="M98 76v38" stroke="#556070" stroke-width="5" stroke-linecap="round"/><circle cx="132" cy="66" r="5" fill="#ff6a2b"/>',
  refrig:'<rect x="56" y="24" width="88" height="148" rx="8" fill="#c9d3dc"/><rect x="62" y="30" width="76" height="68" rx="4" fill="#e1e8ee"/><rect x="62" y="102" width="76" height="64" rx="4" fill="#e1e8ee"/><rect x="128" y="48" width="4" height="34" rx="2" fill="#556070"/><rect x="128" y="120" width="4" height="34" rx="2" fill="#556070"/><rect x="62" y="172" width="76" height="6" fill="#6a7886"/>',
  prep:'<rect x="24" y="64" width="152" height="20" rx="4" fill="#dbe3ea"/><rect x="34" y="52" width="132" height="14" rx="3" fill="#aab6c2"/><rect x="34" y="84" width="132" height="70" rx="3" fill="#c9d3dc"/><rect x="42" y="92" width="56" height="54" rx="3" fill="#e1e8ee"/><rect x="102" y="92" width="56" height="54" rx="3" fill="#e1e8ee"/><rect x="40" y="154" width="8" height="22" fill="#6a7886"/><rect x="152" y="154" width="8" height="22" fill="#6a7886"/>',
  pans:'<g fill="#c9d3dc" stroke="#8b99a8" stroke-width="3"><rect x="34" y="126" width="132" height="18" rx="3"/><rect x="40" y="108" width="132" height="18" rx="3"/><rect x="30" y="90" width="132" height="18" rx="3"/><rect x="38" y="72" width="132" height="18" rx="3"/></g><rect x="62" y="68" width="20" height="5" rx="2" fill="#ff6a2b"/>',
  racks:'<g stroke="#8b99a8" stroke-width="5" stroke-linecap="round"><path d="M44 28v146M156 28v146"/></g><g fill="#c9d3dc" stroke="#8b99a8" stroke-width="2"><rect x="40" y="50" width="120" height="8"/><rect x="40" y="90" width="120" height="8"/><rect x="40" y="130" width="120" height="8"/><rect x="40" y="168" width="120" height="8"/></g><rect x="56" y="30" width="42" height="20" rx="3" fill="#ffb347"/><rect x="104" y="70" width="42" height="20" rx="3" fill="#00456e"/><rect x="58" y="110" width="50" height="20" rx="3" fill="#ff6a2b"/>',
  furniture:'<ellipse cx="100" cy="82" rx="62" ry="14" fill="#c9a37a"/><rect x="96" y="92" width="8" height="64" fill="#7a5a3a"/><ellipse cx="100" cy="160" rx="34" ry="7" fill="#7a5a3a"/><rect x="26" y="108" width="34" height="8" rx="3" fill="#00456e"/><rect x="30" y="116" width="5" height="44" fill="#091747"/><rect x="140" y="108" width="34" height="8" rx="3" fill="#00456e"/><rect x="165" y="116" width="5" height="44" fill="#091747"/>',
  pos:'<rect x="46" y="38" width="108" height="78" rx="9" fill="#1c2540"/><rect x="53" y="45" width="94" height="62" rx="4" fill="#4aa3df"/><rect x="62" y="54" width="36" height="8" rx="2" fill="#fff" opacity=".9"/><rect x="62" y="68" width="76" height="6" rx="2" fill="#fff" opacity=".6"/><rect x="62" y="80" width="60" height="6" rx="2" fill="#fff" opacity=".6"/><rect x="92" y="116" width="16" height="20" fill="#556070"/><rect x="66" y="136" width="68" height="10" rx="5" fill="#556070"/><rect x="50" y="154" width="100" height="22" rx="4" fill="#c9d3dc"/>',
  other:'<path d="M100 40 164 70v62l-64 30-64-30V70z" fill="#d9c7a5"/><path d="M100 40 164 70l-64 30L36 70z" fill="#e9dbbf"/><path d="M100 100v62" stroke="#a88f64" stroke-width="3"/><rect x="108" y="108" width="36" height="12" rx="2" fill="#fff" opacity=".8" transform="rotate(-24 108 108)"/>'
};
const VIEWS = {front:[0,0,1],detail:[-40,-20,1.6],plate:[-60,-60,2.4],back:[0,0,.9],side:[14,0,.95],interior:[-10,-14,1.35],overview:[0,0,.85],closeup:[-30,-30,1.8]};
const artCache = new Map();
LL.art = function(kind='other', view='front', seed=0, label='SAMPLE'){
  const k = kind+view+seed+label; if(artCache.has(k)) return artCache.get(k);
  const [c1,c2] = [['#091747','#00456e'],['#00456e','#ff6a2b'],['#12205a','#ffb347'],['#0a2d4d','#4aa3df']][seed%4];
  const v = VIEWS[view] || VIEWS.front;
  const tr = `translate(${100+v[0]*v[2]*.5} ${100+v[1]*v[2]*.5}) scale(${v[2]}) translate(-100 -100)`;
  const plate = view==='plate' ? '<g transform="translate(78 108)"><rect width="84" height="46" rx="4" fill="#eef2f6" stroke="#8b99a8" stroke-width="2"/><rect x="8" y="8" width="44" height="5" fill="#556070"/><rect x="8" y="18" width="62" height="4" fill="#8b99a8"/><rect x="8" y="27" width="52" height="4" fill="#8b99a8"/><rect x="8" y="36" width="30" height="4" fill="#8b99a8"/></g>' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="-100" y1="-200" x2="300" y2="500"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity=".92"/></linearGradient><radialGradient id="r" cx=".5" cy=".4" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect x="-800" y="-800" width="1800" height="1900" fill="url(#g)"/><rect x="-100" y="-50" width="400" height="400" fill="url(#r)"/><g transform="translate(0 20)"><ellipse cx="100" cy="176" rx="64" ry="7" fill="#000" opacity=".25"/><g transform="${tr}">${ICON[kind]||ICON.other}</g>${plate}</g><text x="100" y="238" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" font-weight="700" letter-spacing="1.4" fill="#fff" opacity=".78">${label} · ${view.toUpperCase()}</text></svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  artCache.set(k, uri); return uri;
};

/* ---------- toast ---------- */
let tt;
LL.toast = function(msg, actionLabel, action){
  const el = LL.$('#toast'); el.innerHTML = `<span>${LL.esc(msg)}</span>` + (actionLabel ? `<button type="button">${LL.esc(actionLabel)}</button>` : '');
  if(actionLabel) el.querySelector('button').onclick = () => { el.classList.remove('show'); action && action(); };
  el.classList.add('show'); clearTimeout(tt); tt = setTimeout(()=>el.classList.remove('show'), actionLabel ? 5200 : 2800);
};

/* ---------- countdown ---------- */
LL.fmtLeft = ms => { if(ms<=0) return 'Ended'; const s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60), x=s%60, p=n=>String(n).padStart(2,'0');
  return d>0 ? `${d}d ${p(h)}h ${p(m)}m` : `${p(h)}:${p(m)}:${p(x)}`; };
setInterval(()=>{ const now=Date.now(); document.querySelectorAll('[data-ends]').forEach(e=>{ e.textContent = LL.fmtLeft(+e.dataset.ends-now); }); }, 1000);

/* ---------- theme ---------- */
LL.applyTheme = function(){
  const t = LL.state.theme; const dark = t==='dark' || (t==='auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = dark ? '#0a0d16' : '#ffffff';
  return dark;
};
LL.download = (name, text, type='text/plain') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 500); };
})();
