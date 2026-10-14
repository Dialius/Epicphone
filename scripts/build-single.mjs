// @ts-check
// npm run build:single — Mode B: SATU berkas Code.gs (backend + SetupSheets + HTML tertanam) di dist-single/.
import fs from 'fs';
import path from 'path';
import { bundelTeks } from './bundel-backend.mjs';
import { OUT_SINGLE, langkah, pastikanNode, bersihkanFolder, bangunFrontend, ukuranKB } from './lib-build.mjs';

pastikanNode();
const T = 3;
const gagal = { hapusBilaGagal: [OUT_SINGLE] };
const html = await langkah(1, T, 'Frontend menjadi satu berkas HTML', bangunFrontend, gagal);
await langkah(2, T, 'Menyiapkan folder dist-single/', () => bersihkanFolder(OUT_SINGLE), gagal);
await langkah(3, T, 'Menggabungkan Code.gs + SetupSheets.gs + HTML', async () => {
  const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const code = await bundelTeks('code', { kecuali: ['doGet'], banner: '/* EPICPHONE SISTEM - Mode B (satu berkas) */\n' });
  const setup = await bundelTeks('setup');
  const doGet = `
const __HTML__ = \`${escaped}\`;
function doGet() {
  return HtmlService.createHtmlOutput(__HTML__)
    .setTitle('Epic Phone')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
`;
  fs.writeFileSync(path.join(OUT_SINGLE, 'Code.gs'), code + '\n' + setup + doGet);
  fs.copyFileSync(path.resolve('appsscript.json'), path.join(OUT_SINGLE, 'appsscript.json'));
}, gagal);
const mb = fs.statSync(path.join(OUT_SINGLE, 'Code.gs')).size / 1024 / 1024;
console.log(`\n✔ Mode B selesai: dist-single/Code.gs (${ukuranKB(path.join(OUT_SINGLE, 'Code.gs'))}) + appsscript.json`);
if (mb > 1.5) console.warn('PERINGATAN: ukuran melebihi 1,5 MB; bila editor menolak, pakai npm run build.');
