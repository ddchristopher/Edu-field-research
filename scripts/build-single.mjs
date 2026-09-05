// Bundles index.html + assets + data into a single file.
//   node scripts/build-single.mjs             -> dist/index.html (full document; opens from disk)
//   node scripts/build-single.mjs --artifact  -> dist/artifact.html (page body only, for hosts that wrap it)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const read = p => readFileSync(resolve(root, p), 'utf8');
const artifact = process.argv.includes('--artifact');
const data = {};
for (const f of ['meta', 'sources', 'overview', 'ai', 'math', 'briefing']) data[f] = JSON.parse(read(`data/${f}.json`));
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="assets/styles.css">', () => `<style>\n${read('assets/styles.css')}\n</style>`);
const inline = `<script type="application/json" id="chalkline-data">${JSON.stringify(data).replace(/<\/script/gi, '<\\/script')}</script>`;
html = html.replace('<script src="assets/charts.js"></script>', () => `${inline}\n<script>\n${read('assets/charts.js')}\n</script>`);
html = html.replace('<script src="assets/app.js"></script>', () => `<script>\n${read('assets/app.js')}\n</script>`);
html = html.replace(/href="data\/(\w+)\.json"/g, 'href="https://github.com/ddchristopher/Edu-field-research/blob/HEAD/data/$1.json"');
mkdirSync(resolve(root, 'dist'), { recursive: true });
if (artifact) {
  // Keep only what belongs inside <body>, plus <title>, font link and styles, which the host places for us.
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const keep = [];
  const title = head.match(/<title>[\s\S]*?<\/title>/); if (title) keep.push(title[0]);
  const fonts = head.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/); if (fonts) keep.push(fonts[0]);
  const style = head.match(/<style>[\s\S]*?<\/style>/); if (style) keep.push(style[0]);
  writeFileSync(resolve(root, 'dist/artifact.html'), keep.join('\n') + '\n' + body.trim() + '\n');
  console.log('dist/artifact.html written');
} else {
  writeFileSync(resolve(root, 'dist/index.html'), html);
  console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
}
