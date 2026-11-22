import {affinePoint, inverseAffine, MAP_SOURCES} from './interactive-map-projection.mjs';

import {AERIAL_GRID, aerialTransform, DEFAULT_AERIAL, positionFrame, propertyAerial, viewerMapAddress} from './job-viewer-map-position.mjs';
export {AERIAL_GRID, aerialTransform, DEFAULT_AERIAL};

// The Site Map already uses this address service. An address match can place
// the view in the right area, while fence and footprint positions come from the drawing.
export async function findAddressAerial(address, fetcher = fetch) {
  address = viewerMapAddress(address);
  if (!address) return null;
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  url.search = new URLSearchParams({SingleLine:address,sourceCountry:'USA',maxLocations:'1',outFields:'Addr_type',f:'json'});
  const response = await fetcher(url,{signal:AbortSignal.timeout(6000),credentials:'omit',referrerPolicy:'no-referrer'});
  if (!response.ok) throw Error('Address lookup unavailable');
  const result = await response.json();
  if (result.error) throw Error('Address lookup unavailable');
  const candidate = result.candidates?.[0];
  if (!(candidate?.score >= 95) || !['PointAddress','StreetAddress','Subaddress'].includes(candidate.attributes?.Addr_type)) return null;
  const frame = positionFrame({lat:candidate.location?.y,lng:candidate.location?.x});
  return propertyAerial(frame,{map:p=>p});
}

export function planAerial(frame, spec, sourceId = frame?.sourceId) {
  const matrix = aerialTransform(frame);
  if (!matrix) return null;
  const source = MAP_SOURCES[sourceId]?.photo !== false && MAP_SOURCES[sourceId]?.available
    ? MAP_SOURCES[sourceId] : MAP_SOURCES[DEFAULT_AERIAL];
  const points = (spec.lines || []).flatMap(line => [[line.x1, line.z1], [line.x2, line.z2]]);
  if (!points.length) return null;
  const box = values => ({
    left: Math.min(...values.map(p => p[0])), right: Math.max(...values.map(p => p[0])),
    top: Math.min(...values.map(p => p[1])), bottom: Math.max(...values.map(p => p[1])),
  });
  const fence = box(points);
  const nearFence = ([x, z]) => x >= fence.left - 400 && x <= fence.right + 400 &&
    z >= fence.top - 400 && z <= fence.bottom + 400;
  const nearby = [spec.site?.lot, ...(spec.site?.buildings || []).map(b => b.pts)].flatMap(ring =>
    Array.isArray(ring) ? ring.filter(p => Array.isArray(p) && nearFence(p)) : []);
  const {left, right, top, bottom} = box([...points, ...nearby]);
  const pad = Math.max(96, .55 * Math.max(right - left, bottom - top));
  const inverse = inverseAffine(matrix);
  const projected = box([[left-pad,top-pad],[right+pad,top-pad],[left-pad,bottom+pad],[right+pad,bottom+pad]].map(([x,y]) => {
    const p = affinePoint(inverse, {x,y});
    return [p.x / AERIAL_GRID, p.y / AERIAL_GRID];
  }));
  if (projected.left < 0 || projected.top < 0 || projected.right >= 1 || projected.bottom >= 1) return null;
  for (let zoom = source.maxZoom; zoom >= 2; zoom--) {
    const n = 2 ** zoom;
    const minX = Math.floor(projected.left * n), maxX = Math.floor(projected.right * n);
    const minY = Math.floor(projected.top * n), maxY = Math.floor(projected.bottom * n);
    if ((maxX - minX + 1) * (maxY - minY + 1) > 16) continue;
    const tiles = [];
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      tiles.push({x, y, url: source.url(zoom,x,y)});
    }
    return {matrix, n, minX, minY, maxX, maxY, tiles, credit: source.credit};
  }
  return null;
}

function loadTile(url) {
  return new Promise(resolve => {
    const image = new Image();
    const finish = value => { clearTimeout(timeout); image.onload = image.onerror = null; resolve(value); };
    const timeout = setTimeout(() => { finish(null); image.removeAttribute('src'); }, 6000);
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = url;
  });
}

