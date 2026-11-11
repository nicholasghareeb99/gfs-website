(function(root){'use strict';
  function placement(hole,segs,holes){
    const tol=.02;
    if(!Number.isFinite(hole.a)||!Number.isFinite(hole.b)||!Number.isFinite(hole.ft)||hole.ft<=0||hole.b-hole.a<hole.ft-tol)return{code:'opening-clipped',message:'The requested gate extends beyond this fence run. Move it within the run or review its width. The gate is not shown.'};
    if((holes||[]).some(other=>other!==hole&&hole.a<other.b-tol&&hole.b>other.a+tol))return{code:'openings-overlap',message:'These gate openings overlap. Separate the openings before reviewing the gates. The affected gates are not shown.'};
    const covered=(segs||[]).filter(s=>s.s0+s.L>hole.a+1e-7&&s.s0<hole.b-1e-7);
    if(!covered.length)return{code:'opening-unresolved',message:'The gate opening could not be located on this run. Review its position. The gate is not shown.'};
    const angle=covered[0].ry,ux=Math.cos(angle),uz=-Math.sin(angle);
    const at=(s,t)=>({x:s.a.x+(s.b.x-s.a.x)*t,z:s.a.z+(s.b.z-s.a.z)*t});
    const first=covered[0],p0=at(first,Math.max(0,(hole.a-first.s0)/first.L));
    for(const s of covered){
      if(Math.cos(s.ry-angle)<0)return{code:'opening-crosses-corner',message:'This gate crosses a corner. Move the full opening onto one straight section. The gate is not shown.'};
      for(const t of [Math.max(0,(hole.a-s.s0)/s.L),Math.min(1,(hole.b-s.s0)/s.L)]){const p=at(s,t),dx=p.x-p0.x,dz=p.z-p0.z;if(Math.abs(dx*uz-dz*ux)>tol)return{code:'opening-crosses-corner',message:'This gate crosses a corner. Move the full opening onto one straight section. The gate is not shown.'};}
    }
    return null;
  }
  function grade(hole,segs){
    const heights=[];
    for(const s of segs||[]){if(s.s0+s.L<=hole.a||s.s0>=hole.b)continue;for(const station of [Math.max(hole.a,s.s0),Math.min(hole.b,s.s0+s.L)]){const t=(station-s.s0)/s.L;heights.push((s.a.y||0)+((s.b.y||0)-(s.a.y||0))*t);}}
    if(heights.length&&Math.max(...heights)-Math.min(...heights)>.02)return{code:'grade-needs-review',message:'Ground level changes across this opening. The gate is shown level; verify its ground clearance and swing on site.'};
    return null;
  }
  function add(B,run,gate,issue){
    const rows=B.group.userData.gateIssues||(B.group.userData.gateIssues=[]),value={run:run.i??0,gate,code:issue.code,message:issue.message};
    if(!rows.some(row=>row.run===value.run&&row.gate===value.gate&&row.code===value.code))rows.push(value);
  }
  function show(host,issues){
    const doc=root.document;if(!host||!doc)return;
    let notice=host.querySelector?.(':scope > [data-gfs-gate-review]');
    if(!issues?.length){notice?.remove();return;}
    if(!notice){notice=doc.createElement('div');notice.dataset.gfsGateReview='';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
      const fixed=host===doc.body;if(!fixed&&root.getComputedStyle?.(host)?.position==='static')host.style.position='relative';
      notice.style.cssText='position:'+(fixed?'fixed':'absolute')+';left:12px;right:12px;bottom:'+(fixed?'var(--gfs-viewer-sheet-clearance,12px)':'12px')+';z-index:45;max-height:28%;overflow:auto;padding:12px 14px;border:1px solid #d4a24b;border-radius:12px;background:rgba(255,248,229,.98);color:#593b0b;font:600 14px/1.45 system-ui;box-shadow:0 6px 24px #142b4020;';host.appendChild(notice);
    }
    notice.replaceChildren();const title=doc.createElement('strong');title.textContent='Gate placement needs review';notice.appendChild(title);
    for(const issue of issues){const row=doc.createElement('p');row.style.cssText='margin:6px 0 0;font-weight:400';row.textContent='Run '+(issue.run+1)+', gate '+(issue.gate+1)+': '+issue.message;notice.appendChild(row);}
  }
  root.GFSGateReview={placement,grade,add,show};
})(window);
