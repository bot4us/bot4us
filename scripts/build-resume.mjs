import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
}

// Landing page: language detection + links to PDF and HTML
const landing = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume — Matvey Sizov</title>
  <script>
    (function () {
      var lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
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
