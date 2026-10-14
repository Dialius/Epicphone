// backend-modul-lanjut.test.ts — Servis, Garansi/Klaim, Biaya, Laporan (PRD 05), Nota PDF, Foto, Backup.
// Layanan asli dijalankan di atas Spreadsheet dan Drive palsu.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pasangGasFake, Palsu } from '../helpers/gas-fake';
import { pasangDriveFake, siapkanFolder, DrivePalsu } from '../helpers/drive-fake';
import { HEADER } from '../../src/backend/Skema';

let palsu: Palsu;
let drive: DrivePalsu;
let M: Record<string, any>;

const IMEI_A = '358123456789012';
const IMEI_B = '358123456789020';
const IMEI_C = '490154203237518';
const IMEI_TT = '352099001761481';
const FOLDER_DASAR = ['00_ASET-BRAND', '01_DATABASE', '02_FOTO-HP/_TERHAPUS', '03_NOTA/RIWAYAT', '04_BUKTI-TRANSAKSI/PEMBELIAN',
  '04_BUKTI-TRANSAKSI/PEMBAYARAN', '04_BUKTI-TRANSAKSI/BIAYA', '05_SERVIS', '06_LAPORAN', '07_BACKUP/HARIAN', '07_BACKUP/BULANAN',
  '07_BACKUP/MINGGUAN', '07_BACKUP/PRA-RILIS', '07_BACKUP/PRA-MIGRASI', '07_BACKUP/PENGAMAN-PULIH', '08_ARSIP'];

function isi(sheet: string, data: Record<string, unknown>) {
  palsu.sheet(sheet).rows.push(HEADER[sheet].map(k => (data[k] === undefined ? '' : data[k])));
}
function unit(id: string, imei: string, o: Record<string, unknown> = {}) {
  isi('Stok_HP', { ID_Unit: id, Tgl_Masuk: new Date(2026, 8, 20), Jam_Masuk: '09:00', IMEI_1: imei, Nama_Barang: 'Samsung Galaxy A54', Kondisi: 'Bekas',
    Kelengkapan: 'Fullset', Harga_Beli: 3000000, Biaya_Lain: 0, Biaya_Servis: 0, HPP: 3000000, Harga_Jual_Target: 3500000, Status: 'Ready', ...o });
}
function aks(sku: string, stok: number, o: Record<string, unknown> = {}) {
  isi('Stok_Aksesoris', { SKU: sku, Nama_Barang: 'Tempered Glass', Kategori: 'Pelindung layar', Stok: stok, Stok_Minimum: 3, Harga_Beli_Rata2: 5000, Harga_Jual: 25000, Status: 'Aman', ...o });
}
const jual = (o: Record<string, unknown> = {}) => ({
  namaPelanggan: 'Budi Santoso', noWa: '0812-3456-7890', metodeBayar: 'Tunai', items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }], dibayar: 3500000, ...o,
}) as any;
const galat = (fn: () => unknown) => { try { fn(); } catch (e) { return e as { kode: string; message: string }; } throw new Error('seharusnya melempar galat'); };
const tgl = (v: unknown) => (globalThis as any).Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
const baris = (sheet: string) => palsu.sheet(sheet).data();

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T03:00:00Z')); // 07 Okt 2026 10:00 WIB
  palsu = pasangGasFake();
  drive = pasangDriveFake();
  siapkanFolder(drive, FOLDER_DASAR.map(f => 'EPICPHONE_00_SISTEM/' + f));
  M = {
    Servis: await import('../../src/backend/ServisService'), Garansi: await import('../../src/backend/GaransiService'), Konsistensi: await import('../../src/backend/Konsistensi'),
    Biaya: await import('../../src/backend/BiayaService'), Tagihan: await import('../../src/backend/TagihanService'), Laporan: await import('../../src/backend/Laporan'),
    Nota: await import('../../src/backend/Nota'), Foto: await import('../../src/backend/FotoService'),
    Jobs: await import('../../src/backend/Jobs'), Jual: await import('../../src/backend/PenjualanService'),
    Beli: await import('../../src/backend/PembelianService'), Data: await import('../../src/backend/DataService'),
    Stok: await import('../../src/backend/StokService'), Code: await import('../../src/backend/Code'), Utils: await import('../../src/backend/Utils'), Nama: await import('../../src/backend/Penamaan'),
  };
});
afterEach(() => { vi.useRealTimers(); });

