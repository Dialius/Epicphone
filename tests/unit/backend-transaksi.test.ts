// backend-transaksi.test.ts — menjalankan layanan backend ASLI di atas Apps Script palsu.
// Fokus: aturan bisnis PRD-03 (penjualan utuh, pembayaran, pembatalan, rollback, idemKey, kunci).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pasangGasFake, Palsu } from '../helpers/gas-fake';
import { HEADER } from '../../src/backend/Skema';

let palsu: Palsu;
let Code: typeof import('../../src/backend/Code');
let Pembelian: typeof import('../../src/backend/PembelianService');
let Penjualan: typeof import('../../src/backend/PenjualanService');
let Tagihan: typeof import('../../src/backend/TagihanService');
let Data: typeof import('../../src/backend/DataService');
let Galat: typeof import('../../src/backend/Galat');

const IMEI_A = '358123456789012';
const IMEI_B = '358123456789020';
const IMEI_TT = '490154203237518';

function isi(sheet: string, data: Record<string, unknown>) {
  const h = HEADER[sheet];
  palsu.sheet(sheet).rows.push(h.map(k => (data[k] === undefined ? '' : data[k])));
}
function unit(id: string, imei: string, o: Record<string, unknown> = {}) {
  isi('Stok_HP', {
    ID_Unit: id, Tgl_Masuk: '2026-09-20', Jam_Masuk: '09:00', IMEI_1: imei, Nama_Barang: 'Samsung Galaxy A54',
    Kondisi: 'Bekas', Kelengkapan: 'Fullset', Harga_Beli: 3000000, Biaya_Lain: 0, Biaya_Servis: 0, HPP: 3000000,
    Harga_Jual_Target: 3500000, Status: 'Ready', ...o,
  });
}
function aks(sku: string, stok: number, o: Record<string, unknown> = {}) {
  isi('Stok_Aksesoris', {
    SKU: sku, Nama_Barang: 'Tempered Glass', Kategori: 'Pelindung layar', Stok: stok, Stok_Minimum: 3,
    Harga_Beli_Rata2: 5000, Harga_Jual: 25000, Status: 'Aman', ...o,
  });
}
/** Isi sel tanggal: harus Date asli (tampil dd MMM yyyy di Spreadsheet); dikembalikan sebagai yyyy-MM-dd untuk dibandingkan */
const tglSel = (v: unknown): string => {
  expect(v).toBeInstanceOf(Date);
  return (globalThis as any).Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
};
const jualDasar = (o: Record<string, unknown> = {}) => ({
  namaPelanggan: 'Budi Santoso', noWa: '0812-3456-7890', metodeBayar: 'Tunai',
  items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }], dibayar: 3500000, ...o,
}) as any;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-07T03:00:00Z')); // 07 Okt 2026 10:00 WIB
  palsu = pasangGasFake();
  Code = await import('../../src/backend/Code');
  Pembelian = await import('../../src/backend/PembelianService');
  Penjualan = await import('../../src/backend/PenjualanService');
  Tagihan = await import('../../src/backend/TagihanService');
  Data = await import('../../src/backend/DataService');
  Galat = await import('../../src/backend/Galat');
});
afterEach(() => { vi.useRealTimers(); });

function galat(fn: () => unknown) {
  try { fn(); } catch (e) { return e as InstanceType<typeof Galat.GalatBisnis>; }
  throw new Error('seharusnya melempar galat');
}

describe('kunci', () => {
  it('buatId di dalam transaksi tidak meminta kunci kedua (tidak deadlock)', () => {
    const r = Code.simpanPembelian({
      namaSupplier: 'CV Maju', metodeBayar: 'Tunai', dibayar: 3000000,
      items: [{ tipe: 'HP', namaBarang: 'Samsung Galaxy A54', imei1: IMEI_A, hargaBeli: 3000000 }],
    } as any);
    expect(r.ok).toBe(true);
    expect(palsu.lockDipegang()).toBe(false); // kunci dilepas
  });
});

