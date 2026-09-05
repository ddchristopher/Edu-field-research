// Bundles index.html + assets + data into dist/index.html (works from disk, no server).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(new URL('..', import.meta.url).pathname);
const read = p => readFileSync(resolve(root, p), 'utf8');
const data = {};
for (const f of ['meta', 'sources', 'overview', 'ai', 'math', 'briefing']) data[f] = JSON.parse(read(`data/${f}.json`));
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="assets/styles.css">', () => `<style>\n${read('assets/styles.css')}\n</style>`);
const inline = `<script type="application/json" id="chalkline-data">${JSON.stringify(data).replace(/<\/script/gi, '<\\/script')}</script>`;
html = html.replace('<script src="assets/charts.js"></script>', () => `${inline}\n<script>\n${read('assets/charts.js')}\n</script>`);
html = html.replace('<script src="assets/app.js"></script>', () => `<script>\n${read('assets/app.js')}\n</script>`);
html = html.replace(/href="data\/(\w+)\.json"/g, 'href="https://github.com/ddchristopher/Edu-field-research/blob/main/data/$1.json"');
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/index.html'), html);
console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