describe('Servis', () => {
  it('internal: kirim ke servis -> unit Servis; selesai menambah modal (HPP naik) dan unit jadi Ready', () => {
    unit('UNT-2609-0001', IMEI_A);
    const k = M.Servis.kirimKeServis('UNT-2609-0001', { keluhan: 'Layar retak', estimasiBiaya: 400000 });
    expect(k).toMatchObject({ idServis: 'SRV-2610-0001', idUnit: 'UNT-2609-0001', statusUnit: 'Servis' });
    expect(baris('Stok_HP')[0]).toMatchObject({ Status: 'Servis', Estimasi_Servis: 400000, HPP: 3000000, Biaya_Servis: 0 }); // estimasi belum masuk modal

    const s = M.Servis.updateStatusServis('SRV-2610-0001', 'Selesai', { biayaPart: 350000, biayaJasa: 50000, jadikanReady: true, tindakan: 'Ganti LCD' });
    expect(s).toMatchObject({ status: 'Selesai', hppLama: 3000000, hppBaru: 3400000, statusUnit: 'Ready' });
    expect(baris('Stok_HP')[0]).toMatchObject({ Status: 'Ready', Biaya_Servis: 400000, Estimasi_Servis: 0, HPP: 3400000 });
    expect(tgl(baris('Servis')[0].Tgl_Selesai)).toBe('2026-10-07');
  });

  it('unit yang sudah Terjual tidak bisa diservis internal; alur status harus berurutan', () => {
    unit('UNT-2609-0001', IMEI_A, { Status: 'Terjual' });
    expect(galat(() => M.Servis.simpanServis({ jenis: 'Internal', idUnit: 'UNT-2609-0001', keluhan: 'x' })).kode).toBe('UNIT_TIDAK_BISA_DISERVIS');
    unit('UNT-2609-0002', IMEI_B);
    const { idServis } = M.Servis.simpanServis({ jenis: 'Internal', idUnit: IMEI_B, keluhan: 'Mati total' }); // bisa dicari lewat IMEI
    expect(galat(() => M.Servis.updateStatusServis(idServis, 'Diambil')).kode).toBe('STATUS_TIDAK_VALID');
    M.Servis.updateStatusServis(idServis, 'Dikerjakan');
    expect(baris('Servis')[0].Status).toBe('Dikerjakan');
    expect(galat(() => M.Servis.simpanServis({ jenis: 'Internal', idUnit: 'UNT-9999-0001', keluhan: 'x' })).kode).toBe('UNIT_TIDAK_ADA');
  });

  it('servis pelanggan: laba = tarif - part - jasa, kontak dibuat dari nomor WA, tidak menyentuh stok', () => {
    unit('UNT-2609-0001', IMEI_A);
    const { idServis } = M.Servis.simpanServis({ jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', imei: IMEI_C, namaPelanggan: 'Siti', noWa: '0812-1111-2222', keluhan: 'Baterai drop', tarifPelanggan: 300000 });
    expect(baris('Kontak')[0]).toMatchObject({ Nama: 'Siti', No_WA: '6281211112222' });
    const r = M.Servis.updateStatusServis(idServis, 'Selesai', { biayaPart: 100000, biayaJasa: 50000 });
    expect(r.labaServis).toBe(150000);
    expect(baris('Servis')[0]).toMatchObject({ Laba_Servis: 150000, Tarif_Pelanggan: 300000 });
    expect(baris('Stok_HP')[0].Status).toBe('Ready');
    M.Servis.updateStatusServis(idServis, 'Diambil');
    expect(baris('Servis')[0].Status).toBe('Diambil');
  });

  it('servis internal dibatalkan: unit bisa dipindah ke Rusak dan kerugian tercatat tanggalnya', () => {
    unit('UNT-2609-0001', IMEI_A, { HPP: 2000000, Harga_Beli: 2000000 });
    const { idServis } = M.Servis.kirimKeServis('UNT-2609-0001', { keluhan: 'Mati total', estimasiBiaya: 900000 });
    M.Servis.updateStatusServis(idServis, 'Batal', { unitJadi: 'Rusak' });
    const u = baris('Stok_HP')[0];
    expect(u).toMatchObject({ Status: 'Rusak', Estimasi_Servis: 0, HPP: 2000000 });
    expect(tgl(u.Tgl_Rusak)).toBe('2026-10-07');
  });

  it('perpindahan status unit mengikuti alur PRD (Terjual tidak bisa langsung Ready, Rusak final)', () => {
    unit('UNT-2609-0001', IMEI_A, { Status: 'Terjual' });
    const { ubahStatusUnit } = M.Stok;
    expect(galat(() => ubahStatusUnit('UNT-2609-0001', 'Ready')).kode).toBe('STATUS_TIDAK_VALID');
    ubahStatusUnit('UNT-2609-0001', 'Retur');
    ubahStatusUnit('UNT-2609-0001', 'Rusak');
    expect(galat(() => ubahStatusUnit('UNT-2609-0001', 'Ready')).kode).toBe('STATUS_TIDAK_VALID');
  });
});

describe('Garansi, klaim, retur, refund', () => {
  function jualBekas(diskon = 0) {
    unit('UNT-2609-0001', IMEI_A);
    return M.Jual.simpanPenjualan(jual({ diskon, dibayar: 3500000 - diskon }));
  }

  it('cekGaransi lewat nota atau 4 digit akhir IMEI: aktif 7 hari untuk bekas, habis setelahnya', () => {
    jualBekas();
    const a = M.Garansi.cekGaransi('JUAL-2610-0001');
    expect(a).toMatchObject({ idUnit: 'UNT-2609-0001', imei: IMEI_A, pelanggan: 'Budi Santoso', tglJual: '07 Okt 2026', garansiSampai: '14 Okt 2026', sisaHari: 7, statusGaransi: 'Aktif' });
    expect(M.Garansi.cekGaransi('9012')?.nota).toBe('JUAL-2610-0001');
    expect(M.Garansi.cekGaransi('0000')).toBeNull();
    vi.setSystemTime(new Date('2026-10-20T03:00:00Z'));
    expect(M.Garansi.cekGaransi(IMEI_A)).toMatchObject({ statusGaransi: 'Habis', sisaHari: -6 });
  });

  it('klaim garansi dengan servis: membuat servis pelanggan tarif 0 yang terhubung ke klaim', () => {
    jualBekas();
    const r = M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Klaim garansi', alasan: 'Speaker mati', tindakan: 'Servis' });
    expect(r).toMatchObject({ idKlaim: 'KLM-2610-0001', status: 'Diproses', masihGaransi: true, dampakLaba: 0 });
    expect(baris('Servis')[0]).toMatchObject({ Jenis: 'Pelanggan', Tarif_Pelanggan: 0, ID_Klaim: 'KLM-2610-0001', IMEI: IMEI_A });
    expect(baris('Garansi_Retur')[0]).toMatchObject({ Masih_Garansi: 'Ya', Jenis: 'Klaim garansi' });
    expect(baris('Stok_HP')[0].Status).toBe('Terjual'); // unit milik pelanggan
  });

  it('retur penuh: unit kembali Ready, laba penjualan dibalik (diskon proporsional), tidak bisa diretur dua kali', () => {
    jualBekas(100000);
    const r = M.Garansi.simpanKlaim({ referensi: 'JUAL-2610-0001', jenis: 'Retur', alasan: 'Tidak cocok' });
    expect(r).toMatchObject({ status: 'Selesai', dampakLaba: -400000 }); // (3.500.000 - 100.000 diskon - 3.000.000)
    expect(baris('Stok_HP')[0]).toMatchObject({ Status: 'Ready', ID_Penjualan: '', HPP: 3000000 });
    expect(galat(() => M.Garansi.simpanKlaim({ referensi: 'JUAL-2610-0001', jenis: 'Retur', alasan: 'lagi' })).kode).toBe('STATUS_TIDAK_VALID');
  });

  it('retur dengan unit kembali rusak: unit Rusak dan tanggal kerusakan tercatat', () => {
    jualBekas();
    M.Garansi.simpanKlaim({ referensi: 'JUAL-2610-0001', jenis: 'Retur', alasan: 'Layar pecah', kondisiKembali: 'Rusak' });
    const u = baris('Stok_HP')[0];
    expect(u.Status).toBe('Rusak');
    expect(tgl(u.Tgl_Rusak)).toBe('2026-10-07');
  });

  it('refund sebagian: kerugian = nilai refund, unit tetap Terjual; refund penuh harus lewat Retur', () => {
    jualBekas();
    expect(galat(() => M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Refund', alasan: 'Lecet', nilaiRefund: 0 })).kode).toBe('NOMINAL_TIDAK_VALID');
    expect(galat(() => M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Refund', alasan: 'Lecet', nilaiRefund: 3500000 })).kode).toBe('REFUND_PENUH');
    const r = M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Refund', alasan: 'Lecet', nilaiRefund: 150000 });
    expect(r).toMatchObject({ status: 'Selesai', dampakLaba: -150000 });
    expect(baris('Stok_HP')[0].Status).toBe('Terjual');
    expect(baris('Garansi_Retur')[0]).toMatchObject({ Nilai_Refund: 150000 });
  });

  it('tukar unit: unit pengganti Terjual atas nota yang sama, unit lama kembali Ready; dampak = selisih modal', () => {
    jualBekas();
    unit('UNT-2609-0002', IMEI_B, { HPP: 3200000, Harga_Beli: 3200000 });
    const r = M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Tukar unit', alasan: 'Mati total', unitPengganti: 'UNT-2609-0002' });
    expect(r).toMatchObject({ status: 'Selesai', dampakLaba: -200000 });
    const u = baris('Stok_HP');
    expect(u.find(x => x.ID_Unit === 'UNT-2609-0001')).toMatchObject({ Status: 'Ready', ID_Penjualan: '' });
    expect(u.find(x => x.ID_Unit === 'UNT-2609-0002')).toMatchObject({ Status: 'Terjual', ID_Penjualan: 'JUAL-2610-0001' });
    expect(galat(() => M.Garansi.simpanKlaim({ referensi: IMEI_B, jenis: 'Tukar unit', alasan: 'x', unitPengganti: 'UNT-2609-0001' })).kode).toBeDefined();
  });

  it('klaim ke nota/IMEI yang tidak ada ditolak; klaim setelah garansi habis dicatat sebagai tidak garansi', () => {
    expect(galat(() => M.Garansi.simpanKlaim({ referensi: 'JUAL-9999-0001', jenis: 'Retur', alasan: 'x' })).kode).toBe('PENJUALAN_TIDAK_DITEMUKAN');
    jualBekas();
    vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
    const r = M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Klaim garansi', alasan: 'Layar bergaris', tindakan: 'Servis' });
    expect(r.masihGaransi).toBe(false);
    expect(baris('Garansi_Retur')[0].Masih_Garansi).toBe('Tidak');
    expect(M.Garansi.updateStatusKlaim(r.idKlaim, 'Selesai').status).toBe('Selesai');
    expect(galat(() => M.Garansi.updateStatusKlaim(r.idKlaim, 'Diproses')).kode).toBe('KLAIM_SUDAH_TUTUP');
  });
});

describe('Kasus PRD 07 tambahan', () => {
  const beli = (o: Record<string, unknown> = {}) => ({ namaSupplier: 'CV Maju', metodeBayar: 'Tunai', dibayar: 1000000, items: [{ tipe: 'HP', namaBarang: 'Redmi 9A', imei1: IMEI_C, hargaBeli: 1000000, ...o }] }) as any;

  it('T03 IMEI kurang dari 15 digit ditolak dengan pesan yang jelas', () => {
    const e = galat(() => M.Beli.simpanPembelian(beli({ imei1: '12345' })));
    expect(e.kode).toBe('IMEI_TIDAK_VALID');
    expect(e.message).toContain('15 angka');
  });

  it('T28 barang masuk HP rusak dengan "Perlu servis": status Servis, tugas servis terbentuk, estimasi belum masuk modal, tidak bisa dijual', () => {
    const h = M.Beli.simpanPembelian(beli({ perluServis: true, keluhanServis: 'Layar pecah', estimasiServis: 400000, biayaLain: 20000 }));
    expect(h.servisCreated).toHaveLength(1);
    expect(baris('Stok_HP')[0]).toMatchObject({ Status: 'Servis', HPP: 1020000, Estimasi_Servis: 400000 });
    expect(baris('Servis')[0]).toMatchObject({ Jenis: 'Internal', Status: 'Antri', Estimasi_Biaya: 400000, ID_Unit: h.unitsCreated[0] });
    expect(galat(() => M.Jual.simpanPenjualan(jual({ items: [{ tipe: 'HP', idUnit: h.unitsCreated[0], harga: 1500000 }] }))).kode).toBe('UNIT_TIDAK_TERSEDIA');
  });

  it('T11 jual aksesoris dengan stok 0 ditolak', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 0, { Status: 'Habis' });
    expect(galat(() => M.Jual.simpanPenjualan(jual({ items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 1, harga: 25000 }] }))).kode).toBe('STOK_KURANG');
  });

  it('T24 nama pelanggan berisi rumus tersimpan sebagai teks, bukan rumus', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual({ namaPelanggan: '=HYPERLINK("http://jahat.example","klik")' }));
    const nama = String(baris('Penjualan')[0].Nama_Pelanggan);
    expect(nama.startsWith('=')).toBe(false);
    expect(typeof baris('Penjualan')[0].Nama_Pelanggan).toBe('string');
  });

  it('T27 batalkan penjualan dengan bonus dari stok: stok bonus kembali dan biaya bonus hilang dari laporan', () => {
    unit('UNT-2609-0001', IMEI_A);
    aks('ACC-2609-0001', 5, { Nama_Barang: 'Casing', Harga_Beli_Rata2: 15000 });
    M.Jual.simpanPenjualan(jual({ bonus: [{ nama: 'Casing', sku: 'ACC-2609-0001', qty: 2 }], dibayar: 3500000 }));
    expect(baris('Stok_Aksesoris')[0].Stok).toBe(3);
    expect(M.Laporan.hitungLabaBulanan(M.Laporan.bacaDataLaporan(), '2026-10').biayaBonus).toBe(30000);
    M.Jual.batalkanTransaksi('JUAL-2610-0001', 'salah');
    expect(baris('Stok_Aksesoris')[0]).toMatchObject({ Stok: 5, Status: 'Aman' });
    expect(M.Laporan.hitungLabaBulanan(M.Laporan.bacaDataLaporan(), '2026-10').biayaBonus).toBe(0);
  });

  it('T09 nota diperbarui setelah cicilan: versi lama ke RIWAYAT sebagai _v1_DIPERBARUI, status baru di PDF', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual({ dibayar: 1000000, jatuhTempo: '2026-10-20' }));
    M.Nota.buatNota('JUAL-2610-0001');
    M.Tagihan.terimaPembayaran('TGH-2610-0001', 2500000, 'Tunai');
    const baru = M.Nota.buatNota('JUAL-2610-0001');
    expect(drive.folder('EPICPHONE_00_SISTEM/03_NOTA/RIWAYAT')!.berkas.map((b: any) => b.nama)).toEqual(['EPICPHONE_NOTA_JUAL-2610-0001_v1_DIPERBARUI.pdf']);
    const isi = Buffer.from(baru.base64, 'base64').toString('latin1');
    expect(isi).toContain('LUNAS');
    expect(isi).not.toContain('BELUM LUNAS');
  });
});