describe('simpanPembelian', () => {
  it('mencatat unit Ready dengan ID berformat dan ISO date', () => {
    const h = Pembelian.simpanPembelian({
      namaSupplier: 'CV Maju', metodeBayar: 'Tunai', dibayar: 3000000,
      items: [{ tipe: 'HP', namaBarang: 'Samsung Galaxy A54', imei1: IMEI_A, hargaBeli: 3000000, biayaLain: 50000 }],
    } as any);
    expect(h.unitsCreated).toEqual(['UNT-2610-0001']);
    expect(h.idPembelian).toBe('BELI-2610-0001');
    const u = palsu.sheet('Stok_HP').data()[0];
    expect(u).toMatchObject({ Status: 'Ready', Jam_Masuk: '10:00', HPP: 3050000, IMEI_1: IMEI_A });
    expect(tglSel(u.Tgl_Masuk)).toBe('2026-10-07');
    expect(typeof u.Harga_Beli).toBe('number'); // angka sungguhan, bukan teks
    expect(typeof u.IMEI_1).toBe('string');     // IMEI tetap teks
    expect(palsu.sheet('Pembelian').data()[0]).toMatchObject({ Status_Bayar: 'Lunas', Sisa: 0 });
    expect(palsu.sheet('Hutang_Piutang').data()).toHaveLength(0);
  });

  it('menolak IMEI ganda dengan kode IMEI_GANDA, dan tidak menulis apa pun', () => {
    unit('UNT-2609-0001', IMEI_A);
    const e = galat(() => Pembelian.simpanPembelian({
      namaSupplier: 'X', metodeBayar: 'Tunai', dibayar: 0,
      items: [{ tipe: 'HP', namaBarang: 'HP', imei1: IMEI_A, hargaBeli: 1 }],
    } as any));
    expect(e.kode).toBe('IMEI_GANDA');
    expect(palsu.sheet('Pembelian').data()).toHaveLength(0);
  });

  it('IMEI yang sama di dua baris satu pembelian ditolak', () => {
    const e = galat(() => Pembelian.simpanPembelian({
      namaSupplier: 'X', metodeBayar: 'Tunai', dibayar: 0,
      items: [{ tipe: 'HP', namaBarang: 'A', imei1: IMEI_A, hargaBeli: 1 }, { tipe: 'HP', namaBarang: 'B', imei1: IMEI_A, hargaBeli: 1 }],
    } as any));
    expect(e.kode).toBe('IMEI_GANDA');
  });

  it('tempo: membuat hutang supplier dan pembayaran awal', () => {
    const h = Pembelian.simpanPembelian({
      namaSupplier: 'CV Maju', metodeBayar: 'Tempo', dibayar: 1000000, jatuhTempo: '2026-10-20',
      items: [{ tipe: 'HP', namaBarang: 'A', imei1: IMEI_A, hargaBeli: 3000000 }],
    } as any);
    expect(h.idTagihan).toBe('TGH-2610-0001');
    expect(palsu.sheet('Hutang_Piutang').data()[0]).toMatchObject({ Jenis: 'Hutang supplier', Terbayar: 1000000, Sisa: 2000000, Status: 'Sebagian' });
    expect(palsu.sheet('Pembayaran').data()[0]).toMatchObject({ Jumlah: 1000000, Catatan: 'Pembayaran awal BELI-2610-0001' });
  });

  it('pembelian lunas juga mencatat pembayaran awal (arus kas lengkap)', () => {
    Pembelian.simpanPembelian({ namaSupplier: 'CV Maju', metodeBayar: 'Transfer', dibayar: 3000000, items: [{ tipe: 'HP', namaBarang: 'A', imei1: IMEI_A, hargaBeli: 3000000 }] } as any);
    expect(palsu.sheet('Hutang_Piutang').data()).toHaveLength(0);
    expect(palsu.sheet('Pembayaran').data()[0]).toMatchObject({ Jumlah: 3000000, Metode: 'Transfer', ID_Hutang_Piutang: '', Catatan: 'Pembayaran awal BELI-2610-0001' });
  });

  it('aksesoris: tambah stok dan harga beli rata-rata tertimbang (tidak lagi diam-diam hilang)', () => {
    aks('ACC-2609-0001', 10, { Harga_Beli_Rata2: 5000 });
    Pembelian.simpanPembelian({
      namaSupplier: 'X', metodeBayar: 'Tunai', dibayar: 100000,
      items: [{ tipe: 'Aksesoris', namaBarang: 'Tempered Glass', hargaBeli: 8000, qty: 10 }],
    } as any);
    const a = palsu.sheet('Stok_Aksesoris').data()[0];
    expect(a).toMatchObject({ Stok: 20, Harga_Beli_Rata2: 6500, Status: 'Aman' });
    expect(palsu.sheet('Pembelian').data()[0]).toMatchObject({ Total: 80000 });
  });

  it('rollback: gagal di tengah jalan mengembalikan semua tulisan', () => {
    palsu.sheet('Pembelian').gagalTulis = true;
    expect(() => Pembelian.simpanPembelian({
      namaSupplier: 'X', metodeBayar: 'Tunai', dibayar: 1,
      items: [{ tipe: 'HP', namaBarang: 'A', imei1: IMEI_A, hargaBeli: 1 }],
    } as any)).toThrow();
    expect(palsu.sheet('Stok_HP').data()).toHaveLength(0);
    expect(palsu.sheet('Pembelian_Item').data()).toHaveLength(0);
    expect(palsu.lockDipegang()).toBe(false);
  });
});