async function tileCanvas(plan) {
  const canvas = document.createElement('canvas');
  canvas.width = (plan.maxX - plan.minX + 1) * 256;
  canvas.height = (plan.maxY - plan.minY + 1) * 256;
  const context = canvas.getContext('2d');
  let loaded = 0;
  await Promise.all(plan.tiles.map(async tile => {
    const image = await loadTile(tile.url);
    if (!image) return;
    context.drawImage(image, (tile.x - plan.minX) * 256, (tile.y - plan.minY) * 256, 256, 256);
    loaded++;
  }));
  return loaded ? {canvas, partial: loaded < plan.tiles.length} : null;
}

export async function loadJobAerial(T, spec, gy) {
  const frame = spec.site?.aerial;
  let plan = planAerial(frame, spec), image = plan && await tileCanvas(plan);
  if (!image && frame?.sourceId && frame.sourceId !== DEFAULT_AERIAL) {
    plan = planAerial(frame, spec, DEFAULT_AERIAL);
    image = plan && await tileCanvas(plan);
  }
  if (!image) return null;
  const texture = new T.CanvasTexture(image.canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const geometry = new T.PlaneGeometry(1, 1, 96, 96);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const east = plan.minX + (plan.maxX + 1 - plan.minX) * uv.getX(i);
    const south = plan.minY + (plan.maxY + 1 - plan.minY) * (1 - uv.getY(i));
    const p = affinePoint(plan.matrix,{x:east * AERIAL_GRID / plan.n, y:south * AERIAL_GRID / plan.n});
    position.setXYZ(i,p.x,0,p.y);
  }
  const material = new T.MeshBasicMaterial({map:texture, alphaTest:.5, toneMapped:false});
  const mesh = new T.Mesh(geometry,material);
  mesh.name = 'Job aerial imagery';
  mesh.userData = {ctx:'aerial', noShadow:1};
  function updateGrade() {
    for (let i = 0; i < position.count; i++) position.setY(i, gy(position.getX(i), position.getZ(i)) + .16);
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  updateGrade();
  return {mesh, updateGrade, credit:plan.credit, partial:image.partial};
}

export function buildJobOutlines(T, spec, group, gy) {
  const structures = spec.site?.buildings?.length ? spec.site.buildings : (spec.structs || []);
  const lotMaterial = new T.LineDashedMaterial({color:0xffe490, dashSize:4, gapSize:2});
  const buildingMaterial = new T.LineBasicMaterial({color:0xf9f5e9});
  const shadow = new T.LineBasicMaterial({color:0x1c3330});
  function line(points, material, name, close) {
    if (!Array.isArray(points) || points.length < (close ? 3 : 2) ||
        points.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return;
    const path = close ? [...points, points[0]] : points;
    const vertices = [];
    for (let i = 1; i < path.length; i++) {
      const [x,z] = path[i-1], [nextX,nextZ] = path[i];
      const count = Math.min(160, Math.max(1, Math.ceil(Math.hypot(nextX-x,nextZ-z) / 4)));
      if (i === 1) vertices.push(x,0,z);
      for (let step = 1; step <= count; step++) {
        vertices.push(x+(nextX-x)*step/count,0,z+(nextZ-z)*step/count);
      }
    }
    const geometry = new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    const outline = new T.Line(geometry,material);
    outline.name = name;
    outline.userData = {siteOutline:true, noShadow:1};
    group.add(outline);
    if (material === buildingMaterial) {
      const bounds = new T.Box2().setFromPoints(points.map(([x,z]) => new T.Vector2(x,z)));
      const size = bounds.getSize(new T.Vector2());
      outline.renderOrder = 1;
      const border = new T.Line(geometry,shadow);
      border.name = name + ' shadow';
      border.position.set(Math.min(.35,size.x*.03),.02,Math.min(.35,size.y*.03));
      group.add(border);
    }
  }
  for (const s of structures) line(s.pts,buildingMaterial,s.kind === 'house' ? 'House outline' : 'Structure outline',true);
  line(spec.site?.lot,lotMaterial,'Lot outline',true);
  for (const l of spec.site?.lines || []) if (l.kind === 'lot') line(l.pts,lotMaterial,'Lot outline',false);
  function updateGrade() {
    for (const outline of group.children) {
      if (!outline.userData.siteOutline) continue;
      const p = outline.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i,gy(p.getX(i),p.getZ(i))+.27);
      p.needsUpdate = true;
      outline.geometry.computeBoundingSphere();
      if (outline.material === lotMaterial) outline.computeLineDistances();
    }
  }
  updateGrade();
  return updateGrade;
}
