(() => {
  const root = document.querySelector('[data-community-directory]');
  if (!root) return;
  const input = root.querySelector('input[type="search"]');
  const rows = [...root.querySelectorAll('[data-community-row]')];
  const status = root.querySelector('[role="status"]');
  const normalize = text => text.toLowerCase().replace(/\btwp\.?\b/g, 'township').replace(/[^a-z0-9]+/g, ' ').trim();
  input.addEventListener('input', () => {
    const query = normalize(input.value).split(' ').filter(Boolean);
    const states = query.filter(term => /^(mi|michigan|oh|ohio)$/.test(term))
      .map(term => /^(mi|michigan)$/.test(term) ? 'michigan' : 'ohio');
    const terms = query.filter(term => !/^(mi|michigan|oh|ohio)$/.test(term));
    const eligible = rows.filter(row => {
      const region = row.closest('[data-community-group]')?.querySelector('h2')?.textContent || '';
      return states.every(state => normalize(region).includes(state));
    });
    const matches = text => terms.every(term => normalize(text).includes(term));
    const wordMatches = eligible.filter(row => {
      const words = normalize(row.dataset.communityName || '').split(' ');
      return terms.every(term => words.some(word => word.startsWith(term)));
    });
    const nameMatches = wordMatches.length ? wordMatches : eligible.filter(row => matches(row.dataset.communityName || ''));
    // Prefer community names; fall back to county/jurisdiction labels when needed.
    const visible = new Set(nameMatches.length ? nameMatches : eligible.filter(row => {
      const region = row.closest('[data-community-group]')?.querySelector('h2')?.textContent || '';
      return matches(row.textContent + ' ' + region);
    }));
    for (const row of rows) row.hidden = !visible.has(row);
    for (const group of root.querySelectorAll('[data-community-group]')) {
      group.hidden = ![...group.querySelectorAll('[data-community-row]')].some(row => !row.hidden);
    }
    root.querySelector('[data-community-empty]').hidden = visible.size > 0;
    status.textContent = visible.size + (visible.size === 1 ? ' community' : ' communities');
  });
})();