describe('simpanPenjualan', () => {
  it('lunas: unit Terjual, penjualan Aktif, laba dan garansi benar', () => {
    unit('UNT-2609-0001', IMEI_A);
    const h = Penjualan.simpanPenjualan(jualDasar());
    expect(h).toMatchObject({ idPenjualan: 'JUAL-2610-0001', total: 3500000, sisa: 0, labaKotor: 500000, garansiSampai: '14 Okt 2026 (7 hari)' });
    const terjual = palsu.sheet('Stok_HP').data()[0];
    expect(terjual).toMatchObject({ Status: 'Terjual', ID_Penjualan: 'JUAL-2610-0001' });
    expect(tglSel(terjual.Tgl_Keluar)).toBe('2026-10-07');
    expect(palsu.sheet('Penjualan').data()[0]).toMatchObject({ Status: 'Aktif', Status_Bayar: 'Lunas', Laba_Kotor: 500000 });
    const item = palsu.sheet('Penjualan_Item').data()[0];
    expect(item).toMatchObject({ Tipe: 'HP', HPP: 3000000, Laba_Item: 500000 });
    expect(tglSel(item.Garansi_Hingga)).toBe('2026-10-14');
    expect(palsu.sheet('Hutang_Piutang').data()).toHaveLength(0);
  });

  it('HP baru bergaransi 12 bulan', () => {
    unit('UNT-2609-0001', IMEI_A, { Kondisi: 'Baru' });
    const h = Penjualan.simpanPenjualan(jualDasar());
    expect(h.garansiSampai).toBe('07 Okt 2027 (12 bulan)');
  });

  it('tempo: piutang, pembayaran awal, dan pelanggan baru terhubung lewat ID', () => {
    unit('UNT-2609-0001', IMEI_A);
    const h = Penjualan.simpanPenjualan(jualDasar({ dibayar: 1000000, jatuhTempo: '2026-10-21', metodeBayar: 'Cicilan' }));
    expect(h).toMatchObject({ sisa: 2500000, idTagihan: 'TGH-2610-0001' });
    const t = palsu.sheet('Hutang_Piutang').data()[0];
    expect(t).toMatchObject({ Jenis: 'Piutang pelanggan', ID_Referensi: 'JUAL-2610-0001', Sisa: 2500000, Status: 'Sebagian' });
    const k = palsu.sheet('Kontak').data()[0];
    expect(k).toMatchObject({ Nama: 'Budi Santoso', No_WA: '6281234567890', Total_Transaksi: 1 });
    expect(t.ID_Kontak).toBe(k.ID_Kontak);
    expect(palsu.sheet('Pembayaran').data()[0]).toMatchObject({ Jumlah: 1000000, Catatan: 'Pembayaran awal JUAL-2610-0001' });
  });

  it('pelanggan yang sama (nomor WA sama) tidak diduplikasi, jumlah transaksinya naik', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B);
    Penjualan.simpanPenjualan(jualDasar());
    Penjualan.simpanPenjualan(jualDasar({ noWa: '+62 812 3456 7890', items: [{ tipe: 'HP', idUnit: 'UNT-2609-0002', harga: 3500000 }] }));
    const k = palsu.sheet('Kontak').data();
    expect(k).toHaveLength(1);
    expect(k[0].Total_Transaksi).toBe(2);
  });

  it('piutang wajib pelanggan, WA, dan tanggal jatuh tempo yang valid', () => {
    unit('UNT-2609-0001', IMEI_A);
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ namaPelanggan: 'Pelanggan Umum', dibayar: 0, jatuhTempo: '2026-10-21' }))).kode).toBe('TEMPO_BUTUH_PELANGGAN');
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ noWa: '', dibayar: 0, jatuhTempo: '2026-10-21' }))).kode).toBe('TEMPO_BUTUH_WA');
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ dibayar: 0 }))).kode).toBe('TEMPO_BUTUH_TANGGAL');
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ dibayar: 0, jatuhTempo: '2026-10-01' }))).kode).toBe('TEMPO_TANGGAL_LALU');
    expect(palsu.sheet('Penjualan').data()).toHaveLength(0);
  });

  it('menolak unit yang sedang Servis atau sudah Terjual', () => {
    unit('UNT-2609-0001', IMEI_A, { Status: 'Servis' });
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar())).kode).toBe('UNIT_TIDAK_TERSEDIA');
  });

  it('aksesoris + bonus: stok berkurang, bonus jadi biaya (laba negatif), harga bonus 0', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 10);
    aks('ACC-2609-0002', 5, { Nama_Barang: 'Kabel Data', Harga_Beli_Rata2: 15000 });
    const h = Penjualan.simpanPenjualan(jualDasar({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 2, harga: 25000 }],
      bonus: [{ nama: 'Kabel Data', sku: 'ACC-2609-0002', qty: 1 }, { nama: 'Casing silikon', hpp: 12000 }],
      dibayar: 3550000,
    }));
    expect(h.subtotal).toBe(3550000);
    expect(h.biayaBonus).toBe(27000);
    // (3.550.000) - modal(3.000.000 + 2x5.000) - bonus 27.000
    expect(h.labaKotor).toBe(513000);
    const stok = palsu.sheet('Stok_Aksesoris').data();
    expect(stok.find(a => a.SKU === 'ACC-2609-0001')).toMatchObject({ Stok: 8 });
    expect(stok.find(a => a.SKU === 'ACC-2609-0002')).toMatchObject({ Stok: 4 });
    const bonus = palsu.sheet('Penjualan_Item').data().filter(i => i.Tipe === 'Bonus');
    expect(bonus.map(b => [b.Harga_Jual, b.Laba_Item])).toEqual([[0, -15000], [0, -12000]]);
  });

  it('stok aksesoris kurang ditolak tanpa menulis apa pun', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 1);
    const e = galat(() => Penjualan.simpanPenjualan(jualDasar({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 2, harga: 25000 }],
    })));
    expect(e.kode).toBe('STOK_KURANG');
    expect(palsu.sheet('Stok_HP').data()[0].Status).toBe('Ready');
  });

  it('tukar tambah: unit masuk stok, total berkurang, laba tidak memotong nilai TT', () => {
    unit('UNT-2609-0001', IMEI_A);
    const h = Penjualan.simpanPenjualan(jualDasar({
      tukarTambah: { ada: true, model: 'iPhone 11 64GB', imei: IMEI_TT, nilai: 2000000 }, dibayar: 1500000,
    }));
    expect(h).toMatchObject({ total: 1500000, nilaiTukarTambah: 2000000, sisa: 0, labaKotor: 500000 });
    const tt = palsu.sheet('Stok_HP').data().find(u => u.IMEI_1 === IMEI_TT)!;
    expect(tt).toMatchObject({ Sumber: 'Tukar Tambah', HPP: 2000000, Status: 'Ready', ID_Sumber: 'JUAL-2610-0001' });
    expect(palsu.sheet('Tukar_Tambah').data()[0]).toMatchObject({ Nilai_Taksir: 2000000, ID_Unit_Masuk: tt.ID_Unit });
  });

  it('tukar tambah menyimpan detail unit yang sama dengan Barang Masuk (IMEI 2, grade, baterai, kelengkapan, harga jual)', () => {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({
      tukarTambah: {
        ada: true, model: 'Samsung Galaxy S21 8/128 GB Abu-abu', imei: IMEI_TT, imei2: '490154203237526', nilai: 1500000,
        kondisiUnit: 'Bekas', grade: 'A', kelengkapan: 'Fullset', bateraiPersen: 87, bebasKunciAkun: 'Ya', hargaJualTarget: 2100000,
      }, dibayar: 2000000,
    }));
    const tt = palsu.sheet('Stok_HP').data().find(u => u.IMEI_1 === IMEI_TT)!;
    expect(tt).toMatchObject({
      Nama_Barang: 'Samsung Galaxy S21 8/128 GB Abu-abu', IMEI_2: '490154203237526', Kondisi: 'Bekas', Grade: 'A', Kelengkapan: 'Fullset',
      Baterai_Persen: 87, Bebas_Kunci_Akun: 'Ya', Harga_Jual_Target: 2100000, HPP: 1500000, Status: 'Ready',
    });
  });

  it('tukar tambah tanpa detail tetap memakai bawaan lama (margin 15 persen, unit saja)', () => {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 }, dibayar: 2500000 }));
    const tt = palsu.sheet('Stok_HP').data().find(u => u.IMEI_1 === IMEI_TT)!;
    expect(tt).toMatchObject({ Kondisi: 'Bekas', Kelengkapan: 'Unit saja', Bebas_Kunci_Akun: 'Belum dicek', Harga_Jual_Target: 1150000 });
  });

  it('IMEI 2 dan baterai tukar tambah divalidasi', () => {
    unit('UNT-2609-0001', IMEI_A);
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'X', imei: IMEI_TT, imei2: '12', nilai: 1 } }))).kode).toBe('IMEI_TIDAK_VALID');
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'X', imei: IMEI_TT, imei2: IMEI_TT, nilai: 1 } }))).kode).toBe('IMEI_GANDA');
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'X', imei: IMEI_TT, bateraiPersen: 140, nilai: 1 } }))).kode).toBe('BATERAI_TIDAK_VALID');
  });

  it('beberapa unit HP berbeda dalam satu nota: semua Terjual, laba dijumlah, harga per unit dipakai', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B, { HPP: 2000000, Harga_Beli: 2000000, Harga_Jual_Target: 2400000 });
    const h = Penjualan.simpanPenjualan(jualDasar({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3400000 }, { tipe: 'HP', idUnit: 'UNT-2609-0002', harga: 2300000 }], dibayar: 5700000,
    }));
    expect(h).toMatchObject({ total: 5700000, sisa: 0, labaKotor: 700000 });
    expect(palsu.sheet('Stok_HP').data().map(u => u.Status)).toEqual(['Terjual', 'Terjual']);
    expect(palsu.sheet('Penjualan_Item').data()).toHaveLength(2);
  });

  it('IMEI tukar tambah wajib valid dan tidak boleh sudah ada di stok', () => {
    unit('UNT-2609-0001', IMEI_A);
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'X', imei: '123', nilai: 1 } }))).kode).toBe('IMEI_TIDAK_VALID');
    unit('UNT-2609-0002', IMEI_TT);
    expect(galat(() => Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'X', imei: IMEI_TT, nilai: 1 } }))).kode).toBe('IMEI_GANDA');
  });

  it('rollback: gagal menulis Penjualan_Item membatalkan header, unit, stok, dan ID tetap berlanjut', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 10);
    palsu.sheet('Penjualan_Item').gagalTulis = true;
    expect(() => Penjualan.simpanPenjualan(jualDasar({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 2, harga: 25000 }],
    }))).toThrow();
    expect(palsu.sheet('Penjualan').data()).toHaveLength(0);
    expect(palsu.sheet('Stok_HP').data()[0].Status).toBe('Ready');
    expect(palsu.sheet('Stok_Aksesoris').data()[0].Stok).toBe(10);
    expect(palsu.lockDipegang()).toBe(false);
  });
});

