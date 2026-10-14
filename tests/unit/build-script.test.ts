// build-script.test.ts — memastikan `npm run build` selalu menghasilkan persis Code.gs, SetupSheets.gs, Index.html,
// appsscript.json dalam satu folder, lintas platform (termasuk sistem berkas yang tidak membedakan huruf besar-kecil).

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const OUT = path.join(os.tmpdir(), `epicphone-uji-build-${process.pid}`);
afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

/** Sistem berkas palsu seperti Windows/macOS: nama tidak membedakan huruf besar-kecil, tetapi menyimpan huruf aslinya */
function fsTakPeka() {
  const berkas = new Map<string, { nama: string; isi: string }>();
  const kunci = (p: string) => path.basename(p).toLowerCase();
  return {
    berkas,
    rmSync: (p: string) => { berkas.delete(kunci(p)); },
    writeFileSync: (p: string, isi: string) => {
      const ada = berkas.get(kunci(p));
      berkas.set(kunci(p), { nama: ada ? ada.nama : path.basename(p), isi }); // menimpa berkas lama MEMPERTAHANKAN nama aslinya
    },
    readdirSync: () => [...berkas.values()].map(b => b.nama),
    readFileSync: (p: string) => { const b = berkas.get(kunci(p)); if (!b) throw new Error('ENOENT'); return b.isi; },
    existsSync: (p: string) => berkas.has(kunci(p)),
  };
}

describe('Index.html pada sistem berkas yang tidak membedakan huruf', () => {
  it('logika lama (menulis Index.html lalu menghapus index.html) menghapus satu-satunya salinan: penyebab galat build:gas di Windows/macOS', () => {
    const f = fsTakPeka();
    f.writeFileSync('dist/index.html', '<html>');                       // hasil Vite
    f.writeFileSync('dist/Index.html', f.readFileSync('dist/index.html')); // namanya tetap index.html
    if (f.existsSync('dist/index.html') && !f.readdirSync().every(n => n !== 'index.html')) f.rmSync('dist/index.html');
    expect(() => f.readFileSync('dist/Index.html')).toThrow('ENOENT');    // berkas lenyap -> galat pada langkah berikutnya
  });

  it('tulisIndexHtml yang baru menghasilkan berkas bernama persis "Index.html" pada kedua jenis sistem berkas', async () => {
    const { tulisIndexHtml } = await import('../../scripts/lib-build.mjs');
    const f = fsTakPeka();
    f.writeFileSync('dist/index.html', '<html>lama');
    tulisIndexHtml('dist', '<html>baru', f as never);
    expect(f.readdirSync()).toEqual(['Index.html']);
    expect(f.readFileSync('dist/index.html')).toBe('<html>baru');
  });
});

describe('npm run build', () => {
  it('menghasilkan persis empat berkas, menyingkirkan berkas usang, dan hasilnya siap ditempel ke Apps Script', () => {
    fs.mkdirSync(OUT, { recursive: true });
    ['Code.single.js', 'index.html', 'Code.js', 'sisa.txt'].forEach(n => fs.writeFileSync(path.join(OUT, n), 'usang')); // sisa build lama
    const keluaran = execFileSync(process.execPath, ['scripts/build.mjs'], { env: { ...process.env, EPICPHONE_OUT: OUT }, encoding: 'utf8', timeout: 150_000 });
    expect(fs.readdirSync(OUT).sort()).toEqual(['Code.gs', 'Index.html', 'SetupSheets.gs', 'appsscript.json']);
    expect(keluaran).toContain('Build selesai');
    const code = fs.readFileSync(path.join(OUT, 'Code.gs'), 'utf8');
    expect(code).toMatch(/^function doGet\(\)/m);
    expect(code).toContain('createHtmlOutputFromFile("Index")');
    expect(fs.readFileSync(path.join(OUT, 'SetupSheets.gs'), 'utf8')).toMatch(/^function setupAwal\(\)/m);
    expect(fs.statSync(path.join(OUT, 'Index.html')).size).toBeLessThan(400 * 1024);
  }, 180_000);

  it('bila satu langkah gagal: pesan jelas, kode keluar bukan nol, dan folder hasil dihapus agar clasp push tidak mendorong versi lama', async () => {
    const { langkah } = await import('../../scripts/lib-build.mjs');
    const sisa = path.join(OUT, 'sisa-gagal');
    fs.mkdirSync(sisa, { recursive: true });
    fs.writeFileSync(path.join(sisa, 'Code.gs'), 'lama');
    const asli = process.exit;
    const galat: string[] = [];
    const asliError = console.error;
    console.error = (...a: unknown[]) => { galat.push(a.join(' ')); };
    let kode = -1;
    (process as unknown as { exit: (c: number) => never }).exit = ((c: number) => { kode = c; throw new Error('keluar'); }) as never;
    try {
      await langkah(3, 5, 'Backend -> Code.gs', () => { throw new Error('contoh kesalahan'); }, { hapusBilaGagal: [sisa] }).catch(() => undefined);
    } finally {
      process.exit = asli;
      console.error = asliError;
    }
    expect(kode).toBe(1);
    expect(galat.join('\n')).toContain('Langkah 3 gagal: Backend -> Code.gs');
    expect(galat.join('\n')).toContain('contoh kesalahan');
    expect(fs.existsSync(sisa)).toBe(false);
  });
});
