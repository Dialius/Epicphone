// dok-skema.mjs — membuat docs/SKEMA-SHEET.md dari src/backend/Skema.ts (satu sumber kebenaran desain sheet).
import { build } from 'esbuild';
import fs from 'fs';

const hasil = await build({ entryPoints: ['src/backend/Skema.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const kode = hasil.outputFiles[0].text;
const modul = await import('data:text/javascript;base64,' + Buffer.from(kode).toString('base64'));
const { SKEMA, FORMAT, LEBAR_BAWAAN, WARNA_GRUP, WARNA_STATUS, VERSI_SKEMA } = modul;

const NAMA_TIPE = {
  id: 'ID (teks, dikunci)', teks: 'Teks', nama: 'Nama/label', cat: 'Teks panjang (membungkus)', angka: 'Bilangan', rp: 'Rupiah', persen: 'Persen', persen1: 'Persen 1 desimal',
  tgl: 'Tanggal asli', jam: 'Jam (teks HH:mm)', imei: 'IMEI (teks)', wa: 'No. WA (teks)', link: 'Tautan', status: 'Status berwarna',
};

let md = `# Desain Spreadsheet EPICPHONE_DB_UTAMA\n\n`;
md += `Dibuat otomatis dari \`src/backend/Skema.ts\` oleh \`npm run dok:skema\` (versi skema ${VERSI_SKEMA}). Jangan diedit manual: ubah Skema.ts lalu jalankan ulang.\n\n`;
md += `## Aturan umum (PRD 01)\n\n`;
md += `- Baris 1 = header (tebal, putih di atas navy), dibekukan, filter aktif, baris selang-seling.\n`;
md += `- Tanggal = tanggal asli dengan tampilan \`dd MMM yyyy\` (lokal Indonesia: Okt, Agu, Des). Jam = teks \`HH:mm\` WIB.\n`;
md += `- Uang = angka asli dengan format \`${FORMAT.rp}\` (negatif merah). IMEI, nomor WA, dan ID = teks (tidak pernah jadi angka).\n`;
md += `- Kolom bertanda 🔒 diisi sistem (ID dan kolom turunan); diproteksi dengan peringatan. Kolom lain bebas diedit.\n`;
md += `- Tab: ${Object.entries(WARNA_GRUP).map(([k, v]) => `${k} ${v}`).join(', ')}.\n`;
md += `- Warna status: ${Object.entries(WARNA_STATUS).map(([k, v]) => `**${k}** (${v.nilai.join(', ')})`).join('; ')}.\n\n`;

let totalKolom = 0;
for (const l of SKEMA) {
  const lebar = l.kolom.reduce((s, k) => s + (k.w ?? LEBAR_BAWAAN[k.t]), 0);
  totalKolom += l.kolom.length;
  md += `## ${l.nama}\n\n`;
  md += `Grup ${l.grup}; ${l.kolom.length} kolom; lebar total ${lebar} px; ${l.baris ?? 1000} baris disediakan (bertambah otomatis)${l.proteksiPenuh ? '; seluruh sheet dikunci' : ''}.\n\n`;
  md += `| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |\n|---|---|---|---|---|---|\n`;
  l.kolom.forEach((k, i) => {
    md += `| ${i + 1} | ${k.kunci ? '🔒 ' : ''}${k.n} | ${NAMA_TIPE[k.t]} | \`${FORMAT[k.t]}\` | ${k.w ?? LEBAR_BAWAAN[k.t]} | ${k.val ? k.val.replace('RANGE:', 'dari ') + (k.lunak ? ' (peringatan)' : '') : ''} |\n`;
  });
  md += `\n`;
}
md += `Total: ${SKEMA.length} sheet, ${totalKolom} kolom.\n`;
fs.writeFileSync('docs/SKEMA-SHEET.md', md);
console.log(`docs/SKEMA-SHEET.md dibuat: ${SKEMA.length} sheet, ${totalKolom} kolom`);