describe('terimaPembayaran', () => {
  function jualTempo() {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({ dibayar: 1000000, jatuhTempo: '2026-10-21' }));
  }

  it('cicilan bertahap sampai lunas, transaksi asal ikut sinkron', () => {
    jualTempo();
    const a = Tagihan.terimaPembayaran('TGH-2610-0001', 1000000, 'Transfer');
    expect(a).toMatchObject({ terbayar: 2000000, sisa: 1500000, status: 'Sebagian' });
    const b = Tagihan.terimaPembayaran('TGH-2610-0001', 1500000, 'Tunai', 'pelunasan');
    expect(b).toMatchObject({ sisa: 0, status: 'Lunas' });
    expect(palsu.sheet('Penjualan').data()[0]).toMatchObject({ Dibayar: 3500000, Sisa_Tagihan: 0, Status_Bayar: 'Lunas' });
    expect(palsu.sheet('Pembayaran').data()).toHaveLength(3);
  });

  it('menolak nominal melebihi sisa, nol, dan tagihan yang sudah lunas', () => {
    jualTempo();
    expect(galat(() => Tagihan.terimaPembayaran('TGH-2610-0001', 9999999, 'Tunai')).kode).toBe('MELEBIHI_SISA');
    expect(galat(() => Tagihan.terimaPembayaran('TGH-2610-0001', 0, 'Tunai')).kode).toBe('NOMINAL_TIDAK_VALID');
    Tagihan.terimaPembayaran('TGH-2610-0001', 2500000, 'Tunai');
    expect(galat(() => Tagihan.terimaPembayaran('TGH-2610-0001', 1, 'Tunai')).kode).toBe('SUDAH_LUNAS');
  });
});