describe('Data yang sebelumnya tidak masuk sheet', () => {
  const beli = (o: Record<string, unknown> = {}, root: Record<string, unknown> = {}) => ({
    namaSupplier: 'CV Maju Seluler', metodeBayar: 'Tunai', dibayar: 3000000, items: [{ tipe: 'HP', namaBarang: 'Samsung Galaxy A54 5G 8/256 Hitam', imei1: IMEI_A, hargaBeli: 3000000, ...o }], ...root,
  }) as any;

  it('supplier dari Barang Masuk dicatat di Kontak (Tipe Supplier) dan ID-nya terhubung ke pembelian; supplier sama tidak digandakan', () => {
    M.Beli.simpanPembelian(beli());
    M.Beli.simpanPembelian(beli({ imei1: IMEI_B }, { namaSupplier: '  cv maju seluler ' }));
    const kontak = baris('Kontak');
    expect(kontak).toHaveLength(1);
    expect(kontak[0]).toMatchObject({ Nama: 'CV Maju Seluler', Tipe: 'Supplier' });
    expect(baris('Pembelian').map(p => p.ID_Supplier)).toEqual([kontak[0].ID_Kontak, kontak[0].ID_Kontak]);
    expect((M.Code.getSemuaData() as any).data.kontak[0]).toMatchObject({ nama: 'CV Maju Seluler', tipe: 'Supplier', totalTransaksi: 2 });
  });

  it('nama supplier umum/kosong tidak membuat kontak; pelanggan yang juga supplier menjadi "Keduanya"', () => {
    M.Beli.simpanPembelian(beli({}, { namaSupplier: 'Supplier' }));
    M.Beli.simpanPembelian(beli({ imei1: IMEI_B }, { namaSupplier: '' }));
    expect(baris('Kontak')).toHaveLength(0);
    unit('UNT-2609-0001', IMEI_C);
    M.Jual.simpanPenjualan(jual({ namaPelanggan: 'Budi Santoso' }));
    M.Beli.simpanPembelian(beli({ imei1: '358123456789046' }, { namaSupplier: 'Budi Santoso' }));
    expect(baris('Kontak')).toHaveLength(1);
    expect(baris('Kontak')[0].Tipe).toBe('Keduanya');
  });

  it('ID_Produk terhubung otomatis bila nama cocok dengan katalog (juga untuk unit tukar tambah); IMEI 2 dan catatan tersimpan', () => {
    M.Code.simpanProduk({ jenis: 'HP', platform: 'Android', merek: 'Samsung', model: 'Galaxy A54 5G', varian: '8/256', warna: 'Hitam', hargaStandar: 4200000 });
    M.Code.simpanProduk({ jenis: 'HP', platform: 'iPhone', merek: 'Apple', model: 'iPhone 11', varian: '64GB', warna: '', hargaStandar: 4000000 });
    M.Beli.simpanPembelian(beli({ imei2: IMEI_B, catatan: 'Lecet halus di frame' }));
    const u = baris('Stok_HP')[0];
    expect(u).toMatchObject({ ID_Produk: 'PRD-2610-0001', IMEI_2: IMEI_B, Catatan: 'Lecet halus di frame' });
    expect(galat(() => M.Beli.simpanPembelian(beli({ imei1: IMEI_C, imei2: IMEI_B }))).kode).toBe('IMEI_GANDA'); // IMEI 2 sudah dipakai
    expect(galat(() => M.Beli.simpanPembelian(beli({ imei1: IMEI_C, imei2: '123' }))).kode).toBe('IMEI_TIDAK_VALID');
    unit('UNT-2609-0001', '358123456789046');
    M.Jual.simpanPenjualan(jual({ tukarTambah: { ada: true, model: 'Apple iPhone 11 64GB', imei: IMEI_TT, nilai: 1000000 }, dibayar: 2500000 }));
    expect(baris('Stok_HP').find(x => x.IMEI_1 === IMEI_TT)).toMatchObject({ ID_Produk: 'PRD-2610-0002' });
  });

  it('pembelian tempo wajib supplier dan tanggal jatuh tempo; hutang supplier tercatat dengan ID kontak', () => {
    expect(galat(() => M.Beli.simpanPembelian(beli({}, { metodeBayar: 'Tempo', dibayar: 1000000, namaSupplier: '' }))).kode).toBe('TEMPO_BUTUH_SUPPLIER');
    expect(galat(() => M.Beli.simpanPembelian(beli({}, { metodeBayar: 'Tempo', dibayar: 1000000 }))).kode).toBe('TEMPO_BUTUH_TANGGAL');
    expect(galat(() => M.Beli.simpanPembelian(beli({}, { metodeBayar: 'Tempo', dibayar: 1000000, jatuhTempo: '2026-10-01' }))).kode).toBe('TEMPO_TANGGAL_LALU');
    expect(galat(() => M.Beli.simpanPembelian(beli({}, { metodeBayar: 'Kredit' }))).kode).toBe('METODE_TIDAK_VALID');
    expect(baris('Stok_HP')).toHaveLength(0); // tidak ada yang tertulis saat ditolak
    M.Beli.simpanPembelian(beli({}, { metodeBayar: 'Tempo', dibayar: 1000000, jatuhTempo: '2026-10-20' }));
    const h = baris('Hutang_Piutang')[0];
    expect(h).toMatchObject({ Jenis: 'Hutang supplier', Nama: 'CV Maju Seluler', Total: 3000000, Terbayar: 1000000, Sisa: 2000000 });
    expect(h.ID_Kontak).toBe(baris('Kontak')[0].ID_Kontak);
    const d = (M.Code.getSemuaData() as any).data;
    expect(d.tagihan[0]).toMatchObject({ jenis: 'Hutang supplier', noWa: '', sisa: 2000000 });
  });

  it('pembelian aksesoris dari aplikasi: stok bertambah, stok minimum dari Pengaturan, produk terhubung', () => {
    palsu.sheet('Pengaturan').rows.push(HEADER.Pengaturan.map(k => ({ Kunci: 'STOK_MINIMUM_DEFAULT', Nilai: '5' } as any)[k] ?? ''));
    M.Beli.simpanPembelian({ namaSupplier: 'Toko Acc', metodeBayar: 'Tunai', dibayar: 200000, items: [{ tipe: 'Aksesoris', namaBarang: 'Kabel Data Type-C', kategori: 'Kabel', qty: 10, hargaBeli: 20000, hargaJualTarget: 45000 }] } as any);
    expect(baris('Stok_Aksesoris')[0]).toMatchObject({ Nama_Barang: 'Kabel Data Type-C', Kategori: 'Kabel', Stok: 10, Stok_Minimum: 5, Harga_Beli_Rata2: 20000, Harga_Jual: 45000, Status: 'Aman' });
    const d = (M.Code.getSemuaData() as any).data;
    expect(d.aksesoris[0]).toMatchObject({ sku: 'ACC-2610-0001', stok: 10, hargaJual: 45000 });
  });

  it('pelanggan bernama tanpa WhatsApp tetap masuk Kontak; nama kembar tidak ditautkan sembarangan', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B);
    M.Jual.simpanPenjualan(jual({ namaPelanggan: 'Pak Haji', noWa: '' }));
    M.Jual.simpanPenjualan(jual({ namaPelanggan: ' pak  haji ', noWa: '', items: [{ tipe: 'HP', idUnit: 'UNT-2609-0002', harga: 3500000 }] }));
    const k = baris('Kontak');
    expect(k).toHaveLength(1);
    expect(k[0]).toMatchObject({ Nama: 'Pak Haji', No_WA: '', Tipe: 'Pelanggan' });
    expect(baris('Penjualan').map(p => p.ID_Pelanggan)).toEqual([k[0].ID_Kontak, k[0].ID_Kontak]);
    expect((M.Code.getSemuaData() as any).data.kontak[0].totalTransaksi).toBe(2);
    // dua kontak bernama sama: tidak ditautkan (ambigu), tidak membuat kontak baru
    isi('Kontak', { ID_Kontak: 'KTK-2610-0099', Nama: 'Pak Haji', Tipe: 'Pelanggan', No_WA: '6281999999999' });
    unit('UNT-2609-0003', IMEI_C);
    M.Jual.simpanPenjualan(jual({ namaPelanggan: 'Pak Haji', noWa: '', items: [{ tipe: 'HP', idUnit: 'UNT-2609-0003', harga: 3500000 }] }));
    expect(baris('Kontak')).toHaveLength(2);
    expect(baris('Penjualan')[2].ID_Pelanggan).toBe('');
  });

  it('checklist tukar tambah dan catatan penjualan tersimpan', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual({
      catatan: 'Pelanggan minta nota atas nama toko', tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000, kondisi: { layar: 'Baik', baterai: 'Cacat', kamera: 'Baik', body: 'Cacat', faceJari: 'Baik' }, catatan: 'Baterai 78%' }, dibayar: 2500000,
    }));
    expect(baris('Tukar_Tambah')[0]).toMatchObject({ Kondisi_Layar: 'Baik', Kondisi_Baterai: 'Cacat', Kondisi_Kamera: 'Baik', Kondisi_Body: 'Cacat', Kondisi_FaceJari: 'Baik', Catatan: 'Baterai 78%' });
    expect(baris('Penjualan')[0].Catatan).toBe('Pelanggan minta nota atas nama toko');
  });

  it('nama teknisi/vendor yang diketik tersimpan dan tampil kembali; garansi mengikuti Pengaturan', () => {
    const { idServis } = M.Servis.simpanServis({ jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', namaPelanggan: 'Siti', keluhan: 'Baterai', pelaksana: 'Teknisi sendiri', namaVendor: 'Teknisi Sendiri (Mas Danang)' });
    expect(baris('Servis')[0]).toMatchObject({ Pelaksana: 'Teknisi sendiri', Nama_Vendor: 'Teknisi Sendiri (Mas Danang)' });
    expect((M.Code.getSemuaData() as any).data.servis[0].teknisi).toBe('Teknisi Sendiri (Mas Danang)');
    void idServis;
    palsu.sheet('Pengaturan').rows.push(HEADER.Pengaturan.map(k => ({ Kunci: 'GARANSI_BEKAS_HARI', Nilai: '14' } as any)[k] ?? ''));
    unit('UNT-2609-0001', IMEI_A);
    expect(M.Jual.simpanPenjualan(jual()).garansiSampai).toBe('21 Okt 2026 (14 hari)');
  });
});

