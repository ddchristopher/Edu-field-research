/* Chalkline charts: dependency-free SVG charts.
   Kinds: line, multiples, bars, dumbbell, stack.
   Every chart ships a hover/keyboard tooltip and a table view. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const measureCanvas = document.createElement('canvas').getContext('2d');

  function svgEl(tag, attrs, children) {
    const node = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
    if (children) children.forEach(c => c && node.appendChild(c));
    return node;
  }
  function htmlEl(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function textWidth(str, font) {
    measureCanvas.font = font || '12px "Public Sans", system-ui, sans-serif';
    return measureCanvas.measureText(str).width;
  }
  function wrapWords(str, maxWidth, font, maxLines) {
    const words = String(str).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (textWidth(test, font) <= maxWidth || !cur) cur = test;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      const head = lines.slice(0, maxLines - 1);
      head.push(lines.slice(maxLines - 1).join(' '));
      return head;
    }
    return lines;
  }
  function fmt(v, format, unit) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    switch (format) {
      case 'percent': return (Number.isInteger(v) ? v : v.toFixed(1)) + '%';
      case 'currency': return '$' + Math.round(v).toLocaleString('en-US');
      case 'int': return Math.round(v).toLocaleString('en-US');
      case 'float1': return v.toFixed(1);
      case 'M': return v.toFixed(1) + 'M';
      default: {
        const s = Number.isInteger(v) ? v.toLocaleString('en-US') : String(v);
        return unit === '%' ? s + '%' : unit === 'M' ? s + 'M' : s;
      }
    }
  }
  function niceStep(range, targetTicks) {
    const raw = range / Math.max(1, targetTicks);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  }
  function ticksFor(min, max, targetTicks) {
    const step = niceStep(max - min, targetTicks);
    const start = Math.ceil(min / step) * step;
    const out = [];
    for (let t = start; t <= max + 1e-9; t += step) out.push(+t.toFixed(6));
    return out;
  }
  function domainFor(values, given, padFrac) {
    if (given) return given;
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * (padFrac === undefined ? 0.25 : padFrac);
    return [min - pad, max + pad];
  }
  function cssVar(name, el) {
    return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
  }

  /* ---------- tooltip ---------- */
  function makeTip(host) {
    const tip = htmlEl('div', 'chart-tip');
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    host.appendChild(tip);
    return {
      show(x, y, title, rows) {
        tip.replaceChildren();
        if (title) tip.appendChild(htmlEl('div', 'chart-tip-title', title));
        rows.forEach(r => {
          const row = htmlEl('div', 'chart-tip-row');
          if (r.color) { const key = htmlEl('span', 'chart-tip-key'); key.style.background = r.color; row.appendChild(key); }
          row.appendChild(htmlEl('strong', 'chart-tip-value', r.value));
          row.appendChild(htmlEl('span', 'chart-tip-label', r.label));
          tip.appendChild(row);
        });
        tip.hidden = false;
        const hw = host.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = x + 14, top = y - th - 10;
        if (left + tw > hw - 4) left = x - tw - 14;
        if (left < 4) left = 4;
        if (top < 4) top = y + 16;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      },
      hide() { tip.hidden = true; }
    };
  }

  /* ---------- shared scaffolding ---------- */
  function frame(container, height) {
    container.replaceChildren();
    const width = Math.max(240, container.clientWidth || 600);
    const svg = svgEl('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'chart-svg' });
    container.appendChild(svg);
    return { svg, width, height };
  }
  function seriesColor(i, accent, root) {
    if (accent && i === 0) return accent;
    return cssVar(`--series-${i + 1}`, root) || '#2a78d6';
  }

  /* ---------- LINE ---------- */
  function renderLine(container, spec, opts) {
    const root = document.documentElement;
    const { svg, width, height } = frame(container, spec.height || 280);
    const m = { top: 30, right: 16, bottom: 34, left: 46 };
    const endLabelSpace = spec.series.length > 1 ? 88 : 60;
    m.right += endLabelSpace;
    const pw = width - m.left - m.right, ph = height - m.top - m.bottom;
    const n = spec.x.length;
    const allVals = spec.series.flatMap(s => s.values).concat(spec.baseline ? [spec.baseline.value] : []);
    const [y0, y1] = domainFor(allVals, spec.yDomain, 0.3);
    const xAt = i => m.left + (n === 1 ? pw / 2 : (pw * i) / (n - 1));
    const yAt = v => m.top + ph - ((v - y0) / (y1 - y0)) * ph;
    const g = svgEl('g');
    svg.appendChild(g);

    // gridlines + y labels
    ticksFor(y0, y1, 4).forEach(t => {
      g.appendChild(svgEl('line', { x1: m.left, x2: width - m.right, y1: yAt(t), y2: yAt(t), class: 'grid' }));
      g.appendChild(svgEl('text', { x: m.left - 8, y: yAt(t) + 4, 'text-anchor': 'end', class: 'axis-label' }, [document.createTextNode(fmt(t, spec.format, spec.unit))]));
    });
    // x labels
    spec.x.forEach((lab, i) => {
      g.appendChild(svgEl('text', { x: xAt(i), y: height - 10, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'axis-label' }, [document.createTextNode(lab)]));
    });
    // baseline
    if (spec.baseline) {
      const y = yAt(spec.baseline.value);
      g.appendChild(svgEl('line', { x1: m.left, x2: width - m.right, y1: y, y2: y, class: 'baseline' }));
      g.appendChild(svgEl('text', { x: width - m.right, y: y - 6, 'text-anchor': 'end', class: 'annot' }, [document.createTextNode(spec.baseline.label)]));
    }
    // marker (vertical)
    if (spec.marker) {
      const i = spec.x.indexOf(spec.marker.x);
      if (i >= 0) {
        g.appendChild(svgEl('line', { x1: xAt(i), x2: xAt(i), y1: m.top - 8, y2: m.top + ph, class: 'marker' }));
        g.appendChild(svgEl('text', { x: xAt(i) + 5, y: m.top - 12, class: 'annot' }, [document.createTextNode(spec.marker.label)]));
      }
    }
    // series
    const colors = spec.series.map((s, i) => s.color || seriesColor(i, spec.series.length === 1 ? opts.accent : null, root));
    const endLabels = [];
    spec.series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      g.appendChild(svgEl('path', { d, class: 'series-line', stroke: colors[si] }));
      pts.forEach((p, i) => g.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 4, class: 'series-dot', fill: colors[si], 'data-i': i })));
      const last = pts[pts.length - 1];
      endLabels.push({ x: last[0] + 10, y: last[1] + 4, text: fmt(s.values[s.values.length - 1], spec.format, spec.unit) + (spec.series.length > 1 ? ' ' + s.name : ''), color: colors[si] });
    });
    // de-collide end labels
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) if (endLabels[i].y - endLabels[i - 1].y < 15) endLabels[i].y = endLabels[i - 1].y + 15;
    endLabels.forEach(l => g.appendChild(svgEl('text', { x: l.x, y: l.y, class: 'end-label' }, [document.createTextNode(l.text)])));

    // interaction
    const tip = makeTip(container);
    const cross = svgEl('line', { class: 'crosshair', y1: m.top, y2: m.top + ph, visibility: 'hidden' });
    g.appendChild(cross);
    const hit = svgEl('rect', { x: m.left - 10, y: 0, width: pw + 20, height, fill: 'transparent' });
    g.appendChild(hit);
    let focusIdx = -1;
    function showAt(i, clientX) {
      focusIdx = i;
      cross.setAttribute('x1', xAt(i)); cross.setAttribute('x2', xAt(i)); cross.setAttribute('visibility', 'visible');
      svg.querySelectorAll('.series-dot').forEach(d => d.classList.toggle('is-active', +d.getAttribute('data-i') === i));
      const rows = spec.series.map((s, si) => ({ value: fmt(s.values[i], spec.format, spec.unit), label: s.name, color: colors[si] }));
      const rect = container.getBoundingClientRect();
      const px = clientX !== undefined ? clientX - rect.left : xAt(i);
      tip.show(px, m.top + ph / 2, spec.x[i], rows);
    }
    function hide() { focusIdx = -1; cross.setAttribute('visibility', 'hidden'); tip.hide(); svg.querySelectorAll('.series-dot.is-active').forEach(d => d.classList.remove('is-active')); }
    hit.addEventListener('pointermove', e => {
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = Math.abs(xAt(i) - x); if (d < bd) { bd = d; best = i; } }
      showAt(best, e.clientX);
    });
    hit.addEventListener('pointerleave', hide);
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${spec.title}. ${spec.subtitle || ''} Use arrow keys to read values.`);
    svg.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); showAt(Math.min(n - 1, focusIdx < 0 ? 0 : focusIdx + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(Math.max(0, focusIdx < 0 ? n - 1 : focusIdx - 1)); }
      else if (e.key === 'Escape') hide();
    });
    svg.addEventListener('blur', hide);
    return { colors };
  }

  /* ---------- SMALL MULTIPLES ---------- */
  function renderMultiples(container, spec, opts) {
    container.replaceChildren();
    const grid = htmlEl('div', 'multiples');
    container.appendChild(grid);
    spec.panels.forEach(panel => {
      const cell = htmlEl('div', 'multiple');
      cell.appendChild(htmlEl('h4', 'multiple-title', panel.name));
      const body = htmlEl('div', 'chart-body');
      cell.appendChild(body);
      grid.appendChild(cell);
      const sub = { title: `${spec.title}: ${panel.name}`, x: spec.x, unit: spec.unit, format: spec.format, marker: spec.marker, height: 170, series: [{ name: panel.name, values: panel.values }] };
      renderLine(body, sub, opts);
    });
  }

  /* ---------- HORIZONTAL BARS ---------- */
  function renderBars(container, spec, opts) {
    const root = document.documentElement;
    const font = '12.5px "Public Sans", system-ui, sans-serif';
    const width0 = Math.max(240, container.clientWidth || 600);
    const labelMax = Math.min(260, Math.max(110, Math.round(width0 * 0.38)));
    const rows = spec.items.map(it => ({ ...it, lines: wrapWords(it.label, labelMax, font, 3) }));
    const rowH = r => Math.max(30, r.lines.length * 15 + 12);
    const heights = rows.map(rowH);
    const m = { top: spec.reference ? 26 : 10, right: 58, bottom: 26, left: Math.min(labelMax, Math.max(...rows.map(r => Math.max(...r.lines.map(l => textWidth(l, font)))))) + 14 };
    const height = m.top + heights.reduce((a, b) => a + b, 0) + m.bottom;
    const { svg, width } = frame(container, height);
    const pw = width - m.left - m.right;
    const vals = spec.items.map(i => i.value);
    const max = spec.xDomain ? spec.xDomain[1] : Math.max(...vals, spec.reference ? spec.reference.value : 0) * 1.08;
    const xAt = v => m.left + (v / max) * pw;
    const g = svgEl('g');
    svg.appendChild(g);
    ticksFor(0, max, 4).forEach(t => {
      g.appendChild(svgEl('line', { x1: xAt(t), x2: xAt(t), y1: m.top, y2: height - m.bottom, class: 'grid' }));
      g.appendChild(svgEl('text', { x: xAt(t), y: height - 8, 'text-anchor': 'middle', class: 'axis-label' }, [document.createTextNode(fmt(t, spec.format, spec.unit))]));
    });
    g.appendChild(svgEl('line', { x1: m.left, x2: m.left, y1: m.top, y2: height - m.bottom, class: 'axis' }));
    const groups = [...new Set(spec.items.map(i => i.group).filter(Boolean))];
    const colorFor = it => it.color || (it.group ? seriesColor(groups.indexOf(it.group), groups.indexOf(it.group) === 0 ? opts.accent : null, root) : (opts.accent || seriesColor(0, null, root)));
    const tip = makeTip(container);
    let y = m.top;
    const barH = 18;
    rows.forEach((r, idx) => {
      const h = heights[idx];
      const cy = y + h / 2;
      r.lines.forEach((line, li) => {
        const ly = cy + (li - (r.lines.length - 1) / 2) * 15 + 4;
        g.appendChild(svgEl('text', { x: m.left - 10, y: ly, 'text-anchor': 'end', class: 'cat-label' }, [document.createTextNode(line)]));
      });
      const x1 = xAt(r.value), rad = 4;
      const top = cy - barH / 2, bot = cy + barH / 2;
      const d = `M${m.left} ${top} H${Math.max(m.left, x1 - rad)} Q${x1} ${top} ${x1} ${top + rad} V${bot - rad} Q${x1} ${bot} ${Math.max(m.left, x1 - rad)} ${bot} H${m.left} Z`;
      const bar = svgEl('path', { d, fill: colorFor(r), class: 'bar' });
      g.appendChild(bar);
      g.appendChild(svgEl('text', { x: x1 + 8, y: cy + 4, class: 'value-label' }, [document.createTextNode(r.display || fmt(r.value, spec.format, spec.unit))]));
      const hitRect = svgEl('rect', { x: 0, y, width, height: h, fill: 'transparent', class: 'bar-hit', tabindex: '0', role: 'img', 'aria-label': `${r.label}: ${r.display || fmt(r.value, spec.format, spec.unit)}` });
      g.appendChild(hitRect);
      const show = (clientX, clientY) => {
        bar.classList.add('is-active');
        const rect = container.getBoundingClientRect();
        const rowsTip = [{ value: r.display || fmt(r.value, spec.format, spec.unit), label: r.group || spec.unit || '', color: colorFor(r) }];
        if (r.source && opts.sources && opts.sources[r.source]) rowsTip.push({ value: '', label: 'Source: ' + opts.sources[r.source].org });
        tip.show(clientX !== undefined ? clientX - rect.left : x1, clientY !== undefined ? clientY - rect.top : cy, r.label, rowsTip);
      };
      const hide = () => { bar.classList.remove('is-active'); tip.hide(); };
      hitRect.addEventListener('pointermove', e => show(e.clientX, e.clientY));
      hitRect.addEventListener('pointerleave', hide);
      hitRect.addEventListener('focus', () => show());
      hitRect.addEventListener('blur', hide);
      y += h;
    });
    if (spec.reference) {
      const rx = xAt(spec.reference.value);
      g.appendChild(svgEl('line', { x1: rx, x2: rx, y1: m.top - 4, y2: height - m.bottom, class: 'baseline' }));
      g.appendChild(svgEl('text', { x: rx, y: m.top - 10, 'text-anchor': 'middle', class: 'annot' }, [document.createTextNode(`${spec.reference.label} ${fmt(spec.reference.value, spec.format, spec.unit)}`)]));
    }
    return { legend: groups.map((gname, i) => ({ name: gname, color: seriesColor(i, i === 0 ? opts.accent : null, root), shape: 'rect' })) };
  }

  /* ---------- DUMBBELL ---------- */
  function renderDumbbell(container, spec, opts) {
    const root = document.documentElement;
    const font = '12.5px "Public Sans", system-ui, sans-serif';
    const rowH = 36;
    const m = { top: 14, right: 40, bottom: 28, left: Math.max(...spec.items.map(i => textWidth(i.label, font))) + 16 };
    const height = m.top + spec.items.length * rowH + m.bottom;
    const { svg, width } = frame(container, height);
    const pw = width - m.left - m.right;
    const all = spec.items.flatMap(i => [i.a, i.b]);
    const [x0, x1] = spec.xDomain || domainFor(all, null, 0.15);
    const xAt = v => m.left + ((v - x0) / (x1 - x0)) * pw;
    const g = svgEl('g');
    svg.appendChild(g);
    ticksFor(x0, x1, 5).forEach(t => {
      g.appendChild(svgEl('line', { x1: xAt(t), x2: xAt(t), y1: m.top, y2: height - m.bottom, class: 'grid' }));
      g.appendChild(svgEl('text', { x: xAt(t), y: height - 8, 'text-anchor': 'middle', class: 'axis-label' }, [document.createTextNode(fmt(t, spec.format, spec.unit))]));
    });
    const accent = opts.accent || seriesColor(0, null, root);
    const before = cssVar('--dumbbell-before', root) || '#b9c0cc';
    const tip = makeTip(container);
    spec.items.forEach((it, i) => {
      const cy = m.top + i * rowH + rowH / 2;
      g.appendChild(svgEl('text', { x: m.left - 12, y: cy + 4, 'text-anchor': 'end', class: 'cat-label' }, [document.createTextNode(it.label)]));
      const xa = xAt(it.a), xb = xAt(it.b);
      g.appendChild(svgEl('line', { x1: xa, x2: xb, y1: cy, y2: cy, class: 'dumbbell-line' }));
      g.appendChild(svgEl('circle', { cx: xa, cy, r: 5, fill: before, class: 'series-dot' }));
      g.appendChild(svgEl('circle', { cx: xb, cy, r: 5, fill: accent, class: 'series-dot' }));
      // Label each end by role: the "before" value is muted, the current value is bold, whichever side it lands on.
      const aLeft = xa <= xb;
      g.appendChild(svgEl('text', { x: aLeft ? xa - 9 : xa + 9, y: cy + 4, 'text-anchor': aLeft ? 'end' : 'start', class: 'value-label muted' }, [document.createTextNode(fmt(it.a, spec.format, spec.unit))]));
      g.appendChild(svgEl('text', { x: aLeft ? xb + 9 : xb - 9, y: cy + 4, 'text-anchor': aLeft ? 'start' : 'end', class: 'value-label' }, [document.createTextNode(fmt(it.b, spec.format, spec.unit))]));
      const delta = it.b - it.a;
      const hit = svgEl('rect', { x: 0, y: cy - rowH / 2, width, height: rowH, fill: 'transparent', class: 'bar-hit', tabindex: '0', role: 'img', 'aria-label': `${it.label}: ${spec.aLabel} ${it.a}, ${spec.bLabel} ${it.b}, change ${delta > 0 ? '+' : ''}${delta}` });
      g.appendChild(hit);
      const show = (cx, cyc) => {
        const rect = container.getBoundingClientRect();
        tip.show(cx !== undefined ? cx - rect.left : xb, cyc !== undefined ? cyc - rect.top : cy, it.label, [
          { value: fmt(it.a, spec.format, spec.unit), label: spec.aLabel, color: before },
          { value: fmt(it.b, spec.format, spec.unit), label: spec.bLabel, color: accent },
          { value: (delta > 0 ? '+' : '') + fmt(delta, spec.format, spec.unit), label: 'change' }
        ]);
      };
      hit.addEventListener('pointermove', e => show(e.clientX, e.clientY));
      hit.addEventListener('pointerleave', () => tip.hide());
      hit.addEventListener('focus', () => show());
      hit.addEventListener('blur', () => tip.hide());
    });
    return { legend: [{ name: spec.aLabel, color: before, shape: 'dot' }, { name: spec.bLabel, color: accent, shape: 'dot' }] };
  }

  /* ---------- 100% STACK ---------- */
  function renderStack(container, spec, opts) {
    const root = document.documentElement;
    const height = 44;
    const { svg, width } = frame(container, height);
    const total = spec.segments.reduce((a, s) => a + s.value, 0);
    const ramp = ['--ramp-4', '--ramp-3', '--ramp-2', '--ramp-1'].map(v => cssVar(v, root));
    const ctx = cssVar('--ctx', root);
    const ordered = spec.segments.filter(s => !s.neutral);
    const colorFor = (s, i) => s.neutral ? ctx : ramp[Math.min(ramp.length - 1, Math.round((i / Math.max(1, ordered.length - 1)) * (ramp.length - 1)))];
    const gap = 2, barH = 28, y = 8;
    let x = 0;
    const tip = makeTip(container);
    const legend = [];
    spec.segments.forEach((s, i) => {
      const w = (s.value / total) * (width - gap * (spec.segments.length - 1));
      const color = colorFor(s, i);
      const rect = svgEl('rect', { x, y, width: Math.max(0, w), height: barH, fill: color, rx: i === 0 || i === spec.segments.length - 1 ? 4 : 0, class: 'bar' });
      svg.appendChild(rect);
      const label = fmt(s.value, spec.format, spec.unit);
      if (w >= textWidth(label, '600 12px "Public Sans"') + 16) {
        svg.appendChild(svgEl('text', { x: x + w / 2, y: y + barH / 2 + 4, 'text-anchor': 'middle', class: 'in-bar-label', fill: s.neutral ? cssVar('--ink', root) : '#ffffff' }, [document.createTextNode(label)]));
      }
      const hit = svgEl('rect', { x, y: 0, width: Math.max(0, w), height, fill: 'transparent', class: 'bar-hit', tabindex: '0', role: 'img', 'aria-label': `${s.label}: ${label}` });
      svg.appendChild(hit);
      const show = (cx, cy) => { const r = container.getBoundingClientRect(); rect.classList.add('is-active'); tip.show(cx !== undefined ? cx - r.left : x + w / 2, cy !== undefined ? cy - r.top : y, s.label, [{ value: label, label: 'of teens', color }]); };
      const hide = () => { rect.classList.remove('is-active'); tip.hide(); };
      hit.addEventListener('pointermove', e => show(e.clientX, e.clientY));
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => show());
      hit.addEventListener('blur', hide);
      legend.push({ name: `${s.label}`, value: label, color, shape: 'rect' });
      x += w + gap;
    });
    return { legend };
  }

  /* ---------- table view ---------- */
  function buildTable(spec) {
    const table = htmlEl('table', 'data-table');
    const thead = htmlEl('thead'), tbody = htmlEl('tbody');
    const tr = htmlEl('tr');
    const addTh = t => tr.appendChild(htmlEl('th', null, t));
    if (spec.kind === 'line' || spec.kind === 'multiples') {
      const series = spec.kind === 'line' ? spec.series : spec.panels.map(p => ({ name: p.name, values: p.values }));
      addTh('Year');
      series.forEach(s => addTh(s.name));
      thead.appendChild(tr);
      spec.x.forEach((xl, i) => {
        const row = htmlEl('tr');
        row.appendChild(htmlEl('th', null, xl));
        series.forEach(s => row.appendChild(htmlEl('td', 'num', fmt(s.values[i], spec.format, spec.unit))));
        tbody.appendChild(row);
      });
    } else if (spec.kind === 'bars') {
      addTh('Category'); if (spec.items.some(i => i.group)) addTh('Series'); addTh('Value');
      thead.appendChild(tr);
      spec.items.forEach(it => {
        const row = htmlEl('tr');
        row.appendChild(htmlEl('th', null, it.label));
        if (spec.items.some(i => i.group)) row.appendChild(htmlEl('td', null, it.group || ''));
        row.appendChild(htmlEl('td', 'num', it.display || fmt(it.value, spec.format, spec.unit)));
        tbody.appendChild(row);
      });
    } else if (spec.kind === 'dumbbell') {
      addTh('Category'); addTh(spec.aLabel); addTh(spec.bLabel); addTh('Change');
      thead.appendChild(tr);
      spec.items.forEach(it => {
        const row = htmlEl('tr');
        row.appendChild(htmlEl('th', null, it.label));
        row.appendChild(htmlEl('td', 'num', fmt(it.a, spec.format, spec.unit)));
        row.appendChild(htmlEl('td', 'num', fmt(it.b, spec.format, spec.unit)));
        const d = it.b - it.a;
        row.appendChild(htmlEl('td', 'num', (d > 0 ? '+' : '') + fmt(d, spec.format, spec.unit)));
        tbody.appendChild(row);
      });
    } else if (spec.kind === 'stack') {
      addTh('Segment'); addTh('Share');
      thead.appendChild(tr);
      spec.segments.forEach(s => {
        const row = htmlEl('tr');
        row.appendChild(htmlEl('th', null, s.label));
        row.appendChild(htmlEl('td', 'num', fmt(s.value, spec.format, spec.unit)));
        tbody.appendChild(row);
      });
    }
    table.appendChild(thead); table.appendChild(tbody);
    return table;
  }

  /* ---------- SPARKLINE (stat tiles) ---------- */
  function sparkline(container, spark, accent) {
    const root = document.documentElement;
    container.replaceChildren();
    const w = 84, h = 30, pad = 4;
    const vals = spark.values;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || 1;
    const xAt = i => pad + (i / (vals.length - 1)) * (w - pad * 2);
    const yAt = v => h - pad - ((v - min) / span) * (h - pad * 2);
    const svg = svgEl('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: 'spark', role: 'img', 'aria-label': `${spark.label || 'Trend'}: ${spark.x[0]} ${vals[0]} to ${spark.x[vals.length - 1]} ${vals[vals.length - 1]}` });
    const d = vals.map((v, i) => (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1)).join(' ');
    svg.appendChild(svgEl('path', { d, class: 'spark-line', stroke: cssVar('--ctx', root) }));
    const li = vals.length - 1;
    svg.appendChild(svgEl('circle', { cx: xAt(li), cy: yAt(vals[li]), r: 3, fill: accent || cssVar('--accent', root), class: 'spark-dot' }));
    const title = svgEl('title');
    title.textContent = `${spark.x[0]}: ${vals[0]} → ${spark.x[li]}: ${vals[li]}`;
    svg.appendChild(title);
    container.appendChild(svg);
  }

  const renderers = { line: renderLine, multiples: renderMultiples, bars: renderBars, dumbbell: renderDumbbell, stack: renderStack };

  /* Mount: renders, attaches legend/table, and re-renders on resize + theme change. */
  function mount(container, spec, opts) {
    opts = opts || {};
    const body = htmlEl('div', 'chart-body');
    const legendHost = htmlEl('div', 'chart-legend');
    container.appendChild(legendHost);
    container.appendChild(body);
    let lastWidth = 0;
    function draw() {
      const result = renderers[spec.kind](body, spec, opts) || {};
      legendHost.replaceChildren();
      const legendItems = result.legend || (spec.kind === 'line' && spec.series.length > 1 ? spec.series.map((s, i) => ({ name: s.name, color: result.colors ? result.colors[i] : seriesColor(i), shape: 'line' })) : []);
      legendItems.forEach(item => {
        const li = htmlEl('span', 'legend-item');
        const sw = htmlEl('span', 'legend-swatch ' + (item.shape || 'rect'));
        sw.style.background = item.color;
        li.appendChild(sw);
        li.appendChild(htmlEl('span', null, item.value ? `${item.name} ${item.value}` : item.name));
        legendHost.appendChild(li);
      });
      legendHost.hidden = legendItems.length === 0;
    }
    draw();
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w && Math.abs(w - lastWidth) > 4) { lastWidth = w; draw(); }
    });
    ro.observe(body);
    document.addEventListener('chalkline:theme', draw);
    return { redraw: draw, table: () => buildTable(spec) };
  }

  window.ChalklineCharts = { mount, buildTable, fmt, sparkline };
})();