describe('batalkanTransaksi', () => {
  it('mengembalikan stok, menarik unit tukar tambah, membatalkan tagihan', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 10);
    Penjualan.simpanPenjualan(jualDasar({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 2, harga: 25000 }],
      bonus: [{ nama: 'Casing', hpp: 12000 }],
      tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 }, dibayar: 1000000, jatuhTempo: '2026-10-21',
    }));
    const r = Penjualan.batalkanTransaksi('JUAL-2610-0001', 'Pelanggan batal', 'tidak jadi beli');
    expect(r.status).toBe('Batal');
    const stok = palsu.sheet('Stok_HP').data();
    expect(stok.find(u => u.ID_Unit === 'UNT-2609-0001')).toMatchObject({ Status: 'Ready', ID_Penjualan: '', Tgl_Keluar: '' });
    expect(stok.find(u => u.IMEI_1 === IMEI_TT)).toMatchObject({ Status: 'Batal' });
    expect(palsu.sheet('Stok_Aksesoris').data()[0].Stok).toBe(10);
    expect(palsu.sheet('Hutang_Piutang').data()[0].Status).toBe('Batal');
    expect(palsu.sheet('Penjualan').data()[0]).toMatchObject({ Status: 'Batal' });
    expect(String(palsu.sheet('Penjualan').data()[0].Catatan)).toContain('BATAL: Pelanggan batal');
  });

  it('unit yang sudah dibatalkan bisa dijual lagi; IMEI tukar tambah yang batal boleh dipakai lagi', () => {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 }, dibayar: 2500000 }));
    Penjualan.batalkanTransaksi('JUAL-2610-0001', 'salah input');
    const ulang = Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 }, dibayar: 2500000 }));
    expect(ulang.idPenjualan).toBe('JUAL-2610-0002');
  });

  it('ditolak bila sudah batal, bila alasan kosong, atau unit tukar tambah sudah terjual', () => {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({ tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 }, dibayar: 2500000 }));
    expect(galat(() => Penjualan.batalkanTransaksi('JUAL-2610-0001', '  ')).kode).toBe('ALASAN_KOSONG');
    const idTT = palsu.sheet('Stok_HP').data().find(u => u.IMEI_1 === IMEI_TT)!.ID_Unit;
    // unit TT dijual lebih dulu
    palsu.sheet('Stok_HP').rows.forEach(r => { if (r[0] === idTT) r[HEADER.Stok_HP.indexOf('Status')] = 'Terjual'; });
    expect(galat(() => Penjualan.batalkanTransaksi('JUAL-2610-0001', 'batal')).kode).toBe('TT_SUDAH_DIPAKAI');
    expect(palsu.sheet('Penjualan').data()[0].Status).toBe('Aktif'); // tidak berubah
    expect(galat(() => Penjualan.batalkanTransaksi('BELI-2610-0001', 'x')).kode).toBe('BATAL_TIDAK_DIDUKUNG');
  });
});

