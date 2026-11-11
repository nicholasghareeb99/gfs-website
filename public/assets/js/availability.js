/* ============================================================
   GHAREEB FENCING — BOOKING AVAILABILITY
   ============================================================
   Reads open appointment slots from Firestore so the website can
   only offer times that are genuinely free.

   Firestore contract (matches the deployed rules — /availableSlots
   is publicly readable, and the public may update ONLY the
   `booked` field):

     /availableSlots/{id}
       date:   "2026-08-14"                 (ISO yyyy-mm-dd)
       time:   "Morning (8 am - 12 pm)"     (label shown to the customer)
       booked: false

   IMPORTANT — graceful degradation:
   The Executive app does not currently create availableSlots
   documents. Until it does, this collection will be empty, and
   the booking form falls back to the standard time windows and
   a plain date picker. Nothing breaks either way; publishing
   slots simply upgrades the experience from "preferred time" to
   "guaranteed open time".
   ============================================================ */
(function () {
  'use strict';

  const BUILD = 'availability-v1.0-2026-08-09';

  const dateInput = document.getElementById('bk-date');
  const timeSelect = document.getElementById('bk-time');
  const slotNote = document.getElementById('bk-slot-note');
  const dateNote = document.getElementById('bk-date-note');
  if (!dateInput || !timeSelect) return;   // not on the booking page

  // slots grouped by date: { '2026-08-14': [{id, time}, ...] }
  let slotsByDate = null;   // null = no published slots; fall back
  const DEFAULT_TIMES = [
    'Morning (8 am - 12 pm)',
    'Afternoon (12 - 5 pm)',
    'Evening (5 - 7 pm)',
  ];

  // ---- Date bounds: earliest tomorrow, latest 90 days out, no Sundays ----
  function iso(d) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function setDateBounds() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 90);
    dateInput.min = iso(tomorrow);
    dateInput.max = iso(horizon);
  }

  // Sunday is not a working day — reject it rather than let someone book
  // a slot nobody will show up for.
  function validateDate() {
    const v = dateInput.value;
    if (!v) { dateInput.setCustomValidity(''); return; }
    // Parse as local, not UTC, so the weekday is correct
    const parts = v.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (d.getDay() === 0) {
      dateInput.setCustomValidity('We do not measure on Sundays — please pick another day.');
      if (dateNote) {
        dateNote.textContent = 'We do not measure on Sundays. Pick Monday-Saturday.';
        dateNote.style.color = 'var(--stop)';
      }
    } else {
      dateInput.setCustomValidity('');
      if (dateNote) {
        dateNote.textContent = 'We measure Monday-Saturday.';
        dateNote.style.color = 'var(--galv)';
      }
    }
    dateInput.reportValidity && dateInput.checkValidity();
  }

  // ---- Populate the time select for the chosen date ----------------
  function fillTimes() {
    const chosen = dateInput.value;
    const prev = timeSelect.value;
    timeSelect.innerHTML = '<option value="">Select a time</option>';

    // No published slots — offer the standard windows
    if (!slotsByDate) {
      DEFAULT_TIMES.forEach(t => {
        const o = document.createElement('option');
        o.value = t; o.textContent = t;
        timeSelect.appendChild(o);
      });
      if (slotNote) slotNote.textContent = "We'll confirm the exact time when we call.";
      if (prev) timeSelect.value = prev;
      return;
    }

    const open = (chosen && slotsByDate[chosen]) || [];
    if (!chosen) {
      if (slotNote) slotNote.textContent = 'Pick a date to see requested visit windows.';
      return;
    }
    if (!open.length) {
      if (slotNote) {
        slotNote.textContent = 'No openings that day — try another date.';
        slotNote.style.color = 'var(--warn)';
      }
      return;
    }
    open.forEach(slot => {
      const o = document.createElement('option');
      o.value = slot.time;
      o.textContent = slot.time;
      o.dataset.slotId = slot.id;
      timeSelect.appendChild(o);
    });
    if (slotNote) {
      slotNote.textContent = open.length + ' published ' + (open.length === 1 ? 'window' : 'windows') + ' that day. Our office confirms your visit.';
      slotNote.style.color = 'var(--ok)';
    }
    if (prev) timeSelect.value = prev;
  }

  // Expose the chosen slot id so leads.js can mark it booked on success
  function currentSlotId() {
    const opt = timeSelect.options[timeSelect.selectedIndex];
    return (opt && opt.dataset && opt.dataset.slotId) || null;
  }
  window.GFSAvailability = { currentSlotId: currentSlotId, version: BUILD };

  // ---- Load published slots ---------------------------------------
  async function loadSlots() {
    if (!window.GFS_DB) return;
    try {
      const snap = await window.GFS_DB.collection('availableSlots').get();
      if (snap.empty) {
        console.log('[Ghareeb Availability] No published slots — using standard time windows.');
        return;
      }
      const grouped = {};
      const todayIso = iso(new Date());
      snap.forEach(doc => {
        const d = doc.data() || {};
        if (d.booked) return;                    // already taken
        if (!d.date || !d.time) return;          // malformed
        if (d.date < todayIso) return;           // in the past
        (grouped[d.date] = grouped[d.date] || []).push({ id: doc.id, time: d.time });
      });
      const dayCount = Object.keys(grouped).length;
      if (!dayCount) {
        console.log('[Ghareeb Availability] All published slots are taken — using standard windows.');
        return;
      }
      slotsByDate = grouped;
      console.log('[Ghareeb Availability] ' + dayCount + ' day(s) with open slots loaded.');
      fillTimes();
    } catch (e) {
      // Permissions, offline, anything — the standard windows still work
      console.log('[Ghareeb Availability] Could not read slots, using standard windows:', e.message || e);
    }
  }

  function init() {
    console.log('[Ghareeb Availability] ' + BUILD);
    setDateBounds();
    fillTimes();
    dateInput.addEventListener('change', () => { validateDate(); fillTimes(); });
    dateInput.addEventListener('input', validateDate);
    if (window.GFS_DB) loadSlots();
    else window.addEventListener('gfs-firebase-ready', loadSlots, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
