/* ============================================================
   GHAREEB FENCING — PRINTABLE BALLPARK ESTIMATE (PDF)
   ============================================================
   Builds the estimate sheet from the ballpark tool's data.

   Made to be printed: white paper, dark type, thin rules and one
   light tint. No solid color pages.

   Tech: jsPDF (loaded on demand from the CDN)
   Output: US Letter. Content flows onto as many pages as it needs:
     - who it is for, how to reach them, the range
     - every fence style in the project (length, height, gates)
     - what the customer told us about the yard
     - the sketch they drew on the map
     - other styles priced for the same fence
     - what happens next and what the written proposal covers
   ============================================================ */

(function() {
  'use strict';

  let jsPDFLoading = false;
  const loadCallbacks = [];

  function loadJsPDF(cb, onError) {
    if (typeof window.jspdf?.jsPDF === 'function') return cb();
    loadCallbacks.push({ ready: cb, error: onError });
    if (jsPDFLoading) return;
    jsPDFLoading = true;
    const script = document.createElement('script');
    let settled = false;
    const timeout = setTimeout(() => finish(new Error('PDF library timed out')), 20000);
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      jsPDFLoading = false;
      if (error) script.remove();
      const callbacks = loadCallbacks.splice(0);
      callbacks.forEach(c => error ? c.error(error) : c.ready());
    }
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.onload = () => finish(typeof window.jspdf?.jsPDF === 'function' ? null : new Error('PDF library unavailable'));
    script.onerror = () => finish(new Error('PDF library could not load'));
    try { document.head.appendChild(script); } catch (error) { finish(error); }
  }

  // The logo is drawn onto a canvas once so it can go into the PDF as a PNG.
  // The sheet prints fine without it if the image cannot load in time.
  let logoPromise = null;
  function loadLogo() {
    if (logoPromise) return logoPromise;
    logoPromise = new Promise(resolve => {
      try {
        const img = new Image();
        const done = value => { clearTimeout(timer); resolve(value); };
        const timer = setTimeout(() => done(null), 2500);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            done({ data: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
          } catch (e) { done(null); }
        };
        img.onerror = () => done(null);
        img.src = '/assets/img/performance-v12/ghareeb-logo-396.webp';
      } catch (e) { resolve(null); }
    });
    return logoPromise;
  }

  // -------- THEME (current brand: ink, one blue, quiet grays) --------
  const INK   = [16, 43, 70];
  const BLUE  = [29, 94, 182];
  const GRAY  = [80, 102, 128];
  const RULE  = [203, 215, 227];
  const TINT  = [242, 246, 250];
  const PHONE = '(419) 214-2107';

  function moneyFmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function formatRange(low, high) { return moneyFmt(low) + ' – ' + moneyFmt(high); }

  // The built-in PDF fonts cover Western European text only. Anything else
  // a customer typed is replaced rather than printed as stray symbols.
  function safe(value, max) {
    return String(value == null ? '' : value)
      .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
      .replace(/[^ -~ -ÿ–—•…]/g, '?')
      .replace(/\s+/g, ' ').trim().slice(0, max || 500);
  }
  function removalText(data) {
    if (!data.removeOldFence) return '';
    const labels = { wood: 'Wood', chain: 'Chain link', vinyl: 'Vinyl', aluminum: 'Aluminum / metal', other: 'Other / mixed materials' };
    const material = Object.prototype.hasOwnProperty.call(labels, data.existingFenceMaterial) ? labels[data.existingFenceMaterial] : 'Material to confirm';
    return material + ' fence, allowance for ' + data.linearFeet + ' ft. We confirm the removal scope on site.';
  }
  function gateText(single, double) {
    const bits = [];
    if (single > 0) bits.push(single + ' walk');
    if (double > 0) bits.push(double + ' drive');
    return bits.length ? bits.join(', ') : 'None';
  }
  // The project as a list of fence styles. Older callers send one style.
  function partsOf(data) {
    if (Array.isArray(data.parts) && data.parts.length) {
      return data.parts.map(part => ({ name: safe(part.name, 200), feet: Number(part.feet) || 0, height: part.height, singleGates: Number(part.singleGates) || 0, doubleGates: Number(part.doubleGates) || 0 }));
    }
    return [{ name: safe(data.fenceName, 200), feet: Number(data.linearFeet) || 0, height: data.height, singleGates: Number(data.singleGates) || 0, doubleGates: Number(data.doubleGates) || 0 }];
  }

  // -------- PDF BUILDER --------
  function buildPDF(data, logo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48, RIGHT = W - M, BOTTOM = H - 62, FULL = W - 2 * M;
    let y = 0;

    const color = rgb => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const line = rgb => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    const fill = rgb => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
    function need(height) { if (y + height > BOTTOM) { doc.addPage(); y = 56; } }
    function heading(text) {
      need(40);
      font('bold', 9); color(BLUE);
      doc.text(text.toUpperCase(), M, y, { charSpace: 1.2 });
      line(RULE); doc.setLineWidth(0.75); doc.line(M, y + 6, RIGHT, y + 6);
      y += 24;
    }
    function paragraph(text, size, rgb, width, x) {
      font('normal', size || 10.5); color(rgb || INK);
      const lines = doc.splitTextToSize(text, width || FULL);
      need(lines.length * (size || 10.5) * 1.35);
      doc.text(lines, x || M, y);
      y += lines.length * (size || 10.5) * 1.35;
    }
    function bullets(items, columns) {
      const cols = columns || 1, width = FULL / cols - 14;
      font('normal', 10.5); color(INK);
      const rows = Math.ceil(items.length / cols);
      for (let r = 0; r < rows; r++) {
        let tallest = 0;
        const cells = [];
        for (let c = 0; c < cols; c++) {
          const item = items[r + c * rows];
          if (!item) continue;
          const lines = doc.splitTextToSize(item, width);
          cells.push({ x: M + c * (FULL / cols), lines: lines });
          tallest = Math.max(tallest, lines.length);
        }
        need(tallest * 14 + 3);
        cells.forEach(cell => {
          fill(BLUE); doc.circle(cell.x + 3, y - 3.4, 1.7, 'F');
          doc.text(cell.lines, cell.x + 12, y);
        });
        y += tallest * 14 + 3;
      }
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    // The reference is the request's own receipt, so the office can match
    // this sheet to the lead. Older callers get a dated stand-in.
    const receipt = /^web_[a-zA-Z0-9_-]{16,80}$/.test(data.reference || '') ? data.reference : '';
    const refShort = receipt ? receipt.slice(4, 12).toUpperCase() : 'W-' + Date.now().toString(36).toUpperCase().slice(-7);
    const parts = partsOf(data);
    const reach = ({ call: 'Call', text: 'Text', email: 'Email' })[String(data.contactMethod || '').toLowerCase()] || '';

    // ---------- Letterhead ----------
    let textX = M;
    if (logo && logo.data) {
      const logoH = 54, logoW = logoH * (logo.ratio || 1.5);
      try { doc.addImage(logo.data, 'PNG', M, 34, logoW, logoH); textX = M + logoW + 14; } catch (e) { textX = M; }
    }
    font('bold', 16); color(INK);
    doc.text('Ghareeb Fencing Solutions', textX, 54);
    font('normal', 9.5); color(GRAY);
    doc.text('5242 Tractor Rd Suite C, Toledo, OH 43612', textX, 69);
    doc.text(PHONE + '  ·  nick@ghareebfence.com  ·  ghareebfence.com', textX, 82);
    font('bold', 10); color(BLUE);
    const kicker = 'BALLPARK ESTIMATE';
    doc.text(kicker, RIGHT - doc.getTextWidth(kicker) - (kicker.length - 1), 54, { charSpace: 1 });
    font('normal', 9.5); color(GRAY);
    doc.text(dateStr, RIGHT, 69, { align: 'right' });
    doc.text('Ref ' + refShort, RIGHT, 82, { align: 'right' });
    line(INK); doc.setLineWidth(1.2); doc.line(M, 100, RIGHT, 100);
    y = 124;

    // ---------- Who and how to reach them ----------
    const facts = [
      ['Prepared for', safe(data.customerName, 120) || 'You'],
      ['Property', safe(data.address, 300) || 'To be confirmed'],
    ];
    if (reach) facts.push(['Best way to reach you', reach + (data.bestTime ? ' (' + safe(data.bestTime, 40).toLowerCase() + ')' : '')]);
    if (data.timeline) facts.push(['When you want it built', safe(data.timeline, 60)]);
    const colW = FULL / 2 - 10;
    for (let i = 0; i < facts.length; i += 2) {
      let tallest = 0;
      [facts[i], facts[i + 1]].forEach((fact, c) => {
        if (!fact) return;
        const x = M + c * (FULL / 2 + 10 - 10 * c);
        font('normal', 8.5); color(GRAY);
        doc.text(fact[0].toUpperCase(), x, y, { charSpace: 0.6 });
        font('bold', 11.5); color(INK);
        const lines = doc.splitTextToSize(fact[1], colW).slice(0, 3);
        doc.text(lines, x, y + 15);
        tallest = Math.max(tallest, lines.length);
      });
      y += 22 + tallest * 14;
    }
    y += 4;

    // ---------- The range ----------
    const hasRange = Number.isFinite(data.priceLow) && Number.isFinite(data.priceHigh);
    fill(TINT); doc.rect(M, y, FULL, 92, 'F');
    fill(BLUE); doc.rect(M, y, 4, 92, 'F');
    font('bold', 9); color(BLUE);
    doc.text('BALLPARK RANGE', M + 20, y + 24, { charSpace: 1.2 });
    font('bold', 30); color(INK);
    doc.text(hasRange ? formatRange(data.priceLow, data.priceHigh) : 'We will price this for you', M + 20, y + 58);
    font('normal', 10); color(GRAY);
    doc.text('Based on the length, style and gates you entered. The firm price comes after we measure on site.', M + 20, y + 78);
    y += 118;

    // ---------- The fence ----------
    heading(parts.length > 1 ? 'Your fence: ' + parts.length + ' styles' : 'Your fence');
    const cols = { style: M, height: M + 300, length: M + 366, gates: M + 438 };
    font('bold', 8.5); color(GRAY);
    doc.text('STYLE', cols.style, y); doc.text('HEIGHT', cols.height, y); doc.text('LENGTH', cols.length, y); doc.text('GATES', cols.gates, y);
    y += 8; line(RULE); doc.setLineWidth(0.5); doc.line(M, y, RIGHT, y); y += 16;
    parts.forEach(part => {
      font('bold', 11); color(INK);
      const nameLines = doc.splitTextToSize(part.name || 'Style to confirm', 285).slice(0, 3);
      need(nameLines.length * 14 + 12);
      doc.text(nameLines, cols.style, y);
      font('normal', 11);
      doc.text(part.height ? part.height + ' ft' : '-', cols.height, y);
      doc.text(part.feet + ' ft', cols.length, y);
      doc.text(doc.splitTextToSize(gateText(part.singleGates, part.doubleGates), RIGHT - cols.gates), cols.gates, y);
      y += nameLines.length * 14 + 4;
      line(RULE); doc.setLineWidth(0.5); doc.line(M, y - 2, RIGHT, y - 2); y += 12;
    });
    if (parts.length > 1) {
      font('bold', 11); color(INK);
      doc.text('Total', cols.style, y);
      doc.text(data.linearFeet + ' ft', cols.length, y);
      doc.text(gateText(Number(data.singleGates) || 0, Number(data.doubleGates) || 0), cols.gates, y);
      y += 18;
    }
    const removal = removalText(data);
    if (removal) { y += 2; font('bold', 10.5); color(INK); doc.text('Old fence removal:', M, y); paragraph(removal, 10.5, INK, FULL - 110, M + 104); y += 2; }
    y += 10;

    // ---------- What the customer told us ----------
    const notes = (Array.isArray(data.siteNotes) ? data.siteNotes : []).map(note => safe(note, 80)).filter(Boolean).slice(0, 12);
    if (notes.length) { heading('You told us'); bullets(notes, 2); y += 10; }

    // ---------- What happens next ----------
    const steps = [
      'We look over your request and ' + (reach === 'Text' ? 'text you' : reach === 'Email' ? 'email you' : reach === 'Call' ? 'call you' : 'get in touch') + '.',
      'We measure on site. It is free. We walk the fence line and check grade, gates and access.',
      'You get a written proposal with the firm price.',
    ];
    need(150);
    heading('What happens next');
    steps.forEach((text, i) => {
      const lines = doc.splitTextToSize(text, FULL - 30);
      need(lines.length * 14 + 6);
      font('bold', 11); color(BLUE); doc.text(String(i + 1), M, y);
      font('normal', 10.5); color(INK); doc.text(lines, M + 18, y);
      y += lines.length * 14 + 5;
    });
    y += 4;
    font('bold', 10.5); color(INK);
    need(20);
    doc.text('Book your measure: ghareebfence.com/quote/book  or call ' + PHONE, M, y);
    y += 26;

    // ---------- What the proposal covers ----------
    need(130);
    heading('Your written proposal spells out');
    bullets([
      'Selected materials, gates and installation method',
      'Removal, disposal and site preparation',
      'Permit, utility-location and HOA responsibilities',
      'Payment terms, schedule and scope changes',
      'Material and workmanship coverage',
    ], 2);
    y += 10;
    // ---------- The sketch ----------
    const sketch = readSketch(data.geometry);
    if (sketch) {
      // Use the room left on this page when there is enough for a readable
      // drawing; otherwise start the next page with a full-size one.
      const room = BOTTOM - y - 74;
      const boxH = room >= 190 ? Math.min(260, room) : 260;
      need(boxH + 74);
      heading('Your sketch');
      drawSketch(doc, sketch, M, y - 6, FULL, boxH, { ink: INK, blue: BLUE, gray: GRAY, rule: RULE });
      y += boxH + 8;
      paragraph('From the lines you drew on the map. North is up. Lengths are approximate and get confirmed on site.' + (sketch.gates.length ? ' W is a walk gate, D is a drive gate.' : ''), 9, GRAY);
      y += 12;
    }

    // ---------- Other styles for the same fence ----------
    const comparisons = (Array.isArray(data.comparisons) ? data.comparisons : []).filter(row => row && Number.isFinite(row.low) && Number.isFinite(row.high)).slice(0, 8);
    if (comparisons.length > 1) {
      need(60 + comparisons.length * 20);
      heading('Same fence, other styles');
      paragraph(parts.length > 1 ? 'Your project with a different main style. Your added styles stay as they are.' : 'The same length, height and gates in a few other styles, lowest first.', 9.5, GRAY);
      y += 8;
      comparisons.forEach(row => {
        const mine = row.id === data.fenceId;
        need(20);
        if (mine) { fill(TINT); doc.rect(M, y - 13, FULL, 19, 'F'); }
        font(mine ? 'bold' : 'normal', 10.5); color(INK);
        const label = doc.splitTextToSize(safe(row.name, 160) + (mine ? '  (your pick)' : ''), FULL - 150)[0];
        doc.text(label, M + 6, y);
        doc.text(formatRange(row.low, row.high), RIGHT - 6, y, { align: 'right' });
        y += 20;
      });
      y += 12;
    }

    // ---------- Closing line ----------
    need(40);
    font('normal', 9.5); color(GRAY);
    doc.text('3-year workmanship warranty  ·  Financing options at ghareebfence.com/financing  ·  Family owned in Toledo', M, y);

    // ---------- Footer on every page ----------
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      line(RULE); doc.setLineWidth(0.5); doc.line(M, H - 46, RIGHT, H - 46);
      font('normal', 8.5); color(GRAY);
      doc.text('This is a ballpark, not a quote or a contract. A site measure sets the final scope and price.', M, H - 32);
      doc.text('Ghareeb Fencing Solutions  ·  ' + PHONE + (receipt ? '  ·  Request ' + receipt : '  ·  Ref ' + refShort), M, H - 20);
      doc.text('Page ' + page + ' of ' + pages, RIGHT, H - 20, { align: 'right' });
    }
    return doc;
  }

  // -------- SKETCH FROM THE MAP DRAWING --------
  function readSketch(geometry) {
    if (!geometry || typeof geometry !== 'string' || geometry.length > 45000) return null;
    try {
      const drawing = JSON.parse(geometry);
      const ok = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
      const lines = (Array.isArray(drawing.lines) ? drawing.lines : []).filter(run => Array.isArray(run) && run.length >= 2 && run.every(ok)).slice(0, 100);
      if (!lines.length) return null;
      const gates = (Array.isArray(drawing.gates) ? drawing.gates : []).filter(ok).slice(0, 200);
      return { lines: lines, gates: gates };
    } catch (e) { return null; }
  }
  function drawSketch(doc, sketch, x, y, w, h, c) {
    const all = sketch.lines.flat();
    const lat0 = all.reduce((sum, p) => sum + p.lat, 0) / all.length;
    // Feet per degree, close enough for a yard-sized drawing.
    const fx = 365223 * Math.cos(lat0 * Math.PI / 180), fy = 362776;
    const minLng = Math.min(...all.map(p => p.lng)), maxLng = Math.max(...all.map(p => p.lng));
    const minLat = Math.min(...all.map(p => p.lat)), maxLat = Math.max(...all.map(p => p.lat));
    const spanX = Math.max(1, (maxLng - minLng) * fx), spanY = Math.max(1, (maxLat - minLat) * fy);
    const pad = 34, scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
    const offX = x + (w - spanX * scale) / 2, offY = y + (h - spanY * scale) / 2;
    const at = p => ({ x: offX + (p.lng - minLng) * fx * scale, y: offY + (maxLat - p.lat) * fy * scale });
    const feet = (a, b) => Math.hypot((a.lng - b.lng) * fx, (a.lat - b.lat) * fy);

    doc.setDrawColor(c.rule[0], c.rule[1], c.rule[2]); doc.setLineWidth(0.75); doc.rect(x, y, w, h, 'S');
    // north arrow
    doc.setDrawColor(c.gray[0], c.gray[1], c.gray[2]); doc.setLineWidth(1);
    doc.line(x + w - 20, y + 34, x + w - 20, y + 14); doc.line(x + w - 20, y + 14, x + w - 24, y + 21); doc.line(x + w - 20, y + 14, x + w - 16, y + 21);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text('N', x + w - 20, y + 44, { align: 'center' });

    sketch.lines.forEach(run => {
      doc.setDrawColor(c.blue[0], c.blue[1], c.blue[2]); doc.setLineWidth(2.2); doc.setLineCap('round'); doc.setLineJoin('round');
      for (let i = 1; i < run.length; i++) {
        const a = at(run[i - 1]), b = at(run[i]);
        doc.line(a.x, a.y, b.x, b.y);
      }
      // segment lengths, only where there is room for the label
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
      for (let i = 1; i < run.length; i++) {
        const a = at(run[i - 1]), b = at(run[i]), length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 42) continue;
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
        const label = Math.round(feet(run[i - 1], run[i])) + ' ft';
        // Stand the label clear of the line: half its width when the line is
        // upright, a line of text when it runs across.
        const off = 6 + Math.abs(nx) * doc.getTextWidth(label) / 2 + Math.abs(ny) * 4;
        doc.text(label, (a.x + b.x) / 2 + nx * off, (a.y + b.y) / 2 + ny * off + 3, { align: 'center' });
      }
      doc.setFillColor(255, 255, 255); doc.setDrawColor(c.blue[0], c.blue[1], c.blue[2]); doc.setLineWidth(1);
      run.forEach(point => { const p = at(point); doc.circle(p.x, p.y, 2.4, 'FD'); });
    });
    sketch.gates.forEach(gate => {
      const p = at(gate);
      doc.setFillColor(255, 255, 255); doc.setDrawColor(c.ink[0], c.ink[1], c.ink[2]); doc.setLineWidth(1.1);
      doc.circle(p.x, p.y, 6.5, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
      doc.text(gate.type === 'drive' ? 'D' : 'W', p.x, p.y + 2.6, { align: 'center' });
    });
  }

  // -------- PUBLIC API --------
  let downloadPending = false;
  function downloadEstimate(data) {
    if (downloadPending) return;
    downloadPending = true;
    const button = document.getElementById('bp-action-pdf');
    const label = button?.textContent;
    const wasDisabled = button?.disabled;
    if (button) { button.disabled = true; button.textContent = 'Preparing PDF…'; button.setAttribute('aria-busy', 'true'); }
    // iOS Safari will not save a generated file from script, and it blocks
    // a new tab that is opened after waiting on anything. Open the tab now,
    // while this is still the customer's tap, and send the PDF to it after.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let tab = null;
    if (isIOS) { try { tab = window.open('', '_blank'); if (tab) tab.document.write('<p style="font:16px system-ui;padding:24px">Preparing your estimate…</p>'); } catch (e) { tab = null; } }
    function finishDownload() {
      downloadPending = false;
      if (button) { button.disabled = wasDisabled; button.textContent = label; button.removeAttribute('aria-busy'); }
    }
    loadJsPDF(() => {
      loadLogo().then(logo => {
        try {
          const doc = buildPDF(data, logo);
          const filename = `Ghareeb-Fencing-Estimate-${(data.customerName || 'quote').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'quote'}.pdf`;
          if (isIOS) {
            const url = URL.createObjectURL(doc.output('blob'));
            if (tab && !tab.closed) tab.location.href = url;
            else if (!window.open(url, '_blank')) alert('Your browser blocked the new tab. Allow pop-ups for this site and tap the button again, or call ' + PHONE + ' and we will send your estimate.');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } else {
            doc.save(filename);
          }
        } catch (e) {
          console.error('PDF generation failed:', e);
          try { if (tab && !tab.closed) tab.close(); } catch (_) {}
          alert('Could not make the PDF right now. Please call ' + PHONE + ' for your estimate.');
        } finally {
          finishDownload();
        }
      });
    }, () => {
      finishDownload();
      try { if (tab && !tab.closed) tab.close(); } catch (_) {}
      alert('The PDF could not load. Check your connection and tap the button again. Your project details are still here.');
    });
  }

  window.GFSEstimatePDF = { download: downloadEstimate, build: buildPDF };
})();