describe('data master', () => {
  it('kontak: normalisasi WA, tolak nomor ganda dan nama kosong', () => {
    const a = Code.simpanKontak({ nama: 'Siti', tipe: 'Pelanggan', noWa: '0812-1111-2222' }) as any;
    expect(a.ok).toBe(true);
    expect(palsu.sheet('Kontak').data()[0]).toMatchObject({ Nama: 'Siti', No_WA: '6281211112222', Total_Transaksi: 0 });
    expect(Code.simpanKontak({ nama: 'Siti 2', tipe: 'Supplier', noWa: '+62 812 1111 2222' }) as any).toMatchObject({ ok: false, kode: 'WA_GANDA' });
    expect(Code.simpanKontak({ nama: ' ', tipe: 'Supplier' }) as any).toMatchObject({ ok: false, kode: 'NAMA_KOSONG' });
  });

  it('produk: nama lengkap dibentuk, produk kembar ditolak, muncul di getSemuaData', () => {
    const p = { jenis: 'HP', platform: 'Android', merek: 'Samsung', model: 'Galaxy A54', varian: '8/256', warna: 'Hitam', hargaStandar: 4200000 } as const;
    expect((Code.simpanProduk(p) as any).ok).toBe(true);
    expect(Code.simpanProduk(p) as any).toMatchObject({ ok: false, kode: 'PRODUK_GANDA' });
    const d = (Code.getSemuaData() as any).data;
    expect(d.katalog[0]).toMatchObject({ merek: 'Samsung', hargaStandar: 4200000, aktif: true });
    expect(palsu.sheet('Produk').data()[0].Nama_Lengkap).toBe('Samsung Galaxy A54 8/256 Hitam');
  });
});

