// Validates data/*.json: structure, source references, series lengths, dates.
// Usage: node scripts/validate-data.mjs [--links]   (--links also HEAD-checks every source URL)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = f => JSON.parse(readFileSync(resolve(root, 'data', f), 'utf8'));
const problems = [];
const warn = m => problems.push('WARN ' + m);
const fail = m => problems.push('FAIL ' + m);

const sources = read('sources.json');
const meta = read('meta.json');
const briefing = read('briefing.json');
const sections = ['overview.json', 'ai.json', 'math.json'].map(read);
const usedSources = new Set();
const isoDate = /^\d{4}-\d{2}(-\d{2})?$/;

// sources
for (const [id, s] of Object.entries(sources)) {
  for (const k of ['org', 'title', 'date', 'url']) if (!s[k]) fail(`sources.${id} missing ${k}`);
  if (s.date && !isoDate.test(s.date)) fail(`sources.${id} date not ISO: ${s.date}`);
  if (s.url && !/^https?:\/\//.test(s.url)) fail(`sources.${id} url not http(s): ${s.url}`);
}
function checkSource(ref, where) {
  const ids = Array.isArray(ref) ? ref : ref ? [ref] : [];
  if (!ids.length) return fail(`${where}: missing source`);
  ids.forEach(id => { usedSources.add(id); if (!sources[id]) fail(`${where}: unknown source id '${id}'`); });
}
function checkStat(s, where) {
  for (const k of ['label', 'display', 'source']) if (!s[k]) fail(`${where}: stat missing ${k}`);
  if (s.value !== undefined && typeof s.value !== 'number') fail(`${where}: stat.value must be a number`);
  if (s.delta && !['good', 'bad', 'neutral'].includes(s.delta.sentiment || 'neutral')) fail(`${where}: bad delta sentiment`);
  checkSource(s.source, where);
}
function checkChart(c, where) {
  for (const k of ['kind', 'title', 'source']) if (!c[k]) fail(`${where}: chart missing ${k}`);
  checkSource(c.source, where);
  if (c.kind === 'line') {
    if (!Array.isArray(c.x) || !Array.isArray(c.series)) return fail(`${where}: line needs x and series`);
    c.series.forEach(s => { if (s.values.length !== c.x.length) fail(`${where}: series '${s.name}' has ${s.values.length} values for ${c.x.length} x labels`); if (!s.values.every(v => typeof v === 'number')) fail(`${where}: non-numeric value in '${s.name}'`); });
    if (c.yDomain) c.series.forEach(s => s.values.forEach(v => { if (v < c.yDomain[0] || v > c.yDomain[1]) fail(`${where}: value ${v} outside yDomain`); }));
  } else if (c.kind === 'multiples') {
    c.panels.forEach(p => { if (p.values.length !== c.x.length) fail(`${where}: panel '${p.name}' length mismatch`); });
  } else if (c.kind === 'bars') {
    c.items.forEach(i => { if (typeof i.value !== 'number') fail(`${where}: bar '${i.label}' value not numeric`); if (i.source) checkSource(i.source, where + '/' + i.label); });
  } else if (c.kind === 'dumbbell') {
    c.items.forEach(i => { if (typeof i.a !== 'number' || typeof i.b !== 'number') fail(`${where}: dumbbell '${i.label}' needs numeric a and b`); });
  } else if (c.kind === 'stack') {
    const total = c.segments.reduce((a, s) => a + s.value, 0);
    if (Math.abs(total - 100) > 1.5) warn(`${where}: stack segments total ${total}, expected ~100`);
  } else fail(`${where}: unknown chart kind '${c.kind}'`);
}
for (const sec of sections) {
  const where = `${sec.section}`;
  for (const k of ['section', 'title', 'lede', 'kpis', 'blocks']) if (!sec[k]) fail(`${where}: missing ${k}`);
  sec.kpis.forEach((k, i) => checkStat(k, `${where}.kpis[${i}]`));
  if (sec.kpis.length !== 6) warn(`${where}: ${sec.kpis.length} KPI tiles (layout expects 6)`);
  sec.blocks.forEach((b, i) => {
    const bw = `${where}.blocks[${i}]`;
    if (!['sm', 'md', 'lg', 'full'].includes(b.size)) fail(`${bw}: bad size '${b.size}'`);
    if (b.type === 'chart') checkChart(b.chart, bw);
    else if (b.type === 'stats') b.items.forEach((s, j) => checkStat(s, `${bw}.items[${j}]`));
    else if (b.type === 'findings') b.items.forEach((f, j) => { if (!f.headline || !f.detail) fail(`${bw}.items[${j}]: finding needs headline and detail`); checkSource(f.source, `${bw}.items[${j}]`); });
    else if (b.type === 'chips') b.items.forEach((c, j) => { if (!c.label || !c.display) fail(`${bw}.items[${j}]: chip needs label and display`); checkSource(c.source, `${bw}.items[${j}]`); });
    else if (b.type === 'table') b.rows.forEach((r, j) => { if (r.cells.length !== b.columns.length) fail(`${bw}.rows[${j}]: ${r.cells.length} cells for ${b.columns.length} columns`); checkSource(r.source, `${bw}.rows[${j}]`); });
    else fail(`${bw}: unknown block type '${b.type}'`);
  });
  // row fill check: sizes should sum to multiples of 6 in sequence
  const span = { sm: 2, md: 3, lg: 4, full: 6 };
  let acc = 0;
  sec.blocks.forEach(b => { acc += span[b.size] || 0; if (acc > 6) { warn(`${where}: block '${b.id || b.title}' breaks a 6-column row`); acc = span[b.size]; } if (acc === 6) acc = 0; });
  if (acc !== 0) warn(`${where}: last row is not full (${acc}/6 columns)`);
}
// briefing + meta
for (const k of ['edition', 'generated', 'summary', 'items', 'upcoming', 'changelog']) if (!briefing[k]) fail(`briefing missing ${k}`);
briefing.items.forEach((it, i) => { for (const k of ['date', 'tag', 'headline', 'detail']) if (!it[k]) fail(`briefing.items[${i}] missing ${k}`); if (!isoDate.test(it.date)) fail(`briefing.items[${i}] bad date`); if (!['AI', 'Math', 'Data', 'Policy'].includes(it.tag)) fail(`briefing.items[${i}] unknown tag ${it.tag}`); checkSource(it.source, `briefing.items[${i}]`); });
const dates = briefing.items.map(i => i.date);
if (dates.some((d, i) => i && d > dates[i - 1])) warn('briefing.items are not sorted newest first');
briefing.upcoming.forEach((u, i) => { for (const k of ['date', 'what', 'why']) if (!u[k]) fail(`briefing.upcoming[${i}] missing ${k}`); if (u.source) checkSource(u.source, `briefing.upcoming[${i}]`); });
for (const k of ['name', 'tagline', 'edition', 'generatedAt', 'nextScheduledRun', 'cadence', 'repo']) if (!meta[k]) fail(`meta missing ${k}`);
if (meta.edition !== briefing.edition) fail(`meta.edition (${meta.edition}) != briefing.edition (${briefing.edition})`);
for (const id of Object.keys(sources)) if (!usedSources.has(id)) warn(`source '${id}' is never cited`);

if (process.argv.includes('--links')) {
  const results = await Promise.all(Object.entries(sources).map(async ([id, s]) => {
    try { const r = await fetch(s.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) }); return [id, r.status]; }
    catch (e) { return [id, 'ERR ' + e.message]; }
  }));
  results.forEach(([id, st]) => { if (st !== 200) warn(`link ${id}: ${st}`); });
}

const fails = problems.filter(p => p.startsWith('FAIL')).length;
problems.forEach(p => console.log(p));
console.log(`\n${fails} failure(s), ${problems.length - fails} warning(s). Sources cited: ${usedSources.size}/${Object.keys(sources).length}.`);
process.exit(fails ? 1 : 0);
