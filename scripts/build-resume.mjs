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
        var opt={margin:10,filename:pdfUrl,html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
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
