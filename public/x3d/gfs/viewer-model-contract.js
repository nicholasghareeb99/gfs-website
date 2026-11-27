/* Model-only overrides for customer previews. Caller-supplied layout metadata is preserved. */
(function (root) {
  'use strict';
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const keys = new Set(('altBoardIn aluTop arch archIn bayMaxMult boardIn boardTIn cAccent cPanel cPost cap capTIn capTrimIn capTrimTIn capTrimFaces capTrimVersion capWIn cedar clBotIn clBraceBands clFrameFinish clGateIn clLineIn clMeshFt clMeshIn clRailIn clTensionBands clTermIn dogAng dogEar dogIn editH finial gArch gBrace gDrop gFrameIn gFrameGapIn gFrameTIn gGapIn gHingeRight gHinges gLatch gMesh gPostIn gRiseIn gStileIn gStyle gSwing gapIn h horiz kickIn latIn meshCol midrailHeightFt mode pkBotIn pkHIn pkIn pkOverPost pkPuppy pkThrough pkZIn postHIn picketRailShape postHeightMode postClearanceIn postTopReference cadFamily postIn puppyIn woodSupport noDig pipeLengthFt embedmentIn flatTopRail railFlat railHIn railKind railLenFt railTIn railWIn railZIn rails railsAuto railsN rings scalIn secFt spear stagger tip gStileAboveIn topRailHIn topRailTIn topProjectionIn topPicketArchIn topPicketStepped topBandIn topGapIn topPicketIn topPicketTIn topper wire wireGa wireRollIn wood woodgrain pkProduct pkName pkStockIn pkWood srRail srRailEnd srLapIn srPost srEndPost srPostTop srBuryIn srWood srMesh srMeshIn srWireSide srStapleIn srTension srGate').split(' '));
  // V3-222 Values with a checked range or list (inches unless named). A value that fails is dropped, as an unknown key is.
  const oneOf = list => v => list.includes(v), between = (lo, hi) => v => typeof v === 'number' && v >= lo && v <= hi;
  const label = v => typeof v === 'string' && v.length <= 48 && !/[<>\u0000-\u001f\u007f]/.test(v);
  const checks = {
    boardIn: between(0.5, 24), boardTIn: between(0.25, 4), tip: oneOf(['', 'flat', 'dog', 'point', 'gothic']),
    pkProduct: v => typeof v === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(v), pkName: label, pkStockIn: between(24, 192), pkWood: oneOf(['pt', 'cedar', 'cedartone', 'fir']),
    srRail: oneOf(['halflog', 'round', 'wedge', 'square', 'diamond']), srRailEnd: oneOf(['tenon', 'lap', 'paddle']), srLapIn: between(0, 12),
    srPost: oneOf(['round', 'halfround', 'square', 'rect']), srEndPost: oneOf(['same', 'round', 'square']), srPostTop: oneOf(['flat', 'bevel', 'dome', 'point']),
    srBuryIn: between(12, 72), srWood: oneOf(['cedar', 'pt', 'locust', 'grey']), srMesh: oneOf(['none', 'welded', 'black', 'horse']), srMeshIn: oneOf(['2x4', '2x2', '1x2']),
    srWireSide: oneOf(['in', 'out']), srStapleIn: between(2, 24), srTension: v => typeof v === 'boolean', srGate: oneOf(['rail', 'tube']), railLenFt: between(4, 16),
  };
  // V3-225 The split rail tube farm gate's finish and bar count (checked; a value that fails is dropped, as an unknown key is).
  for (const key of ['srGateFin', 'srGateBars']) keys.add(key);
  if (typeof checks === 'object' && typeof oneOf === 'function') Object.assign(checks, { srGateFin: oneOf(['galv', 'black']), srGateBars: oneOf([4, 5, 6]) });   // (V3-222's checks)
  function modelPatch(value) {
    const result = {};
    if (!object(value)) return result;
    for (const key of Object.keys(value)) {
      if (!keys.has(key)) continue;
      const item = value[key];
      if (item !== null && checks[key] && !checks[key](item)) continue;
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
  const optionKey = option => /^opt[123]$/.test(option) ? option : "";
  const runKey = (style, index, option) => style + (optionKey(option) ? '#' + optionKey(option) : '') + '#run' + index;
  function scopeForOption(overrides, option) {
    const scoped = modelMap(overrides);
    const result = {};
    for (const [key, value] of Object.entries(scoped)) {
      const match = /^(.*)#(opt[123])(#run[0-9]+)$/.exec(key);
      if (match && match[2] === option) result[match[1] + match[3]] = value;
      if (!match && (!optionKey(option) || !/#run[0-9]+$/.test(key))) result[key] = value;
    }
    return result;
  }
  function attachScope(spec, overrides, source, option) {
    if (!object(spec)) throw Error('The fence preview needs a valid layout.');
    const scope = option === undefined ? modelMap(overrides) : scopeForOption(overrides, option);
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
  function studioPatch(overrides, style, runIndex, option) {
    return Object.assign({}, modelPatch(overrides?.[style]), validIndex(runIndex) ? modelPatch(overrides?.[runKey(style, runIndex, option)]) : {});
  }
  function heightOf(style, fallback = 6) {
    const match = String(style || '').replace(/[‘’ʼ´]/g, "'").match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i);
    return match ? Number(match[1]) : Number(fallback) || 6;
  }
  // Match Studio's original sketch connectivity before true-length correction.
  function sketchRunIds(lines, ppf) {
    if (!Array.isArray(lines) || !(Number(ppf) > 0)) throw Error('The sketch scale needs review.');
    const rawStyle = line => root._gfsSketchLineTools ? root._gfsSketchLineTools.identity(line).value : line.fenceStyle || "";
    const used = new Set(), ids = new Array(lines.length), near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < .8;
    const point = (x, y) => ({ x: Number(x) / ppf, z: Number(y) / ppf });
    let run = 0;
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const first = lines[i], style = rawStyle(first), pts = [point(first.x, first.y), point(first.x2, first.y2)];
      if (!pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))) throw Error('A sketch point needs review.');
      used.add(i); ids[i] = run;
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < lines.length; j++) {
          if (used.has(j) || (rawStyle(lines[j])) !== style) continue;
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
      const sides=[line.woodFinishedSide==='left'?1:line.woodFinishedSide==='right'?-1:0];
      used.add(i);
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < lines.length; j++) {
          if (used.has(j) || !sameGroup(line, lines[j])) continue;
          const next = lines[j], a = point(next.x1, next.z1), b = point(next.x2, next.z2), head = pts[0], tail = pts[pts.length - 1];
          const side=next.woodFinishedSide==='left'?1:next.woodFinishedSide==='right'?-1:0;
          if (near(tail, a)) {pts.push(b);sides.push(side);}
          else if (near(tail, b)) {pts.push(a);sides.push(-side);}
          else if (near(head, b)) {pts.unshift(a);sides.unshift(side);}
          else if (near(head, a)) {pts.unshift(b);sides.unshift(-side);}
          else continue;
          used.add(j); grew = true;
        }
      }
      const clean = [pts[0]], cleanSides=[];
      for (let j = 1; j < pts.length; j++) if (Math.hypot(pts[j].x - clean[clean.length - 1].x, pts[j].z - clean[clean.length - 1].z) > .25) {clean.push(pts[j]);cleanSides.push(sides[j-1]);}
      if (clean.length < 2) continue;
      const styleName = preserve ? line.s || selectedStyle : selectedStyle;
      const heightFt = keepHeights ? Number(line.h) || heightOf(styleName, selectedHeight) : Number(selectedHeight) || 6;
      out.push({ i: out.length, ri: validIndex(line.ri) ? line.ri : null, pts: clean, woodFinishedSides:cleanSides, styleName, sourceStyleName: line.s || spec.style || selectedStyle, heightFt, gates: [] });
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
    // V3-221 A job's own custom pieces and part edits (jobs/<id>.fence3dCustom): only the record's shape is checked here, and it is
  // copied as plain data; studio/custom-parts.mjs (in the viewer) validates every entry and draws only what passes.
  function customRecord(value) {
    if (!object(value) || value.v !== 1 || Object.keys(value).some(k => !['v', 'edits', 'pieces', 'terrain', 'meshes'].includes(k))) return undefined;
    for (const k of ['edits', 'pieces', 'terrain', 'meshes']) if (value[k] !== undefined && !Array.isArray(value[k])) return undefined;
    let text = ''; try { text = JSON.stringify(value) } catch (_) { return undefined }
    return text.length <= 320000 ? JSON.parse(text) : undefined;
  }
  root.GFSModelContract = Object.freeze({ modelPatch, modelMap, attachScope, runPatch, studioPatch, runKey, scopeForOption, heightOf, sketchRunIds, styleForKind, viewerRuns, layoutLabel, customRecord });
})(typeof window !== 'undefined' ? window : globalThis);
