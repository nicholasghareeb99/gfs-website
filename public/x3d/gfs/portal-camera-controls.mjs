export function movePortalCamera(api,action){
 const s=api.get();const next={};
 if(action==='in')next.R=Math.max(4,s.R*.78);
 if(action==='out')next.R=Math.min(5000,s.R/ .78);
 if(action==='left')next.theta=s.theta-Math.PI/12;
 if(action==='right')next.theta=s.theta+Math.PI/12;
 if(action==='top')next.phi=.08;
 if(action==='angle')next.phi=Math.PI/3;
 if(!Object.keys(next).length)return false;api.set(next);return true;
}
export function installPortalCameraControls(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win||new URLSearchParams(win.location.search).get('portal')!=='1')return;
 let attempts=0;const timer=win.setInterval(()=>{if(!win.__f3dCam){if(++attempts>120)win.clearInterval(timer);return;}win.clearInterval(timer);
 const bar=doc.createElement('div');bar.className='portal-camera-controls';bar.setAttribute('role','group');bar.setAttribute('aria-label','3D camera controls');
 for(const [label,action]of [['Zoom +','in'],['Zoom −','out'],['Rotate left','left'],['Rotate right','right'],['Top view','top'],['Angle view','angle'],['Fit fence','fit']]){const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(action==='fit')doc.getElementById('btnReset')?.click();else movePortalCamera(win.__f3dCam,action);};bar.append(b);}
 doc.body.append(bar);const css=doc.createElement('style');css.textContent='.portal-camera-controls{position:fixed;z-index:20;bottom:max(12px,env(safe-area-inset-bottom));left:12px;right:12px;display:flex;justify-content:center;flex-wrap:wrap;gap:6px;padding:8px;background:#fffffff2;border:1px solid #cdd6db;border-radius:12px}.portal-camera-controls button{min-height:44px;padding:8px 12px;border:1px solid #bccbd1;border-radius:8px;background:#fff;color:#182c36;font:600 14px system-ui}.portal-viewer-mode #sheet{display:none!important}.portal-viewer-mode #rail{max-height:calc(100dvh - 235px);overflow:auto}';doc.head.append(css);
 },100);
}
if(typeof window!=='undefined')installPortalCameraControls();