describe('API publik (Code.ts)', () => {
  it('idemKey: kirim dua kali menghasilkan satu penjualan dan respons yang sama', () => {
    unit('UNT-2609-0001', IMEI_A);
    const a = Code.simpanPenjualan(jualDasar(), 'idem_abc') as any;
    const b = Code.simpanPenjualan(jualDasar(), 'idem_abc') as any;
    expect(a.ok).toBe(true);
    expect(b).toEqual(a);
    expect(palsu.sheet('Penjualan').data()).toHaveLength(1);
  });

  it('galat bisnis kembali sebagai { ok:false, kode, pesan } dan tidak diingat idemKey', () => {
    const r = Code.simpanPenjualan(jualDasar(), 'idem_x') as any;
    expect(r).toMatchObject({ ok: false, kode: 'UNIT_TIDAK_ADA' });
    expect(typeof r.pesan).toBe('string');
    unit('UNT-2609-0001', IMEI_A);
    expect((Code.simpanPenjualan(jualDasar(), 'idem_x') as any).ok).toBe(true); // coba lagi dengan kunci yang sama
  });

  it('galat tak terduga menjadi ERROR_SISTEM, kunci dilepas', () => {
    palsu.sheet('Pembelian').gagalTulis = true;
    const r = Code.simpanPembelian({ namaSupplier: 'X', metodeBayar: 'Tunai', dibayar: 1, items: [{ tipe: 'HP', namaBarang: 'A', imei1: IMEI_A, hargaBeli: 1 }] } as any) as any;
    expect(r).toMatchObject({ ok: false, kode: 'ERROR_SISTEM' });
    expect(palsu.lockDipegang()).toBe(false);
  });

  it('cariStok: cocok dengan 4 digit akhir IMEI, 50 per halaman, hasil berisi teks (bukan Date)', () => {
    for (let i = 1; i <= 60; i++) unit(`UNT-2609-${String(i).padStart(4, '0')}`, `35812345678${String(i).padStart(4, '0')}`);
    const semua = (Code.cariStok('', undefined, 1) as any).data;
    expect(semua).toMatchObject({ total: 60, halaman: 1, ukuran: 50 });
    expect(semua.items).toHaveLength(50);
    expect((Code.cariStok('', undefined, 2) as any).data.items).toHaveLength(10);
    expect((Code.cariStok('0042') as any).data.items.map((u: any) => u.ID_Unit)).toEqual(['UNT-2609-0042']);
  });
});

