/* AI Describe interface.   analyzePhotos(images, hints) -> Promise<ListingJSON>
 *   images: [{role:'front'|'plate'|'back'|'overview'|'closeup', dataUrl:'data:image/jpeg;base64,...'}]
 *   hints : {type:'item'|'lot', category?, make?, model?, condition?, qty?, notes?}
 *   -> {...listing fields, valueRange (rep-only), newPrice, usedRange:{low,high}, comps:[{src,kind,price,url}], valueBasis}
 *   newPrice/usedRange/comps feed the BUYER value snapshot ("AI estimate"); they are never shown on the seller side.
 * Tries POST {endpoint} (serverless /api/analyze -> vision LLM). If the backend is missing or has no API key
 * (404/405/501/503, network error, bad JSON) it falls back to clearly-labeled DEMO output.        */
(function(){
const LL = window.LL;
const CFG = { endpoint: (window.LL_CONFIG && window.LL_CONFIG.analyzeEndpoint) || 'api/analyze', timeoutMs: 45000 };
const PICKUP = 'Buyer arranges pickup.';
const CONDS = ['Like New','Good','Workhorse'];

/* ----- realistic DEMO samples (NOT read from the photos) ----- */
const DEMO = {
 oven:{make:'Blodgett',model:'DFG-100 ES',size:'38" W × 41" D × 70" H (double stack)',power:'Natural gas · 120V / 60Hz / 1 Ph blower',cat:'oven',cond:'Good',reason:'Clean interior and doors seal well; light cosmetic scratches on the side panels.',conf:'high',
   title:'Blodgett DFG-100 ES Double-Stack Gas Convection Oven',value:[2800,4200],newp:17500,
   desc:'Blodgett DFG-100 ES double-stack natural gas convection ovens with porcelain-lined interiors and independent solid-state controls. The 120V blower motors and pilot ignition were read from the data plate (model/serial visible). Racks, doors and gaskets are in good working condition with normal wear and a few scratches on the exterior. Includes stainless legs and the oven racks shown. Buyer arranges pickup.',included:'Oven racks as shown, stainless legs',review:['Confirm both decks power on','Gas type (NG vs LP)']},
 mixer:{make:'Hobart',model:'HL200',size:'20-qt bowl · 21" W × 24" D × 34" H',power:'115V / 60Hz / 1 Ph · 1/2 HP',cat:'mixer',cond:'Good',reason:'Planetary gears turn smoothly; bowl guard intact and paint chips only near the base.',conf:'high',
   title:'Hobart HL200 20-Quart Planetary Mixer',value:[1800,2900],newp:7900,
   desc:'Hobart HL200 20-quart planetary mixer with three fixed speeds and a bowl guard. The data plate shows 115V single phase, so it plugs into a standard dedicated outlet. Bowl lift and speed selector move freely and the unit shows normal bakery wear with minor paint chips near the base. Attachment hub is clean and ready for a dough hook or whip. Buyer arranges pickup.',included:'Bowl, bowl guard; attachments to be confirmed',review:['Which attachments are included']},
 refrig:{make:'True',model:'T-49',size:'54" W × 29" D × 83" H',power:'115V / 60Hz / 1 Ph · self-contained',cat:'refrig',cond:'Good',reason:'Stainless exterior with minor dents; gaskets look intact and interior shelves are clean.',conf:'medium',
   title:'True T-49 Two-Door Reach-In Refrigerator',value:[1200,2000],newp:6000,
   desc:'True T-49 two-door reach-in refrigerator with stainless-steel front and sides and self-closing doors. Self-contained refrigeration runs on 115V single phase, so no remote compressor is required. Interior is clean with the shelves shown and the door gaskets appear intact. Expect minor dents and scuffs consistent with daily restaurant use. Buyer arranges pickup.',included:'Shelves as pictured',review:['Confirm unit holds temperature','Exact model suffix on plate']},
 prep:{make:'Turbo Air',model:'PST-60-24-N',size:'60" W × 30" D × 43" H',power:'115V / 60Hz / 1 Ph',cat:'prep',cond:'Like New',reason:'Cutting board and rail show very little wear; stainless is bright with no dents visible.',conf:'medium',
   title:'Turbo Air PST-60-24-N Refrigerated Sandwich/Salad Prep Table',value:[1100,1800],newp:3200,
   desc:'Turbo Air 60-inch refrigerated prep table with a 24-inch-deep cutting board and two solid doors below. Stainless top and rail are in very good shape with minimal wear. Self-contained 115V refrigeration is plug-and-play. Pan rail is included; pans are not. Buyer arranges pickup.',included:'Cutting board, pan rail (pans not included)',review:['Number of 1/6 pans the rail holds','Confirm cooling']},
 smallwares:{make:'Winco',model:'ALXP-1826',size:'18" × 26" full-size aluminum sheet pans',power:'n/a',cat:'smallwares',cond:'Workhorse',reason:'Typical baking wear: darkened pans and light warping on a few.',conf:'medium',
   title:'Lot of Aluminum Full-Size Sheet Pans',value:[90,160],newp:320,
   desc:'Lot of aluminum full-size (18" × 26") sheet pans in everyday bakery condition. Pans are darkened from use and a few show light warping, but all remain usable for baking and prep. Quantity is as counted by the seller and may be confirmed at the lot check. Buyer arranges pickup.',included:'Pans as shown; counted by seller',review:['Pan count','Full vs half size']},
 racks:{make:'Metro',model:'Super Erecta 5-tier',size:'48" W × 24" D × 74" H',power:'n/a',cat:'racks',cond:'Good',reason:'Chrome finish is intact with light cloudiness; all shelves present and level.',conf:'medium',
   title:'Metro Super Erecta 5-Tier Wire Shelving Unit, 48" × 24"',value:[120,260],newp:400,
   desc:'Metro Super Erecta five-tier wire shelving unit, 48 inches wide by 24 inches deep. Chrome posts and wire shelves are intact with light surface cloudiness and no major rust visible. Shelves adjust on the post grooves and the unit stands level. Buyer arranges pickup.',included:'5 shelves, 4 posts, feet',review:['Shelf count']},
 furniture:{make:'Unbranded',model:'—',size:'30" round top, 29" H (bistro table)',power:'n/a',cat:'furniture',cond:'Good',reason:'Tops show minor scratches; bases are sturdy with no wobble.',conf:'low',
   title:'Bistro Table Set with Metal Bases',value:[60,140],newp:350,
   desc:'Bistro-style round tables with metal bases and laminate tops. Surfaces show light scratches from regular dining service but the bases are sturdy and level. Photo does not show a manufacturer mark, so brand is listed as unbranded. Buyer arranges pickup.',included:'Tables as pictured; chairs listed separately',review:['Brand/material','Quantity and chairs']},
 pos:{make:'Elo',model:'I-Series (15" touch)',size:'15" touchscreen',power:'12V DC adapter / 120V outlet',cat:'pos',cond:'Good',reason:'Screen is clear with no dead zones visible; stand shows light wear.',conf:'medium',
   title:'Elo 15" Touchscreen POS Terminal with Stand',value:[150,350],newp:1100,
   desc:'Elo 15-inch touchscreen POS terminal on an adjustable stand, as used at a counter. The screen is clear and the housing shows only light wear. Power adapter is included if shown in the photos; software license and data are not transferred. The seller should have wiped any account data before pickup. Buyer arranges pickup.',included:'Terminal, stand, power adapter if pictured',review:['Software/data wiped','Cables included']},
 other:{make:'',model:'',size:'',power:'',cat:'other',cond:'Good',reason:'General condition looks serviceable from the photos.',conf:'low',
   title:'Restaurant & Bakery Equipment Item',value:[50,200],newp:null,
   desc:'Restaurant and bakery equipment item. The photos show the whole item and the model area, but the make and model could not be confirmed from the images alone. Condition looks serviceable with normal wear. Please add any known make, model or dimensions before submitting. Buyer arranges pickup.',included:'As pictured',review:['Make','Model','Dimensions']}
};
const ORDER = ['oven','mixer','refrig','prep','racks','pos','furniture','smallwares'];
function hash(s){ let h=0; for(let i=0;i<Math.min(s.length,4000);i+=7) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }

function demo(images, hints){
  const key = (hints.type==='lot' && !hints.category) ? 'smallwares' : (DEMO[hints.category] ? hints.category : ORDER[hash(images[0]?.dataUrl||'x') % ORDER.length]);
  const d = DEMO[key];
  const out = {
    source:'demo', category:d.cat, make:hints.make||d.make, model:hints.model||d.model, size:d.size, power:d.power,
    condition:hints.condition||d.cond, conditionReason:d.reason, title:d.title, description:d.desc, included:d.included,
    confidence:d.conf, confidenceNote: d.conf==='high'?'Model/data plate looked readable.':'Some details could not be confirmed from the photos.',
    needsReview:d.review, serial:'', valueRange:{low:d.value[0],high:d.value[1],note:'DEMO placeholder estimate'},
    newPrice:d.newp, usedRange:d.newp?{low:d.value[0],high:d.value[1]}:null, comps:[], valueBasis:d.newp?'model_estimate':'unknown'   // DEMO placeholders
  };
  if(hints.type==='lot'){ out.title = 'Lot of ' + (hints.qty>1 ? hints.qty+' ' : '') + (hints.make ? hints.make+' ' : '') + 'Smallwares'; }
  return new Promise(r => setTimeout(()=>r(out), 2600));
}

/* seller-facing text must never contain prices, fees or phone numbers */
const PRICE=/\$\s?\d|\b\d[\d,]*\s?(dollars|usd)\b|\b(commission|fee|fees|price|priced|asking)\b/i, PHONE=/(\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/;
function clean(t){ // drop any sentence mentioning a price/fee/phone number
  const parts = String(t||'').split(/(?<=[.!?])\s+/).filter(x => x && !PRICE.test(x) && !PHONE.test(x));
  return parts.join(' ').replace(/\s{2,}/g,' ').trim(); }
function normalize(j){
  const o = Object.assign({source:'ai',category:'other',make:'',model:'',size:'',power:'',condition:'Good',conditionReason:'',title:'',description:'',included:'',confidence:'low',confidenceNote:'',needsReview:[],serial:'',valueRange:null,newPrice:null,usedRange:null,comps:[],valueBasis:'unknown'}, j);
  if(!LL.cat.some(c=>c.id===o.category)) o.category='other';
  if(!CONDS.includes(o.condition)) o.condition='Good';
  if(!['high','medium','low'].includes(o.confidence)) o.confidence='low';
  ['make','model','size','power','conditionReason','title','description','included','confidenceNote','serial'].forEach(k=>o[k]=clean(o[k]));
  if(!/buyer arranges pickup/i.test(o.description)) o.description = (o.description + ' ' + PICKUP).trim();
  o.needsReview = Array.isArray(o.needsReview) ? o.needsReview.map(clean).filter(Boolean).slice(0,6) : [];
  Object.assign(o, normValue(o));
  return o;
}
/* buyer value snapshot fields: positive whole dollars, low<=high, comps capped at 3; anything invalid becomes null/[] */
const num = v => { v=+v; return Number.isFinite(v) && v>0 ? Math.round(v) : null; };
function normValue(j){
  const np = num(j && j.newPrice), lo = num(j && j.usedRange && j.usedRange.low), hi = num(j && j.usedRange && j.usedRange.high);
  const usedRange = lo && hi ? {low:Math.min(lo,hi), high:Math.max(lo,hi)} : null;
  const comps = (Array.isArray(j && j.comps) ? j.comps : []).filter(c=>c && num(c.price)).slice(0,3)
    .map(c=>({src:String(c.src||'Listing').slice(0,60), kind:c.kind==='new'?'new':'used', price:num(c.price), url:/^https?:\/\//.test(c.url||'')?String(c.url):''}));
  const valueBasis = ['web_comps','model_estimate','unknown'].includes(j && j.valueBasis) ? j.valueBasis : (np||usedRange ? 'model_estimate' : 'unknown');
  return {newPrice:np, usedRange, comps, valueBasis};
}
/* Map an AI result onto a BUYER lot record (what a publish step would store). The buyer UI labels it "AI estimate". */
LL.lotValueFromAI = r => { const v = normValue(r||{}); return (v.newPrice && v.usedRange) ? {newPrice:v.newPrice, usedRange:v.usedRange, comps:v.comps, valueSource:v.valueBasis==='web_comps'?'ai-comps':'ai'} : {}; };
LL.normValue = normValue;

LL.analyzePhotos = async function analyzePhotos(images, hints={}){
  const ctrl = new AbortController(); const to = setTimeout(()=>ctrl.abort(), CFG.timeoutMs);
  const t0 = Date.now();
  try{
    const r = await fetch(CFG.endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, signal:ctrl.signal, body:JSON.stringify({images, hints})});
    if(!r.ok) throw Object.assign(new Error('backend '+r.status), {status:r.status});
    const j = await r.json();
    if(!j || typeof j.title !== 'string') throw new Error('bad json');
    const out = normalize(j); out.source='ai';
    const wait = 1800 - (Date.now()-t0); if(wait>0) await new Promise(r=>setTimeout(r,wait));
    return out;
  }catch(e){
    console.info('[AI Describe] backend unavailable → DEMO mode:', e.message);
    return normalize(await demo(images, hints));
  }finally{ clearTimeout(to); }
};
LL.DEMO = DEMO; LL.PICKUP = PICKUP; LL.CONDS = CONDS;
})();