describe('Sheet dari versi lama', () => {
  it('kolom yang belum ada ditambahkan otomatis dan isian tidak lagi hilang diam-diam', () => {
    unit('UNT-2609-0001', IMEI_A, { HPP: 2000000, Harga_Beli: 2000000 });
    const sh = palsu.sheet('Stok_HP');
    // jadikan sheet "versi lama": buang kolom Tgl_Rusak (ujung) dan Estimasi_Servis (tengah)
    ['Tgl_Rusak', 'Estimasi_Servis'].forEach(nama => { const i = sh.rows[0].indexOf(nama); sh.rows.forEach(r => r.splice(i, 1)); });
    expect(sh.rows[0]).toHaveLength(HEADER.Stok_HP.length - 2);
    const k = M.Servis.kirimKeServis('UNT-2609-0001', { keluhan: 'Mati total', estimasiBiaya: 900000 });
    M.Servis.updateStatusServis(k.idServis, 'Batal', { unitJadi: 'Rusak' });
    expect(sh.rows[0]).toEqual(HEADER.Stok_HP); // kolom kembali lengkap dan berurutan
    const u = baris('Stok_HP')[0];
    expect(u).toMatchObject({ ID_Unit: 'UNT-2609-0001', Status: 'Rusak', Harga_Beli: 2000000, IMEI_1: IMEI_A }); // data lama tetap sejajar
    expect(tgl(u.Tgl_Rusak)).toBe('2026-10-07');                     // isian baru benar-benar tersimpan
  });

  it('isian untuk kolom yang tidak ada di skema ditolak dengan pesan jelas (bukan dibuang diam-diam)', async () => {
    const { Db } = await import('../../src/backend/Db');
    expect(() => Db.append('Biaya_Operasional', { ID_Biaya: 'X', Kolom_Salah: 'abc' })).toThrow(/Kolom_Salah/);
    expect(() => Db.updateById('Biaya_Operasional', 'X', { Kolom_Salah: 'abc' })).not.toThrow(); // baris tidak ada: tidak ada yang diubah
    expect(M.Code.simpanBiaya({ kategori: 'Listrik', nominal: 1000 })).toMatchObject({ ok: true });
  });
});

describe('Cek Konsistensi dan Pengaturan', () => {
  it('data dari alur normal tidak menghasilkan selisih; data yang diubah di luar aplikasi terdeteksi', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Beli.simpanPembelian({ namaSupplier: 'CV Maju', metodeBayar: 'Tempo', dibayar: 500000, jatuhTempo: '2026-10-20', items: [{ tipe: 'HP', namaBarang: 'Redmi 9A', imei1: IMEI_C, hargaBeli: 1000000 }, { tipe: 'Aksesoris', namaBarang: 'Casing', qty: 5, hargaBeli: 10000 }] } as any);
    M.Jual.simpanPenjualan(jual({ dibayar: 1000000, jatuhTempo: '2026-10-21', diskon: 50000, bonus: [{ nama: 'Casing', hpp: 12000 }] }));
    M.Tagihan.terimaPembayaran('TGH-2610-0001', 300000, 'Transfer');
    const bersih = (M.Code.cekKonsistensi() as any).data;
    expect(bersih).toMatchObject({ ok: true, selisih: [] });
    expect(bersih.diperiksa).toMatchObject({ penjualan: 1, pembelian: 1, tagihan: 2, aksesoris: 1 });

    // owner mengubah angka langsung di Spreadsheet
    const h = HEADER;
    const ubah = (sheet: string, id: string, kolom: string, nilai: unknown) => palsu.sheet(sheet).rows.forEach(r => { if (r[0] === id) r[h[sheet].indexOf(kolom)] = nilai; });
    ubah('Penjualan', 'JUAL-2610-0001', 'Laba_Kotor', 9999999);
    ubah('Hutang_Piutang', 'TGH-2610-0001', 'Terbayar', 1);
    ubah('Stok_HP', 'UNT-2610-0001', 'HPP', 123);
    const kode = ((M.Code.cekKonsistensi() as any).data.selisih as any[]).map(x => x.kode).sort();
    expect(kode).toEqual(expect.arrayContaining(['HPP_BEDA', 'LABA_BEDA', 'TERBAYAR_BEDA']));
  });

  it('getLogTerbaru memuat aktivitas terbaru dulu; backupSekarang memverifikasi salinan; pengaturan ikut dalam getSemuaData', () => {
    siapkanFolder(drive, ['EPICPHONE_00_SISTEM/07_BACKUP/HARIAN']);
    M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 1000 });
    M.Biaya.simpanBiaya({ kategori: 'Sewa', nominal: 2000 });
    const log = (M.Code.getLogTerbaru(5) as any).data;
    expect(log[0]).toMatchObject({ aksi: 'Tambah', sheet: 'Biaya_Operasional' });
    expect(log[0].ringkasan).toContain('Sewa');
    expect((M.Code.backupSekarang() as any)).toMatchObject({ ok: true });
    const d = (M.Code.getSemuaData() as any).data;
    expect(d.pengaturan).toMatchObject({ NAMA_TOKO: 'Epic Phone Purwokerto', GARANSI_BARU_BULAN: '12', AMBANG_TEMPO_HARI: '3' });
    expect(M.Code.simpanPengaturan({ TIDAK_ADA: 'x' })).toMatchObject({ ok: false, kode: 'PENGATURAN_TIDAK_DIKENAL' });
    // kunci baku yang belum ada di sheet (sheet lama) ditambahkan, lalu terbaca kembali oleh aplikasi dan logika server
    expect(M.Code.simpanPengaturan({ NAMA_TOKO: 'Toko Baru', ALAMAT: 'Jl. Sudirman 1', AMBANG_TEMPO_HARI: '5' })).toMatchObject({ ok: true });
    expect(M.Code.simpanPengaturan({ NAMA_TOKO: 'Toko Baru 2' })).toMatchObject({ ok: true }); // sekarang sudah ada: diperbarui, tidak digandakan
    expect(baris('Pengaturan').filter(p => p.Kunci === 'NAMA_TOKO')).toHaveLength(1);
    expect((M.Code.getSemuaData() as any).data.pengaturan).toMatchObject({ NAMA_TOKO: 'Toko Baru 2', ALAMAT: 'Jl. Sudirman 1', AMBANG_TEMPO_HARI: '5' });
  });
});

describe('Layar Pengaturan: status sistem dan daftar backup', () => {
  it('status sistem memakai trigger dan Drive yang nyata (bukan angka tetap); trigger hilang terdeteksi', () => {
    (globalThis as any).ScriptApp = { getProjectTriggers: () => ['jobBackupHarian', 'jobCekTagihan'].map(f => ({ getHandlerFunction: () => f })) };
    (globalThis as any).DriveApp.getStorageUsed = () => 1.5 * 1073741824;
    (globalThis as any).DriveApp.getStorageLimit = () => 15 * 1073741824;
    unit('UNT-2609-0001', IMEI_A);
    const s = (M.Code.getStatusSistem() as any).data;
    expect(s.trigger).toMatchObject({ aktif: 2, total: 6 });
    expect(s.trigger.hilang).toContain('jobLaporanBulanan');
    expect(s.drive).toEqual({ terpakaiGB: 1.5, batasGB: 15 });
    expect(s.baris.Stok_HP).toBe(1);
  });

  it('daftar backup memuat salinan yang tersedia, terbaru dulu', () => {
    M.Jobs.jalankanBackupHarian();
    const d = (M.Code.getDaftarBackup() as any).data;
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ jenis: 'HARIAN', nama: 'EPICPHONE_BACKUP_HARIAN_2026-10-07_1000' });
  });
});

