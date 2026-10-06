/* On-device photo quality checks: brightness/glare + Laplacian-variance sharpness. No data leaves the phone. */
(function(){
const LL = window.LL;
const T = { dark:75, bright:205, satFrac:.16, blur:38 }; // tunable thresholds
const cv = document.createElement('canvas'); const cx = cv.getContext('2d', {willReadFrequently:true});
LL.vision = {
  T,
  analyze(src, sw, sh){
    const W = Math.min(320, sw), H = Math.max(1, Math.round(sh * W / sw));
    cv.width = W; cv.height = H; cx.drawImage(src, 0, 0, W, H);
    const d = cx.getImageData(0, 0, W, H).data, g = new Float32Array(W*H);
    let sum = 0, sat = 0, dk = 0;
    for(let i=0,j=0;i<d.length;i+=4,j++){ const y = .299*d[i] + .587*d[i+1] + .114*d[i+2]; g[j]=y; sum+=y; if(y>=248) sat++; if(y<=14) dk++; }
    const n = W*H; let m=0, m2=0, k=0;
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){ const i=y*W+x, l = 4*g[i]-g[i-1]-g[i+1]-g[i-W]-g[i+W]; m+=l; m2+=l*l; k++; }
    const mean = m/k, lap = m2/k - mean*mean;
    return { mean:sum/n, sat:sat/n, dark:dk/n, lap };
  },
  verdict(a){
    const out = { light:'ok', sharp:'ok', msgs:[] };
    if(a.mean < T.dark || a.dark > .45){ out.light='dark'; out.msgs.push('Too dark — turn on lights / move near a window'); }
    else if(a.mean > T.bright || a.sat > T.satFrac){ out.light='bright'; out.msgs.push('Too bright / glare — step away from direct light or tilt slightly to cut shine'); }
    if(a.lap < T.blur){ out.sharp='blur'; out.msgs.push('Hold steady — image looks soft. Tap to focus and brace your elbows'); }
    out.ok = out.light==='ok' && out.sharp==='ok';
    return out;
  },
  /* downscale any image source to a JPEG data URL */
  async toDataURL(src, sw, sh, max=1024, q=.74){
    const r = Math.min(1, max / Math.max(sw, sh)), c = document.createElement('canvas');
    c.width = Math.round(sw*r); c.height = Math.round(sh*r); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  },
  async fromFile(file){
    let bmp; try{ bmp = await createImageBitmap(file, {imageOrientation:'from-image'}); }catch(e){
      bmp = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); }); }
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
    return { url: await this.toDataURL(bmp, w, h), a: this.analyze(bmp, w, h) };
  }
};
})();
