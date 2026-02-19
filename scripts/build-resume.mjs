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

// Toolbar: PDF download (pre-generated or client-side fallback) + language switcher
function makeToolbar(langId, pdfName) {
  const btnText = langId === 'ru' ? 'Скачать PDF' : 'Download PDF';
  return `
<div id="resume-toolbar">
  <button type="button" id="pdf-download-btn" class="toolbar-btn" data-pdf="${pdfName}">${btnText}</button>
  <span class="toolbar-divider">|</span>
  <a href="../ru/" class="toolbar-lang${langId === 'ru' ? ' active' : ''}">RU</a>
  <a href="../en/" class="toolbar-lang${langId === 'en' ? ' active' : ''}">EN</a>
</div>
<script>
(function(){
  var btn=document.getElementById('pdf-download-btn');
  if(!btn)return;
  btn.addEventListener('click',function(){
    var pdfUrl=btn.dataset.pdf;
    fetch(pdfUrl).then(function(r){
      if(r.ok&&r.headers.get('content-type')&&r.headers.get('content-type').toLowerCase().includes('pdf')){
        return r.blob().then(function(blob){
          var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=pdfUrl;a.click();URL.revokeObjectURL(a.href);
        });
      }
      throw new Error('not pdf');
    }).catch(function(){
      var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';s.onload=function(){
        var toolbar=document.getElementById('resume-toolbar');var oldDisplay,oldPad;if(toolbar){oldDisplay=toolbar.style.display;toolbar.style.display='none'}oldPad=document.body.style.paddingTop;document.body.style.paddingTop='0';
        var opt={margin:15,filename:pdfUrl,html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
        html2pdf().set(opt).from(document.body).save().then(function(){if(toolbar)toolbar.style.display=oldDisplay;document.body.style.paddingTop=oldPad;btn.disabled=false;btn.textContent='${btnText}';});
      };document.head.appendChild(s);
      btn.disabled=true;btn.textContent='${langId === 'ru' ? 'Генерация…' : 'Generating…'}';
    });
  });
})();
</script>
<style>
#resume-toolbar{position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:.5em 1em;padding:.5em 1em;background:var(--color-dimmed);border-bottom:1px solid var(--color-secondary);box-shadow:0 2px 8px rgba(0,0,0,.1)}#resume-toolbar .toolbar-btn{background:none;border:none;cursor:pointer;color:var(--color-accent);font:inherit;font-weight:600;padding:0}#resume-toolbar .toolbar-btn:hover{text-decoration:underline}#resume-toolbar .toolbar-btn:disabled{opacity:.7;cursor:wait}#resume-toolbar .toolbar-divider{color:var(--color-secondary);font-weight:300}#resume-toolbar .toolbar-lang{color:var(--color-accent);text-decoration:none;padding:.2em .5em;border-radius:.2em}#resume-toolbar .toolbar-lang:hover{background:rgba(0,0,0,.05)}#resume-toolbar .toolbar-lang.active{font-weight:700;color:var(--color-primary);background:rgba(0,0,0,.08);pointer-events:none}body{padding-top:3rem}@media print{#resume-toolbar{display:none}body{padding-top:0}}
</style>
`;
}

// Ensure output dirs exist
for (const { id } of locales) {
  mkdirSync(join(root, 'docs', 'resume', id), { recursive: true });
}

// Force light theme only: same layout for HTML and PDF, white background
function patchLightTheme(html) {
  return html
    .replace(/color-scheme:light dark/g, 'color-scheme:light')
    .replace(
      /@media \(prefers-color-scheme: dark\)\{:root\{[^}]+\}\}/g,
      '/* dark theme disabled */',
    )
    .replace('--color-dimmed-light: #f3f4f5', '--color-dimmed-light: #ffffff');
}

// Layout patch: page margins for PDF/print, narrow sidebar + full-width content, visual emphasis
const LAYOUT_CSS = `
/* Skills: visible gray boxes for each tag */
.tag-list{display:flex;flex-wrap:wrap;gap:.35em .5em}
.tag-list>li{background:#e5e7eb;color:var(--color-primary);border-radius:.2em;padding:.25em .55em;font-size:.9em;list-style:none}
/* Emphasize key info: summary, companies, positions */
.masthead article p{border-left:3px solid var(--color-accent);padding-left:1em;font-size:1.05em;line-height:1.55;color:var(--color-primary)}
.meta strong{font-weight:700;color:var(--color-primary)}
article header h4{font-weight:600}
/* Masthead: FIO, title, socials (horizontal when fit), summary — centered */
.masthead{display:flex;flex-direction:column;align-items:center;text-align:center}
.masthead>div:first-child{order:1}
.masthead .icon-list{order:2;flex-direction:row!important;flex-wrap:wrap;justify-content:center;margin:.5em 0}
.masthead>article{order:3;text-align:left;align-self:stretch}
/* Print: sidebar wide enough for full text (Work, Education, Skills) */
@media print{
  @page{size:A4;margin:12mm}
  body{max-width:none!important;margin:0!important;padding:0!important;width:100%;gap:0}
  body{grid-template-columns:[full-start] 0 [main-start side-start] minmax(6.5em,7em) [side-end content-start] minmax(0,1fr) [main-end content-end] 0 [full-end]!important}
  body{column-gap:1em}
  body>*{min-width:0}
  h3{font-size:var(--scale2)!important;padding-right:.5em;white-space:normal;line-height:1.25;grid-column:side;align-self:start;min-width:0}
  section{display:contents}
  section>.stack,section>.grid-list{grid-column:content;margin-top:.5rem;margin-bottom:1rem;min-width:0}
  section#work .stack,section#education .stack,section#skills .grid-list{border-top:1px solid var(--color-secondary);padding-top:.85rem;margin-top:.75rem}
  .masthead{padding:2em 0}
  .stack{gap:1.6rem}
  .stack>article{margin-bottom:0;padding-bottom:1.25rem}
  .stack>article:last-child{padding-bottom:0}
  .timeline>div:not(:last-child){padding-bottom:.6rem}
  article>*+*,article header+.timeline{margin-top:.5rem}
  .grid-list{gap:.75rem 1rem}
  .grid-list>div{margin:0}
  .tag-list>li{background:#e5e7eb!important;padding:.2em .5em;font-size:.85em}
}
@media screen{html{font-size:15px}body{max-width:52rem;margin:0 auto;padding:2rem 1.5rem;line-height:1.6}}
`;

// Render HTML, patch for light theme, generate PDF from same source, inject toolbar
await (async () => {
for (const { id, json, pdf } of locales) {
  const input = join(root, 'resume', json);
  const outDir = join(root, 'docs', 'resume', id);
  const htmlPath = join(outDir, 'index.html');
  const pdfPath = join(outDir, pdf);

  run(`npx resumed render "${input}" -t ${theme} -o "${htmlPath}"`);

  let html = readFileSync(htmlPath, 'utf8');
  html = patchLightTheme(html);
  html = html.replace(/Бакалавр in /g, '').replace(/Bachelor in /g, '');
  html = html.replace('</style>', LAYOUT_CSS + '\n</style>');
  writeFileSync(htmlPath, html);

  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    });
    await browser.close();
  } catch (e) {
    console.warn(`PDF export failed for ${id} (Chrome/Puppeteer may be unavailable):`, e.message);
  }

  html = readFileSync(htmlPath, 'utf8');
  html = html.replace('</body>', makeToolbar(id, pdf) + '\n</body>');
  writeFileSync(htmlPath, html);
}
})();

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
