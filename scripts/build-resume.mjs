import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const theme = 'jsonresume-theme-even';

const locales = [
  { id: 'ru', json: 'resume.ru.json', pdf: 'Matvey_Sizov_CV.pdf' },
  { id: 'en', json: 'resume.en.json', pdf: 'Matvey_Sizov_CV.pdf' },
];

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
}

// Toolbar: PDF download + language switcher (injected into each resume page)
function makeToolbar(langId, pdfName) {
  const other = langId === 'ru' ? 'en' : 'ru';
  return `
<div id="resume-toolbar">
  <a href="${pdfName}" download class="toolbar-btn">${langId === 'ru' ? 'Скачать PDF' : 'Download PDF'}</a>
  <span class="toolbar-divider">|</span>
  <a href="../ru/" class="toolbar-lang${langId === 'ru' ? ' active' : ''}">RU</a>
  <a href="../en/" class="toolbar-lang${langId === 'en' ? ' active' : ''}">EN</a>
</div>
<style>
#resume-toolbar{position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:.5em 1em;padding:.5em 1em;background:var(--color-dimmed);border-bottom:1px solid var(--color-secondary);box-shadow:0 2px 8px rgba(0,0,0,.1)}#resume-toolbar .toolbar-btn{color:var(--color-accent);text-decoration:none;font-weight:600}#resume-toolbar .toolbar-btn:hover{text-decoration:underline}#resume-toolbar .toolbar-divider{color:var(--color-secondary);font-weight:300}#resume-toolbar .toolbar-lang{color:var(--color-accent);text-decoration:none;padding:.2em .5em;border-radius:.2em}#resume-toolbar .toolbar-lang:hover{background:rgba(0,0,0,.05)}#resume-toolbar .toolbar-lang.active{font-weight:700;color:var(--color-primary);background:rgba(0,0,0,.08);pointer-events:none}body{padding-top:3rem}@media print{#resume-toolbar{display:none}body{padding-top:0}}
</style>
`;
}

// Ensure output dirs exist
for (const { id } of locales) {
  mkdirSync(join(root, 'docs', 'resume', id), { recursive: true });
}

// Render HTML and PDF per locale (PDF may fail locally without Chrome; works in CI)
for (const { id, json, pdf } of locales) {
  const input = join(root, 'resume', json);
  const outDir = join(root, 'docs', 'resume', id);
  run(`npx resumed render "${input}" -t ${theme} -o "${join(outDir, 'index.html')}"`);
  try {
    run(`npx resumed export "${input}" -t ${theme} -o "${join(outDir, pdf)}"`);
  } catch (e) {
    console.warn(`PDF export failed for ${id} (Chrome/Puppeteer may be unavailable):`, e.message);
  }
  // Inject toolbar with PDF download + language switcher
  const htmlPath = join(outDir, 'index.html');
  let html = readFileSync(htmlPath, 'utf8');
  html = html.replace('</body>', makeToolbar(id, pdf) + '\n</body>');
  writeFileSync(htmlPath, html);
}

// Landing page: robust language detection (navigator.languages preferred, then fallbacks)
const landing = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume — Matvey Sizov</title>
  <script>
    (function () {
      var lang = (navigator.languages && navigator.languages[0] || navigator.language || navigator.userLanguage || '').toLowerCase();
      var isRu = lang.indexOf('ru') === 0;
      var path = isRu ? 'ru' : 'en';
      window.location.replace('./' + path + '/');
    })();
  </script>
</head>
<body>
  <noscript>
    <p>Resume (choose language):</p>
    <ul>
      <li><a href="./ru/">RU (HTML)</a> — <a href="./ru/Matvey_Sizov_CV.pdf">PDF</a></li>
      <li><a href="./en/">EN (HTML)</a> — <a href="./en/Matvey_Sizov_CV.pdf">PDF</a></li>
    </ul>
  </noscript>
</body>
</html>
`;

writeFileSync(join(root, 'docs', 'resume', 'index.html'), landing);
console.log('Resume build done: docs/resume/{ru,en}/');
console.log('Landing: docs/resume/index.html');
