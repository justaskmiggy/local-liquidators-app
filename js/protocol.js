/* Local Liquidators "Auction Inventory Protocol (Consignor Guide)" — PROTOTYPE.
   Visual protocol funnel: 1 Bookmark (lot sticker) → 2 Context (4 required angles + 1 optional extra; with logo + plate that is 4–7 photos per item, max 7) → 3 Brand (logo) → 4 Specs (data plate) → 5 Working video (≤15s) → 6 Scale (group shot).
   Data protocol: A Lot Number · B Consignor ID · C Description = [Brand] + [Type] + [Model/Dimensions] · D Guarantee Type.
   This file: protocol slots + checklist, lot numbers, digital lot sticker, plate read (DEMO pattern), lot-sticker reservation /
   print / ship-to-me orders, and the in-app Protocol help screen. Loaded before sell.js. */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state;
LL.views = LL.views || {}; LL.acts = LL.acts || {};
LL.CONTACT = {name:'Jackson Cole', email:'Jcole@LocalLiquidators.com', phone:'(602) 865-9684', tel:'+16028659684'};
/* Photo rule (Michael, Oct 8 2026): 4–7 photos per item = 4 required angles + manufacturer data plate + brand logo + 1 optional extra. Max 7.
   Slot keys are kept stable with the old 10-angle list (ctx1 front, ctx2 side, ctx4 back, ctx5 top/inside; old ctx3 "right side" becomes the extra). */
const ANGLES = [
  {k:'ctx1', n:'Front', h:'Straight on, 3–4 ft back — the whole item in frame.', role:'front'},
  {k:'ctx2', n:'Side / angle', h:'Step to the side or a front corner — show the full side panel.', role:'side'},
  {k:'ctx4', n:'Back / hookups', h:'Back panel, cords, gas or water hookups.', role:'back'},
  {k:'ctx5', n:'Inside / top / working', h:'Open it up — interior, top or work surface — or show it running.', role:'interior'},
  {k:'ctx3', n:'Extra (optional)', h:'One more: the other side, controls, accessories or any wear worth showing.', role:'closeup'}];
const PART_ANGLES = [
  {s:'1', n:'Front', h:'Photograph this piece on its own — whole piece, straight on.', role:'front'},
  {s:'2', n:'Side / angle', h:'Step to the side — full side of this piece.', role:'side'},
  {s:'4', n:'Back / hookups', h:'Back of this piece — cords or hookups.', role:'back'},
  {s:'5', n:'Inside / top', h:'Open it up or show the top / work surface.', role:'interior'},
  {s:'3', n:'Extra (optional)', h:'Controls, wear or accessories.', role:'closeup'}];
const MIN = 4, MAX = ANGLES.length, EXTRA = MAX - MIN; // 4 required angles + 1 optional extra
const PHOTO_MAX = MAX + 2; // + brand logo + data plate = 7 photos per item, max
const KINDS = [
  {id:'machine',n:'Machine',h:'Mixers, ovens, slicers, dishwashers — anything that runs or moves.'},
  {id:'cooler',n:'Cooler / Refrigeration',h:'Reach-ins, walk-ins, prep tables, freezers — show the thermometer.'},
  {id:'other',n:'Other',h:'Furniture, smallwares, POS, racks — video is optional.'}];
const STEPS = [{k:'bookmark',n:'Bookmark',d:'Lot sticker first'},{k:'context',n:'Context',d:'4 required angles + 1 extra'},{k:'brand',n:'Brand',d:'Logo close-up'},{k:'specs',n:'Specs',d:'Serial / data plate'},{k:'video',n:'Video',d:'≤15s working clip'},{k:'scale',n:'Scale',d:'Wide group shot'}];
const kindOf = it => { if(it.itemKind && KINDS.some(k=>k.id===it.itemKind)) return it.itemKind;
  if(it.cat==='refrig'||it.cat==='prep') return 'cooler';
  if(it.cat==='oven'||it.cat==='mixer'||it.cat==='pos') return 'machine';
  return 'other'; };
const videoReq = it => kindOf(it)==='machine' || kindOf(it)==='cooler';
const videoPrompt = it => kindOf(it)==='cooler'
  ? 'Show the thermometer or display reading under 41°F for up to 15 seconds.'
  : kindOf(it)==='machine'
  ? 'Show it running / moving for up to 15 seconds.'
  : 'Optional: a short clip of the item (up to 15 seconds).';
const GUAR = [{v:'On Site Guarantee',d:'Fully functional'},{v:'AS IS',d:'Sellable but damaged or untested'}];
const TYPE = {oven:'Commercial Oven',mixer:'Commercial Mixer',refrig:'Commercial Refrigerator',prep:'Refrigerated Prep Table',smallwares:'Smallwares',racks:'Wire Shelving Unit',furniture:'Restaurant Furniture',pos:'POS Terminal',other:'Equipment'};
const has = (it,k) => !!(it.photos && it.photos[k]);
const skipped = (it,s) => !!(s.skip && it.skip && it.skip[s.skip]);
const partOf = (it,pid) => (it.parts||[]).find(p=>p.id===pid);
const partName = (it,p,j) => (p && p.name) || 'Main item '+(j+1);

