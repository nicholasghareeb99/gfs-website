/* ============================================================
   GHAREEB FENCING — DOWNLOADABLE PDF ESTIMATE
   ============================================================
   Generates a branded multi-page PDF estimate from the ballpark
   tool data. Includes project planning, comparisons and scope questions.

   Tech: jsPDF (loaded on-demand from CDN, ~150KB gzipped)
   Output: US Letter (8.5" x 11"), 4 pages
     1. Cover with project summary and price range
     2. Material comparison (all 5 main fence types priced for same project)
     3. Scope checklist and financing information
     4. Project preparation and contact
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

  // -------- THEME (matches the website design system) --------
  const COLORS = {
    navy:      [26, 46, 64],
    gold:      [184, 148, 90],
    goldBright:[212, 178, 122],
    cream:     [250, 246, 239],
    creamWarm: [243, 234, 216],
    grayDeep:  [56, 56, 56],
    grayMid:   [120, 120, 120],
    grayLight: [220, 220, 220],
  };

  function moneyFmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function formatRange(low, high) {
    return moneyFmt(low) + ' – ' + moneyFmt(high);
  }

  function removalDescription(data) {
    if (!data.removeOldFence) return 'Removal not requested';
    const labels = { wood: 'Wood', chain: 'Chain link', vinyl: 'Vinyl', aluminum: 'Aluminum / metal', other: 'Other / mixed materials' };
    const material = Object.prototype.hasOwnProperty.call(labels, data.existingFenceMaterial) ? labels[data.existingFenceMaterial] : 'Material to confirm';
    return material + ' removal; allowance for ' + data.linearFeet + ' ft. Confirm scope.';
  }

  // -------- PDF BUILDER --------
  function buildPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });  // 612 × 792 pt
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Helper: set fill from color array
    function fill(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
    function stroke(rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
    function textColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

    // ==================== PAGE 1: COVER ====================
    fill(COLORS.navy);
    doc.rect(0, 0, W, 220, 'F');

    // Gold accent stripe
    fill(COLORS.gold);
    doc.rect(0, 220, W, 4, 'F');

    // Logo text "GHAREEB FENCING SOLUTIONS"
    doc.setFont('helvetica', 'bold');
    textColor(COLORS.cream);
    doc.setFontSize(11);
    doc.text('GHAREEB FENCING SOLUTIONS', 50, 50, { charSpace: 2 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(COLORS.goldBright);
    doc.text('TOLEDO  ·  NORTHWEST OHIO  ·  SOUTHEAST MICHIGAN', 50, 64, { charSpace: 1.5 });

    // Title
    doc.setFont('times', 'normal');
    doc.setFontSize(34);
    textColor(COLORS.cream);
    doc.text('Your Fence Planning Range', 50, 120);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    textColor(COLORS.goldBright);
    doc.text(data.customerName ? 'Prepared for ' + data.customerName : 'Prepared for you', 50, 145);

    // Date and reference number
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const refNum = 'GFS-W-' + Date.now().toString(36).toUpperCase().slice(-7);
    doc.setFontSize(10);
    textColor(COLORS.cream);
    doc.text(dateStr, 50, 170);
    doc.setFont('helvetica', 'bold');
    doc.text(refNum, 50, 188);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(COLORS.goldBright);
    doc.text('REFERENCE', 50, 200);

    // Project Summary box
    fill(COLORS.cream);
    doc.rect(0, 224, W, H - 224, 'F');

    let y = 260;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    textColor(COLORS.gold);
    doc.text('YOUR PROJECT', 50, y, { charSpace: 2 });
    y += 18;

    doc.setFont('times', 'normal');
    doc.setFontSize(20);
    textColor(COLORS.navy);
    const styleLines = doc.splitTextToSize(String(data.fenceName || ''), W - 100);
    doc.text(styleLines, 50, y);
    y += Math.max(26, styleLines.length * 23 + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    textColor(COLORS.grayDeep);
    const specs = [
      ['Length',        data.linearFeet + ' linear feet'],
      ['Height',        data.height + ' feet'],
      ['Walk Gates',    data.singleGates ? data.singleGates + ' × single gate' : 'None'],
      ['Drive Gates',   data.doubleGates ? data.doubleGates + ' × double gate' : 'None'],
      ['Existing Fence', removalDescription(data)],
      ['Address',       String(data.address || '(to be confirmed)').slice(0, 500)],
    ];
    // Use the same 500-character address limit as the accepted lead record.
    // Wrap values before placing the range box so long addresses cannot run
    // off the page or collide with the price and proposal checklist.
    let specSize = 11, specRows;
    do {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(specSize);
      specRows = specs.map(([key, value]) => ({key, lines: doc.splitTextToSize(String(value), W - 230)}));
      if (y + specRows.reduce((sum, row) => sum + Math.max(17, row.lines.length * specSize * 1.15 + 5), 0) + 223 <= H - 66 || specSize <= 8) break;
      specSize--;
    } while (true);
    specRows.forEach(({key, lines}) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(specSize);
      textColor(COLORS.grayMid);
      doc.text(key, 50, y);
      doc.setFont('helvetica', 'bold');
      textColor(COLORS.navy);
      doc.text(lines, 180, y);
      y += Math.max(17, lines.length * specSize * 1.15 + 5);
    });

    // Price reveal box
    y += 14;
    fill(COLORS.navy);
    doc.rect(50, y, W - 100, 110, 'F');
    fill(COLORS.gold);
    doc.rect(50, y, W - 100, 4, 'F');

    textColor(COLORS.goldBright);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PLANNING PRICE RANGE', 70, y + 30, { charSpace: 1.5 });

    textColor(COLORS.cream);
    doc.setFont('times', 'normal');
    doc.setFontSize(32);
    doc.text(formatRange(data.priceLow, data.priceHigh), 70, y + 70);

    doc.setFontSize(10);
    textColor(COLORS.cream);
    doc.text('Planning range only. A site review confirms the final scope and price.', 70, y + 92);

    y += 130;

    // What this includes - small teaser
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    textColor(COLORS.gold);
    doc.text('REVIEW IN YOUR WRITTEN PROPOSAL', 50, y, { charSpace: 1.5 });
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    textColor(COLORS.grayDeep);
    const inclusions = [
      'Selected materials, gates and installation method',
      'Removal, disposal and site preparation',
      'Permit, utility-location and HOA responsibilities',
      'Payment terms, schedule and scope changes',
      'Material and workmanship coverage',
    ];
    inclusions.forEach(item => {
      doc.text('•  ' + item, 50, y);
      y += 13;
    });

    // Footer
    fill(COLORS.navy);
    doc.rect(0, H - 50, W, 50, 'F');
    textColor(COLORS.cream);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('(419) 214-2107', 50, H - 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textColor(COLORS.goldBright);
    doc.text('info@ghareebfencingsolutions.com  ·  ghareebfence.com', 50, H - 14);
    doc.setFontSize(8);
    textColor(COLORS.cream);
    doc.text('Page 1 of 4', W - 80, H - 14);

    // ==================== PAGE 2: COMPARISON ====================
    doc.addPage();
    fill(COLORS.navy);
    doc.rect(0, 0, W, 80, 'F');
    fill(COLORS.gold);
    doc.rect(0, 80, W, 3, 'F');

    textColor(COLORS.goldBright);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('COMPARE MATERIALS', 50, 32, { charSpace: 2 });
    textColor(COLORS.cream);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Explore your material options.', 50, 60);

    y = 110;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    textColor(COLORS.grayDeep);
    doc.text(`Planning inputs: ${data.linearFeet} ft at ${data.height} ft tall, ${data.singleGates + data.doubleGates} total gate(s).`, 50, y);
    y += 28;

    // Comparison table
    fill(COLORS.navy);
    doc.rect(50, y, W - 100, 24, 'F');
    textColor(COLORS.cream);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Style', 60, y + 16);
    doc.text('Planning Range', W - 200, y + 16);
    y += 24;

    let altIdx = 0;
    // Hard guard: never render past the bottom of the page, no matter how
    // many comparison rows get passed in.
    const ROW_H = 38;
    const PAGE_BOTTOM = doc.internal.pageSize.getHeight() - 180;
    const maxRows = Math.max(1, Math.floor((PAGE_BOTTOM - y) / ROW_H));
    const rows = data.comparisons.slice(0, maxRows);
    const omitted = data.comparisons.length - rows.length;
    rows.forEach(c => {
      if (altIdx % 2 === 1) {
        fill(COLORS.creamWarm);
        doc.rect(50, y, W - 100, 38, 'F');
      }
      const isSelected = c.id === data.fenceId;
      if (isSelected) {
        fill(COLORS.gold);
        doc.rect(50, y, 4, 38, 'F');
      }
      textColor(isSelected ? COLORS.navy : COLORS.grayDeep);
      doc.setFont('helvetica', isSelected ? 'bold' : 'normal');
      doc.setFontSize(11);
      const label = c.name + (isSelected ? ' (selected)' : '');
      const labelLines = doc.splitTextToSize(label, W - 280).slice(0, 2);
      doc.text(labelLines, 60, y + (labelLines.length > 1 ? 15 : 22));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      textColor(COLORS.grayMid);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      textColor(isSelected ? COLORS.navy : COLORS.grayDeep);
      doc.text(formatRange(c.low, c.high), W - 200, y + 22);
      y += 38;
      altIdx++;
    });

    if (omitted > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      textColor(COLORS.grayMid);
      doc.text('+ ' + omitted + ' more styles available — ask us for pricing on any style.', 60, y + 14);
      y += 22;
    }

    y += 18;
    fill(COLORS.cream);
    doc.rect(50, y, W - 100, 90, 'F');
    fill(COLORS.gold);
    doc.rect(50, y, 4, 90, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    textColor(COLORS.navy);
    doc.text('Compare the complete scope', 70, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    textColor(COLORS.grayDeep);
    const wrap = doc.splitTextToSize(
      'Review the actual product, appearance, care instructions and written coverage for each option. ' +
      'Confirm the same measured layout, gates, removal and installation scope. Pool boundaries ' +
      'and driven-post options need a project-specific review. These planning ranges are not fixed-price offers.',
      W - 140
    );
    doc.text(wrap, 70, y + 40);

    // Page footer
    fill(COLORS.navy);
    doc.rect(0, H - 30, W, 30, 'F');
    textColor(COLORS.cream);
    doc.setFontSize(8);
    doc.text('Ghareeb Fencing Solutions  ·  ' + refNum, 50, H - 12);
    doc.text('Page 2 of 4', W - 80, H - 12);

    // ==================== PAGE 3: WHAT'S INCLUDED ====================
    doc.addPage();
    fill(COLORS.navy);
    doc.rect(0, 0, W, 80, 'F');
    fill(COLORS.gold);
    doc.rect(0, 80, W, 3, 'F');

    textColor(COLORS.goldBright);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('YOUR PROPOSAL CHECKLIST', 50, 32, { charSpace: 2 });
    textColor(COLORS.cream);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Know what your proposal includes.', 50, 60);

    y = 110;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    textColor(COLORS.grayDeep);
    doc.text("Compare proposals against the same layout and scope.", 50, y);
    y += 14;
    doc.text("Ask which items are included, excluded or need further review:", 50, y);
    y += 28;

    const sections = [
      { title: 'Materials & Installation', items: [
        'Fence length, height, selected product and finish',
        'Board or panel dimensions, posts, rails and fasteners',
        'Post spacing, support and installation method',
        'Gate openings, frames, hinges and latches',
        'Removal, disposal and any site restoration',
      ] },
      { title: 'Site & Responsibilities', items: [
        'Property-line information and site access',
        'Permit and inspection responsibilities',
        'Any required plot plans or drawings',
        'HOA requirements and approval responsibilities',
        'Utility-location and private-service responsibilities',
      ] },
      { title: 'Terms & Completion', items: [
        'Written material and workmanship terms and exclusions',
        'Payment schedule and how scope changes are approved',
        'Project-specific requirements, including pool boundaries',
        'Expected schedule, cleanup and final walkthrough',
      ] },
    ];

    sections.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      textColor(COLORS.navy);
      doc.text(section.title, 50, y);
      y += 6;
      fill(COLORS.gold);
      doc.rect(50, y, 30, 2, 'F');
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      textColor(COLORS.grayDeep);
      section.items.forEach(item => {
        doc.text('-  ' + item, 60, y);
        y += 14;
      });
      y += 14;
    });

    // Financing information; offer terms come from the lender.
    fill(COLORS.navy);
    doc.rect(50, y, W - 100, 65, 'F');
    textColor(COLORS.goldBright);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CONSIDERING FINANCING?', 70, y + 22, { charSpace: 1.5 });
    textColor(COLORS.cream);
    doc.setFont('times', 'normal');
    doc.setFontSize(16);
    doc.text('Explore Slice by FNBO options', 70, y + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Review eligibility and current loan terms at ghareebfence.com/financing', 70, y + 58);

    fill(COLORS.navy);
    doc.rect(0, H - 30, W, 30, 'F');
    textColor(COLORS.cream);
    doc.setFontSize(8);
    doc.text('Ghareeb Fencing Solutions  ·  ' + refNum, 50, H - 12);
    doc.text('Page 3 of 4', W - 80, H - 12);

    // ==================== PAGE 4: WHY GHAREEB ====================
    doc.addPage();
    fill(COLORS.navy);
    doc.rect(0, 0, W, 80, 'F');
    fill(COLORS.gold);
    doc.rect(0, 80, W, 3, 'F');

    textColor(COLORS.goldBright);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('YOUR NEXT STEP', 50, 32, { charSpace: 2 });
    textColor(COLORS.cream);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Bring your fence plan to life.', 50, 60);

    y = 110;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    textColor(COLORS.grayDeep);
    const intro = doc.splitTextToSize(
      'Ghareeb Fencing Solutions serves Toledo and nearby communities in Northwest Ohio and ' +
      'Southeast Michigan. Share your project details so we can review the layout, materials, ' +
      'gates and installation needs for your yard.',
      W - 100
    );
    doc.text(intro, 50, y);
    y += intro.length * 14 + 14;

    // Three project steps
    const credBoxW = (W - 100 - 20) / 3;
    const creds = [
      { num: '01', label: 'Share your layout' },
      { num: '02', label: 'Compare the options' },
      { num: '03', label: 'Review the proposal' },
    ];
    creds.forEach((c, i) => {
      const x = 50 + i * (credBoxW + 10);
      fill(COLORS.cream);
      doc.rect(x, y, credBoxW, 80, 'F');
      fill(COLORS.gold);
      doc.rect(x, y, credBoxW, 3, 'F');
      doc.setFont('times', 'normal');
      doc.setFontSize(28);
      textColor(COLORS.navy);
      doc.text(c.num, x + 12, y + 36);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      textColor(COLORS.grayDeep);
      doc.text(c.label, x + 12, y + 58);
    });
    y += 100;

    // Project preparation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    textColor(COLORS.gold);
    doc.text('PREPARE FOR YOUR ESTIMATE', 50, y, { charSpace: 1.5 });
    y += 18;

    const planningTips = [
      { text: 'Gather photos of the fence line, existing fencing and the areas you want to enclose. Note any access, slope or boundary questions.', author: 'Your property', source: 'Layout and site details' },
      { text: 'Bring the styles you like and the gate openings you need. Ask to compare the same layout and complete installation scope in each option.', author: 'Your options', source: 'Materials and gates' },
    ];

    planningTips.forEach(t => {
      fill(COLORS.cream);
      doc.rect(50, y, W - 100, 78, 'F');
      fill(COLORS.gold);
      doc.rect(50, y, 4, 78, 'F');
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      textColor(COLORS.grayDeep);
      const wrap = doc.splitTextToSize(t.text, W - 140);
      doc.text(wrap, 70, y + 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      textColor(COLORS.navy);
      doc.text(t.author, 70, y + 64);
      const authorWidth = doc.getTextWidth(t.author);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      textColor(COLORS.grayMid);
      doc.text(t.source, 70 + authorWidth + 10, y + 64);
      y += 88;
    });

    // CTA strip
    y = H - 100;
    fill(COLORS.navy);
    doc.rect(0, y, W, 70, 'F');
    fill(COLORS.gold);
    doc.rect(0, y, W, 4, 'F');
    doc.setFont('times', 'normal');
    doc.setFontSize(16);
    textColor(COLORS.cream);
    doc.text('Ready for your free on-site measure?', 50, y + 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    textColor(COLORS.goldBright);
    doc.text('(419) 214-2107  ·  ghareebfence.com/contact', 50, y + 56);

    fill(COLORS.navy);
    doc.rect(0, H - 30, W, 30, 'F');
    textColor(COLORS.cream);
    doc.setFontSize(8);
    doc.text('Ghareeb Fencing Solutions  ·  ' + refNum, 50, H - 12);
    doc.text('Page 4 of 4', W - 80, H - 12);

    return doc;
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
    function finishDownload() {
      downloadPending = false;
      if (button) { button.disabled = wasDisabled; button.textContent = label; button.removeAttribute('aria-busy'); }
    }
    loadJsPDF(() => {
      try {
        const doc = buildPDF(data);
        const filename = `Ghareeb-Fencing-Estimate-${(data.customerName || 'quote').replace(/\s+/g, '-')}.pdf`;
        // iOS Safari often ignores doc.save() auto-download because it can't
        // trigger anchor downloads from JS reliably. Detect iOS and open the
        // PDF in a new tab instead — user then taps Share → Save to Files.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          const win = window.open(url, '_blank');
          if (!win) {
            alert('Popup blocked. Please allow popups for this site and try again. Or call (419) 214-2107 to get your estimate.');
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else {
          doc.save(filename);
        }
      } catch (e) {
        console.error('PDF generation failed:', e);
        alert('Could not generate the PDF right now. Please call (419) 214-2107 for your estimate.');
      } finally {
        finishDownload();
      }
    }, () => {
      finishDownload();
      alert('The PDF could not load. Check your connection and tap Download PDF again. Your project details are still here.');
    });
  }

  window.GFSEstimatePDF = { download: downloadEstimate };
})();
