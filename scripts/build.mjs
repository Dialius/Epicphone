// @ts-check
// npm run build — membangun SEMUA berkas untuk Google Apps Script ke satu folder (dist/):
//   Code.gs, SetupSheets.gs, Index.html, appsscript.json
// Setelah mengubah kode apa pun cukup jalankan `npm run build` (atau `npm run push` untuk build lalu clasp push).
import fs from 'fs';
import path from 'path';
import { bundelTeks, fungsiGlobal } from './bundel-backend.mjs';
import { OUT, langkah, pastikanNode, bersihkanFolder, tulisIndexHtml, bangunFrontend, ukuranKB } from './lib-build.mjs';

pastikanNode();
const T = 5;
const gagal = { hapusBilaGagal: [OUT] };
const nama = path.relative(process.cwd(), OUT) || '.';

// Frontend lebih dulu: bagian paling lama dan paling mungkin gagal
const html = await langkah(1, T, 'Frontend menjadi satu berkas HTML', bangunFrontend, gagal);
await langkah(2, T, `Menyiapkan folder ${nama}/ (dikosongkan agar tidak ada berkas usang)`, () => bersihkanFolder(OUT), gagal);
await langkah(3, T, 'Backend -> Code.gs', async () => {
  fs.writeFileSync(path.join(OUT, 'Code.gs'), await bundelTeks('code', { banner: '/* EPICPHONE SISTEM - Code.gs - dibuat oleh npm run build */\n' }));
}, gagal);
await langkah(4, T, 'Setup sheet -> SetupSheets.gs', async () => {
  fs.writeFileSync(path.join(OUT, 'SetupSheets.gs'), await bundelTeks('setup', { banner: '/* EPICPHONE SISTEM - SetupSheets.gs - dibuat oleh npm run build */\n' }));
}, gagal);
await langkah(5, T, 'Index.html dan appsscript.json', () => {
  tulisIndexHtml(OUT, html);
  fs.copyFileSync(path.resolve('appsscript.json'), path.join(OUT, 'appsscript.json'));
}, gagal);

// Pemeriksaan akhir: persis empat berkas, nama persis (huruf besar-kecil)
const ada = fs.readdirSync(OUT).sort();
const harus = ['Code.gs', 'Index.html', 'SetupSheets.gs', 'appsscript.json'];
if (JSON.stringify(ada) !== JSON.stringify(harus)) {
  fs.rmSync(OUT, { recursive: true, force: true });
  console.error(`✖ Isi ${nama}/ tidak sesuai. Seharusnya ${harus.join(', ')}; ditemukan ${ada.join(', ')}.`);
  process.exit(1);
}
console.log(`\n✔ Build selesai di ${nama}/`);
harus.forEach(f => console.log(`  ${f.padEnd(16)} ${ukuranKB(path.join(OUT, f))}`));
console.log(`  Fungsi global Code.gs: ${fungsiGlobal('code').length}, SetupSheets.gs: ${fungsiGlobal('setup').join(', ')}`);
if (fs.statSync(path.join(OUT, 'Index.html')).size > 400 * 1024) console.warn('PERINGATAN: Index.html melebihi target 400 KB (PRD 04 bagian 9).');
console.log('\nLangkah berikutnya: clasp push   (atau npm run push untuk build sekaligus push)');