describe('Biaya operasional', () => {
  it('mencatat biaya dengan tanggal; menolak kategori asing, nominal nol, dan tanggal masa depan', () => {
    const { idBiaya } = M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 450000, catatan: 'Token' });
    expect(idBiaya).toBe('BIA-2610-0001');
    expect(tgl(baris('Biaya_Operasional')[0].Tanggal)).toBe('2026-10-07');
    expect(galat(() => M.Biaya.simpanBiaya({ kategori: 'Hiburan', nominal: 1 })).kode).toBe('KATEGORI_TIDAK_VALID');
    expect(galat(() => M.Biaya.simpanBiaya({ kategori: 'Sewa', nominal: 0 })).kode).toBe('NOMINAL_TIDAK_VALID');
    expect(galat(() => M.Biaya.simpanBiaya({ kategori: 'Sewa', nominal: 10, tanggal: '2026-12-01' })).kode).toBe('TANGGAL_TIDAK_VALID');
    M.Biaya.simpanBiaya({ kategori: 'Sewa', nominal: 2000000, tanggal: '2026-10-01' });
    expect(baris('Biaya_Operasional')).toHaveLength(2);
  });
});

describe('Laporan (PRD 05)', () => {
  function skenarioOktober() {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B, { HPP: 2000000, Harga_Beli: 2000000 });
    aks('ACC-2609-0001', 10);
    // Penjualan 1: HP + 2 aksesoris + bonus, diskon 100.000, lunas
    M.Jual.simpanPenjualan(jual({
      items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }, { tipe: 'Aksesoris', sku: 'ACC-2609-0001', qty: 2, harga: 25000 }],
      bonus: [{ nama: 'Casing', hpp: 15000 }], diskon: 100000, dibayar: 3450000,
    }));
    // Servis pelanggan: laba 150.000
    const s = M.Servis.simpanServis({ jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', namaPelanggan: 'Siti', keluhan: 'Baterai', tarifPelanggan: 300000 });
    M.Servis.updateStatusServis(s.idServis, 'Selesai', { biayaPart: 100000, biayaJasa: 50000 });
    // Biaya operasional 200.000
    M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 200000 });
    // Refund sebagian 50.000 atas penjualan 1 (unit A masih garansi)
    M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Refund', alasan: 'Lecet', nilaiRefund: 50000 });
    // Unit B rusak (HPP 2.000.000)
    const k = M.Servis.kirimKeServis('UNT-2609-0002', { keluhan: 'Mati total' });
    M.Servis.updateStatusServis(k.idServis, 'Batal', { unitJadi: 'Rusak' });
  }

  it('laba bulan Oktober sesuai rumus PRD 05 (diskon proporsional, bonus terpisah, rusak, refund, operasional)', () => {
    skenarioOktober();
    const d = M.Laporan.bacaDataLaporan();
    const x = M.Laporan.hitungLabaBulanan(d, '2026-10');
    expect(x.jmlUnitTerjual).toBe(1);
    expect(x.omzet).toBe(3450000);          // 3.500.000 + 50.000 - 100.000
    expect(x.hpp).toBe(3010000);            // 3.000.000 + 2 x 5.000
    expect(x.labaKotorHP).toBe(401408);     // 3.500.000 - 98.592 - 3.000.000
    expect(x.labaAksesoris).toBe(38592);    // 50.000 - 1.408 - 10.000
    expect(x.biayaBonus).toBe(15000);
    expect(x.labaServis).toBe(150000);
    expect(x.kerugianRefund).toBe(50000);
    expect(x.kerugianRusak).toBe(2000000);
    expect(x.biayaOperasional).toBe(200000);
    expect(x.labaBersih).toBe(401408 + 38592 + 150000 - 15000 - 50000 - 2000000 - 200000);
    expect(x.marginPersen).toBe(12.3);      // (401.408 + 38.592 - 15.000) / 3.450.000
    // bulan lain tidak terpengaruh
    expect(M.Laporan.hitungLabaBulanan(d, '2026-09')).toMatchObject({ omzet: 0, labaBersih: 0 });
  });

  it('retur penuh dibalik di bulan retur; pembatalan lintas bulan menjadi pembalik di bulan pembatalan', () => {
    vi.setSystemTime(new Date('2026-09-20T03:00:00Z'));
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B);
    M.Jual.simpanPenjualan(jual());                                   // JUAL-2609-0001, laba 500.000 (September)
    M.Jual.simpanPenjualan(jual({ items: [{ tipe: 'HP', idUnit: 'UNT-2609-0002', harga: 3600000 }], dibayar: 3600000 })); // laba 600.000
    vi.setSystemTime(new Date('2026-10-05T03:00:00Z'));
    M.Jual.batalkanTransaksi('JUAL-2609-0001', 'salah input');        // dibatalkan di Oktober
    M.Garansi.simpanKlaim({ referensi: 'JUAL-2609-0002', jenis: 'Retur', alasan: 'tidak suka' }); // retur di Oktober
    const d = M.Laporan.bacaDataLaporan();
    const sep = M.Laporan.hitungLabaBulanan(d, '2026-09');
    expect(sep.omzet).toBe(7100000);                                   // penjualan yang dibatalkan Oktober tetap ada di angka September
    expect(sep.labaBersih).toBe(1100000);
    const okt = M.Laporan.hitungLabaBulanan(d, '2026-10');
    expect(okt.pembalikanRetur).toBe(500000 + 600000);                 // pembatalan lintas bulan + retur penuh
    expect(okt.labaBersih).toBe(-1100000);
    expect(okt.omzet).toBe(0);
  });

  it('pembatalan di bulan yang sama menghilangkan penjualan dari angka bulan itu', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    M.Jual.batalkanTransaksi('JUAL-2610-0001', 'salah');
    const x = M.Laporan.hitungLabaBulanan(M.Laporan.bacaDataLaporan(), '2026-10');
    expect(x).toMatchObject({ omzet: 0, labaBersih: 0, pembalikanRetur: 0, jmlUnitTerjual: 0 });
  });

  it('arus kas: kas masuk/keluar dengan rincian dan per metode', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Beli.simpanPembelian({ namaSupplier: 'CV Maju', metodeBayar: 'Transfer', dibayar: 1000000, items: [{ tipe: 'HP', namaBarang: 'Redmi Note 12', imei1: IMEI_C, hargaBeli: 1000000 }] });
    M.Jual.simpanPenjualan(jual({ metodeBayar: 'QRIS' }));
    M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 200000 });
    const k = M.Laporan.hitungArusKas(M.Laporan.bacaDataLaporan(), '2026-10-01', '2026-10-31');
    expect(k.masuk).toBe(3500000);
    expect(k.keluar).toBe(1200000);
    expect(k.bersih).toBe(2300000);
    expect(k.perMetode.QRIS).toEqual({ masuk: 3500000, keluar: 0 });
    expect(k.perMetode.Transfer).toEqual({ masuk: 0, keluar: 1000000 });
    expect(k.rincianKeluar).toMatchObject({ pembelianDanHutang: 1000000, biayaOperasional: 200000 });
  });

  it('getLaporanBulanan memuat stok, tagihan (aging), penjualan; format bulan divalidasi', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B, { Tgl_Masuk: new Date(2026, 7, 1) }); // 67 hari
    M.Jual.simpanPenjualan(jual({ dibayar: 500000, jatuhTempo: '2026-10-10', items: [{ tipe: 'HP', idUnit: 'UNT-2609-0001', harga: 3500000 }] }));
    vi.setSystemTime(new Date('2026-10-20T03:00:00Z'));
    const l = M.Laporan.getLaporanBulanan('2026-10');
    expect(l.stok).toMatchObject({ jumlahUnit: 1, nilaiStok: 3000000, umur: { lebih60: 1 } });
    expect(l.stok.terlama[0]).toMatchObject({ id: 'UNT-2609-0002', umurHari: 80 });
    expect(l.tagihan).toMatchObject({ piutang: 3000000, piutangTelat: 3000000, aging: { telat8sd30: 3000000 } });
    expect(l.penjualan.modelTerlaris[0]).toMatchObject({ nama: 'Samsung Galaxy A54', unit: 1 });
    expect(galat(() => M.Laporan.getLaporanBulanan('2026-13')).kode).toBe('BULAN_TIDAK_VALID');
  });

  it('jobLaporanBulanan: tulis Laba_Bulanan, buat PDF di 06_LAPORAN; kunci bulan membekukan angka', () => {
    vi.setSystemTime(new Date('2026-09-20T03:00:00Z'));
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    vi.setSystemTime(new Date('2026-10-01T03:00:00Z')); // tanggal 1: job bekerja untuk September
    const hasil = M.Laporan.jalankanLaporanBulanan();
    expect(hasil).toContain('EPICPHONE_LAPORAN_LABA_2026-09.pdf');
    const row = baris('Laba_Bulanan')[0];
    expect(row).toMatchObject({ Bulan: 'Sep 2026', Jml_Unit_Terjual: 1, Omzet: 3500000, Laba_Bersih: 500000, Terkunci: 'Tidak' });
    expect(drive.folder('EPICPHONE_00_SISTEM/06_LAPORAN')!.berkas.map(b => b.nama)).toEqual(['EPICPHONE_LAPORAN_LABA_2026-09.pdf']);
    expect(M.Laporan.jalankanLaporanBulanan()).toContain('PDF'.length ? 'dibuat' : ''); // dijalankan ulang menggantikan berkas lama
    expect(drive.folder('EPICPHONE_00_SISTEM/06_LAPORAN')!.berkas).toHaveLength(1);

    M.Laporan.kunciBulan('2026-09');
    expect(baris('Laba_Bulanan')[0].Terkunci).toBe('Ya');
    expect(galat(() => M.Laporan.kunciBulan('2026-10')).kode).toBe('BULAN_BERJALAN');
    // penjualan baru di September (koreksi manual) tidak mengubah angka yang terkunci
    isi('Penjualan', { ID_Penjualan: 'JUAL-2609-0099', Tanggal: new Date(2026, 8, 25), Total_Tagihan: 1, Status: 'Aktif', Diskon: 0 });
    expect(M.Laporan.jalankanLaporanBulanan('2026-09')).toContain('terkunci');
    expect(baris('Laba_Bulanan')[0].Omzet).toBe(3500000);
  });

  it('job tidak bekerja selain tanggal 1', () => {
    expect(M.Laporan.jalankanLaporanBulanan()).toContain('bukan tanggal 1');
  });
});