/* ---------- slots (every photo position, in protocol order) ---------- */
function slots(it){
  const out = [{k:'sticker',step:'bookmark',grp:'bookmark',n:'Lot sticker',h:'Photograph the lot number sticker FIRST — it divides this lot from the next.',f:'plate',g:'Fill the frame with the lot sticker',req:true}];
  if(it.type!=='lot'){
    ANGLES.forEach((a,i)=>out.push({k:a.k,step:'context',grp:'context',i:i+1,n:a.n,h:a.h,f:'full',g:'Whole item in frame · clean background',req:i<MIN,role:a.role}));
    out.push({k:'brand',step:'brand',grp:'brand',n:'Brand logo close-up',h:'Zoom in on the brand name or manufacturer emblem.',f:'plate',g:'Fill the frame with the logo',req:true,skip:'brand',role:'brand logo close-up'});
    out.push({k:'plate',step:'specs',grp:'specs',n:'Manufacturer plate',h:'Scan the manufacturer plate — model, serial and electrical specs, tight and in focus.',f:'plate',g:'Fill the frame with the plate',req:true,skip:'plate',role:'plate'});
    out.push({k:'video',step:'video',grp:'video',n:'Working video',h:videoPrompt(it),f:'full',g:kindOf(it)==='cooler'?'Show the thermometer under 41°F':kindOf(it)==='machine'?'Show it running / moving':'Up to 15 seconds',req:videoReq(it),skip:'video',media:'video'});
  } else {
    (it.parts||[]).forEach((p,j)=>{ const nm=partName(it,p,j);
      PART_ANGLES.forEach((a,i)=>out.push({k:p.id+'-'+a.s,step:'context',grp:p.id,part:p.id,pj:j,i:i+1,pn:nm,n:nm+' · '+a.n,h:a.h,f:'full',g:'This piece in frame',req:i<MIN,role:a.role}));
      out.push({k:p.id+'-brand',step:'brand',grp:p.id+'b',part:p.id,pj:j,pn:nm,n:nm+' · Brand logo',h:'Zoom in on this piece’s brand name or emblem.',f:'plate',g:'Fill the frame with the logo',req:true,skip:p.id+'-brand',role:'brand logo close-up'});
      out.push({k:p.id+'-plate',step:'specs',grp:p.id+'s',part:p.id,pj:j,pn:nm,n:nm+' · Manufacturer plate',h:'Scan this piece’s manufacturer plate — model, serial, electrical specs.',f:'plate',g:'Fill the frame with the plate',req:true,skip:p.id+'-plate',role:'plate'}); });
    out.push({k:'group',step:'scale',grp:'scale',n:'Wide overall group shot',h:'Step back and get everything in this lot in one wide shot.',f:'full',g:'The whole group in frame',req:true,role:'overview'});
    out.push({k:'video',step:'video',grp:'video',n:'Working video',h:videoPrompt(it),f:'full',g:kindOf(it)==='cooler'?'Show the thermometer under 41°F':kindOf(it)==='machine'?'Show it running / moving':'Up to 15 seconds',req:videoReq(it),skip:'video',media:'video'});
  }
  return out;
}
/* slots that count toward "photo-ready": required & not skipped, plus optional ones already taken */
const shots = it => { migrate(it); return slots(it).filter(s=>!skipped(it,s) && (s.req || has(it,s.k))); };
const open = (it,s) => !has(it,s.k) && !skipped(it,s);
/* next slot to capture after k. Optional slots (the extra angle on an item or a group-lot piece) are only offered while still inside the same group. */
function next(it,k,leaveGroup){ const all=slots(it), i=all.findIndex(s=>s.k===k), cur=all[i];
  for(let j=i+1;j<all.length;j++){ const s=all[j]; if(!open(it,s)) continue; if(!s.req && (leaveGroup || !cur || s.grp!==cur.grp)) continue; return s; }
  return all.find(s=>s.req && open(it,s)) || null; }
const ctxCount = it => slots(it).filter(s=>s.step==='context' && !s.part && has(it,s.k)).length;
/* 4–7 rule per item (or per group-lot piece): required angles done, total photos, plate/logo state */
function photoRule(it,pid){ const all=slots(it).filter(s=>pid?s.part===pid:!s.part);
  const ang=all.filter(s=>s.step==='context'), req=ang.filter(s=>s.req), b=all.find(s=>s.step==='brand'), pl=all.find(s=>s.step==='specs');
  const st=s=>!s?'na':has(it,s.k)?'ok':skipped(it,s)?'skip':'need';
  const r={reqDone:req.filter(s=>has(it,s.k)).length, min:req.length, total:ang.concat([b,pl]).filter(s=>s&&has(it,s.k)).length, max:PHOTO_MAX, plate:st(pl), brand:st(b)};
  r.ok = r.reqDone>=r.min && r.plate!=='need' && r.brand!=='need'; return r; }
