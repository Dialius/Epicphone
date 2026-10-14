// artefak-build.test.ts — menguji BERKAS HASIL BUILD (dist/Code.gs, SetupSheets.gs, Index.html), bukan kode sumber:
// itulah yang ditempel ke Google Apps Script. Dijalankan setelah `npm run build`.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import vm from 'vm';
import { pasangGasFake } from '../helpers/gas-fake';
import { pasangSetupFake } from '../helpers/setup-fake';

const ADA = fs.existsSync('dist/Code.gs') && fs.existsSync('dist/SetupSheets.gs') && fs.existsSync('dist/Index.html');
const g = globalThis as any;

describe.skipIf(!ADA)('berkas hasil build untuk Apps Script', () => {
  let code = '', setup = '', html = '';
  beforeAll(() => {
    code = fs.readFileSync('dist/Code.gs', 'utf8');
    setup = fs.readFileSync('dist/SetupSheets.gs', 'utf8');
    html = fs.readFileSync('dist/Index.html', 'utf8');
  });

  it('tidak memakai sintaks modul dan terbaca sebagai skrip biasa (V8 Apps Script)', () => {
    [code, setup].forEach(k => {
      expect(k).not.toMatch(/^\s*(import|export)\s/m);
      expect(() => new vm.Script(k)).not.toThrow();
    });
  });

  it('semua fungsi publik dan fungsi trigger menjadi fungsi global setelah dimuat', () => {
    pasangGasFake();
    vm.runInThisContext(code);
    vm.runInThisContext(setup);
    ['doGet', 'getSemuaData', 'cariStok', 'simpanPembelian', 'simpanPenjualan', 'terimaPembayaran', 'batalkanTransaksi', 'simpanServis',
      'updateStatusServis', 'cekGaransi', 'simpanKlaim', 'simpanBiaya', 'buatNota', 'ambilNota', 'getLaporanLayar', 'buatLaporanPdf',
      'unggahFoto', 'getFotoReferensi', 'hapusFoto', 'simpanKontak', 'simpanProduk', 'getPengaturan', 'simpanPengaturan',
      'jobBackupHarian', 'jobBackupBulanan', 'jobBackupMingguan', 'jobLaporanBulanan', 'jobCekTagihan', 'jobBersihkan',
      'backupPraRilis', 'daftarBackup', 'pulihkanDariBackup', 'setupAwal', 'perbaikiFolder', 'cekStrukturSheet', 'migrasiSkema']
      .forEach(n => expect(typeof g[n], `fungsi global ${n}`).toBe('function'));
  });

  it('Code.gs yang sudah dibangun berjalan: data kosong, tulis biaya, galat berkode, doGet memuat berkas "Index"', () => {
    pasangGasFake();
    vm.runInThisContext(code);
    const kosong = g.getSemuaData();
    expect(kosong).toMatchObject({ ok: true });
    expect(kosong.data.stok).toEqual([]);
    expect(g.simpanBiaya({ kategori: 'Listrik', nominal: 150000 }, 'idem-1')).toMatchObject({ ok: true });
    expect(g.simpanBiaya({ kategori: 'Listrik', nominal: 150000 }, 'idem-1')).toMatchObject({ ok: true }); // idemKey: tidak ganda
    expect(g.getSemuaData().data.biaya).toHaveLength(1);
    expect(g.simpanBiaya({ kategori: 'Hiburan', nominal: 1 })).toMatchObject({ ok: false, kode: 'KATEGORI_TIDAK_VALID' });
    let dimuat = '';
    g.HtmlService = { createHtmlOutputFromFile: (n: string) => { dimuat = n; const o: any = { setTitle: () => o, addMetaTag: () => o }; return o; } };
    g.doGet();
    expect(dimuat).toBe('Index');
  });

  it('SetupSheets.gs yang sudah dibangun menjalankan setupAwal dan memasang trigger yang semuanya ada di Code.gs', () => {
    const fake = pasangSetupFake();
    vm.runInThisContext(code);
    vm.runInThisContext(setup);
    const url = g.setupAwal();
    expect(url).toContain('docs.google.com');
    expect(Object.keys(fake.sheets)).toContain('Stok_HP');
    expect(fake.trigger).toHaveLength(6);
    fake.trigger.forEach(t => expect(typeof g[t.fungsi], `trigger ${t.fungsi}`).toBe('function'));
    expect(fake.spreadsheet.locale).toBe('id_ID');
  });

  it('Index.html: satu berkas mandiri, tanpa sumber luar, di bawah 400 KB', () => {
    expect(html.length).toBeLessThan(400 * 1024);
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href="https?:/);
    expect(html).toContain('viewport');
  });
});