describe('Laporan untuk layar', () => {
  it('periode hari ini, 7 hari, bulan ini, bulan lalu dihitung dari rentang tanggal yang benar', () => {
    vi.setSystemTime(new Date('2026-09-30T03:00:00Z'));
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());                                 // 30 Sep: laba 500.000
    vi.setSystemTime(new Date('2026-10-05T03:00:00Z'));
    unit('UNT-2609-0002', IMEI_B);
    M.Jual.simpanPenjualan(jual({ items: [{ tipe: 'HP', idUnit: 'UNT-2609-0002', harga: 3600000 }], dibayar: 3600000 })); // 05 Okt: laba 600.000
    vi.setSystemTime(new Date('2026-10-07T03:00:00Z'));
    unit('UNT-2609-0003', IMEI_C);
    M.Jual.simpanPenjualan(jual({ items: [{ tipe: 'HP', idUnit: 'UNT-2609-0003', harga: 3700000 }], dibayar: 3700000 })); // 07 Okt: laba 700.000
    M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 100000 });

    const L = (p: string) => (M.Code.getLaporanLayar(p) as any).data;
    expect(L('hari-ini')).toMatchObject({ periode: '07 Okt 2026', omzet: 3700000, unitTerjual: 1, labaBersih: 600000, pembandingLabel: 'kemarin', bisaDikunci: false, bisaPdf: false });
    expect(L('7-hari')).toMatchObject({ omzet: 7300000, unitTerjual: 2, labaBersih: 1200000 }); // 01-07 Okt (30 Sep tidak termasuk)
    const bi = L('bulan-ini');
    expect(bi).toMatchObject({ periode: 'Oktober 2026', omzet: 7300000, labaBersih: 1200000, labaBulanLalu: 500000, pembandingAda: true, persenKenaikan: 140, bisaDikunci: false, bisaPdf: true, transaksiJual: 2 });
    expect(bi.komposisi).toEqual({ hp: 100, aksesoris: 0, servis: 0 });
    expect(bi.tren12Bulan).toHaveLength(12);
    expect(bi.tren12Bulan[11]).toEqual({ bulan: 'Okt 26', laba: 1.2 });
    expect(bi.tren12Bulan[10]).toEqual({ bulan: 'Sep 26', laba: 0.5 });
    const bl = L('bulan-lalu');
    expect(bl).toMatchObject({ periode: 'September 2026', omzet: 3500000, labaBersih: 500000, bisaDikunci: true, isLocked: false });
    expect(bl.pembandingAda).toBe(false);
    expect(galat(() => M.Laporan.getLaporanLayar('kemarin')).kode).toBe('PERIODE_TIDAK_VALID');
    M.Laporan.kunciBulan('2026-09');
    expect(L('bulan-lalu')).toMatchObject({ isLocked: true, bisaDikunci: false });
    expect(L('2026-09').isLocked).toBe(true);
  });

  it('memuat model terlaris dengan laba, bonus tersering, arus kas per metode, umur stok bernilai, debitur terbesar', () => {
    unit('UNT-2609-0001', IMEI_A);
    unit('UNT-2609-0002', IMEI_B, { Tgl_Masuk: new Date(2026, 7, 1), HPP: 2000000 });
    M.Jual.simpanPenjualan(jual({ bonus: [{ nama: 'Casing', hpp: 12000 }], dibayar: 1000000, jatuhTempo: '2026-10-09', metodeBayar: 'Transfer' }));
    vi.setSystemTime(new Date('2026-10-11T03:00:00Z')); // dua hari lewat jatuh tempo
    const l = (M.Code.getLaporanLayar('bulan-ini') as any).data;
    expect(l.top10Model[0]).toEqual({ nama: 'Samsung Galaxy A54', terjual: 1, laba: 500000 });
    expect(l.bonusPalingSering).toEqual([{ nama: 'Casing', qty: 1 }]);
    expect(l.perMetode.Transfer).toEqual({ masuk: 1000000, keluar: 0 });
    expect(l.stokUmur.lebih60).toEqual({ unit: 1, nilai: 2000000 });
    expect(l.unitLebih30Hari).toBe(1);
    expect(l.nilaiLebih30Hari).toBe(2000000);
    expect(l.debiturTerbesar[0]).toMatchObject({ nama: 'Budi Santoso', sisa: 2500000, hariTelat: 2 });
    expect(l.piutangTelat).toBe(2500000);
  });

  it('buatLaporanPdf menyimpan PDF di 06_LAPORAN dan mengembalikan base64', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    const r = (M.Code.buatLaporanPdf('2026-10') as any).data;
    expect(r.nama).toBe('EPICPHONE_LAPORAN_LABA_2026-10.pdf');
    expect(Buffer.from(r.base64, 'base64').toString('latin1')).toContain('Laporan laba Okt 2026');
    expect(drive.folder('EPICPHONE_00_SISTEM/06_LAPORAN')!.berkas).toHaveLength(1);
  });
});

describe('Nota PDF', () => {
  const dasar = () => ({
    toko: { nama: 'Epic Phone Purwokerto', tagline: 'Inovasi Ada Di Genggaman', alamat: 'Jl. Sudirman 1', wa: '628123', instagram: '@epicphone_purwokerto', syarat: 'Garansi kerusakan pabrik.', logo: '', ukuran: 'A5' as const },
    id: 'JUAL-2610-0042', tanggal: '07 Okt 2026', jam: '10.00', pelanggan: 'Budi', metode: 'Transfer', status: 'Aktif' as const,
    subtotal: 3550000, diskon: 100000, nilaiTukarTambah: 0, unitTukarTambah: '', total: 3450000, dibayar: 3450000, sisa: 0,
    barang: [{ nama: 'Samsung Galaxy A54', imei: IMEI_A, kondisi: 'Bekas', qty: 1, harga: 3500000, garansi: '14 Okt 2026' }, { nama: 'Tempered Glass', imei: '', kondisi: '', qty: 2, harga: 25000, garansi: '' }],
    bonus: [{ nama: 'Casing silikon', qty: 1 }],
  });

  it('memuat bagian wajib PRD 02, bonus GRATIS, garansi per barang, dan TIDAK memuat modal/laba', () => {
    const h = M.Nota.renderNotaHtml(dasar());
    ['Epic Phone Purwokerto', 'Inovasi Ada Di Genggaman', 'NOTA PENJUALAN', 'JUAL-2610-0042', '07 Okt 2026', 'Budi', IMEI_A, 'Bekas',
      'Garansi sampai 14 Okt 2026', 'BONUS', 'Casing silikon', 'GRATIS', 'Rp 3.500.000', 'Rp 3.450.000', 'LUNAS', 'Penjual', 'Pembeli', 'Terima kasih']
      .forEach(t => expect(h, t).toContain(t));
    expect(h).not.toMatch(/HPP|modal|laba/i);
    expect(h).not.toContain('DIBATALKAN');
  });

  it('belum lunas menampilkan jatuh tempo; batal diberi watermark DIBATALKAN; nama pelanggan di-escape', () => {
    const b = M.Nota.renderNotaHtml({ ...dasar(), dibayar: 1000000, sisa: 2450000, jatuhTempo: '15 Okt 2026' });
    expect(b).toContain('BELUM LUNAS (jatuh tempo 15 Okt 2026)');
    const x = M.Nota.renderNotaHtml({ ...dasar(), status: 'Batal', pelanggan: '<script>alert(1)</script>' });
    expect(x).toContain('DIBATALKAN');
    expect(x).not.toContain('<script>alert');
    expect(x).toContain('&lt;script&gt;');
    expect(M.Nota.renderNotaHtml({ ...dasar(), toko: { ...dasar().toko, ukuran: '80mm' } })).toContain('width:280px');
  });

  it('buatNota: PDF di 03_NOTA/tahun/bulan dengan nama baku, tautan tersimpan, hasil siap diunduh', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    const n = M.Nota.buatNota('JUAL-2610-0001');
    expect(n.nama).toBe('EPICPHONE_NOTA_JUAL-2610-0001.pdf');
    const f = drive.folder('EPICPHONE_00_SISTEM/03_NOTA/2026/10')!;
    expect(f.berkas.map(b => b.nama)).toEqual(['EPICPHONE_NOTA_JUAL-2610-0001.pdf']);
    expect(f.berkas[0].sharing).toBe('ANYONE_WITH_LINK');
    expect(n.urlUnduh).toContain(n.idFile);
    expect(Buffer.from(n.base64, 'base64').length).toBeGreaterThan(100);
    expect(baris('Penjualan')[0].Link_Nota_PDF).toBe(n.urlLihat);
  });

  it('buat ulang setelah pembatalan: versi lama ke RIWAYAT sebagai _v1_DIBATALKAN, nomor nota tetap, versi baru berwatermark', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    M.Nota.buatNota('JUAL-2610-0001');
    M.Jual.batalkanTransaksi('JUAL-2610-0001', 'salah input');
    const baru = M.Nota.buatNota('JUAL-2610-0001');
    expect(baru.nama).toBe('EPICPHONE_NOTA_JUAL-2610-0001.pdf');
    expect(drive.folder('EPICPHONE_00_SISTEM/03_NOTA/RIWAYAT')!.berkas.map(b => b.nama)).toEqual(['EPICPHONE_NOTA_JUAL-2610-0001_v1_DIBATALKAN.pdf']);
    expect(drive.folder('EPICPHONE_00_SISTEM/03_NOTA/2026/10')!.berkas).toHaveLength(1);
    expect(Buffer.from(baru.base64, 'base64').toString('latin1')).toContain('DIBATALKAN');
  });

  it('ambilNota membuka nota yang ada tanpa membuat versi baru; membuat bila belum ada atau berkas hilang', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    const pertama = M.Nota.ambilNota('JUAL-2610-0001'); // belum ada -> dibuat
    const kedua = M.Nota.ambilNota('JUAL-2610-0001');   // sudah ada -> sama persis
    expect(kedua.idFile).toBe(pertama.idFile);
    expect(drive.folder('EPICPHONE_00_SISTEM/03_NOTA/RIWAYAT')!.berkas).toHaveLength(0);
    drive.berkas(pertama.idFile)!.setTrashed(true); // berkas hilang dari Drive
    const ketiga = M.Nota.ambilNota('JUAL-2610-0001');
    expect(ketiga.idFile).not.toBe(pertama.idFile);
    expect(M.Code.ambilNota('JUAL-9999-0001')).toMatchObject({ ok: false, kode: 'PENJUALAN_TIDAK_ADA' });
  });

  it('tautan publik mengikuti Pengaturan: dimatikan membuat nota baru privat dan semua nota lama kembali privat', () => {
    palsu.sheet('Pengaturan').rows.push(HEADER.Pengaturan.map(k => ({ Kunci: 'NOTA_LINK_PUBLIK', Nilai: 'Ya' } as any)[k] ?? ''));
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    M.Nota.buatNota('JUAL-2610-0001');
    expect(M.Code.simpanPengaturan({ NOTA_LINK_PUBLIK: 'Tidak' })).toMatchObject({ ok: true });
    expect(drive.folder('EPICPHONE_00_SISTEM/03_NOTA/2026/10')!.berkas[0].sharing).toBe('PRIVATE');
    expect(M.Code.simpanPengaturan({ TIDAK_ADA: 'x' })).toMatchObject({ ok: false, kode: 'PENGATURAN_TIDAK_DIKENAL' });
  });

  it('nota penjualan batal-draft atau tidak ada ditolak', () => {
    expect(galat(() => M.Nota.buatNota('JUAL-2610-0099')).kode).toBe('PENJUALAN_TIDAK_ADA');
  });
});