const ruleText = r => `${r.reqDone}/${r.min} required · ${r.total} of ${r.max} max`;
const ruleHTML = r => `<span class="prule"><b class="${r.reqDone>=r.min?'okt':''}">${ruleText(r)}</b><span class="rflag ${r.plate}">${r.plate==='ok'?'✓ ':r.plate==='skip'?'No ':''}Data plate</span><span class="rflag ${r.brand}">${r.brand==='ok'?'✓ ':r.brand==='skip'?'No ':''}Brand logo</span></span>`;

/* ---------- per-lot checklist: the 5 protocol parameters ---------- */
function checklist(it){ migrate(it); const grp=it.type==='lot', parts=it.parts||[], all=slots(it);
  const handled = k => { const s=all.find(x=>x.k===k); return s && (has(it,k) || skipped(it,s)); };
  const brandTxt = t => t.make ? t.make : 'unknown';
  const out = [{k:'bookmark',n:'Bookmark',ok:has(it,'sticker'),detail:has(it,'sticker')?(it.stickerMode==='physical'?'Physical sticker photographed':'Digital lot sticker #'+it.lot):'Lot sticker photo missing'}];
  const vidOk = () => { if(!videoReq(it)) return {ok:true,na:!has(it,'video')&&!it.skip?.video,detail:has(it,'video')?'Optional video':'Video optional for Other'};
    if(has(it,'video')) return {ok:true,detail:kindOf(it)==='cooler'?`Working video · ${it.tempF!=null?it.tempF+'°F':'temp not noted'}`:'Working video'};
    if(it.skip?.video) return {ok:true,detail:'Doesn’t power on · AS IS'};
    return {ok:false,detail:kindOf(it)==='cooler'?'Cooler video (thermometer <41°F) missing':'Working video missing'}; };
  if(!grp){ const c=ctxCount(it);
    out.push({k:'context',n:'Context',ok:c>=MIN,detail:c<MIN?`${c} of ${MIN} required angles`:`${MIN} required${c>MIN?` + ${c-MIN} extra`:''} · ${photoRule(it).total} of ${PHOTO_MAX} photos`});
    out.push({k:'brand',n:'Brand',ok:handled('brand'),detail:has(it,'brand')?'Logo close-up':it.skip?.brand?'No brand logo · brand: '+brandTxt(it):'Logo close-up missing'});
    out.push({k:'specs',n:'Specs',ok:handled('plate'),detail:has(it,'plate')?'Manufacturer plate photo':it.skip?.plate?'No plate · '+(it.model?'model typed':'specs typed or left blank'):'Plate photo missing'});
    const v=vidOk(); out.push({k:'video',n:'Video',ok:v.ok,na:!!v.na,detail:v.detail});
    out.push({k:'scale',n:'Scale',ok:true,na:true,detail:'Group lots only'});
  } else { const shotP=parts.filter(p=>photoRule(it,p.id).reqDone>=MIN).length;
    out.push({k:'context',n:'Context',ok:parts.length>0 && shotP===parts.length,detail:parts.length?`${shotP} of ${parts.length} main item${parts.length===1?'':'s'} with ${MIN} required angles`:'Add at least one main item'});
    const bh=parts.filter(p=>handled(p.id+'-brand')).length, sh=parts.filter(p=>handled(p.id+'-plate')).length;
    out.push({k:'brand',n:'Brand',ok:parts.length>0 && bh===parts.length,detail:`${bh} of ${parts.length} logos (or “no logo”)`});
    out.push({k:'specs',n:'Specs',ok:parts.length>0 && sh===parts.length,detail:`${sh} of ${parts.length} plates (or “no plate”)`});
    out.push({k:'scale',n:'Scale',ok:has(it,'group'),detail:has(it,'group')?'Wide group shot'+(it.qty>1?' · '+it.qty+' pcs counted':''):'Wide group shot missing'});
    const v=vidOk(); out.push({k:'video',n:'Video',ok:v.ok,na:!!v.na,detail:v.detail});
  }
  return out; }
const missing = it => checklist(it).filter(c=>!c.ok && !c.na);

/* ---------- lot numbers ---------- */
function nextLot(){ const L=S().lots; const used=new Set(S().items.map(i=>String(i.lot))); let n=Math.max(1,+L.next||1001); while(used.has(String(n))) n++; L.next=n+1; return n; }
function reserve(count,start){ const L=S().lots; count=Math.max(1,Math.min(999,+count||25)); start=+start||+L.next||1001; Object.assign(L,{start,end:start+count-1,next:Math.max(start,+L.next||start)}); if(L.next>L.end || L.next<start) L.next=start; LL.save(); }
const fmtRange = L => L && L.end ? `${L.start}–${L.end}` : '';

