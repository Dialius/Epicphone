// lib-build.mjs — bagian bersama skrip build. Lintas platform (Windows, macOS, Linux): tidak memakai perintah shell,
// dan tidak pernah menaruh index.html dan Index.html di folder yang sama (sistem berkas Windows/macOS tidak membedakan huruf besar-kecil).
import fs from 'fs';
import os from 'os';
import path from 'path';

export const OUT = path.resolve(process.env.EPICPHONE_OUT || 'dist');
export const OUT_SINGLE = path.resolve(process.env.EPICPHONE_OUT_SINGLE || 'dist-single');

/** Pesan galat yang bisa dibaca: galat esbuild memuat daftar `errors` dengan lokasi berkas */
export function pesanGalat(e) {
  if (e && Array.isArray(e.errors) && e.errors.length) {
    return e.errors.map(x => `  ${x.text}${x.location ? `\n    di ${x.location.file}:${x.location.line}:${x.location.column}` : ''}`).join('\n');
  }
  return '  ' + String((e && e.stack) || e);
}

/** Jalankan satu langkah build dengan label; bila gagal tampilkan penyebab, hapus hasil lama, dan hentikan. */
export async function langkah(no, total, nama, fn, { hapusBilaGagal = [] } = {}) {
  console.log(`[${no}/${total}] ${nama}...`);
  try {
    return await fn();
  } catch (e) {
    console.error(`\n✖ Langkah ${no} gagal: ${nama}\n${pesanGalat(e)}\n`);
    // Hasil build lama dihapus agar "clasp push" tidak diam-diam mendorong versi usang
    hapusBilaGagal.forEach(d => fs.rmSync(d, { recursive: true, force: true }));
    if (hapusBilaGagal.length) console.error(`Folder hasil build dihapus supaya versi lama tidak terdorong tanpa sengaja.\n`);
    console.error(`Node ${process.version}. Bila pesan di atas tidak jelas, salin seluruh teks ini saat meminta bantuan.`);
    process.exit(1);
  }
}

export function pastikanNode() {
  const mayor = Number(process.versions.node.split('.')[0]);
  if (mayor < 18) {
    console.error(`✖ Node ${process.version} terlalu lama. Gunakan Node 18 atau lebih baru (disarankan 20/22).`);
    process.exit(1);
  }
}

export function bersihkanFolder(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Tulis Index.html dengan huruf besar-kecil yang persis. Aman pada sistem berkas yang tidak membedakan huruf:
 * berkas bernama index.html dihapus lebih dulu (bila tidak, menulis "Index.html" hanya menimpa isi berkas lama dan
 * namanya tetap index.html, sehingga Apps Script tidak menemukan berkas "Index").
 */
export function tulisIndexHtml(dir, isi, fsx = fs) {
  ['index.html', 'Index.html'].forEach(n => fsx.rmSync(path.join(dir, n), { force: true }));
  fsx.writeFileSync(path.join(dir, 'Index.html'), isi);
  if (!fsx.readdirSync(dir).includes('Index.html')) throw new Error('Index.html tidak tercipta dengan huruf besar I. Periksa sistem berkas.');
}

/** Bangun frontend (Vite) ke folder sementara lalu kembalikan teks HTML satu berkas. Tanpa shell: memakai API Vite. */
export async function bangunFrontend() {
  // Folder sementara di luar proyek: aman dijalankan bersamaan dan tidak menyisakan berkas di repo
  const sementara = fs.mkdtempSync(path.join(os.tmpdir(), 'epicphone-frontend-'));
  // Hasil untuk Apps Script SELALU mode produksi, apa pun NODE_ENV di komputer/terminal (mis. "development" atau "test"):
  // tanpa ini bundel membengkak dan memuat kode pengembangan.
  const nodeEnvLama = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const { build } = await import('vite');
  try {
    await build({ configFile: path.resolve('vite.config.ts'), mode: 'production', logLevel: 'warn', build: { outDir: sementara, emptyOutDir: true } });
    const berkas = path.join(sementara, 'index.html');
    if (!fs.existsSync(berkas)) throw new Error('Vite tidak menghasilkan index.html');
    return fs.readFileSync(berkas, 'utf8');
  } finally {
    if (nodeEnvLama === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnvLama;
    fs.rmSync(sementara, { recursive: true, force: true });
  }
}

export function ukuranKB(berkas) {
  return (fs.statSync(berkas).size / 1024).toFixed(0) + ' KB';
}
