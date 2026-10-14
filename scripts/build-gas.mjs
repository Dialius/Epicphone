// @ts-check
// Build Mode A (rekomendasi, PRD 04): dist/Code.gs + dist/SetupSheets.gs + dist/Index.html + appsscript.json
import { execSync } from 'child_process';
import fs from 'fs';
import { bundelTeks, fungsiGlobal, kb } from './bundel-backend.mjs';

// 1. Frontend: satu berkas HTML (JS/CSS tertanam). Apps Script memakai nama berkas "Index".
execSync('npx vite build', { stdio: 'inherit' });
fs.writeFileSync('dist/Index.html', fs.readFileSync('dist/index.html', 'utf8'));
if (fs.existsSync('dist/index.html') && !fs.readdirSync('dist').every(f => f !== 'index.html')) fs.rmSync('dist/index.html');

// 2. Backend: Code.gs (aplikasi) dan SetupSheets.gs (pembuat Spreadsheet/Drive/trigger)
fs.writeFileSync('dist/Code.gs', await bundelTeks('code', { banner: '/* EPICPHONE SISTEM - Code.gs - dibuat oleh build:gas */\n' }));
fs.writeFileSync('dist/SetupSheets.gs', await bundelTeks('setup', { banner: '/* EPICPHONE SISTEM - SetupSheets.gs - dibuat oleh build:gas */\n' }));

// 3. Bersihkan sisa build lama dan salin manifest
['Code.js', 'Code.single.js'].forEach(f => fs.rmSync(`dist/${f}`, { force: true }));
fs.copyFileSync('appsscript.json', 'dist/appsscript.json');

const html = fs.statSync('dist/Index.html').size;
console.log('Fungsi global Code.gs        :', fungsiGlobal('code').join(', '));
console.log('Fungsi global SetupSheets.gs :', fungsiGlobal('setup').join(', '));
console.log(`build:gas selesai -> Code.gs ${kb('dist/Code.gs')}, SetupSheets.gs ${kb('dist/SetupSheets.gs')}, Index.html ${kb('dist/Index.html')}`);
if (html > 400 * 1024) console.warn('PERINGATAN: Index.html melebihi target 400 KB (PRD 04 bagian 9).');