/* ---------- migration from the pre-protocol shot list (front / plate / back · overview / closeup) ---------- */
function migrate(it){ if(it.pv>=4) return; it.pv=4; it.skip=it.skip||{}; it.photos=it.photos||{};
  if(it.lot==null) it.lot=nextLot(); if(!it.guarantee) it.guarantee='On Site Guarantee';
  if(!it.stickerMode){ it.stickerMode='digital'; it.photos.sticker='digital'; }
  if(!it.itemKind) it.itemKind=kindOf(it);
  if(it.type==='lot' && !(it.parts&&it.parts.length)) it.parts=[{id:LL.uid().slice(0,5),name:''}];
  const map = it.type==='lot' ? {overview:'group',closeup:it.parts[0].id+'-1'} : {front:'ctx1',back:'ctx4'};
  /* note: closeup→piece front keeps old data; front/back keys match the 4–7 slot list */
  Object.entries(map).forEach(([o,n])=>{ if(it.photos[o] && !it.photos[n]){ it.photos[n]=it.photos[o]; const u=LL.photos.get(it.id,o); if(u) LL.photos.set(it.id,n,u); } });
  setTimeout(LL.save,0); }

/* ---------- digital lot sticker (canvas → JPEG, photo #1) ---------- */
const stk = new Map();
function rr(x,X,Y,W,H,R){ x.beginPath(); x.moveTo(X+R,Y); x.arcTo(X+W,Y,X+W,Y+H,R); x.arcTo(X+W,Y+H,X,Y+H,R); x.arcTo(X,Y+H,X,Y,R); x.arcTo(X,Y,X+W,Y,R); x.closePath(); }
const fmtDate = t => { const d=new Date(t||Date.now()); return (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear(); };
function stickerURL(lot,cid,date){ const fo=!!(document.fonts && document.fonts.check('800 40px Barlow')); const key=[lot,cid,date,fo].join('|'); if(stk.has(key)) return stk.get(key);
  const c=document.createElement('canvas'); c.width=1024; c.height=768; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,1024,768); g.addColorStop(0,'#091747'); g.addColorStop(1,'#00456e'); x.fillStyle=g; x.fillRect(0,0,1024,768);
  x.strokeStyle='rgba(255,255,255,.07)'; x.lineWidth=2; for(let i=0;i<1024;i+=64){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,768); x.stroke(); } for(let i=0;i<768;i+=64){ x.beginPath(); x.moveTo(0,i); x.lineTo(1024,i); x.stroke(); }
  x.fillStyle='#fff'; x.globalAlpha=.85; x.font=`700 30px ${fo?'Barlow':'Arial'}, Arial`; x.textAlign='left'; x.fillText('LOCAL LIQUIDATORS · DIGITAL LOT STICKER',40,56); x.globalAlpha=1;
  x.save(); x.translate(512,400); x.rotate(-.025); x.shadowColor='rgba(0,0,0,.45)'; x.shadowBlur=30; x.shadowOffsetY=14;
  rr(x,-380,-235,760,470,34); x.fillStyle='#7ee04f'; x.fill(); x.shadowColor='transparent';
  x.lineWidth=8; x.strokeStyle='#5cbf2f'; x.stroke();
  x.fillStyle='#091747'; x.textAlign='center'; x.font=`800 54px ${fo?'Barlow':'Arial'}, Arial`; x.fillText('LOT',0,-150);
  const s=String(lot||'—'); let fs=300; x.font=`800 ${fs}px ${fo?'Barlow':'Arial'}, Arial`; while(x.measureText(s).width>680 && fs>80){ fs-=10; x.font=`800 ${fs}px ${fo?'Barlow':'Arial'}, Arial`; }
  x.textBaseline='middle'; x.fillText(s,0,10); x.textBaseline='alphabetic';
  x.fillStyle='rgba(9,23,71,.88)'; x.save(); rr(x,-380,-235,760,470,34); x.clip(); x.fillRect(-380,140,760,95); x.restore();
  x.fillStyle='#fff'; x.font=`700 34px ${fo?'Barlow':'Arial'}, Arial`; x.fillText(`Consignor ${cid||'— not set —'}   ·   ${date}`,0,200); x.restore();
  x.fillStyle='#ffb347'; x.font=`700 26px ${fo?'Barlow':'Arial'}, Arial`; x.textAlign='right'; x.fillText('PHOTO 1 · BOOKMARK',984,740);
  const u=c.toDataURL('image/jpeg',.9); stk.set(key,u); return u; }
const stickerOf = it => stickerURL(it.lot, S().profile.consignorId, fmtDate(it.created));

