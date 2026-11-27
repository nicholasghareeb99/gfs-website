// Can this device draw the 3D Lab? Kept apart from lab3d.mjs so asking doesn't load three.js.
let ok = null;
export function webglOK() {
  if (ok != null) return ok;
  try { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); ok = !!g; g?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { ok = false; }
  return ok;
}
