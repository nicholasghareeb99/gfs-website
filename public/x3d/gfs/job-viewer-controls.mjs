import {captureFrame, configureQuality} from './studio-rendering.mjs';
import {openAR} from './ar-workspace.mjs';
import {applyFenceLayers, mountFenceLayerControls} from './fence-layers.mjs';
import {aerialTransform, findAddressAerial, loadJobAerial} from './job-viewer-site.mjs';

const heightToken = /\b(\d+(?:\.\d+)?)\s*(?:ft\b|')/i;
const feet = name => name.replace(/[‘’ʼ´]/g,"'");
export const styleFamily = name => feet(name).replace(heightToken,' ').replace(/\s+/g,' ').trim();
export function savedHeightStyles(style, saved, resolveHeight) {
  const family = styleFamily(style).toLowerCase();
  const choices = new Map();
  for (const name of [style, ...saved]) {
    if (typeof name !== 'string' || styleFamily(name).toLowerCase() !== family) continue;
    const height = Number(feet(name).match(heightToken)?.[1]) || Number(resolveHeight(name));
    if (height > 0 && !choices.has(height)) choices.set(height,name);
  }
  return [...choices].sort(([a],[b]) => a-b);
}

export function viewerMode(spec, search) {
  const params = new URLSearchParams(search);
  const customer = params.get('portal') === '1';
  const job = !['sample','style-only'].includes(spec.previewKind) && !!(customer || spec.job || spec.num || spec.addr || spec.fromSitePlan ||
    spec.site || spec.siteMap || spec.geo || spec.mapFrame || spec.lines?.some(line=>Array.isArray(line.latlngs)) || spec.previewKind === 'saved-sketch' || spec.modelScope?.source === 'site' || spec.modelScope?.source === 'sketch');
  const special = ['lab','library','website','studio'].some(key => params.get(key) === '1');
  return {active: !special && (params.get('embed') !== '1' || customer && job), customer, job};
}

export function northBearing(spec) {
  const frame = spec.site?.aerial;
  return aerialTransform(frame) ? Math.atan2(frame.vz,frame.vx) : Math.PI/2;
}

export function gradeLimit(split) { return split ? 1 : 2; }
export function clampGrade(value, limit) {
  return Math.max(-limit,Math.min(limit,Math.round((Number(value)||0)*48)/48));
}

export function projectGradeHandles(handles, T, camera, fence, canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const projected = new T.Vector3(), placed = [];
  fence.updateWorldMatrix(true,false);
  camera.updateMatrixWorld();
  const sorted = [...handles].sort((a,b) => Number(!!b.active) - Number(!!a.active));
  for (const h of sorted) {
    if (!h.el.isConnected) continue;
    const p = h.p;
    projected.set(p.x,p.y+(p.handleTop ?? p.top ?? 4),p.z).applyMatrix4(fence.matrixWorld).project(camera);
    const x=(1+projected.x)*width/2, y=(1-projected.y)*height/2;
    const visible = projected.z > -1 && projected.z < 1 && x >= 22 && x <= width-22 &&
      y >= 22 && y <= height-22 && !placed.some(q => Math.abs(q.x-x)<44 && Math.abs(q.y-y)<44);
    if (h.el.hidden === visible) h.el.hidden = !visible;
    if (!visible) continue;
    placed.push({x,y});
    h.el.style.left = x+'px';
    h.el.style.top = y+'px';
  }
}

export function createGradeBanner(openShape) {
  const banner = document.createElement('div');
  banner.id = 'gfsGradeNotice';
  banner.hidden = true;
  const message = document.createElement('span');
  message.setAttribute('role','status');
  const review = document.createElement('button');
  review.type = 'button';
  review.textContent = 'Review grade';
  review.onclick = openShape;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Dismiss';
  close.setAttribute('aria-label','Dismiss grade notice');
  banner.append(message,review,close);
  let dismissed = '';
  close.onclick = () => { dismissed = message.textContent; banner.hidden = true; };
  return {banner, show(text, canReview) {
    if (!text) dismissed = '';
    if (message.textContent !== text) message.textContent = text;
    review.hidden = !canReview;
    banner.hidden = !text || dismissed === text;
  }};
}

const icons = {
  view:'M2 7h20v12H2zM7 7l3-3h4l3 3M9 13h6m-3-3v6',
  fit:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M8 8h8v8H8z',
  zoomIn:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM7 10h6m-3-3v6',
  zoomOut:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM7 10h6',
  move:'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3',
  orbit:'M20 7v5h-5M4 17v-5h5M5 10a7 7 0 0 1 12-4l3 6M4 12l3 6a7 7 0 0 0 12-4',
  image:'M3 5h18v14H3zM3 16l5-5 4 4 2-2 7 6m-5-10h.01',
  shape:'M2 20 8 9l4 6 4-11 6 16H2zM14 9l2 2 2-2',
  site:'M3 21V9l4-3 4 3 6-3 4 3v12M3 16h18M3 12h18M7 6V3m10 3V3',
  expand:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M8 16l8-8',
  options:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
};

function iconButton(button, icon, label, feedback) {
  if (!button) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('aria-hidden','true');
  const path = document.createElementNS(ns,'path');
  path.setAttribute('d',icons[icon]);
  svg.append(path);
  button.replaceChildren(svg);
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label',label);
  let timer, held = false;
  const show = () => { feedback.textContent = label; };
  const clear = () => { if (feedback.textContent === label) feedback.textContent = ''; };
  button.addEventListener('focus',() => { if (button.matches(':focus-visible')) show(); });
  button.addEventListener('blur',clear);
  button.addEventListener('pointerenter',event => { if (event.pointerType === 'mouse') show(); });
  button.addEventListener('pointerleave',() => { clearTimeout(timer); clear(); });
  button.addEventListener('pointerdown',event => {
    held = false;
    if (event.pointerType !== 'mouse') timer = setTimeout(() => { held = true; show(); },500);
  });
  for (const event of ['pointerup','pointercancel']) button.addEventListener(event,() => clearTimeout(timer));
  button.addEventListener('contextmenu',event => event.preventDefault());
  button.addEventListener('click',event => {
    if (held) { event.preventDefault(); event.stopImmediatePropagation(); held = false; }
  },true);
}

export function mountJobViewer({mode,spec,T,scene,renderer,cam,ground,siteGroup,fenceGroup,resize,gy,updateOutlines,zoom,quality,enableFrame}) {
  const $ = id => document.getElementById(id);
  const node = (tag,className) => Object.assign(document.createElement(tag),{className});
  const shell = node('main','job-viewer-shell');
  const summary = node('div','job-viewer-summary');
  const viewport = node('div','job-viewer-main');
  const stage = node('div','job-viewer-stage');
  const footer = node('footer','job-viewer-footer');
  const notices = node('div','job-viewer-notices');
  const statusLine = node('div','job-viewer-status');
  const toolName = node('span','job-viewer-tool-name');
  const rail = $('rail');
  rail.setAttribute('role','group');
  rail.setAttribute('aria-label','Viewer tools');
  stage.append($('c'));
  summary.append($('hud'));
  statusLine.append($('hint'),toolName);
  footer.append(notices,$('sheet'),statusLine);

  const drawer = node('aside','job-viewer-drawer');
  drawer.hidden = true;
  drawer.setAttribute('aria-label','Viewer panel');
  const settings = node('section','job-viewer-options');
  settings.id = 'jobViewerOptions';
  settings.innerHTML = '<h2>View options</h2><label>Scene<select aria-label="Scene"><option value="outdoor">Property context</option><option value="showroom">Showroom</option></select></label><label>Quality<select aria-label="Render quality"><option value="auto">Auto</option><option value="field">Field · faster</option><option value="presentation">Presentation</option></select></label><div class="job-viewer-actions"><button type="button" data-image>Export image</button><button type="button" data-ar>View in AR</button></div><p class="job-viewer-export-status" role="status"></p>';
  viewport.append(stage,rail,drawer);
  shell.append(document.querySelector('body > header'),summary,viewport,footer);
  document.body.prepend(shell);
  const [sceneOption, qualityOption] = settings.querySelectorAll('select');
  const status = settings.querySelector('[role=status]');
  const tools = new Map([[settings,'btnViewerOptions']]);
  if ($('gfsShape')) tools.set($('gfsShape'),'btnShape');
  if ($('gfsSite')) tools.set($('gfsSite'),'btnSite');
  for (const [panel] of tools) drawer.append(panel);
  let active = null;
  function updateDrawer() {
    drawer.hidden = !active;
    for (const [panel,id] of tools) {
      const on = active === panel;
      panel.hidden = !on;
      $(id)?.setAttribute('aria-expanded',String(on));
      $(id)?.classList.toggle('on',on);
    }
  }
  function toggle(panel) {
    active = active === panel ? null : panel;
    updateDrawer();
    if (active) drawer.scrollTop = 0;
  }
  function addButton(id, icon, label, action) {
    const button = node('button','rbtn');
    button.id = id;
    button.onclick = action;
    rail.append(button);
    iconButton(button,icon,label,toolName);
    return button;
  }
  const opts = addButton('btnViewerOptions','options','View options',() => toggle(settings));
  opts.setAttribute('aria-controls',settings.id);
  rail.prepend(opts);
  addButton('btnZoomIn','zoomIn','Zoom in',() => zoom(.8));
  addButton('btnZoomOut','zoomOut','Zoom out',() => zoom(1.25));
  for (const [id,icon,label] of [
    ['btnView','view','Change camera view'],['btnReset','fit','Fit fence'],['btnMove','move','Move fence'],
    ['btnOrbit','orbit','Auto-orbit'],['btnSnap','image','Save image to job'],['btnShape','shape','Shape the yard'],
    ['btnSite','site','Job site tools'],['btnExpand','expand','Open full screen'],
  ]) iconButton($(id),icon,label,toolName);
  for (const id of ['btnCtx','btnSat','btnLab']) $(id).hidden = true;
  $('btnMove').hidden = mode.job || mode.customer;
  $('btnSnap').hidden = mode.customer || !window.opener || window.opener.closed;
  $('styleRow').hidden = mode.customer;
  $('hRow').hidden = mode.customer || !$('hRow').children.length;
  $('adjust').hidden = mode.job || mode.customer;
  if (!mode.job && !mode.customer) $('adjust').classList.add('show');
  for (const [panel,id] of tools) {
    if (panel === settings) continue;
    $(id).setAttribute('aria-controls',panel.id);
    new MutationObserver(() => {
      if (panel.classList.contains('on')) {
        if (active && active !== panel && active !== settings) closeLegacy(active);
        active = panel;
      } else {
        if (active === panel) active = null;
        if (panel === $('gfsSite')) { $('gfsTlEnd')?.click(); applyFenceLayers(fenceGroup); }
      }
      updateDrawer();
    }).observe(panel,{attributes:true,attributeFilter:['class']});
  }
  function closeLegacy(panel) {
    if (panel === $('gfsShape')) $('gfsShDone')?.click();
    else if (panel === $('gfsSite') && panel.classList.contains('on')) $('btnSite')?.click();
  }
  opts.addEventListener('click',() => {
    for (const [panel] of tools) if (panel !== settings) closeLegacy(panel);
  },true);
  drawer.addEventListener('keydown',event => {
    if (event.key !== 'Escape' || !active) return;
    const id = tools.get(active);
    if (active === settings) toggle(settings);
    else closeLegacy(active);
    $(id)?.focus();
  });
  updateDrawer();

  const placeNotices = () => {
    for (const notice of document.querySelectorAll('body > [data-gfs-gate-review],body > .ws-model-review,body > #gfsGradeNotice')) notices.append(notice);
    for (const review of document.querySelectorAll('body > #gfsModelCheck,body > #gfsModelCheckList')) settings.append(review);
  };
  new MutationObserver(placeNotices).observe(document.body,{childList:true});
  placeNotices();

  const studio = {scene,renderer,cam,sun:scene.children.find(n => n.isDirectionalLight && n.castShadow)};
  const real = window.__gfsReal191, material = ground.material, background = scene.background;
  const floor = real?.studioFloor(0xd9ddd7) || new T.MeshStandardMaterial({color:0xd9ddd7,roughness:.94});
  let aerial, pending, attempted = false, approximate = spec.site?.approximate === true;
  const propertyOption = sceneOption.querySelector('option[value=outdoor]');
  let noMapPosition = mode.job && !spec.site?.aerial && !spec.site?.mapAddress;
  const property = () => sceneOption.value === 'outdoor';
  const draw = () => { renderer.shadowMap.needsUpdate = true; renderer.render(scene,cam); };
  function showScene() {
    const outdoor = property();
    scene.userData.jobViewerProperty = outdoor;
    siteGroup.visible = outdoor;
    if (aerial) aerial.mesh.visible = outdoor;
    for (const n of scene.children) {
      if (n.userData?.ctx === 'grass') n.visible = outdoor && !aerial;
      else if (n.userData?.ctx && n !== aerial?.mesh) n.visible = outdoor && !n.userData.hiddenByUser;
    }
    ground.material = outdoor ? material : floor;
    for (const n of ground.children) if (n.userData?.gfsGround) n.material = ground.material;
    scene.background = outdoor ? background : (real?.studioBackground() || new T.Color(0xe9ede7));
    real?.backdrop(!outdoor);
    const hint = $('hint');
    if (!outdoor) hint.textContent = noMapPosition ? 'No map position for this job.' : 'Showroom';
    else if (aerial) hint.textContent = aerial.credit + (approximate ? ' · Approximate placement' : '') +
      (aerial.partial ? ' · Some aerial tiles are unavailable' : '');
    else if (pending) hint.textContent = 'Loading property aerial…';
    else if (attempted) hint.textContent = 'Property context · Aerial unavailable';
    else hint.textContent = 'Property context';
    draw();
  }
  async function changeScene() {
    if (mode.job && property() && !aerial && !pending && !attempted) {
      pending = true;
      showScene();
      try {
        let mapSpec = spec;
        if (!spec.site?.aerial && spec.site?.mapAddress) {
          const fromAddress = await findAddressAerial(spec.site.mapAddress);
          if (!fromAddress) {
            noMapPosition = true;
            propertyOption.disabled = true;
            sceneOption.value = 'showroom';
            return;
          }
          approximate = true;
          mapSpec = {...spec,site:{...spec.site,aerial:fromAddress}};
        }
        aerial = await loadJobAerial(T,mapSpec,gy);
        if (aerial) scene.add(aerial.mesh);
      } catch (error) { console.warn('[3D] Property aerial could not load', error); }
      finally { attempted = true; pending = false; showScene(); }
    } else showScene();
  }
  propertyOption.disabled = noMapPosition;
  sceneOption.value = mode.job && !noMapPosition ? 'outdoor' : 'showroom';
  sceneOption.onchange = changeScene;
  qualityOption.onchange = () => {
    const value = qualityOption.value;
    const profile = configureQuality(studio,value);
    real?.setQuality(value);
    quality(profile);
    draw();
  };
  qualityOption.onchange();
  settings.querySelector('[data-image]').onclick = () => {
    try {
      const guides = scene.children.filter(n => n.visible && n.userData?.ctx === 'grade-guide');
      for (const guide of guides) guide.visible = false;
      let png;
      try { png = captureFrame(studio,T,studio.quality.exportWidth,'png',.92,{aspect:cam.aspect}); }
      finally { for (const guide of guides) guide.visible = true; draw(); }
      const a = document.createElement('a');
      a.href = png;
      a.download = 'Ghareeb-fence.png';
      footer.append(a);
      a.click();
      a.remove();
      status.textContent = 'Image downloaded.';
    } catch (error) { status.textContent = error.message || 'Image export failed. Try Field quality.'; }
  };
  settings.querySelector('[data-ar]').onclick = () => openAR({
    getFence:() => fenceGroup, name:$('styleRow').querySelector('select')?.value || spec.style || 'Fence model',
  });
  const detail = node('details','job-viewer-detail');
  detail.hidden = true;
  const detailLabel = node('summary','');
  detailLabel.textContent = 'Posts and materials';
  const extraTools = node('div','job-viewer-extra-tools');
  detail.append(detailLabel,extraTools);
  settings.append(detail);
  function placeExtraTools() {
    for (const [id,label] of [['btnViewerPosts','Show posts below ground'],['btnViewerHardware','Detailed gate hardware'],['btnViewerMaterials','Photo-real materials']]) {
      const button = $(id);
      if (button?.parentNode !== rail) continue;
      button.classList.remove('rbtn');
      button.textContent = label;
      button.title = label;
      button.setAttribute('aria-label',label);
      extraTools.append(button);
      detail.hidden = false;
    }
  }
  new MutationObserver(placeExtraTools).observe(rail,{childList:true});
  placeExtraTools();
  mountFenceLayerControls({host:settings,getRoot:() => fenceGroup,redraw:draw});
  window.addEventListener('gfs:fence-rebuilt',() => {
    updateOutlines?.();
    aerial?.updateGrade();
  });
  scene.addEventListener('childadded',event => {
    const child = event.child;
    if (child?.userData?.ctx === 'grass') child.visible = property() && !aerial;
  });
  new ResizeObserver(resize).observe(stage);
  enableFrame(stage);
  resize();
  void changeScene();
}