describe('Foto dan bukti', () => {
  const foto = (o: Record<string, unknown> = {}) => ({ jenisReferensi: 'Unit', idReferensi: 'UNT-2609-0001', posisi: 'depan', base64Data: Buffer.from('gambar-uji').toString('base64'), mimeType: 'image/jpeg', ...o }) as any;

  it('foto unit: folder per unit bernama baku, berkas bernama PRD 09, urutan per posisi, tercatat di Berkas_Foto dan Link_Foto', () => {
    unit('UNT-2609-0001', IMEI_A);
    const a = M.Foto.unggahFoto(foto());
    expect(a.namaBerkas).toBe('EPICPHONE_FOTO-HP_UNT-2609-0001_DEPAN_01_2026-10-07_1000.jpg');
    expect(M.Foto.unggahFoto(foto()).namaBerkas).toContain('_DEPAN_02_');
    expect(M.Foto.unggahFoto(foto({ posisi: 'Layar Menyala' })).namaBerkas).toContain('_LAYAR-MENYALA_01_');
    const folderUnit = drive.root.anak[0].anak.find(f => f.nama === '02_FOTO-HP')!.anak.find(f => f.nama.startsWith('UNT-2609-0001'))!;
    expect(folderUnit.nama).toBe('UNT-2609-0001_SAMSUNG-GALAXY-A54_IMEI-9012');
    expect(folderUnit.berkas).toHaveLength(3);
    expect(baris('Stok_HP')[0].Link_Foto).toContain(folderUnit.id);
    expect(baris('Berkas_Foto')).toHaveLength(3);
    expect(a.pratinjau).toMatch(/^data:image\/png;base64,/);
  });

  it('foto servis, bukti, dan klaim memakai kode, nama, dan folder masing-masing', () => {
    expect(M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Servis', idReferensi: 'SRV-2610-0005', posisi: 'sebelum' }).namaBerkas).toBe('EPICPHONE_FOTO-SERVIS_SRV-2610-0005_SEBELUM_01_2026-10-07_1000.jpg');
    expect(drive.folder('EPICPHONE_00_SISTEM/05_SERVIS')!.berkas).toHaveLength(1);
    const k = M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Klaim', idReferensi: 'KLM-2610-0001', posisi: undefined, mimeType: 'image/png' });
    expect(k.namaBerkas).toBe('EPICPHONE_FOTO-KLAIM_KLM-2610-0001_01_2026-10-07_1000.png');
    expect(M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Pembelian', idReferensi: 'BELI-2610-0003', posisi: 'nota-supplier' }).namaBerkas).toContain('BUKTI-BELI_BELI-2610-0003_NOTA-SUPPLIER_01');
    expect(M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Pembayaran', idReferensi: 'BYR-2610-0012', posisi: 'transfer' }).namaBerkas).toContain('BUKTI-BAYAR_BYR-2610-0012_TRANSFER_01');
    expect(M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Biaya', idReferensi: 'BIA-2610-0004', posisi: 'listrik' }).namaBerkas).toContain('BUKTI-BIAYA_BIA-2610-0004_LISTRIK_01');
    expect(drive.folder('EPICPHONE_00_SISTEM/04_BUKTI-TRANSAKSI/PEMBELIAN')!.berkas).toHaveLength(1);
    expect(drive.folder('EPICPHONE_00_SISTEM/04_BUKTI-TRANSAKSI/BIAYA')!.berkas).toHaveLength(1);
  });

  it('validasi: kode tidak sah, tipe berkas, ukuran > 2 MB, dan batas 12 foto', () => {
    unit('UNT-2609-0001', IMEI_A);
    expect(galat(() => M.Foto.unggahFoto(foto({ posisi: 'ATAS' }))).kode).toBe('POSISI_TIDAK_VALID');
    expect(galat(() => M.Foto.unggahFoto({ ...foto(), jenisReferensi: 'Servis', idReferensi: 'SRV-1', posisi: 'DEPAN' })).kode).toBe('POSISI_TIDAK_VALID');
    expect(galat(() => M.Foto.unggahFoto(foto({ mimeType: 'application/pdf' }))).kode).toBe('TIPE_BERKAS_TIDAK_VALID');
    expect(galat(() => M.Foto.unggahFoto(foto({ base64Data: Buffer.alloc(2_100_000, 1).toString('base64') }))).kode).toBe('FOTO_TERLALU_BESAR');
    expect(galat(() => M.Foto.unggahFoto(foto({ idReferensi: 'UNT-9999-0001' }))).kode).toBe('UNIT_TIDAK_ADA');
    for (let i = 0; i < 12; i++) M.Foto.unggahFoto(foto());
    expect(galat(() => M.Foto.unggahFoto(foto())).kode).toBe('FOTO_TERLALU_BANYAK');
  });

  it('daftarFoto memuat gambar kecil; hapusFoto memindahkan ke _TERHAPUS tanpa menghapus permanen', () => {
    unit('UNT-2609-0001', IMEI_A);
    const a = M.Foto.unggahFoto(foto());
    M.Foto.unggahFoto(foto({ posisi: 'belakang' }));
    const daftar = M.Foto.daftarFoto('Unit', 'UNT-2609-0001');
    expect(daftar.map((d: any) => d.posisi)).toEqual(['DEPAN', 'BELAKANG']);
    expect(daftar[0].pratinjau).toMatch(/^data:image\/png/);
    expect(M.Foto.hapusFoto(a.idBerkas)).toBe(true);
    expect(drive.folder('EPICPHONE_00_SISTEM/02_FOTO-HP/_TERHAPUS')!.berkas).toHaveLength(1);
    expect(M.Foto.daftarFoto('Unit', 'UNT-2609-0001', false)).toHaveLength(1);
    expect(M.Foto.hapusFoto('BRK-9999-0001')).toBe(false);
  });
});

describe('Backup dan pemeliharaan', () => {
  it('nama backup sesuai PRD 09; minggu ISO benar', () => {
    const w = new Date('2026-10-04T18:00:00Z'); // Minggu 05 Okt 2026 01:00 WIB -> sebenarnya Senin; cek fungsi saja
    expect(M.Utils.mingguIso('2026-10-04')).toBe('2026-W40');
    expect(M.Utils.mingguIso('2026-10-05')).toBe('2026-W41');
    expect(M.Utils.mingguIso('2026-01-01')).toBe('2026-W01');
    expect(M.Utils.mingguIso('2027-01-03')).toBe('2026-W53');
    expect(M.Nama.namaBackup('MINGGUAN', new Date('2026-10-04T05:00:00Z'))).toBe('EPICPHONE_BACKUP_MINGGUAN_2026-W40.xlsx');
    expect(M.Nama.namaBackup('HARIAN', w)).toBe('EPICPHONE_BACKUP_HARIAN_2026-10-05_0100');
    expect(M.Nama.namaBackup('BULANAN', w)).toBe('EPICPHONE_BACKUP_BULANAN_2026-10');
  });

  it('backup harian: salinan diverifikasi, backup lebih dari 30 hari dihapus, hasil dicatat di log', () => {
    unit('UNT-2609-0001', IMEI_A);
    const folder = drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/HARIAN')!;
    const lama = folder.createFile({ nama: 'EPICPHONE_BACKUP_HARIAN_2026-08-01_0100', tipe: 'x', bytes: [1], setName() { return this; }, getBytes: () => [1], getContentType: () => 'x', getAs() { return this; } } as any);
    lama.dibuat = new Date('2026-08-01T00:00:00Z');
    M.Jobs.jalankanBackupHarian();
    const nama = folder.berkas.map((b: any) => b.nama);
    expect(nama).toEqual(['EPICPHONE_BACKUP_HARIAN_2026-10-07_1000']);
    const logHasil = baris('Log_Aktivitas').find(l => l.ID_Data === 'jobBackupHarian');
    expect(String(logHasil!.Ringkasan)).toContain('1 backup lama dihapus');
  });

  it('verifikasi mendeteksi salinan yang tidak sama dan salinan rusak dihapus', () => {
    expect(M.Jobs.bandingkanJumlahBaris({ A: 5, B: 3 }, { A: 5, B: 3 })).toEqual([]);
    expect(M.Jobs.bandingkanJumlahBaris({ A: 5, B: 3 }, { A: 4 })).toEqual(['Sheet A: 5 baris di sumber, 4 di salinan', 'Sheet B tidak ada di salinan']);
    // salinan yang barisnya berbeda: openById untuk salinan mengembalikan sheet dengan jumlah baris lain
    const asli = (globalThis as any).SpreadsheetApp.openById;
    (globalThis as any).SpreadsheetApp.openById = (id: string) => (id === 'ss-palsu' ? asli(id) : { getSheets: () => [{ getName: () => 'Stok_HP', getLastRow: () => 1 }] });
    unit('UNT-2609-0001', IMEI_A);
    expect(() => M.Jobs.jalankanBackupHarian()).toThrow(/Verifikasi backup gagal/);
    expect(drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/HARIAN')!.berkas).toHaveLength(0);
    expect(String(baris('Log_Aktivitas').find(l => l.ID_Data === 'jobBackupHarian')!.Ringkasan)).toMatch(/^GAGAL/);
  });

  it('backup bulanan hanya tanggal 1 dan menyimpan 12 terakhir; mingguan .xlsx dibagikan ke akun cadangan, simpan 8', () => {
    expect(M.Jobs.jalankanBackupBulanan()).toBeUndefined();
    expect(drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/BULANAN')!.berkas).toHaveLength(0); // 7 Okt: dilewati
    vi.setSystemTime(new Date('2026-11-01T03:00:00Z'));
    M.Jobs.jalankanBackupBulanan();
    expect(drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/BULANAN')!.berkas.map((b: any) => b.nama)).toEqual(['EPICPHONE_BACKUP_BULANAN_2026-11']);

    palsu.sheet('Pengaturan').rows.push(HEADER.Pengaturan.map(k => ({ Kunci: 'EMAIL_AKUN_CADANGAN', Nilai: 'owner.cadangan@gmail.com' } as any)[k] ?? ''));
    for (let i = 0; i < 9; i++) {
      vi.setSystemTime(new Date(Date.UTC(2026, 9, 4 + i * 7, 5)));
      M.Jobs.jalankanBackupMingguan();
    }
    const mingguan = drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/MINGGUAN')!.berkas;
    expect(mingguan).toHaveLength(8);
    expect(mingguan.every((b: any) => b.nama.endsWith('.xlsx') && b.penonton.includes('owner.cadangan@gmail.com'))).toBe(true);
    expect(mingguan.some((b: any) => b.nama === 'EPICPHONE_BACKUP_MINGGUAN_2026-W40.xlsx')).toBe(false); // yang tertua terpangkas
  });

  it('pemulihan: pengaman dibuat, database lama diganti nama, ID Spreadsheet dialihkan; tanpa konfirmasi ditolak', () => {
    const cadangan = drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/HARIAN')!;
    M.Jobs.jalankanBackupHarian();
    const idBackup = cadangan.berkas[0].id;
    expect(() => M.Jobs.jalankanPemulihan(idBackup, 'tidak')).toThrow(/konfirmasi/);
    const hasil = M.Jobs.jalankanPemulihan(idBackup, 'YA');
    expect(hasil).toContain('Salinan pengaman: EPICPHONE_BACKUP_PENGAMAN-PULIH_2026-10-07_1000');
    expect(drive.folder('EPICPHONE_00_SISTEM/07_BACKUP/PENGAMAN-PULIH')!.berkas).toHaveLength(1);
    expect(drive.folder('EPICPHONE_00_SISTEM/01_DATABASE')!.berkas.map((b: any) => b.nama)).toEqual(['EPICPHONE_DB_UTAMA']);
    expect(palsu.props.get('SPREADSHEET_ID')).not.toBe('ss-palsu');
    expect(drive.berkas('ss-palsu')!.nama).toBe('EPICPHONE_DB_UTAMA_SEBELUM-PULIH_2026-10-07_1000');
  });

  it('status backup di Beranda: normal, gagal, atau lebih dari 36 jam tanpa backup', () => {
    const l = (tanggal: string, jam: string, ringkasan: string) => ({ Aksi: 'Sistem', Sheet: 'Jobs', ID_Data: 'jobBackupHarian', Tanggal: tanggal, Jam: jam, Ringkasan: ringkasan });
    const s = M.Data.hitungStatusBackup;
    expect(s([], '2026-10-07', '10:00')).toMatchObject({ ok: true });
    expect(s([l('2026-10-07', '01:00', 'Backup harian X')], '2026-10-07', '10:00')).toMatchObject({ ok: true, terakhir: '07 Okt 2026 01.00' });
    expect(s([l('2026-10-07', '01:00', 'GAGAL: Verifikasi backup gagal')], '2026-10-07', '10:00')).toMatchObject({ ok: false });
    expect(s([l('2026-10-05', '01:00', 'ok')], '2026-10-07', '10:00')).toMatchObject({ ok: false, pesan: expect.stringContaining('36 jam') });
    expect(s([l('2026-10-06', '01:00', 'ok')], '2026-10-07', '10:00').ok).toBe(true); // 33 jam
  });

  it('job bersihkan menandai draf penjualan macet sebagai Gagal', () => {
    isi('Penjualan', { ID_Penjualan: 'JUAL-2610-0001', Tanggal: new Date(2026, 9, 7), Jam: '08:30', Status: 'Draft' });
    isi('Penjualan', { ID_Penjualan: 'JUAL-2610-0002', Tanggal: new Date(2026, 9, 7), Jam: '09:50', Status: 'Draft' });
    M.Jobs.jalankanBersihkan();
    expect(baris('Penjualan').map(p => p.Status)).toEqual(['Gagal', 'Draft']);
  });
});

describe('getSemuaData: servis, klaim, biaya', () => {
  it('membawa servis, klaim, dan biaya dalam bentuk model layar tanpa objek Date; transaksi memuat semuanya', () => {
    unit('UNT-2609-0001', IMEI_A);
    M.Jual.simpanPenjualan(jual());
    const s = M.Servis.simpanServis({ jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', namaPelanggan: 'Siti', noWa: '0812-1111-2222', keluhan: 'Baterai', tarifPelanggan: 300000, pelaksana: 'Vendor luar', namaVendor: 'Toko Ahmad' });
    M.Servis.updateStatusServis(s.idServis, 'Selesai', { biayaPart: 100000, biayaJasa: 50000 });
    M.Garansi.simpanKlaim({ referensi: IMEI_A, jenis: 'Refund', alasan: 'Lecet', nilaiRefund: 50000 });
    M.Biaya.simpanBiaya({ kategori: 'Listrik', nominal: 200000, catatan: 'Token' });
    const d = (M.Code.getSemuaData() as any).data;
    const adaDate = (v: unknown): boolean => v instanceof Date || (!!v && typeof v === 'object' && Object.values(v as object).some(adaDate));
    expect(adaDate(d)).toBe(false);
    expect(d.belumTerhubung).toEqual([]);
    expect(d.servis[0]).toMatchObject({ id: 'SRV-2610-0001', jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', namaPelanggan: 'Siti', noWa: '081211112222', teknisi: 'Toko Ahmad', biayaPart: 100000, biayaJasa: 50000, tarifPelanggan: 300000, status: 'Selesai', tahap: 'sesudah' });
    expect(d.klaim[0]).toMatchObject({ id: 'KLM-2610-0001', notaId: 'JUAL-2610-0001', imei: IMEI_A, pelanggan: 'Budi Santoso', jenis: 'Refund', nilaiRefund: 50000, dampakLaba: -50000, status: 'Selesai' });
    expect(d.biaya[0]).toMatchObject({ id: 'BIA-2610-0001', kategori: 'Listrik', nominal: 200000, keterangan: 'Token', tanggal: '07 Okt 2026' });
    expect(d.transaksi.map((t: any) => t.tipe).sort()).toEqual(['Biaya', 'Jual', 'Klaim', 'Servis']);
    expect(d.kontak.find((k: any) => k.nama === 'Budi Santoso').totalTransaksi).toBe(1);
    expect(d.statusBackup).toMatchObject({ ok: true });
  });
});
