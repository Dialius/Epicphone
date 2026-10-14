// setup-sheets.test.ts — memastikan SetupSheets.gs membangun Spreadsheet persis seperti desain PRD 01:
// kolom & urutan, lebar, format tanggal/Rupiah/jam/persen, dropdown, warna status, proteksi, tab, trigger.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { pasangSetupFake, SetupPalsu, SheetSetupPalsu } from '../helpers/setup-fake';
import { SKEMA, FORMAT, LEBAR_BAWAAN, WARNA_GRUP, DATA_REFERENSI, HEADER } from '../../src/backend/Skema';

let fake: SetupPalsu;
let setup: typeof import('../../src/backend/SetupSheets');

const lebar = (k: { w?: number; t: keyof typeof LEBAR_BAWAAN }) => k.w ?? LEBAR_BAWAAN[k.t];

beforeEach(async () => {
  vi.resetModules();
  fake = pasangSetupFake();
  setup = await import('../../src/backend/SetupSheets');
  setup.setupAwal();
});

describe('struktur dan ukuran', () => {
  it('membuat semua sheet PRD dengan header dan urutan kolom persis skema, dan membuang Sheet1', () => {
    expect(Object.keys(fake.sheets).filter(n => n !== 'Log_Aktivitas').sort()).toEqual(SKEMA.map(l => l.nama).filter(n => n !== 'Log_Aktivitas').sort());
    expect(fake.sheets.Sheet1).toBeUndefined();
    SKEMA.forEach(l => {
      const s = fake.sheets[l.nama];
      expect(HEADER[l.nama].map((_, i) => s.ambil(1, i + 1)), l.nama).toEqual(HEADER[l.nama]);
    });
    expect(fake.urutanTab).toEqual(SKEMA.map(l => l.nama));
  });

  it('kolom Stok_HP sesuai PRD 01 bagian 3.3 (27 kolom, urutan baku) ditambah Tgl_Rusak di ujung', () => {
    expect(HEADER.Stok_HP).toEqual([
      'ID_Unit', 'Tgl_Masuk', 'Jam_Masuk', 'IMEI_1', 'IMEI_2', 'ID_Produk', 'Nama_Barang', 'Kondisi', 'Grade', 'Kelengkapan',
      'Baterai_Persen', 'Bebas_Kunci_Akun', 'Sumber', 'ID_Sumber', 'Harga_Beli', 'Biaya_Lain', 'Biaya_Servis', 'HPP',
      'Estimasi_Servis', 'Harga_Jual_Target', 'Status', 'Umur_Stok_Hari', 'Tgl_Keluar', 'ID_Penjualan', 'Link_Foto', 'Catatan', 'Dibuat_Oleh',
      'Tgl_Rusak', // tambahan PRD 05 (Kerugian barang rusak per bulan)
    ]);
  });

  it('lebar kolom setiap sheet sama dengan skema, dan jumlah kolom/baris dipangkas sesuai kebutuhan', () => {
    SKEMA.forEach(l => {
      const s = fake.sheets[l.nama];
      l.kolom.forEach((k, i) => expect(s.lebar[i + 1], `${l.nama}.${k.n}`).toBe(lebar(k)));
      expect(s.maxCols, l.nama).toBe(l.kolom.length);
      expect(s.maxRows, l.nama).toBe(Math.max(l.baris ?? 1000, 201));
    });
    expect(fake.sheets.Stok_HP.lebar[4]).toBe(145); // IMEI_1
  });

  it('baris 1 beku, filter aktif di seluruh kolom, baris selang-seling, header tebal navy', () => {
    SKEMA.forEach(l => {
      const s = fake.sheets[l.nama];
      expect(s.frozenRows, l.nama).toBe(1);
      expect(s.filter, l.nama).toBeTruthy();
      expect(s.filter.nc).toBe(l.kolom.length);
      const b = s.getBandings();
      expect(b).toHaveLength(1);
      expect(b[0].warna).toMatchObject({ header: '#0F2A44', pertama: '#FFFFFF', kedua: '#F2F5F9' });
      expect(s.format('fontWeight', 1, 1)).toBe('bold');
      expect(s.format('background', 1, 1)).toMatch(/#(0F2A44|3B5B7E)/);
    });
  });

  it('warna tab: biru master, hijau transaksi, oranye laporan, abu sistem', () => {
    SKEMA.forEach(l => expect(fake.sheets[l.nama].tab, l.nama).toBe(WARNA_GRUP[l.grup]));
    expect(fake.sheets.Produk.tab).toBe(WARNA_GRUP.master);
    expect(fake.sheets.Laba_Bulanan.tab).toBe(WARNA_GRUP.laporan);
    expect(fake.sheets.Pengaturan.tab).toBe(WARNA_GRUP.sistem);
  });
});

describe('format sel (apa yang akan masuk ke sheet)', () => {
  it('setiap kolom memakai format sesuai tipenya, di seluruh baris data', () => {
    SKEMA.forEach(l => {
      const s = fake.sheets[l.nama];
      l.kolom.forEach((k, i) => {
        expect(s.format('numberFormats', 2, i + 1), `${l.nama}.${k.n} baris 2`).toBe(FORMAT[k.t]);
        expect(s.format('numberFormats', s.maxRows - 1, i + 1), `${l.nama}.${k.n} baris akhir`).toBe(FORMAT[k.t]);
      });
    });
  });

  it('format contoh: Rupiah, tanggal dd MMM yyyy, jam teks, IMEI/WA/ID teks, persen', () => {
    const idx = (sheet: string, kol: string) => HEADER[sheet].indexOf(kol) + 1;
    const f = (sheet: string, kol: string) => fake.sheets[sheet].format('numberFormats', 5, idx(sheet, kol));
    expect(f('Stok_HP', 'Harga_Beli')).toBe('"Rp "#,##0;[Red]-"Rp "#,##0');
    expect(f('Penjualan', 'Laba_Kotor')).toBe('"Rp "#,##0;[Red]-"Rp "#,##0'); // laba negatif tampil merah
    expect(f('Stok_HP', 'Tgl_Masuk')).toBe('dd MMM yyyy');
    expect(f('Hutang_Piutang', 'Jatuh_Tempo')).toBe('dd MMM yyyy');
    expect(f('Stok_HP', 'Jam_Masuk')).toBe('@');
    expect(f('Stok_HP', 'IMEI_1')).toBe('@');
    expect(f('Kontak', 'No_WA')).toBe('@');
    expect(f('Stok_HP', 'ID_Unit')).toBe('@');
    expect(f('Stok_HP', 'Baterai_Persen')).toBe('0"%"');
    expect(f('Laba_Bulanan', 'Margin_Persen')).toBe('0.0"%"');
    expect(f('Stok_HP', 'Umur_Stok_Hari')).toBe('#,##0');
  });

  it('rata kanan untuk angka/Rupiah, tengah untuk tanggal/jam/status, kiri untuk teks; teks panjang membungkus', () => {
    const idx = (sheet: string, kol: string) => HEADER[sheet].indexOf(kol) + 1;
    const rata = (sheet: string, kol: string) => fake.sheets[sheet].format('alignments', 3, idx(sheet, kol));
    expect(rata('Stok_HP', 'Harga_Beli')).toBe('right');
    expect(rata('Stok_HP', 'Tgl_Masuk')).toBe('center');
    expect(rata('Stok_HP', 'Jam_Masuk')).toBe('center');
    expect(rata('Stok_HP', 'Status')).toBe('center');
    expect(rata('Stok_HP', 'IMEI_1')).toBe('left');
    expect(fake.sheets.Stok_HP.format('wrapStrategies', 3, idx('Stok_HP', 'Catatan'))).toBe('WRAP');
    expect(fake.sheets.Stok_HP.format('wrapStrategies', 3, idx('Stok_HP', 'IMEI_1'))).toBe('CLIP');
  });

  it('semua tanggal PRD tampil dd MMM yyyy dan semua jam HH:mm (jam disimpan sebagai teks)', () => {
    SKEMA.forEach(l => l.kolom.forEach(k => {
      if (k.t === 'tgl') expect(FORMAT[k.t], `${l.nama}.${k.n}`).toBe('dd MMM yyyy');
      if (k.t === 'jam') expect(k.n, l.nama).toMatch(/^Jam/);
    }));
  });
});

describe('dropdown, warna status, proteksi', () => {
  const idx = (sheet: string, kol: string) => HEADER[sheet].indexOf(kol) + 1;

  it('dropdown berisi nilai dari Referensi; ID_Produk dari sheet Produk; merek hanya peringatan', () => {
    const v = (sheet: string, kol: string) => fake.sheets[sheet].validasiKolom(idx(sheet, kol));
    expect(v('Stok_HP', 'Kondisi').daftar).toEqual(['Baru', 'Bekas']);
    expect(v('Stok_HP', 'Status').daftar).toEqual(['Ready', 'Dipesan', 'Servis', 'Terjual', 'Retur', 'Rusak']);
    expect(v('Stok_HP', 'Bebas_Kunci_Akun').daftar).toEqual(['Ya', 'Tidak', 'Belum dicek']);
    expect(v('Penjualan', 'Metode_Bayar').daftar).toEqual(['Tunai', 'Transfer', 'QRIS', 'Cicilan', 'Tempo']);
    expect(v('Servis', 'Status').daftar).toEqual(['Antri', 'Dikerjakan', 'Selesai', 'Diambil', 'Batal']);
    expect(v('Stok_HP', 'ID_Produk').rentang).toBe('Produk!A2:A');
    expect(v('Produk', 'Merek').lunak).toBe(true);
    expect(v('Stok_HP', 'Kondisi').lunak).toBe(false);
  });

  it('warna status: empat aturan (hijau/kuning/merah/abu) per kolom status, sesuai PRD', () => {
    const aturan = fake.sheets.Stok_HP.aturan;
    expect(aturan).toHaveLength(4);
    const huruf = String.fromCharCode(64 + idx('Stok_HP', 'Status'));
    const hijau = aturan.find((a: any) => a.rumus.includes('"Ready"'));
    expect(hijau.rumus).toContain(`$${huruf}2="Lunas"`);
    expect(aturan.find((a: any) => a.rumus.includes('"Servis"')).rumus).toContain('"Sebagian"');
    expect(aturan.find((a: any) => a.rumus.includes('"Telat"')).rumus).toContain('"Rusak"');
    expect(aturan.find((a: any) => a.rumus.includes('"Terjual"')).rumus).toContain('"Batal"');
    // Penjualan punya dua kolom status berwarna (Status_Bayar dan Status)
    expect(fake.sheets.Penjualan.aturan).toHaveLength(8);
  });

  it('proteksi peringatan: kolom ID/turunan terkunci, kolom isian bebas; Log terkunci penuh', () => {
    const p = fake.sheets.Stok_HP.getProtections()[0];
    expect(p.warningOnly).toBe(true);
    const bebas = (c: number) => p.bebas.some((r: any) => c >= r.c && c < r.c + r.nc);
    expect(bebas(idx('Stok_HP', 'ID_Unit'))).toBe(false);
    expect(bebas(idx('Stok_HP', 'HPP'))).toBe(false);           // turunan
    expect(bebas(idx('Stok_HP', 'Nama_Barang'))).toBe(false);   // turunan (lookup)
    expect(bebas(idx('Stok_HP', 'Harga_Beli'))).toBe(true);     // isian
    expect(bebas(idx('Stok_HP', 'Catatan'))).toBe(true);
    expect(fake.sheets.Log_Aktivitas.getProtections()[0].bebas).toHaveLength(0);
  });
});

describe('isi awal, folder, trigger', () => {
  it('Referensi dan Pengaturan terisi; menjalankan ulang tidak menggandakan dan tidak menimpa nilai owner', () => {
    const total = DATA_REFERENSI.reduce((n, [, v]) => n + v.length, 0);
    const ref = fake.sheets.Referensi;
    expect(ref.getLastRow()).toBe(total + 1);

    const p = fake.sheets.Pengaturan;
    const baris = (kunci: string) => { for (let r = 2; r <= p.getLastRow(); r++) if (p.ambil(r, 1) === kunci) return r; return 0; };
    expect(p.ambil(baris('NAMA_TOKO'), 2)).toBe('Epic Phone Purwokerto');
    expect(p.ambil(baris('GARANSI_BARU_BULAN'), 2)).toBe('12');
    expect(p.ambil(baris('VERSI_SKEMA'), 2)).toBe('3');
    expect(JSON.parse(String(p.ambil(baris('PAKET_BONUS'), 2)))[0].nama).toBe('Paket Dasar');

    const barisSebelum = p.getLastRow();
    p.sel(baris('ALAMAT'), 2, 'Jl. Jenderal Sudirman No. 1, Purwokerto'); // owner mengisi alamat
    setup.setupAwal();
    expect(fake.sheets.Referensi.getLastRow()).toBe(total + 1);
    expect(fake.sheets.Pengaturan.getLastRow()).toBe(barisSebelum);
    expect(fake.sheets.Pengaturan.ambil(baris('ALAMAT'), 2)).toBe('Jl. Jenderal Sudirman No. 1, Purwokerto');
  });

  it('Spreadsheet: lokal Indonesia (bulan Okt/Agu), zona WIB, berada di folder 01_DATABASE', () => {
    expect(fake.spreadsheet.locale).toBe('id_ID');
    expect(fake.spreadsheet.tz).toBe('Asia/Jakarta');
    expect(fake.spreadsheet.dipindahKe).toBe(fake.folder.indexOf('EPICPHONE_00_SISTEM/01_DATABASE') + 1 > 0 ? 'fld-' + (fake.folder.indexOf('EPICPHONE_00_SISTEM/01_DATABASE') + 1) : null);
    expect(fake.props.get('SPREADSHEET_ID')).toBe('ss-baru');
  });

  it('struktur folder Drive sesuai PRD 09 bagian 3', () => {
    const ada = (j: string) => expect(fake.folder, j).toContain('EPICPHONE_00_SISTEM/' + j);
    ['00_ASET-BRAND', '01_DATABASE', '02_FOTO-HP', '02_FOTO-HP/_TERHAPUS', '03_NOTA', '03_NOTA/RIWAYAT', '04_BUKTI-TRANSAKSI',
      '04_BUKTI-TRANSAKSI/PEMBELIAN', '04_BUKTI-TRANSAKSI/PEMBAYARAN', '04_BUKTI-TRANSAKSI/BIAYA', '05_SERVIS', '06_LAPORAN',
      '07_BACKUP', '07_BACKUP/HARIAN', '07_BACKUP/BULANAN', '07_BACKUP/MINGGUAN', '07_BACKUP/PRA-RILIS', '07_BACKUP/PRA-MIGRASI',
      '07_BACKUP/PENGAMAN-PULIH', '08_ARSIP', '09_TEMPLATE-IMPOR'].forEach(ada);
    expect(fake.folder).toContain('EPICPHONE_00_SISTEM');
  });

  it('trigger: enam pekerjaan, jam berbeda (tidak bertabrakan), dan setiap fungsinya benar-benar ada di Code.gs', () => {
    expect(fake.trigger).toHaveLength(6);
    const jam = fake.trigger.map(t => t.jam);
    expect(new Set(jam).size).toBe(6);
    expect(fake.trigger.find(t => t.fungsi === 'jobBackupHarian')!.jam).toBe(1);
    expect(fake.trigger.find(t => t.fungsi === 'jobBackupMingguan')!.mingguan).toBe(true);
    const kode = fs.readFileSync('src/backend/Code.ts', 'utf8');
    const publik = [...kode.matchAll(/^export function (\w+)\s*\(/gm)].map(m => m[1]);
    fake.trigger.forEach(t => expect(publik, `trigger ${t.fungsi} memanggil fungsi yang tidak ada`).toContain(t.fungsi));
    setup.setupAwal();
    expect(fake.trigger).toHaveLength(6); // dijalankan ulang tidak menggandakan trigger
  });
});


describe('Spreadsheet yang sudah berisi data dari versi lama', () => {
  it('setupAwal menyelaraskan kolom tanpa menghilangkan data; kolom milik owner dipertahankan', async () => {
    vi.resetModules();
    const f = pasangSetupFake();
    const lama = new SheetSetupPalsu('Stok_HP');
    ['Status', 'ID_Unit', 'Nama_Barang', 'Harga_Beli', 'Kolom_Owner'].forEach((h, i) => lama.sel(1, i + 1, h));
    ['Ready', 'UNT-2609-0001', 'Samsung A54', 3000000, 'catatan pribadi'].forEach((v, i) => lama.sel(2, i + 1, v));
    ['Servis', 'UNT-2609-0002', 'iPhone 11', 2500000, 'rusak layar'].forEach((v, i) => lama.sel(3, i + 1, v));
    lama.maxCols = 5; lama.maxRows = 100;
    f.sheets.Stok_HP = lama;
    const s = await import('../../src/backend/SetupSheets');
    s.setupAwal();

    HEADER.Stok_HP.forEach((n, i) => expect(lama.ambil(1, i + 1), `kolom ${i + 1}`).toBe(n));
    const kol = (n: string) => HEADER.Stok_HP.indexOf(n) + 1;
    [[2, 'Ready', 'UNT-2609-0001', 'Samsung A54', 3000000], [3, 'Servis', 'UNT-2609-0002', 'iPhone 11', 2500000]].forEach(([r, st, id, nm, hb]) => {
      expect(lama.ambil(r as number, kol('Status'))).toBe(st);
      expect(lama.ambil(r as number, kol('ID_Unit'))).toBe(id);
      expect(lama.ambil(r as number, kol('Nama_Barang'))).toBe(nm);
      expect(lama.ambil(r as number, kol('Harga_Beli'))).toBe(hb);
    });
    const asing = HEADER.Stok_HP.length + 1;
    expect(lama.ambil(1, asing)).toBe('Kolom_Owner');
    expect(lama.ambil(2, asing)).toBe('catatan pribadi');
    expect(lama.ambil(3, asing)).toBe('rusak layar');
  });
});
