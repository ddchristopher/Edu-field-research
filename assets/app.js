/* Chalkline app: loads data/*.json and renders the dashboard. */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; };
  const SECTION_ACCENT = { overview: '--accent', ai: '--ai', math: '--math' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(iso, opts) {
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length === 2) return `${MONTHS[parts[1] - 1]} ${parts[0]}`;
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] || 1));
    const day = parts[2] ? ` ${d.getUTCDate()}` : '';
    return `${MONTHS[d.getUTCMonth()]}${day}, ${d.getUTCFullYear()}`.replace(/,\s(\d{4})$/, opts && opts.short ? '' : ', $1').replace(/,\s?$/, '');
  }
  function shortDate(iso) {
    const p = iso.split('-').map(Number);
    return p.length >= 3 ? `${MONTHS[p[1] - 1]} ${p[2]}` : `${MONTHS[p[1] - 1]} ${p[0]}`;
  }

  /* ---------- data loading ---------- */
  async function loadData() {
    const inline = document.getElementById('chalkline-data');
    if (inline) return JSON.parse(inline.textContent);
    const files = ['meta', 'sources', 'overview', 'ai', 'math', 'briefing'];
    const out = {};
    await Promise.all(files.map(async f => {
      const res = await fetch(`data/${f}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Could not load data/${f}.json (${res.status})`);
      out[f] = await res.json();
    }));
    return out;
  }

  /* ---------- theme ---------- */
  function initTheme() {
    const root = document.documentElement;
    const btn = $('#theme-toggle');
    const order = ['system', 'light', 'dark'];
    let mode = 'system';
    try { mode = localStorage.getItem('chalkline-theme') || 'system'; } catch (e) { /* storage unavailable */ }
    function apply(m) {
      mode = m;
      if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
      btn.setAttribute('aria-label', `Theme: ${m}. Click to change.`);
      btn.dataset.mode = m;
      $('#theme-label').textContent = m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark';
      try { localStorage.setItem('chalkline-theme', m); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('chalkline:theme'));
    }
    apply(mode);
    btn.addEventListener('click', () => apply(order[(order.indexOf(mode) + 1) % order.length]));
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (mode === 'system') document.dispatchEvent(new CustomEvent('chalkline:theme')); });
  }

  /* ---------- pieces ---------- */
  function sourceLink(id, sources, cls) {
    const s = sources[id];
    const a = el('a', cls || 'source-link');
    if (!s) { a.textContent = id; return a; }
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = s.org;
    a.title = `${s.title} (${fmtDate(s.date)})`;
    return a;
  }
  function sourceIds(ref) { return Array.isArray(ref) ? ref : ref ? [ref] : []; }
  function sourceLine(ref, sources, asOf) {
    const ids = sourceIds(ref);
    const p = el('p', 'source-line');
    p.appendChild(el('span', 'source-prefix', ids.length > 1 ? 'Sources' : 'Source'));
    ids.forEach((id, i) => {
      if (i) p.appendChild(document.createTextNode('; '));
      p.appendChild(sourceLink(id, sources));
      const s = sources[id];
      if (s) p.appendChild(el('span', 'source-date', ` (${fmtDate(s.date)})`));
    });
    if (asOf) p.appendChild(el('span', 'source-date', ` · data as of ${asOf}`));
    return p;
  }
  function deltaPill(delta) {
    if (!delta) return null;
    const pill = el('span', `delta delta-${delta.sentiment || 'neutral'}`);
    const glyph = delta.sentiment === 'good' ? '▲' : delta.sentiment === 'bad' ? '▼' : '●';
    pill.appendChild(el('span', 'delta-glyph', glyph));
    pill.appendChild(el('span', null, delta.text));
    return pill;
  }
  function statTile(stat, sources, variant) {
    const tile = el('article', 'tile' + (variant ? ' tile-' + variant : ''));
    tile.appendChild(el('p', 'tile-label', stat.label));
    const valueRow = el('div', 'tile-value-row');
    valueRow.appendChild(el('p', 'tile-value', stat.display));
    if (stat.spark && Array.isArray(stat.spark.values) && stat.spark.values.length > 1) {
      const sp = el('div', 'tile-spark');
      sp.title = `${stat.spark.label || 'Trend'}, ${stat.spark.x[0]}–${stat.spark.x[stat.spark.x.length - 1]}`;
      valueRow.appendChild(sp);
      const draw = () => window.ChalklineCharts.sparkline(sp, stat.spark, getComputedStyle(tile).getPropertyValue('--section-accent-resolved').trim() || undefined);
      draw();
      document.addEventListener('chalkline:theme', draw);
    }
    tile.appendChild(valueRow);
    const meta = el('div', 'tile-meta');
    const d = deltaPill(stat.delta); if (d) meta.appendChild(d);
    if (stat.unit) meta.appendChild(el('span', 'tile-unit', stat.unit));
    tile.appendChild(meta);
    if (stat.note) tile.appendChild(el('p', 'tile-note', stat.note));
    tile.appendChild(sourceLine(stat.source, sources, stat.asOf));
    return tile;
  }
  function blockHeader(title, subtitle) {
    const h = el('header', 'block-head');
    h.appendChild(el('h3', 'block-title', title));
    if (subtitle) h.appendChild(el('p', 'block-sub', subtitle));
    return h;
  }

  /* ---------- blocks ---------- */
  function renderChartBlock(block, sources, accent) { // accent is the CSS variable name for the section, e.g. '--ai'
    const spec = block.chart;
    const card = el('section', `block block-chart size-${block.size || 'md'}`);
    card.id = 'chart-' + block.id;
    card.appendChild(blockHeader(spec.title, spec.subtitle));
    const host = el('div', 'chart');
    card.appendChild(host);
    const handle = window.ChalklineCharts.mount(host, spec, { accentVar: accent, sources });
    if (spec.companion) {
      const list = el('dl', 'companion');
      spec.companion.forEach(c => { const dt = el('dt', null, c.label); const dd = el('dd', null, c.display); list.appendChild(dd); list.appendChild(dt); });
      card.appendChild(list);
    }
    const foot = el('footer', 'block-foot');
    if (spec.note) foot.appendChild(el('p', 'block-note', spec.note));
    const row = el('div', 'foot-row');
    row.appendChild(sourceLine(spec.source, sources));
    const btn = el('button', 'btn-ghost', 'Show table');
    btn.type = 'button';
    const tableWrap = el('div', 'table-wrap');
    tableWrap.hidden = true;
    btn.addEventListener('click', () => {
      if (tableWrap.hidden) { tableWrap.replaceChildren(handle.table()); tableWrap.hidden = false; btn.textContent = 'Hide table'; }
      else { tableWrap.hidden = true; btn.textContent = 'Show table'; }
    });
    row.appendChild(btn);
    foot.appendChild(row);
    card.appendChild(foot);
    card.appendChild(tableWrap);
    return card;
  }
  function renderStatsBlock(block, sources) {
    const card = el('section', `block block-stats size-${block.size || 'md'}`);
    card.appendChild(blockHeader(block.title, block.subtitle));
    const grid = el('div', 'stat-list');
    block.items.forEach(s => grid.appendChild(statTile(s, sources, 'inline')));
    card.appendChild(grid);
    return card;
  }
  function renderFindingsBlock(block, sources) {
    const card = el('section', `block block-findings size-${block.size || 'md'}`);
    card.appendChild(blockHeader(block.title, block.subtitle));
    const list = el('ol', 'findings');
    block.items.forEach(f => {
      const li = el('li', 'finding');
      const p = el('p');
      p.appendChild(el('strong', null, f.headline + ' '));
      p.appendChild(document.createTextNode(f.detail));
      li.appendChild(p);
      li.appendChild(sourceLine(f.source, sources));
      list.appendChild(li);
    });
    card.appendChild(list);
    return card;
  }
  function renderChipsBlock(block, sources) {
    const card = el('section', `block block-chips size-${block.size || 'md'}`);
    card.appendChild(blockHeader(block.title, block.subtitle));
    const list = el('ul', 'chips');
    block.items.forEach(c => {
      const li = el('li', 'chip');
      li.appendChild(el('span', 'chip-label', c.label));
      li.appendChild(el('span', 'chip-value', c.display));
      if (c.note) li.appendChild(el('span', 'chip-note', c.note));
      sourceIds(c.source).forEach((id, i) => { if (i) li.appendChild(document.createTextNode('; ')); li.appendChild(sourceLink(id, sources, 'source-link chip-source')); });
      list.appendChild(li);
    });
    card.appendChild(list);
    return card;
  }
  function renderTableBlock(block, sources) {
    const card = el('section', `block block-table size-${block.size || 'lg'}`);
    card.appendChild(blockHeader(block.title, block.subtitle));
    const wrap = el('div', 'table-wrap');
    const table = el('table', 'evidence-table');
    const thead = el('thead'); const trh = el('tr');
    block.columns.forEach(c => trh.appendChild(el('th', null, c)));
    trh.appendChild(el('th', null, 'Source'));
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = el('tbody');
    block.rows.forEach(r => {
      const tr = el('tr');
      r.cells.forEach((c, i) => tr.appendChild(el(i === 0 ? 'th' : 'td', null, c)));
      const td = el('td'); sourceIds(r.source).forEach((id, i) => { if (i) td.appendChild(document.createTextNode('; ')); td.appendChild(sourceLink(id, sources)); }); tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); wrap.appendChild(table); card.appendChild(wrap);
    return card;
  }
  const BLOCKS = { chart: renderChartBlock, stats: renderStatsBlock, findings: renderFindingsBlock, chips: renderChipsBlock, table: renderTableBlock };

  /* ---------- sections ---------- */
  function renderSection(data, sources) {
    const accentVar = SECTION_ACCENT[data.section];
    const accent = accentVar;
    const sec = $(`#${data.section}`);
    sec.replaceChildren();
    const head = el('header', 'section-head');
    head.appendChild(el('p', 'eyebrow', data.eyebrow));
    head.appendChild(el('h2', 'section-title', data.title));
    head.appendChild(el('p', 'lede', data.lede));
    sec.appendChild(head);
    const kpis = el('div', 'kpi-row');
    data.kpis.forEach(k => kpis.appendChild(statTile(k, sources)));
    sec.appendChild(kpis);
    const grid = el('div', 'block-grid');
    data.blocks.forEach(b => {
      const fn = BLOCKS[b.type];
      if (fn) grid.appendChild(fn(b, sources, accent));
    });
    sec.appendChild(grid);
    // section accent for charts drawn later (theme change) — re-read at draw time via CSS var on the section
    sec.style.setProperty('--section-accent', `var(${accentVar})`);
  }

  function renderHero(meta, briefing) {
    $('#edition').textContent = meta.edition + ' edition';
    $('#updated').textContent = `Updated ${fmtDate(meta.generatedAt)} · next refresh ${fmtDate(meta.nextScheduledRun)}`;
    $('#hero-summary').textContent = briefing.summary;
    $('#brand-tagline').textContent = meta.tagline;
  }

  function renderBriefing(briefing, sources) {
    const sec = $('#briefing');
    $('#briefing-edition').textContent = briefing.edition;
    const list = $('#timeline');
    list.replaceChildren();
    briefing.items.forEach(item => {
      const li = el('li', 'event');
      const when = el('div', 'event-when');
      when.appendChild(el('time', null, shortDate(item.date))).setAttribute('datetime', item.date);
      when.appendChild(el('span', `tag tag-${item.tag.toLowerCase()}`, item.tag));
      li.appendChild(when);
      const body = el('div', 'event-body');
      body.appendChild(el('h4', 'event-title', item.headline));
      body.appendChild(el('p', 'event-detail', item.detail));
      body.appendChild(sourceLine(item.source, sources));
      li.appendChild(body);
      list.appendChild(li);
    });
    const up = $('#upcoming');
    up.replaceChildren();
    briefing.upcoming.forEach(u => {
      const li = el('li', 'upcoming-item');
      li.appendChild(el('time', 'upcoming-date', shortDate(u.date))).setAttribute('datetime', u.date);
      const b = el('div');
      b.appendChild(el('strong', null, u.what));
      b.appendChild(el('p', 'upcoming-why', u.why));
      if (u.source) b.appendChild(sourceLine(u.source, sources));
      li.appendChild(b);
      up.appendChild(li);
    });
    const log = $('#changelog');
    log.replaceChildren();
    briefing.changelog.forEach(c => {
      const li = el('li');
      li.appendChild(el('strong', null, `${c.edition} (${fmtDate(c.date)}): `));
      li.appendChild(document.createTextNode(c.changes.join(' ')));
      log.appendChild(li);
    });
    return sec;
  }

  function renderSources(sources, meta) {
    const tbody = $('#sources-body');
    tbody.replaceChildren();
    const rows = Object.entries(sources).sort((a, b) => (b[1].date || '').localeCompare(a[1].date || ''));
    rows.forEach(([id, s]) => {
      const tr = el('tr');
      tr.appendChild(el('td', 'num', fmtDate(s.date)));
      tr.appendChild(el('td', null, s.org));
      const td = el('td'); const a = el('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.title; td.appendChild(a); tr.appendChild(td);
      tr.appendChild(el('td', 'mono', id));
      tbody.appendChild(tr);
    });
    $('#source-count').textContent = rows.length;
    $('#cadence').textContent = meta.cadence;
    const repo = $('#repo-link'); repo.href = meta.repo;
  }

  /* ---------- nav ---------- */
  function initNav() {
    const links = [...document.querySelectorAll('.nav a')];
    const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    targets.forEach(t => io.observe(t));
  }

  /* ---------- boot ---------- */
  async function boot() {
    initTheme();
    initNav();
    try {
      const data = await loadData();
      renderHero(data.meta, data.briefing);
      renderSection(data.overview, data.sources);
      renderSection(data.ai, data.sources);
      renderSection(data.math, data.sources);
      renderBriefing(data.briefing, data.sources);
      renderSources(data.sources, data.meta);
      document.body.classList.add('is-ready');
    } catch (err) {
      const box = $('#load-error');
      box.hidden = false;
      $('#load-error-msg').textContent = err.message + (location.protocol === 'file:' ? ' (opened from disk).' : '.');
      console.error(err);
    }
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