/* ---------- plate read: same DEMO/real pattern as AI Describe; fills empty Brand/Model/Serial/Volts as a DRAFT ---------- */
async function readPlate(it,s){ const t = s.part ? partOf(it,s.part) : it; const url=LL.photos.get(it.id,s.k); if(!t || !url) return;
  t.plateRead={status:'reading'}; LL.save();
  const cat = s.part ? guessCat(t.name) : (it.cat!=='other'?it.cat:undefined);
  let r=null; try{ r=await LL.analyzePhotos([{role:'plate',dataUrl:url}], {type:'item',category:cat,make:t.make||undefined,model:t.model||undefined}); }catch(e){}
  if(!r){ t.plateRead={status:'failed'}; }
  else { const f={make:r.make,model:r.model,serial:r.serial,power:r.power}, filled=[];
    Object.keys(f).forEach(k=>{ if(!t[k] && f[k] && f[k]!=='n/a' && f[k]!=='—'){ t[k]=f[k]; filled.push(k); } });
    if(!s.part && it.cat==='other' && r.category) it.cat=r.category;
    t.plateRead={status:'done',source:r.source,filled,confidence:r.confidence}; }
  LL.save(); if(location.hash.includes('/sell/item/'+it.id)) LL.render(true); }

/* category hint for a group-lot piece, from its name (keeps the DEMO draft on-topic) */
function guessCat(n){ n=String(n||'').toLowerCase(); const m=[['mixer','mixer'],['oven','oven'],['range','oven'],['fryer','oven'],['refriger','refrig'],['reach-in','refrig'],['cooler','refrig'],['freezer','refrig'],['prep','prep'],['table','prep'],['rack','racks'],['shelv','racks'],['pos','pos'],['register','pos'],['chair','furniture'],['booth','furniture'],['pan','smallwares'],['pot','smallwares']].find(([k])=>n.includes(k)); return m?m[1]:undefined; }
/* ---------- Data protocol: Column C description formula ---------- */
const typeOf = it => it.typeName || TYPE[it.cat] || 'Equipment';
function descAuto(it){
  if(it.type==='lot'){ const names=(it.parts||[]).map((p,j)=>{ const nm=p.name||('Item '+(j+1)); return p.make && !nm.toLowerCase().includes(p.make.toLowerCase()) && !/^(unbranded|unknown)$/i.test(p.make) ? p.make+' '+nm : nm; });
    return `Group Lot - ${names.join(', ')||typeOf(it)}${it.qty>1?` (${it.qty} pcs)`:''}`; }
  const brand = it.make && !/^(unbranded|unknown|n\/a)$/i.test(it.make) ? it.make : '';
  const md = it.model && it.model!=='—' ? 'Model '+it.model : (it.size||'');
  return [brand,typeOf(it)].filter(Boolean).join(' ') + (md?' - '+md:''); }
const desc = it => (it.descC && it.descC.trim()) ? it.descC.trim() : descAuto(it);

LL.proto = {ANGLES,PART_ANGLES,MIN,MAX,EXTRA,PHOTO_MAX,photoRule,ruleText,ruleHTML,STEPS,KINDS,GUAR,TYPE,kindOf,videoReq,videoPrompt,slots,shots,next,open,ctxCount,checklist,missing,nextLot,reserve,fmtRange,migrate,stickerURL,stickerOf,fmtDate,readPlate,typeOf,descAuto,desc,partOf,partName,skipped,has};

