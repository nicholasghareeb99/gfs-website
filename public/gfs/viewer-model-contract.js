/* Model-only overrides for customer previews. Caller-supplied layout metadata is preserved. */
(function (root) {
  'use strict';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keys = new Set(('altBoardIn aluTop arch archIn bayMaxMult boardIn boardTIn cAccent cPanel cPost cap capTIn capTrimIn capWIn cedar clBotIn clBraceBands clFrameFinish clGateIn clLineIn clMeshFt clMeshIn clRailIn clTensionBands clTermIn dogAng dogEar dogIn editH finial gArch gBrace gDrop gFrameIn gFrameGapIn gFrameTIn gGapIn gHingeRight gHinges gLatch gMesh gPostIn gRiseIn gStileIn gStyle gSwing gapIn h horiz kickIn latIn meshCol midrailHeightFt mode pkBotIn pkHIn pkIn pkOverPost pkPuppy pkThrough pkZIn postHIn picketRailShape postHeightMode postClearanceIn postTopReference cadFamily postIn puppyIn railFlat railHIn railKind railLenFt railTIn railWIn railZIn rails railsAuto railsN rings scalIn secFt spear stagger tip gStileAboveIn topRailHIn topRailTIn topProjectionIn topPicketArchIn topPicketStepped topBandIn topGapIn topPicketIn topPicketTIn topper wire wireGa wireRollIn wood woodgrain').split(' '));
  function modelPatch(value) {
    const result = {};
    if (!object(value)) return result;
    for (const key of Object.keys(value)) {
      if (!keys.has(key)) continue;
      const item = value[key];
      if (item === null || typeof item === 'boolean' || typeof item === 'string' && item.length <= 160 || typeof item === 'number' && Number.isFinite(item)) result[key] = item;
      else if (key === 'rails' && Array.isArray(item) && item.every(n => typeof n === 'number' && Number.isFinite(n))) result[key] = item.slice();
    }
    return result;
  }
  function modelMap(value) {
    const result = {};
    if (!object(value)) return result;
    for (const name of Object.keys(value)) {
      if (!name || name.length > 500 || ['__proto__', 'constructor', 'prototype'].includes(name)) continue;
      const patch = modelPatch(value[name]);
      if (Object.keys(patch).length) Object.defineProperty(result, name, { value: patch, enumerable: true, writable: true, configurable: true });
    }
    return result;
  }
  const validIndex = value => Number.isSafeInteger(value) && value >= 0;
  const hasRunEdits = scope => Object.keys(scope || {}).some(key => /#run\d+$/.test(key));
  function attachScope(spec, overrides, source) {
    if (!object(spec)) throw Error('The fence preview needs a valid layout.');
    const scope = modelMap(overrides);
    spec.modelScope = { v: 1, overrides: scope };
    if (source === 'sketch' || source === 'site') spec.modelScope.source = source;
    // Old links have no reliable binding from a saved Studio run to a segment.
    // Keep the edit evidence, but do not guess a run when the source identity is absent.
    if (hasRunEdits(scope) && (spec.lines || []).some(line => !validIndex(line.ri))) spec.modelScope.runReview = true;
    return spec;
  }
  function runPatch(spec, style, runIndex, sourceStyle) {
    const scope = spec?.modelScope?.v === 1 && object(spec.modelScope.overrides) ? spec.modelScope.overrides : {};
    return Object.assign({}, modelPatch(scope[style]), style === sourceStyle && validIndex(runIndex) ? modelPatch(scope[style + '#run' + runIndex]) : {});
  }
  function studioPatch(overrides, style, runIndex) {
    return Object.assign({}, modelPatch(overrides?.[style]), validIndex(runIndex) ? modelPatch(overrides?.[style + '#run' + runIndex]) : {});
  }
  function heightOf(style, fallback = 6) {
    const match = String(style || '').replace(/[‘’ʼ´]/g, "'").match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i);
    return match ? Number(match[1]) : Number(fallback) || 6;
  }
  // Match Studio's original sketch connectivity before true-length correction.
  function sketchRunIds(lines, ppf) {
    if (!Array.isArray(lines) || !(Number(ppf) > 0)) throw Error('The sketch scale needs review.');
    const used = new Set(), ids = new Array(lines.length), near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < .8;
    const point = (x, y) => ({ x: Number(x) / ppf, z: Number(y) / ppf });
    let run = 0;
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const first = lines[i], style = first.fenceStyle || '', pts = [point(first.x, first.y), point(first.x2, first.y2)];
      if (!pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) throw Error('A sketch point needs review.');
      used.add(i); ids[i] = run;
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < lines.length; j++) {
          if (used.has(j) || (lines[j].fenceStyle || '') !== style) continue;
          const a = point(lines[j].x, lines[j].y), b = point(lines[j].x2, lines[j].y2), head = pts[0], tail = pts[pts.length - 1];
          if (near(tail, a)) pts.push(b);
          else if (near(tail, b)) pts.push(a);
          else if (near(head, b)) pts.unshift(a);
          else if (near(head, a)) pts.unshift(b);
          else continue;
          used.add(j); ids[j] = run; grew = true;
        }
      }
      run++;
    }
    return ids;
  }
  function styleForKind(kind, height, names) {
    const rules = { privacy: [/privacy/i, /solid\s*board/i, /stockade/i], vinyl: [/vinyl/i, /\bpvc\b/i], wood: [/cedar|pine|spruce|\bwood\b/i], chainlink: [/chain\s*-?\s*link/i, /\bchain\b/i], ornamental: [/ornamental|aluminum|\balum\b|wrought|iron/i] };
    if (!Array.isArray(names) || !names.length) return '';
    const h = Math.round(height || 0), hRx = h ? new RegExp('\\b' + h + "\\s*(ft|')", 'i') : null;
    for (const rx of rules[kind] || []) {
      const pool = names.filter(n => rx.test(n));
      if (!pool.length) continue;
      if (hRx) {
        const exact = pool.find(n => hRx.test(n));
        if (exact) return exact;
        const neutral = pool.find(n => !/\b\d\s*(ft|')/i.test(n));
        if (neutral) return neutral;
      }
      return pool[0];
    }
    return names[0];
  }
  function viewerRuns(spec, selectedStyle, selectedHeight) {
    const lines = (spec.lines || []).filter(line => [line.x1, line.z1, line.x2, line.z2].every(v => v !== null && v !== '' && Number.isFinite(Number(v))));
    const used = new Set(), out = [], preserve = selectedStyle === spec.style;
    const keepHeights = preserve && Number(selectedHeight) === Number(spec.h || heightOf(spec.style));
    const point = (x, z) => ({ x: Number(x), z: Number(z), y: 0 });
    const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < .8;
    const sameGroup = (a, b) => (a.s || '') === (b.s || '') && (a.h || '') === (b.h || '') && (validIndex(a.ri) || validIndex(b.ri) ? a.ri === b.ri : true);
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const line = lines[i], pts = [point(line.x1, line.z1), point(line.x2, line.z2)];
      used.add(i);
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < lines.length; j++) {
          if (used.has(j) || !sameGroup(line, lines[j])) continue;
          const next = lines[j], a = point(next.x1, next.z1), b = point(next.x2, next.z2), head = pts[0], tail = pts[pts.length - 1];
          if (near(tail, a)) pts.push(b);
          else if (near(tail, b)) pts.push(a);
          else if (near(head, b)) pts.unshift(a);
          else if (near(head, a)) pts.unshift(b);
          else continue;
          used.add(j); grew = true;
        }
      }
      const clean = [pts[0]];
      for (let j = 1; j < pts.length; j++) if (Math.hypot(pts[j].x - clean[clean.length - 1].x, pts[j].z - clean[clean.length - 1].z) > .25) clean.push(pts[j]);
      if (clean.length < 2) continue;
      const styleName = preserve ? line.s || selectedStyle : selectedStyle;
      const heightFt = keepHeights ? Number(line.h) || heightOf(styleName, selectedHeight) : Number(selectedHeight) || 6;
      out.push({ i: out.length, ri: validIndex(line.ri) ? line.ri : null, pts: clean, styleName, sourceStyleName: line.s || spec.style || selectedStyle, heightFt, gates: [] });
    }
    return out;
  }
  function layoutLabel(spec, selectedStyle, selectedHeight) {
    const preserve = selectedStyle === spec.style;
    const keepHeights = preserve && Number(selectedHeight) === Number(spec.h || heightOf(spec.style));
    const lines = (spec.lines || []).filter(line => [line.x1, line.z1, line.x2, line.z2].every(v => v !== null && v !== '' && Number.isFinite(Number(v))));
    const styles = new Set(lines.map(line => preserve ? line.s || selectedStyle : selectedStyle));
    const heights = new Set(lines.map(line => keepHeights ? Number(line.h) || heightOf(line.s || selectedStyle, selectedHeight) : Number(selectedHeight) || 6));
    if (keepHeights && (styles.size > 1 || heights.size > 1)) return 'Saved layout uses multiple styles/heights';
    return (styles.size > 1 ? 'Multiple fence styles' : selectedStyle || '') + ' · ' + selectedHeight + ' ft';
  }
  root.GFSModelContract = Object.freeze({ modelPatch, modelMap, attachScope, runPatch, studioPatch, heightOf, sketchRunIds, styleForKind, viewerRuns, layoutLabel });
})(typeof window !== 'undefined' ? window : globalThis);
