/* "Export for Local Liquidators": protocol spreadsheet (.xlsx, hand-built — no library) + ZIP of JPEG photos named
   1001_01.jpg, 1001_02.jpg … in protocol order (lot sticker first), each stamped with its lot number. Runs entirely on the phone. */
(function(){
const LL = window.LL, esc = LL.esc, I = LL.icons, S = () => LL.state, P = () => LL.proto;
LL.views = LL.views || {}; LL.acts = LL.acts || {};
const enc = new TextEncoder();

/* ---------- ZIP (store, no compression — JPEGs are already compressed) ---------- */
const CRC = (()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
const crc32 = b => { let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
function zip(files){ // files: [{name, data:Uint8Array}]
  const d=new Date(), time=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1), date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  const parts=[], cen=[]; let off=0;
  for(const f of files){ const nm=enc.encode(f.name), crc=crc32(f.data), n=f.data.length;
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,time,true); h.setUint16(12,date,true); h.setUint32(14,crc,true); h.setUint32(18,n,true); h.setUint32(22,n,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,time,true); c.setUint16(14,date,true); c.setUint32(16,crc,true); c.setUint32(20,n,true); c.setUint32(24,n,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    cen.push(new Uint8Array(c.buffer),nm); off+=30+nm.length+n; }
  const csz=cen.reduce((a,b)=>a+b.length,0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csz,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/zip'}); }

/* ---------- XLSX (SpreadsheetML in a ZIP; inline strings, bold header, frozen row, Column D dropdown) ---------- */
const X = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const col = i => { let s=''; i++; while(i){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
function xlsx(header, rows, widths){
  const cell=(v,r,c,st)=> (typeof v==='number' && isFinite(v)) ? `<c r="${col(c)}${r}"${st?` s="${st}"`:''}><v>${v}</v></c>` : `<c r="${col(c)}${r}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>`
   + `<row r="1">${header.map((h,c)=>cell(h,1,c,1)).join('')}</row>` + rows.map((r,i)=>`<row r="${i+2}">${r.map((v,c)=>cell(v,i+2,c,c===2||c>=header.length-3?2:0)).join('')}</row>`).join('')
   + `</sheetData><dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="D2:D2000"><formula1>"On Site Guarantee,AS IS"</formula1></dataValidation></dataValidations></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00456E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = {
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventory" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml':sheet, 'xl/styles.xml':styles };
  const b=zip(Object.entries(files).map(([name,t])=>({name,data:enc.encode(t)})));
  return new Blob([b],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }

/* ---------- rows + photo lists ---------- */
const HEADER = ['Lot Number','Consignor ID','Description','Guarantee Type','Quantity','Lot Type','Item Kind','Brand','Model','Serial','Voltage / Specs','Video','Temp °F','Notes','Photo Count','Photo Files','Protocol Checklist'];
const WIDTHS = [12,14,44,18,9,12,14,16,16,16,22,10,10,40,11,30,40];
const lots = () => S().items.slice().sort((a,b)=>(+a.lot||0)-(+b.lot||0) || String(a.lot).localeCompare(String(b.lot)));
const safe = s => String(s??'').replace(/[^\w-]+/g,'') || 'lot';
const pn = (lot,i) => `${safe(lot)}_${String(i).padStart(2,'0')}.jpg`;
const photoSlots = it => P().slots(it).filter(s=>P().has(it,s.k) && !P().skipped(it,s));
function row(it){ const ck=P().checklist(it), miss=ck.filter(c=>!c.ok&&!c.na), ph=photoSlots(it).filter(s=>s.k!=='video'), grp=it.type==='lot';
  const num=/^\d+$/.test(String(it.lot)) ? +it.lot : String(it.lot||'');
  const partTxt = grp ? (it.parts||[]).map((p,j)=>`${P().partName(it,p,j)}${p.make?' ('+p.make+(p.model?' '+p.model:'')+')':''}`).join('; ') : '';
  const hasVid = !!(it.photos&&it.photos.video), vidSkip = !!(it.skip&&it.skip.video);
  const vidCol = hasVid ? 'yes' : (vidSkip ? 'no — doesn’t power on' : (P().videoReq(it)?'no':'n/a'));
  const tempCol = P().kindOf(it)==='cooler' && it.tempF!=null ? +it.tempF : '';
  return [num, S().profile.consignorId||'', P().desc(it), it.guarantee||'On Site Guarantee', +it.qty||1, grp?'Group / bulk lot':'Single item', P().kindOf(it),
    grp?'':(it.make||(it.skip?.brand?'Unknown (no logo)':'')), grp?'':it.model||'', grp?'':it.serial||'', grp?'':it.power||'',
    vidCol, tempCol,
    [grp&&partTxt?'Main items: '+partTxt:'', grp&&it.countNote?'Count: '+it.countNote:'', it.notes||''].filter(Boolean).join(' · '),
    ph.length, ph.length?`${pn(it.lot,1)} – ${pn(it.lot,ph.length)}`:'', miss.length?'Missing: '+miss.map(c=>c.n).join(', '):'Complete (all parameters hit)']; }
const rows = () => lots().map(row);

/* stamp a small lot badge onto a photo (burned into the JPEG) */
const loadImg = src => new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; });
async function stamp(src, lot){ const im=await loadImg(src), svg=src.startsWith('data:image/svg');
  const W=svg?800:(im.naturalWidth||800), H=svg?1000:(im.naturalHeight||1000), c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.drawImage(im,0,0,W,H);
  const h=Math.round(Math.max(30,Math.min(W,H)*.075)), m=Math.round(h*.4), txt='LOT '+lot; x.font=`800 ${Math.round(h*.6)}px Barlow, Arial, sans-serif`;
  const w=Math.round(x.measureText(txt).width+h*.7); x.fillStyle='rgba(9,23,71,.9)'; x.fillRect(m-3,m-3,w+6,h+6); x.fillStyle='#7ee04f'; x.fillRect(m,m,w,h);
  x.fillStyle='#091747'; x.textBaseline='middle'; x.textAlign='center'; x.fillText(txt,m+w/2,m+h/2+1);
  return c.toDataURL('image/jpeg',.9); }
const toJpeg = async src => src.startsWith('data:image/jpeg') ? src : (async()=>{ const im=await loadImg(src), c=document.createElement('canvas'); c.width=im.naturalWidth||1024; c.height=im.naturalHeight||768; c.getContext('2d').drawImage(im,0,0); return c.toDataURL('image/jpeg',.9); })();
const bytes = u => { const b=atob(u.split(',')[1]), a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return a; };
function vidExt(it){ const m=(it.videoMime||''); if(/mp4|quicktime/i.test(m)) return 'mp4'; return 'webm'; }
async function photoFiles(onp){ const out=[]; const L=lots();
  const tot=L.reduce((a,it)=>a+photoSlots(it).filter(s=>s.k!=='video').length+(it.photos&&it.photos.video?1:0),0); let done=0;
  for(const it of L){ let i=0;
    for(const s of photoSlots(it).filter(s=>s.k!=='video')){ i++; const src=LL.thumb(it,s.k) || (s.k==='sticker'?P().stickerOf(it):null); if(!src) continue;
      const url = s.k==='sticker' ? await toJpeg(src) : await stamp(src,it.lot); out.push({name:pn(it.lot,i),data:bytes(url),lot:it.lot,slot:s.k}); onp&&onp(++done,tot); }
    if(it.photos&&it.photos.video){ const v=LL.photos.get(it.id,'video'); if(v){ out.push({name:`${safe(it.lot)}_video.${vidExt(it)}`,data:bytes(v),lot:it.lot,slot:'video'}); onp&&onp(++done,tot); } }
  }
  return out; }
const base = () => 'local-liquidators-'+(safe(S().profile.consignorId)!=='lot'?safe(S().profile.consignorId)+'-':'')+new Date().toISOString().slice(0,10);
LL.downloadBlob = (name, blob) => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1500); };
LL.exportLL = {HEADER, rows, row, xlsx:()=>xlsx(HEADER,rows(),WIDTHS), photoFiles, zip, crc32, stamp, base, photoName:pn};

/* ---------- screen ---------- */
LL.views.export = () => { const p=S().profile, L=lots(); if(!L.length){ LL.go('#/sell',true); return {html:''}; }
  const nph=L.reduce((a,it)=>a+photoSlots(it).length,0), bad=L.filter(it=>P().missing(it).length), C=LL.CONTACT;
  const ckRow = it => { const ck=P().checklist(it); return `<li class="xlot"><div class="xl-h"><span class="lotchip">#${esc(it.lot)}</span><b>${esc(P().desc(it))}</b></div>
     <div class="pchk mini">${ck.filter(c=>!c.na).map(c=>`<span class="${c.ok?'ok':'no'}" title="${esc(c.detail)}">${c.ok?I.check:'!'} ${c.n}</span>`).join('')}</div>
     ${P().missing(it).length?`<a class="small tlink" href="#/sell/item/${it.id}/photos">Finish: ${P().missing(it).map(c=>esc(c.detail)).join(' · ')}</a>`:''}</li>`; };
  return {html:`<div class="pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><a class="iconbtn" href="#/sell" aria-label="Back">${I.back}</a><h2 style="font-size:27px;font-weight:800;line-height:1.05">Export for Local Liquidators</h2></div>
   <p class="muted small" style="margin-bottom:12px">${L.length} lot${L.length===1?'':'s'} · ${nph} JPEG photos · spreadsheet columns A–D follow the Consignor Guide.</p>
   ${p.consignorId?'':`<label class="field"><span>Your Consignor ID (Column B) <i>*</i></span><input type="text" data-pf="consignorId" placeholder="From your Local Liquidators rep" autocomplete="off"></label>`}
   <div class="card pad"><div class="lbl" style="display:flex;justify-content:space-between"><span>Protocol checklist</span><span class="${bad.length?'warnt':'okt'}">${bad.length?bad.length+' need attention':'All parameters hit'}</span></div><ul class="xlots">${L.map(ckRow).join('')}</ul></div>
   <div class="card pad"><div class="lbl">Spreadsheet preview</div><div class="xtable four" role="table" aria-label="Spreadsheet preview"><div role="row" class="xh"><span>A</span><span>B</span><span>C</span><span>D</span></div><div role="row" class="xh2"><span>Lot Number</span><span>Consignor ID</span><span>Description</span><span>Guarantee Type</span></div>${rows().slice(0,6).map(r=>`<div role="row"><span>${esc(r[0])}</span><span>${esc(r[1]||'—')}</span><span>${esc(r[2])}</span><span>${esc(r[3])}</span></div>`).join('')}</div>
    <p class="hint">Extra columns after D: quantity, lot type, item kind, brand, model, serial, voltage, <b>Video</b>, <b>Temp °F</b>, notes, photo files, checklist.</p></div>
   <div id="xprog" class="small muted center" style="min-height:20px;margin:10px 0 4px" aria-live="polite"></div>
   <div style="display:grid;gap:10px"><button class="btn accent block" data-act="xall">${I.download} Export for Local Liquidators</button>
    <div class="row"><button class="btn ghost sm" data-act="xsheet">Spreadsheet (.xlsx)</button><button class="btn ghost sm" data-act="xzip">Photos (.zip)</button></div>
    <button class="btn line sm block" data-act="dlcsv">CSV instead</button></div>
   <div class="tintcard" style="margin-top:14px"><p><b>Photos:</b> JPEG, named by lot in protocol order — <code>1001_01.jpg</code> is the lot sticker, then angles, logo, plate (and group shot). Working video is <code>1001_video.webm</code> (or .mp4). Every photo carries a small lot-number badge so nothing gets mixed up.</p><p style="margin-top:10px"><b>Large inventory?</b> Request a Dropbox link from ${esc(C.name)} — <a href="mailto:${C.email}">${C.email}</a> · <a href="tel:${C.tel}">${C.phone}</a>.</p></div>
   <p class="small muted" style="margin-top:10px">Files are built on this phone and downloaded — nothing is uploaded.</p></div>`,
   mount(el){ el.addEventListener('input',e=>{ const t=e.target; if(t.dataset.pf){ S().profile[t.dataset.pf]=t.value.trim(); LL.save(); } }); el.addEventListener('change',e=>{ if(e.target.dataset.pf) LL.render(true); }); }}; };
function preflight(){ const bad=lots().filter(it=>P().missing(it).length), msgs=[];
  if(!S().profile.consignorId) msgs.push('Consignor ID (Column B) is not set.');
  if(bad.length) msgs.push(bad.length+' lot'+(bad.length===1?' is':'s are')+' missing protocol parameters:\n'+bad.slice(0,8).map(it=>`  #${it.lot}: ${P().missing(it).map(c=>c.n).join(', ')}`).join('\n'));
  return !msgs.length || confirm(msgs.join('\n\n')+'\n\nExport anyway?'); }
const prog = t => { const e=LL.$('#xprog'); if(e) e.textContent=t; };
async function doSheet(){ LL.downloadBlob(base()+'.xlsx', LL.exportLL.xlsx()); }
async function doZip(){ prog('Preparing photos & video…'); const f=await photoFiles((d,t)=>prog(`Packing export… ${d}/${t}`)); LL.downloadBlob(base()+'-photos.zip', zip(f.map(({name,data})=>({name,data})))); prog(`${f.length} files zipped`); return f; }
LL.acts.xsheet = () => { if(preflight()) doSheet(); };
LL.acts.xzip = () => { if(preflight()) doZip(); };
LL.acts.xall = async () => { if(!preflight()) return; await doSheet(); await new Promise(r=>setTimeout(r,400)); await doZip(); LL.toast('Spreadsheet + photos downloaded'); };
})();