/* ======================= screens ======================= */
const back = h => `<a class="iconbtn" href="${h}" aria-label="Back">${I.back}</a>`;
const ico = {
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/></svg>'};
LL.icons.print=ico.print; LL.icons.truck=ico.truck; LL.icons.tag=ico.tag;

/* ---------- Protocol help ---------- */
LL.views.protocol = () => { const C=LL.CONTACT;
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">${back('#/sell')}<div><h2 style="font-size:28px;font-weight:800">Inventory Protocol</h2><p class="small muted">Local Liquidators Auction Inventory Protocol · Consignor Guide</p></div></div>
   <p class="muted" style="margin:6px 0 14px">Every listing needs two things: <b>the Visual Protocol</b> (what buyers see) and <b>the Data Protocol</b> (what buyers read). Precise input means higher bids.</p>
   <div class="card pad"><div class="lbl">Visual protocol — macro to micro</div><ol class="funnel">${[
     ['Bookmark','Lot number sticker','Photograph the lot sticker <b>first</b>. It acts as a digital divider so assets never get mixed up during upload and editing. The app makes a digital sticker for you (or photograph a real one).'],
     ['Context','4 required + 1 extra','Take <b>4 required angles</b>: front, side, back and inside/top (or working). Add 1 optional extra if it helps. With the logo and data plate that is <b>4–7 photos per item, 7 max</b>. Clean background, good lighting — complete context removes buyer hesitation.'],
     ['Brand','Logo close-up','Zoom in on the brand logo or manufacturer emblem. Brand names drive search traffic and prove authenticity.'],
     ['Specs','Serial / data plate','A legible, tightly focused photo of the model number, serial plate or electrical tags.'],
     ['Video','≤15 seconds','One working video: machines running/moving; coolers showing a thermometer under 41°F. “Doesn’t power on” sets Guarantee to AS IS. Optional for Other.'],
     ['Scale','Group shot','Group or bulk lots: shoot the high-value pieces individually, then one <b>wide overall group shot</b>.']].map((s,i)=>`<li><i>${i+1}</i><div><b>${s[0]}</b> <span class="small muted">· ${s[1]}</span><p class="small">${s[2]}</p></div></li>`).join('')}</ol>
    <p class="small muted" style="margin-top:8px">Efficiency tip: once you find your rhythm, this takes seconds per item.</p></div>
   <div class="card pad"><div class="lbl">Submit</div><p class="small">Submit all photos as <b>JPEG</b>. Large inventory? Request a secure <b>Dropbox link</b> from ${esc(C.name)} for bulk uploads. <b>Export for Local Liquidators</b> in this app names every photo by lot (1001_01.jpg = sticker, 1001_02.jpg …).</p></div>
   <div class="card pad"><div class="lbl">Data protocol — your Excel blueprint</div>
    <div class="xtable" role="table" aria-label="Spreadsheet columns"><div role="row" class="xh"><span>A</span><span>B</span><span>C</span><span>D</span></div><div role="row" class="xh2"><span>Lot Number</span><span>Consignor ID</span><span>Description</span><span>Guarantee Type</span></div><div role="row"><span>1001</span><span>[Your ID]</span><span>Hobart Commercial Mixer - Model HL600</span><span>On Site Guarantee</span></div></div>
    <ul class="tips" style="margin-top:12px"><li><i>A</i><span><b>Lot Number</b> must match the sticker on the item — the link between photos and data.</span></li><li><i>B</i><span><b>Consignor ID</b> — your account identifier (set once in Profile).</span></li><li><i>C</i><span><b>Description</b> = [Brand] + [Type] + [Model / Dimensions].</span></li><li><i>D</i><span><b>On Site Guarantee</b> (fully functional) or <b>AS IS</b> (sellable but damaged / untested).</span></li></ul></div>
   <div class="card pad contactcard"><div class="lbl">Expert support</div><b style="font-family:var(--head);font-size:21px">${esc(C.name)}</b><span class="small muted" style="display:block;margin-bottom:6px">Primary contact · cataloging help</span>
    <a class="listrow" href="mailto:${C.email}" style="text-decoration:none;color:inherit">${I.mail.replace('<svg','<svg width="22" height="22"')}<div><b>Email</b><span class="small muted">${C.email}</span></div></a>
    <a class="listrow" href="tel:${C.tel}" style="text-decoration:none;color:inherit">${I.phone.replace('<svg','<svg width="22" height="22"')}<div><b>Call</b><span class="small muted">${C.phone}</span></div></a></div>
   <p class="small muted center" style="margin:14px 0 4px">Summary of Local Liquidators’ Consignor Guide.</p></div>`}; };

/* ---------- Lot stickers: reserve a block → print or ship ---------- */
const OSTAT = ['Ordered','Printing','Shipped','Delivered'];
LL.STICKER_STATUS = OSTAT;
const latestOrder = () => (S().stickerOrders||[]).slice(-1)[0] || null;
LL.proto.latestOrder = latestOrder;
LL.proto.stickerStatusHTML = (compact) => { const o=latestOrder(), L=S().lots;
  if(o) return `<a class="stkstat" href="#/sell/stickers/order/${o.id}">${ico.truck}<div><b>Lot stickers · ${OSTAT[o.status]}</b><span>${o.from}–${o.to} · ${o.count} stickers · status on this phone</span></div>${I.chev}</a>`;
  if(L.end) return `<a class="stkstat" href="#/sell/stickers">${ico.tag}<div><b>Lots ${fmtRange(L)} reserved</b><span>Next lot #${Math.max(L.next,L.start)} · get paper stickers</span></div>${I.chev}</a>`;
  return `<a class="stkstat" href="#/sell/stickers">${ico.tag}<div><b>Get your lot stickers</b><span>Reserve lot numbers · print or ship</span></div>${I.chev}</a>`; };
LL.views.stickers = ({sub,arg}) => {
  const p=S().profile, L=S().lots;
  if(sub==='print') return printView();
  if(sub==='ship') return shipView();
  if(sub==='order') return orderView(arg);
  const orders=(S().stickerOrders||[]);
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${back('#/sell')}<h2 style="font-size:28px;font-weight:800">Get your lot stickers</h2></div>
   <div class="card pad"><div class="lbl">1 · Reserve lot numbers</div>
    ${L.end?`<p style="font-size:17px;margin-bottom:10px">Reserved <b class="lotrange">${fmtRange(L)}</b> <span class="small muted">(${L.end-L.start+1} numbers · next #${Math.max(L.next,L.start)})</span></p>`:`<p class="small muted" style="margin-bottom:10px">Lot numbers go on a sticker on each item and in Column A of your spreadsheet. The app assigns them in order.</p>`}
    <form id="resf" class="row" style="align-items:flex-end"><label class="field" style="margin:0"><span>How many items?</span><input type="number" min="1" max="999" inputmode="numeric" name="n" value="${L.end?L.end-L.start+1:25}" aria-label="About how many items"></label><label class="field" style="margin:0"><span>Start at #</span><input type="number" min="1" inputmode="numeric" name="s" value="${L.end?L.start:(+L.next||1001)}"></label></form>
    <button class="btn ${L.end?'ghost':''} block sm" style="margin-top:10px" data-act="reservelots">${L.end?'Update reservation':'Reserve lot numbers'}</button></div>
   <div class="lbl" style="margin:18px 0 8px">2 · How do you want your stickers?</div>
   <div class="optcards">
    <a class="optcard" href="#/sell/stickers/print"><span class="oi">${ico.print}</span><b>Print them now</b><span>Print a sticker sheet at home or the office, cut and stick one on each item.</span><em>Fastest</em></a>
    <a class="optcard" href="#/sell/stickers/ship"><span class="oi">${ico.truck}</span><b>Ship them to me</b><span>Bright pre-printed stickers mailed to you. Track the order here.</span><em>Requested by email</em></a></div>
   <p class="small muted center" style="margin:12px 4px 0">No stickers yet? You can still start — the app adds a <b>digital lot sticker</b> as photo #1 of every lot.</p>
   ${orders.length?`<div class="lbl" style="margin:18px 0 8px">Your sticker orders</div>${orders.slice().reverse().map(o=>`<a class="stkstat" href="#/sell/stickers/order/${o.id}">${ico.truck}<div><b>${o.from}–${o.to} · ${OSTAT[o.status]}</b><span>Ordered ${fmtDate(o.at)} · ${o.count} stickers</span></div>${I.chev}</a>`).join('')}`:''}
   <div style="height:12px"></div></div>`,
   mount(el){ } }; };
LL.acts.reservelots = () => { const f=LL.$('#resf'); reserve(f.elements.n.value, f.elements.s.value); LL.toast('Reserved lots '+fmtRange(S().lots)); LL.render(true); };
function rangeOf(){ const L=S().lots; if(L.end) return [L.start,L.end]; const s=+L.next||1001; return [s,s+23]; }
function printView(){ const [a,b]=rangeOf(), n=Math.min(b-a+1,120), cid=S().profile.consignorId;
  return {html:`<div class="pad noprint"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${back('#/sell/stickers')}<h2 style="font-size:26px;font-weight:800">Print lot stickers</h2></div>
   <p class="small muted">${n} stickers · lots ${a}–${a+n-1}${cid?' · Consignor '+esc(cid):''}. Print on plain paper or full-sheet label paper, cut out, and stick one on each item before you photograph it.</p>
   <button class="btn accent block" style="margin:12px 0" data-act="printstk">${ico.print} Print sticker sheet</button></div>
   <div class="stksheet" aria-label="Sticker sheet preview">${Array.from({length:n},(_,i)=>`<div class="pstk"><small>LOT</small><b>${a+i}</b><span>${cid?'Consignor '+esc(cid):'Local Liquidators'}</span></div>`).join('')}</div>
   <p class="small muted center noprint" style="padding:10px 16px 20px">Sheet is generated on this phone.</p>`}; }
LL.acts.printstk = () => window.print();
function shipView(){ const p=S().profile, [a,b]=rangeOf();
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${back('#/sell/stickers')}<h2 style="font-size:26px;font-weight:800">Ship stickers to me</h2></div>
   <div class="ai-banner" role="note" style="margin-bottom:14px">${I.info.replace('<svg','<svg width="22" height="22" style="flex:none"')}<div><b>How ordering works:</b> placing the order saves it on this phone and opens an email to Local Liquidators with the details. Your rep confirms and ships.</div></div>
   <form id="shipf" novalidate>
    <label class="field"><span>Name <i>*</i></span><input type="text" name="name" required value="${esc(p.contact)}" autocomplete="name"></label>
    <label class="field"><span>Business</span><input type="text" name="business" value="${esc(p.business)}" autocomplete="organization"></label>
    <label class="field"><span>Mailing address <i>*</i></span><input type="text" name="street" required placeholder="Street address" autocomplete="street-address"></label>
    <div class="row"><label class="field"><span>City <i>*</i></span><input type="text" name="city" required autocomplete="address-level2"></label><label class="field" style="flex:0 0 74px"><span>State</span><input type="text" name="st" maxlength="2" placeholder="AZ" autocomplete="address-level1"></label><label class="field" style="flex:0 0 96px"><span>ZIP <i>*</i></span><input type="text" name="zip" required inputmode="numeric" maxlength="10" autocomplete="postal-code"></label></div>
    <div class="row"><label class="field"><span>From lot #</span><input type="number" name="from" min="1" value="${a}" inputmode="numeric"></label><label class="field"><span>To lot #</span><input type="number" name="to" min="1" value="${b}" inputmode="numeric"></label></div>
    <p class="hint" id="shipn" style="margin:-6px 0 12px">${b-a+1} stickers</p>
    <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="Delivery instructions, extra blanks, rush…"></textarea></label>
    <button class="btn accent block" type="submit">${ico.truck} Place sticker order</button></form></div>`,
   mount(el){ const f=el.querySelector('#shipf'), upd=()=>{ const n=(+f.elements.to.value)-(+f.elements.from.value)+1; el.querySelector('#shipn').textContent = n>0? n+' stickers':'Check the range'; };
     f.addEventListener('input',upd);
     f.addEventListener('submit',e=>{ e.preventDefault(); const v=n=>f.elements[n].value.trim(); const req=['name','street','city','zip'].find(n=>!v(n)); if(req){ LL.toast('Add your '+(req==='street'?'mailing address':req==='zip'?'ZIP code':req)); f.elements[req].focus(); return; }
       const from=+v('from'), to=+v('to'); if(!(to>=from)){ LL.toast('Check the lot number range'); return; }
       const o={id:LL.uid(),at:Date.now(),name:v('name'),business:v('business'),street:v('street'),city:v('city'),st:v('st').toUpperCase(),zip:v('zip'),from,to,count:to-from+1,notes:v('notes'),consignorId:S().profile.consignorId||'',status:0,hist:[Date.now()]};
       S().stickerOrders=(S().stickerOrders||[]).concat(o); LL.save(); LL.go('#/sell/stickers/order/'+o.id); LL.toast('Sticker order saved — email it to Local Liquidators'); }); } }; }