describe('getSemuaData', () => {
  it('membawa model layar, tanpa objek Date, dengan penjualan/tagihan/transaksi konsisten', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B, { Tgl_Masuk: '2026-08-01' });
    aks('ACC-2609-0001', 2);
    Penjualan.simpanPenjualan(jualDasar({ dibayar: 1000000, jatuhTempo: '2026-10-21' }));
    Tagihan.terimaPembayaran('TGH-2610-0001', 500000, 'Tunai', 'cicil');
    const d = (Code.getSemuaData() as any).data;

    // google.script.run gagal bila ada Date di dalam hasil
    const adaDate = (v: unknown): boolean => v instanceof Date || (v && typeof v === 'object' ? Object.values(v as object).some(adaDate) : false);
    expect(adaDate(d)).toBe(false);

    const lama = d.stok.find((u: any) => u.id === 'UNT-2609-0002');
    expect(lama).toMatchObject({ umurHari: 67, tglMasuk: '01 Agu 2026', status: 'Ready', imei: IMEI_B });
    expect(d.stok.find((u: any) => u.id === 'UNT-2609-0001')).toMatchObject({ status: 'Terjual', notaJualId: 'JUAL-2610-0001' });
    expect(d.aksesoris[0]).toMatchObject({ sku: 'ACC-2609-0001', stok: 2, status: 'Menipis' });

    const jual = d.transaksi.find((t: any) => t.id === 'JUAL-2610-0001');
    expect(jual).toMatchObject({ tipe: 'Jual', pihak: 'Budi Santoso', nominal: 3500000, status: 'Sebagian', dibayar: 1500000, sisa: 2000000, jatuhTempo: '21 Okt 2026', metode: 'Tunai' }); // 1.000.000 awal + 500.000 cicilan
    // pembayaran awal tidak tampil sebagai transaksi Bayar sendiri, cicilan tampil
    const bayar = d.transaksi.filter((t: any) => t.tipe === 'Bayar');
    expect(bayar).toHaveLength(1);
    expect(bayar[0]).toMatchObject({ nominal: 500000, jam: '10.00' });

    const t = d.tagihan[0];
    expect(t).toMatchObject({ id: 'TGH-2610-0001', kontak: 'Budi Santoso', noWa: '081234567890', sisa: 2000000, terbayar: 1500000, status: 'Sebagian', hariTelat: 0, refId: 'JUAL-2610-0001' });
    expect(t.riwayatBayar).toHaveLength(2);
    expect(d.belumTerhubung).toEqual([]); // semua daftar kini dilayani server
  });

  it('penjualan batal tampil Dibatalkan, tagihan batal hilang, unit TT batal tersembunyi; tagihan lewat tempo = Telat', () => {
    unit('UNT-2609-0001', IMEI_A);
    Penjualan.simpanPenjualan(jualDasar({ dibayar: 0, jatuhTempo: '2026-10-07', tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 100000 } }));
    let d = (Code.getSemuaData() as any).data;
    expect(d.tagihan[0].status).toBe('Belum');

    vi.setSystemTime(new Date('2026-10-12T03:00:00Z')); // 5 hari setelah jatuh tempo
    d = (Code.getSemuaData() as any).data;
    expect(d.tagihan[0]).toMatchObject({ status: 'Telat', hariTelat: 5 });
    expect(Tagihan.cekTagihanTelat()).toBe(1);
    expect(palsu.sheet('Hutang_Piutang').data()[0]).toMatchObject({ Status: 'Telat', Hari_Telat: 5 });

    Penjualan.batalkanTransaksi('JUAL-2610-0001', 'batal');
    d = (Code.getSemuaData() as any).data;
    expect(d.tagihan).toHaveLength(0);
    expect(d.stok.some((u: any) => u.imei === IMEI_TT)).toBe(false);
    expect(d.transaksi.find((t: any) => t.id === 'JUAL-2610-0001')).toMatchObject({ status: 'Dibatalkan', catatanBatal: 'batal' });
  });
});
