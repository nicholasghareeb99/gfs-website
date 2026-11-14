// Verified Nov 1 audit; owner authorized repairs Nov 3. Display profiles only.
// Never writes catalog, job, quote, takeoff, price, or customer data. Call before
// per-job/per-run overlays so those explicit saved specifications retain priority.
const spaced = new Set(["PT/CEDAR spaced picket 4'", "3'/4' wood spaced picket",
  "6' spaced 4in/w pickets P/T", "6' spaced cedar 4in picket"]);
const ranch = new Map([["4' ranch rail 3 boards blk welded wire",3],
  ["4' ranch rail 4 boards blk welded wire",4]]);
export function applyAuditedModelCorrection(name, profile, raw = null) {
  if (!profile) return profile;
  const out = {...profile};
  if (Array.isArray(out.rails)) out.rails = out.rails.slice();
  const n=String(name||'');
  if (!out.wood && (/^Rockport-Midrail - (Adobe|Tan|White) [78]ft$/.test(n) || /^Vinyl [78]' Rockport Tan$/.test(n))) {
    if (raw?.secFt == null || +raw.secFt === 8) out.secFt=6;
  }
  if (spaced.has(n) && out.wood) {
    // Replace audited nominal/stale dimensions; respect a later custom width.
    if (raw?.boardIn == null || [3.5,5.5].includes(+raw.boardIn)) out.boardIn=4;
    if (raw?.gapIn == null || [2,2.5,6.5].includes(+raw.gapIn)) out.gapIn=2;
    if (out.boardIn===4 && out.gapIn===2) out.fixedPicketGap=true;
  }
  const count=ranch.get(n);
  const staleRanch=count===3 && +raw?.editH===6 && +raw?.postHIn===50.75 &&
    Array.isArray(raw?.rails) && raw.rails.length===3 && Math.abs(raw.rails[0]-7.625)<1e-8 && Math.abs(raw.rails[2]-37.44)<1e-8;
  if (count && (!raw || staleRanch)) {
    const face=5.5, top=48-face/2, bottom=(count===3?9.5:5)+face/2;
    Object.assign(out,{editH:4,postIn:3.5,postHIn:52,postHeightMode:'custom',
      boardIn:face,boardTIn:1.5,railWIn:face,railHIn:face,railTIn:1.5,
      railsN:count,railsAuto:false,rails:Array.from({length:count},(_,i)=>bottom+(top-bottom)*i/(count-1)),
      wire:'2x4',meshCol:'black'});
    // These belonged to the stale six-foot privacy recipe, not ranch infill.
    delete out.pkHIn;
  }
  if (/^Kingston-Concave Top - (Adobe|Tan|White) 6ft$/.test(n) && out.topper==='scallop') {
    out.topper='spindle';
    out.arch=null;
  }
  // The legacy alias explicitly identifies component colors; other two-tone
  // names lack component roles and remain owner decisions.
  if (/Rockport.*white post\/rail.*Adobe picket/i.test(n) && !out.wood && !raw) {
    out.cPost=out.cRail=16053487; out.cPanel=14272944;
  }
  // Widths embedded in legacy labels are panel widths, not a second height.
  if (!raw?.secFt && !out.wood && /^(?:Vinyl|Bedford|Cascade|Midland)/i.test(n)) {
    const width=n.match(/(?:\b|\s)(6|8)\s*(?:ft|')\s*(?:panels?\b|p\))/i);
    if (width) out.secFt=+width[1];
  }
  return out;
}

export function fixedSpacedPicketLayout(sp,inner,width,gap) {
  if (!sp?.fixedPicketGap || !sp.wood || sp.horiz || !['spaced','picket'].includes(sp.mode)) return null;
  if (![inner,width,gap].every(Number.isFinite) || inner<=0 || width<=0 || gap<0) return null;
  const w=Math.min(width,inner), pitch=w+gap, n=Math.max(1,Math.floor((inner+gap)/pitch));
  const used=n*w+(n-1)*gap;
  return {n,width:w,pitch,gap,start:(inner-used)/2};
}

export function auditedCatalogSummary(name, generated, resolved) {
  if (!resolved || (!spaced.has(name) && !ranch.has(name))) return generated;
  const out={...generated};
  for(const k of ['mode','wood','boardIn','gapIn','editH'])if(resolved[k]!=null)out[k]=resolved[k];
  if(ranch.has(name))out._note=(resolved.rails?.length||resolved.railsN)+'-rail, black 2 × 4 in welded wire';
  return out;
}