function mailOrder(o){ const body=`LOT STICKER ORDER\nOrder #: ${o.id.toUpperCase()}\nPlaced: ${new Date(o.at).toLocaleString()}\n\nName: ${o.name}\nBusiness: ${o.business||'-'}\nConsignor ID: ${o.consignorId||'not set'}\nShip to: ${o.street}, ${o.city}${o.st?', '+o.st:''} ${o.zip}\n\nLot numbers: ${o.from}-${o.to} (${o.count} stickers)\nNotes: ${o.notes||'-'}\n\nSent from Speedy List AI.`;
  return `mailto:${LL.EMAIL}?subject=${encodeURIComponent(`Lot sticker order - ${o.business||o.name} - lots ${o.from}-${o.to}`)}&body=${encodeURIComponent(body)}`; }
function orderView(id){ const o=(S().stickerOrders||[]).find(x=>x.id===id); if(!o){ LL.go('#/sell/stickers',true); return {html:''}; }
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${back('#/sell/stickers')}<div><h2 style="font-size:26px;font-weight:800">Sticker order</h2><p class="small muted">#${o.id.toUpperCase()} · lots ${o.from}–${o.to} · ${o.count} stickers</p></div></div>
   <div class="card pad"><ol class="tracker" aria-label="Order status">${OSTAT.map((s,i)=>`<li class="${i<o.status?'done':i===o.status?'cur':''}"><i>${i<=o.status?I.check:''}</i><div><b>${s}</b><span class="small muted">${o.hist[i]?new Date(o.hist[i]).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):['','We print your stickers','On the way to you','Stick one on each item'][i]}</span></div></li>`).join('')}</ol>
    <p class="small muted" style="margin-top:6px"><span class="badge demo">Status on this phone</span> Statuses don’t update on their own; update them when your rep confirms.</p>
    <button class="btn ghost sm block" style="margin-top:10px" data-act="stkadv" data-id="${o.id}" ${o.status>=3?'disabled':''}>Mark next status</button></div>
   <div class="card pad"><dl class="kv"><dt>Name</dt><dd>${esc(o.name)}</dd>${o.business?`<dt>Business</dt><dd>${esc(o.business)}</dd>`:''}<dt>Ship to</dt><dd>${esc(o.street)}<br>${esc(o.city)}${o.st?', '+esc(o.st):''} ${esc(o.zip)}</dd><dt>Lot numbers</dt><dd>${o.from}–${o.to}</dd><dt>Stickers</dt><dd>${o.count}</dd><dt>Consignor ID</dt><dd>${esc(o.consignorId||'—')}</dd>${o.notes?`<dt>Notes</dt><dd>${esc(o.notes)}</dd>`:''}</dl></div>
   <a class="btn block" style="margin-top:14px" href="${mailOrder(o)}">${I.mail} Email order to Local Liquidators</a>
   <p class="small muted" style="margin-top:8px">Opens your mail app with the order filled in, addressed to ${LL.EMAIL}. Nothing is sent until you tap Send.</p>
   <a class="btn ghost block" style="margin-top:12px" href="#/sell">Back to inventory</a></div>`}; }
LL.acts.stkadv = b => { const o=(S().stickerOrders||[]).find(x=>x.id===b.dataset.id); if(!o||o.status>=3) return; o.status++; o.hist[o.status]=Date.now(); LL.save(); LL.render(true); };
})();
