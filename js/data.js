/* SAMPLE DATA — every live auction / lot below is invented for the prototype. Recent results use figures
   from the Local Liquidators Crumbl proposal (winning bids before buyer's premium and tax). */
(function(){
const LL = window.LL, H = 3600e3, base = Date.now();
LL.AUCTIONS = [
  {id:'a1',live:true,title:'Restaurant Closing Auction',loc:'Phoenix, AZ',blurb:'Full kitchen line, walk-in parts and dining room.',art:'oven',seed:0},
  {id:'a2',live:true,title:'Bakery Equipment Liquidation',loc:'Mesa, AZ',blurb:'Mixers, proofers, sheet pans and prep tables.',art:'mixer',seed:1},
  {id:'a3',live:true,title:'Café & Smallwares Sale',loc:'Scottsdale, AZ',blurb:'Espresso-bar gear, POS and smallwares by the lot.',art:'pos',seed:2},
  {id:'cary',live:false,title:'Cary, NC Crumbl Auction',loc:'Cary, NC',closed:'Closed 6/17/26',lots:105,total:'$84,101',url:'https://online.localauctions.com/auction/24410/bidgallery/',art:'oven',seed:3,
    hl:['Two Blodgett XCEL-XR8 rack ovens at $18,000 each','Two Hobart HL600 mixers at $10,250 each','Hobart HL200 mixer: $4,150','Reach-in coolers: about $1,100–$1,650 each','Pickup completed within 2 days']},
  {id:'wsp',live:false,title:'West St. Paul, MN Crumbl Auction',loc:'West St. Paul, MN',closed:'Closed 8/25/26',lots:209,total:'$50,914',url:'https://online.localauctions.com/auction/27514/bidgallery/',art:'mixer',seed:1,
    hl:['Hobart HL600 mixers: $8,100 and $8,200','Blodgett rack ovens: $5,100 and $5,800','Reach-ins: $440–$680','Sheet pans: about $90–$145 per lot of 24','Pickup within 2 days']}
];
const L = (id,a,t,cat,city,st,miles,bid,bids,h,views,seed) => ({id,a,t,cat,city,st,miles,bid,bids,ends:base+h*H,views,seed,sample:true,url:LL.SITE});
LL.LOTS = [
  L('l1','a1','Blodgett DFG-100 Double-Stack Convection Oven','oven','Phoenix','AZ',0,1250,14,5.5,['front','interior','plate','side'],0),
  L('l2','a1','True T-49 Two-Door Reach-In Refrigerator','refrig','Phoenix','AZ',0,640,9,5.5,['front','interior','plate'],1),
  L('l3','a1','Turbo Air 60" Sandwich Prep Table','prep','Phoenix','AZ',0,420,7,6,['front','detail','back'],2),
  L('l4','a1','Metro 5-Tier Wire Shelving, Lot of 4','racks','Phoenix','AZ',0,95,4,6.5,['front','detail'],3),
  L('l5','a1','Bistro Tables & Chairs, Lot of 6','furniture','Phoenix','AZ',0,180,5,7,['overview','detail','back'],0),
  L('l6','a2','Hobart HL600 60-Qt Planetary Mixer','mixer','Mesa','AZ',18,3900,21,26,['front','detail','plate','back'],1),
  L('l7','a2','Full-Size Aluminum Sheet Pans, Lot of 24','smallwares','Mesa','AZ',18,110,11,27,['overview','closeup'],2),
  L('l8','a2','Baxter Single Rack Oven','oven','Mesa','AZ',18,2200,13,28,['front','interior','plate'],3),
  L('l9','a2','Stainless Work Table 72" with Undershelf','prep','Mesa','AZ',18,150,6,29,['front','detail'],0),
  L('l10','a3','Elo 15" Touchscreen POS Terminal','pos','Scottsdale','AZ',12,140,8,49,['front','detail','plate'],2),
  L('l11','a3','Bunn Commercial Coffee Brewer','other','Scottsdale','AZ',12,85,3,50,['front','detail'],1),
  L('l12','a3','Smallwares Lot: Pots, Pans & Utensils','smallwares','Scottsdale','AZ',12,60,5,51,['overview','closeup','detail'],3),
  L('l13','a3','Two-Door Under-Counter Freezer','refrig','Scottsdale','AZ',12,360,10,52,['front','interior','plate'],0),
];
/* BUYER value snapshot — SAMPLE ESTIMATES ONLY (invented for the prototype, not real quotes or appraisals).
   newPrice = typical retail for the same item new; usedRange = typical used-market range; comps = sample comparables.
   A live build would fill these from the AI pass (server/analyze-core.js -> newPrice/usedRange/comps) backed by a web
   search or pricing API. Never shown on the seller side, and never on recent results (those show the actual winning bid). */
const NEW='Restaurant supply retailer', DEALER='Used equipment dealer', MKT='Online marketplace';
const V = (np,lo,hi,c) => ({newPrice:np, usedRange:{low:lo,high:hi}, comps:c.map(([src,kind,price])=>({src,kind,price})), valueSource:'sample'});
const VALUES = {
  l1:V(17500,4500,7500,[[NEW,'new',17450],[DEALER,'used',6900],[MKT,'used',4800]]),
  l2:V(6000,1500,2800,[[NEW,'new',5980],[DEALER,'used',2600],[MKT,'used',1650]]),
  l3:V(3200,900,1600,[[NEW,'new',3150],[DEALER,'used',1500],[MKT,'used',950]]),
  l4:V(1600,300,600,[[NEW,'new',1580],[MKT,'used',520],[MKT,'used',340]]),
  l5:V(1800,300,700,[[NEW,'new',1790],[MKT,'used',650],[MKT,'used',380]]),
  l6:V(38000,8000,14000,[[NEW,'new',37900],[DEALER,'used',13500],[MKT,'used',8900]]),
  l7:V(320,90,150,[[NEW,'new',318],[MKT,'used',140],[MKT,'used',95]]),
  l8:V(38000,6000,12000,[[NEW,'new',37600],[DEALER,'used',11500],[MKT,'used',6800]]),
  l9:V(350,100,200,[[NEW,'new',345],[MKT,'used',190],[MKT,'used',110]]),
  l10:V(1100,200,450,[[NEW,'new',1095],[DEALER,'used',420],[MKT,'used',230]]),
  l11:V(700,150,350,[[NEW,'new',695],[MKT,'used',320],[MKT,'used',170]]),
  l12:V(900,100,250,[[NEW,'new',880],[MKT,'used',240],[MKT,'used',120]]),
  l13:V(3400,800,1500,[[NEW,'new',3390],[DEALER,'used',1450],[MKT,'used',850]]),
};
LL.LOTS.forEach(l => Object.assign(l, VALUES[l.id]||{}));
LL.RESULT_LOTS = [
  {id:'r1',a:'cary',t:'Blodgett XCEL-XR8 rack ovens (2)',cat:'oven',res:'Sold $18,000 each',views:['front','interior','plate'],seed:3},
  {id:'r2',a:'cary',t:'Hobart HL600 mixers (2)',cat:'mixer',res:'Sold $10,250 each',views:['front','detail','plate'],seed:1},
  {id:'r3',a:'cary',t:'Hobart HL200 mixer',cat:'mixer',res:'Sold $4,150',views:['front','detail'],seed:0},
  {id:'r4',a:'cary',t:'Reach-in coolers',cat:'refrig',res:'About $1,100–$1,650 each',views:['front','interior'],seed:2},
  {id:'r5',a:'wsp',t:'Hobart HL600 mixers',cat:'mixer',res:'Sold $8,100 and $8,200',views:['front','detail','plate'],seed:1},
  {id:'r6',a:'wsp',t:'Blodgett rack ovens',cat:'oven',res:'Sold $5,100 and $5,800',views:['front','interior','plate'],seed:3},
  {id:'r7',a:'wsp',t:'Reach-in coolers',cat:'refrig',res:'Sold $440–$680',views:['front','interior'],seed:0},
  {id:'r8',a:'wsp',t:'Sheet pans, lots of 24',cat:'smallwares',res:'About $90–$145 per lot',views:['overview','closeup'],seed:2},
].map(r=>Object.assign(r,{result:true,sample:true,url:LL.AUCTIONS.find(a=>a.id===r.a).url}));
LL.auction = id => LL.AUCTIONS.find(a=>a.id===id);
LL.lot = id => LL.LOTS.find(l=>l.id===id) || LL.RESULT_LOTS.find(l=>l.id===id);
LL.money = n => '$' + Number(n).toLocaleString('en-US');
LL.filterLots = (q, cat) => { q=(q||'').trim().toLowerCase(); return LL.LOTS.filter(l => (cat==='all'||!cat||l.cat===cat) && (!q || (l.t+' '+LL.catLabel(l.cat)+' '+l.city+' '+l.st).toLowerCase().includes(q))); };
LL.matchSearch = s => LL.LOTS.filter(l => {
  if(s.cat && s.cat!=='any' && l.cat!==s.cat) return false;
  if(s.kw){ const hay=(l.t+' '+LL.catLabel(l.cat)).toLowerCase(); if(!s.kw.toLowerCase().split(/[,\s]+/).filter(Boolean).every(w=>hay.includes(w))) return false; }
  if(s.state && s.state!=='any' && l.st!==s.state) return false;
  if(s.miles && l.miles>s.miles) return false;
  if(s.min && l.bid<s.min) return false; if(s.max && l.bid>s.max) return false; return true; });
/* scope -> ordered slide list for the swipe viewer */
LL.scopeLots = scope => {
  if(scope==='all') return LL.filterLots(LL.state.ui.q, LL.state.ui.cat);
  if(scope==='watch') return LL.LOTS.filter(l=>LL.state.watch.includes(l.id));
  if(scope.startsWith('s:')) { const s=LL.state.searches.find(x=>x.id===scope.slice(2)); return s?LL.matchSearch(s):[]; }
  const a = LL.auction(scope); if(!a) return LL.LOTS;
  return a.live ? LL.LOTS.filter(l=>l.a===scope) : LL.RESULT_LOTS.filter(l=>l.a===scope);
};
LL.scopeTitle = scope => scope==='all' ? 'All example lots' : scope==='watch' ? 'Watchlist' : scope.startsWith('s:') ? 'Saved search' : (LL.auction(scope)||{title:'Lots'}).title;
LL.STATES = ['AZ','CA','CO','FL','GA','IL','MN','NC','NM','NV','NY','OH','OR','PA','TX','UT','VA','WA'];
})();
