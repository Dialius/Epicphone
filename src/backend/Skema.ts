// Skema.ts — satu-satunya sumber kebenaran desain Spreadsheet (PRD 01 + tambahan PRD 05).
// Dipakai SetupSheets (membangun sheet: format, lebar, dropdown, warna status, proteksi)
// dan Db (mengubah nilai ke bentuk yang benar saat ditulis: tanggal asli, angka asli, teks).
//
// Tipe kolom:
//  id     ID manusiawi (teks, dikunci)           teks   teks biasa
//  nama   nama/label panjang                      cat    teks panjang (bungkus baris)
//  angka  bilangan bulat  #,##0                   rp     Rupiah  "Rp "#,##0
//  persen angka dengan tanda %                    tgl    tanggal asli, tampil dd MMM yyyy
//  jam    teks HH:mm (WIB)                        imei   teks 15 digit (tidak boleh jadi angka)
//  wa     teks nomor 62xxxx                       link   tautan Drive
//  status teks berwarna (conditional format)
// Opsi `kunci`: kolom turunan/ID; diproteksi (peringatan) dan hanya ditulis kode.

import { SHEET } from './Config';

export type TipeKolom =
  | 'id' | 'teks' | 'nama' | 'cat' | 'angka' | 'rp' | 'persen' | 'persen1'
  | 'tgl' | 'jam' | 'imei' | 'wa' | 'link' | 'status';

export interface Kolom {
  n: string;
  t: TipeKolom;
  /** lebar piksel; bila kosong dipakai bawaan tipe */
  w?: number;
  /** nama kelompok dropdown di Referensi (atau 'RANGE:Sheet!A2:A') */
  val?: string;
  /** dropdown hanya peringatan (boleh nilai lain) */
  lunak?: boolean;
  /** kolom ID/turunan: dikunci */
  kunci?: boolean;
  /** rumus-turunan di PRD (F): nilainya dihitung kode dan ditulis server */
  turunan?: boolean;
}

export interface Lembar {
  nama: string;
  grup: 'master' | 'transaksi' | 'laporan' | 'sistem';
  kolom: Kolom[];
  /** jumlah baris yang disediakan (bertambah otomatis saat penuh) */
  baris?: number;
  /** seluruh sheet diproteksi (peringatan), mis. Log */
  proteksiPenuh?: boolean;
}

export const LEBAR_BAWAAN: Record<TipeKolom, number> = {
  id: 130, teks: 130, nama: 240, cat: 260, angka: 80, rp: 125, persen: 80, persen1: 90,
  tgl: 105, jam: 62, imei: 145, wa: 130, link: 150, status: 100,
};

export const WARNA_GRUP: Record<Lembar['grup'], string> = {
  master: '#2F6FB5', transaksi: '#2E9E5B', laporan: '#E67E22', sistem: '#8A949E',
};

const id = (n: string, w?: number): Kolom => ({ n, t: 'id', w, kunci: true });
const teks = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'teks', ...o });
const nama = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'nama', ...o });
const cat = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'cat', ...o });
const angka = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'angka', ...o });
const rp = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'rp', ...o });
const tgl = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'tgl', ...o });
const jam = (n: string): Kolom => ({ n, t: 'jam' });
const status = (n: string, o: Partial<Kolom> = {}): Kolom => ({ n, t: 'status', ...o });
const link = (n: string): Kolom => ({ n, t: 'link' });
/** kolom turunan (F di PRD): dihitung server, dikunci */
const F = (k: Kolom): Kolom => ({ ...k, kunci: true, turunan: true });

export const SKEMA: Lembar[] = [
  {
    nama: SHEET.PRODUK, grup: 'master', kolom: [
      id('ID_Produk'), teks('Jenis', { val: 'Jenis_Produk', w: 90 }), teks('Platform', { val: 'Platform', w: 90 }),
      teks('Merek', { val: 'Merek', lunak: true, w: 110 }), teks('Model', { w: 170 }), teks('Varian', { w: 110 }),
      teks('Warna', { w: 100 }), F(nama('Nama_Lengkap', { w: 300 })), rp('Harga_Jual_Standar', { w: 140 }),
      status('Aktif', { val: 'Aktif_Produk', w: 70 }),
    ],
  },
  {
    nama: SHEET.KONTAK, grup: 'master', kolom: [
      id('ID_Kontak'), nama('Nama', { w: 220 }), teks('Tipe', { val: 'Tipe_Kontak', w: 100 }), { n: 'No_WA', t: 'wa' },
      cat('Alamat', { w: 280 }), cat('Catatan'), F(angka('Total_Transaksi', { w: 120 })),
    ],
  },
  {
    nama: SHEET.STOK_HP, grup: 'transaksi', baris: 2000, kolom: [
      id('ID_Unit'), tgl('Tgl_Masuk'), jam('Jam_Masuk'), { n: 'IMEI_1', t: 'imei' }, { n: 'IMEI_2', t: 'imei' },
      teks('ID_Produk', { val: 'RANGE:Produk!A2:A', lunak: true, w: 110 }), F(nama('Nama_Barang', { w: 280 })),
      teks('Kondisi', { val: 'Kondisi', w: 75 }), teks('Grade', { val: 'Grade', w: 60 }),
      teks('Kelengkapan', { val: 'Kelengkapan', w: 105 }), { n: 'Baterai_Persen', t: 'persen', w: 100 },
      teks('Bebas_Kunci_Akun', { val: 'Bebas_Kunci_Akun', w: 120 }), teks('Sumber', { val: 'Sumber_Unit', w: 100 }),
      id('ID_Sumber'), rp('Harga_Beli'), rp('Biaya_Lain'), F(rp('Biaya_Servis')), F(rp('HPP')),
      F(rp('Estimasi_Servis')), rp('Harga_Jual_Target', { w: 135 }), status('Status', { val: 'Status_Unit' }),
      F(angka('Umur_Stok_Hari', { w: 115 })), tgl('Tgl_Keluar'), id('ID_Penjualan'), link('Link_Foto'),
      cat('Catatan'), teks('Dibuat_Oleh', { w: 90 }), tgl('Tgl_Rusak', { w: 105 }),
    ],
  },
  {
    nama: SHEET.STOK_AKSESORIS, grup: 'transaksi', kolom: [
      id('SKU'), nama('Nama_Barang', { w: 280 }), teks('Kategori', { val: 'Kategori_Aksesoris', w: 120 }),
      F(angka('Stok', { w: 70 })), angka('Stok_Minimum', { w: 105 }), F(rp('Harga_Beli_Rata2', { w: 140 })),
      rp('Harga_Jual'), F(status('Status')),
    ],
  },
  {
    nama: SHEET.PEMBELIAN, grup: 'transaksi', baris: 2000, kolom: [
      id('ID_Pembelian'), tgl('Tanggal'), jam('Jam'), id('ID_Supplier'), F(nama('Nama_Supplier', { w: 200 })),
      F(rp('Total')), teks('Metode_Bayar', { val: 'Metode_Bayar', w: 105 }), rp('Dibayar'), F(rp('Sisa')),
      F(status('Status_Bayar', { w: 105 })), link('Link_Nota'), status('Status', { val: 'Status_Dokumen' }),
      cat('Catatan'), teks('Dibuat_Oleh', { w: 90 }),
    ],
  },
  {
    nama: SHEET.PEMBELIAN_ITEM, grup: 'transaksi', baris: 3000, kolom: [
      id('ID_Item', 150), id('ID_Pembelian'), teks('Tipe', { val: 'Jenis_Produk', w: 90 }), id('ID_Unit_atau_SKU', 150),
      F(nama('Nama_Barang', { w: 280 })), angka('Qty', { w: 60 }), rp('Harga_Satuan', { w: 125 }), F(rp('Subtotal')),
    ],
  },
  {
    nama: SHEET.PENJUALAN, grup: 'transaksi', baris: 2000, kolom: [
      id('ID_Penjualan'), tgl('Tanggal'), jam('Jam'), id('ID_Pelanggan'), F(nama('Nama_Pelanggan', { w: 200 })),
      F(rp('Subtotal')), rp('Diskon'), rp('Nilai_Tukar_Tambah', { w: 150 }), F(rp('Total_Tagihan', { w: 135 })),
      F(rp('Biaya_Bonus')), teks('Metode_Bayar', { val: 'Metode_Bayar', w: 105 }), rp('Dibayar'),
      F(rp('Sisa_Tagihan', { w: 125 })), F(status('Status_Bayar', { w: 105 })), F(rp('Laba_Kotor')),
      link('Link_Nota_PDF'), status('Status', { val: 'Status_Penjualan' }), cat('Catatan'), teks('Dibuat_Oleh', { w: 90 }),
    ],
  },
  {
    nama: SHEET.PENJUALAN_ITEM, grup: 'transaksi', baris: 4000, kolom: [
      id('ID_Item', 150), id('ID_Penjualan'), teks('Tipe', { val: 'Tipe_Item_Jual', w: 90 }), id('ID_Unit_atau_SKU', 150),
      F(nama('Nama_Barang', { w: 280 })), { n: 'IMEI', t: 'imei', kunci: true, turunan: true }, angka('Qty', { w: 60 }),
      rp('Harga_Jual'), F(rp('HPP')), F(rp('Laba_Item')), F(tgl('Garansi_Hingga', { w: 120 })), teks('Alasan_Bonus', { w: 160 }),
    ],
  },
  {
    nama: SHEET.TUKAR_TAMBAH, grup: 'transaksi', kolom: [
      id('ID_TT'), tgl('Tanggal'), id('ID_Penjualan'), id('ID_Pelanggan'), id('ID_Unit_Masuk'),
      F(nama('Nama_Barang', { w: 260 })), { n: 'IMEI', t: 'imei' },
      teks('Kondisi_Layar', { val: 'Kondisi_TT', w: 105 }), teks('Kondisi_Baterai', { val: 'Kondisi_TT', w: 115 }),
      teks('Kondisi_Kamera', { val: 'Kondisi_TT', w: 110 }), teks('Kondisi_Body', { val: 'Kondisi_TT', w: 100 }),
      teks('Kondisi_FaceJari', { val: 'Kondisi_TT', w: 115 }), rp('Nilai_Taksir', { w: 125 }), cat('Catatan'),
    ],
  },
  {
    nama: SHEET.SERVIS, grup: 'transaksi', kolom: [
      id('ID_Servis'), tgl('Tgl_Masuk'), jam('Jam_Masuk'), tgl('Tgl_Selesai'), teks('Jenis', { val: 'Jenis_Servis', w: 90 }),
      teks('Pelaksana', { val: 'Pelaksana_Servis', w: 120 }), teks('Nama_Vendor', { w: 150 }), id('ID_Unit'),
      nama('Nama_Pelanggan', { w: 200 }), nama('Perangkat', { w: 240 }), { n: 'IMEI', t: 'imei' },
      cat('Keluhan'), cat('Tindakan'), rp('Estimasi_Biaya', { w: 130 }), rp('Biaya_Part'), rp('Biaya_Jasa_Teknisi', { w: 150 }),
      rp('Tarif_Pelanggan', { w: 130 }), F(rp('Laba_Servis')), status('Status', { val: 'Status_Servis' }),
      id('ID_Klaim'), teks('Dibuat_Oleh', { w: 90 }),
    ],
  },
  {
    nama: SHEET.GARANSI_RETUR, grup: 'transaksi', kolom: [
      id('ID_Klaim'), tgl('Tanggal'), jam('Jam'), id('ID_Penjualan'), id('ID_Unit'), F(nama('Nama_Barang', { w: 260 })),
      teks('Jenis', { val: 'Jenis_Klaim', w: 110 }), cat('Alasan'), F(status('Masih_Garansi', { w: 110 })),
      cat('Tindakan', { w: 220 }), rp('Nilai_Refund', { w: 120 }), id('Unit_Pengganti'), status('Status', { val: 'Status_Klaim' }),
      F(rp('Dampak_Laba', { w: 120 })),
    ],
  },
  {
    nama: SHEET.HUTANG_PIUTANG, grup: 'transaksi', kolom: [
      id('ID_Tagihan'), teks('Jenis', { val: 'Jenis_Tagihan', w: 130 }), id('ID_Referensi'), id('ID_Kontak'),
      F(nama('Nama', { w: 200 })), rp('Total'), F(rp('Terbayar')), F(rp('Sisa')), tgl('Jatuh_Tempo', { w: 115 }),
      F(angka('Hari_Telat', { w: 90 })), F(status('Status')),
    ],
  },
  {
    nama: SHEET.PEMBAYARAN, grup: 'transaksi', kolom: [
      id('ID_Bayar'), tgl('Tanggal'), jam('Jam'), id('ID_Hutang_Piutang', 150), F(nama('Nama', { w: 200 })), rp('Jumlah'),
      teks('Metode', { val: 'Metode_Bayar', w: 100 }), cat('Catatan', { w: 220 }), link('Link_Bukti'),
    ],
  },
  {
    nama: SHEET.BIAYA_OPERASIONAL, grup: 'transaksi', kolom: [
      id('ID_Biaya'), tgl('Tanggal'), teks('Kategori', { val: 'Kategori_Biaya', w: 110 }), rp('Nominal'),
      cat('Catatan'), link('Link_Bukti'),
    ],
  },
  {
    nama: SHEET.DASHBOARD, grup: 'laporan', kolom: [
      teks('Metrik', { w: 260 }), { n: 'Nilai', t: 'teks', w: 160 }, cat('Keterangan', { w: 360 }),
    ],
  },
  {
    nama: SHEET.LABA_BULANAN, grup: 'laporan', kolom: [
      teks('Bulan', { w: 90 }), angka('Jml_Unit_Terjual', { w: 120 }), rp('Omzet', { w: 135 }), rp('HPP', { w: 135 }),
      rp('Laba_Kotor_HP', { w: 135 }), rp('Laba_Aksesoris', { w: 135 }), rp('Laba_Servis', { w: 125 }),
      rp('Biaya_Bonus', { w: 120 }), rp('Biaya_Garansi', { w: 120 }), rp('Pembalikan_Retur', { w: 130 }),
      rp('Kerugian_Refund', { w: 125 }), rp('Kerugian_Rusak', { w: 125 }), rp('Biaya_Operasional', { w: 140 }),
      rp('Laba_Bersih', { w: 140 }), { n: 'Margin_Persen', t: 'persen1' }, rp('Selisih_Bulan_Lalu', { w: 150 }),
      status('Terkunci', { val: 'Ya_Tidak', w: 80 }),
    ],
  },
  {
    nama: SHEET.PENGATURAN, grup: 'sistem', kolom: [
      teks('Kunci', { w: 230, kunci: true }), { n: 'Nilai', t: 'cat', w: 380 }, cat('Keterangan', { w: 360 }),
    ],
  },
  {
    nama: SHEET.REFERENSI, grup: 'sistem', kolom: [
      teks('Kelompok', { w: 190 }), teks('Nilai', { w: 200 }), angka('Urutan', { w: 70 }),
    ],
  },
  {
    nama: SHEET.LOG_AKTIVITAS, grup: 'sistem', baris: 5000, proteksiPenuh: true, kolom: [
      tgl('Tanggal'), jam('Jam'), teks('Aksi', { w: 80 }), teks('Sheet', { w: 150 }), id('ID_Data', 150),
      cat('Ringkasan', { w: 520 }),
    ],
  },
  {
    nama: SHEET.BERKAS_FOTO, grup: 'sistem', baris: 2000, kolom: [
      id('ID_Berkas'), tgl('Tanggal'), jam('Jam'), teks('Jenis_Referensi', { val: 'Jenis_Referensi_Berkas', w: 120 }),
      id('ID_Referensi', 150), teks('Posisi_atau_Tahap', { w: 140 }), angka('Urutan', { w: 65 }),
      nama('Nama_Berkas', { w: 480 }), teks('ID_File_Drive', { w: 260 }), link('Link'), angka('Ukuran_KB', { w: 90 }),
      status('Status', { val: 'Status_Berkas' }),
    ],
  },
];

/** Nama kolom per sheet (urutan sama dengan skema) */
export const HEADER: Record<string, string[]> = Object.fromEntries(SKEMA.map(l => [l.nama, l.kolom.map(k => k.n)]));

const PETA: Record<string, Record<string, Kolom>> = Object.fromEntries(
  SKEMA.map(l => [l.nama, Object.fromEntries(l.kolom.map(k => [k.n, k]))]),
);

export function kolomSkema(sheet: string, kolom: string): Kolom | undefined {
  return PETA[sheet]?.[kolom];
}

export function lembarSkema(sheet: string): Lembar | undefined {
  return SKEMA.find(l => l.nama === sheet);
}

// ── Format angka/tanggal Spreadsheet ──────────────────────────────────────────

export const FORMAT: Record<TipeKolom, string> = {
  id: '@', teks: '@', nama: '@', cat: '@', angka: '#,##0', rp: '"Rp "#,##0;[Red]-"Rp "#,##0',
  persen: '0"%"', persen1: '0.0"%"', tgl: 'dd MMM yyyy', jam: '@', imei: '@', wa: '@', link: '@', status: '@',
};

/** Tipe yang disimpan sebagai angka sungguhan */
export const TIPE_ANGKA: ReadonlySet<TipeKolom> = new Set(['angka', 'rp', 'persen', 'persen1']);
/** Tipe yang disimpan sebagai teks murni */
export const TIPE_TEKS: ReadonlySet<TipeKolom> = new Set(['id', 'teks', 'nama', 'cat', 'jam', 'imei', 'wa', 'link', 'status']);

// ── Warna status (PRD 01 prinsip 5) ───────────────────────────────────────────

export const WARNA_STATUS = {
  hijau: { bg: '#DDF3E4', fg: '#14532D', nilai: ['Ready', 'Lunas', 'Aman', 'Aktif', 'Selesai', 'Diambil', 'Ya'] },
  kuning: { bg: '#FFF1C2', fg: '#7A5B00', nilai: ['Servis', 'Sebagian', 'Menipis', 'Dipesan', 'Dikerjakan', 'Antri', 'Diproses', 'Dibuka', 'Belum', 'Draft'] },
  merah: { bg: '#FBD5D5', fg: '#8B1A1A', nilai: ['Telat', 'Rusak', 'Habis', 'Gagal', 'Ditolak'] },
  abu: { bg: '#E5E7EB', fg: '#4B5563', nilai: ['Terjual', 'Batal', 'Terhapus', 'Retur', 'Tidak'] },
} as const;

// ── Isi dropdown (Referensi) ──────────────────────────────────────────────────

export const DATA_REFERENSI: Array<[string, string[]]> = [
  ['Jenis_Produk', ['HP', 'Aksesoris']],
  ['Platform', ['iPhone', 'Android']],
  ['Merek', ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Infinix', 'Tecno', 'Itel', 'Poco', 'Huawei', 'Asus', 'Lainnya']],
  ['Aktif_Produk', ['Ya', 'Tidak']],
  ['Kondisi', ['Baru', 'Bekas']],
  ['Grade', ['A', 'B', 'C']],
  ['Kelengkapan', ['Fullset', 'Unit saja', 'Tanpa dus']],
  ['Bebas_Kunci_Akun', ['Ya', 'Tidak', 'Belum dicek']],
  ['Sumber_Unit', ['Pembelian', 'Tukar Tambah', 'Beli Putus']],
  ['Status_Unit', ['Ready', 'Dipesan', 'Servis', 'Terjual', 'Retur', 'Rusak']],
  ['Metode_Bayar', ['Tunai', 'Transfer', 'QRIS', 'Cicilan', 'Tempo']],
  ['Status_Bayar', ['Lunas', 'Sebagian', 'Belum']],
  ['Status_Dokumen', ['Aktif', 'Batal']],
  ['Status_Penjualan', ['Aktif', 'Batal', 'Draft', 'Gagal']],
  ['Tipe_Item_Jual', ['HP', 'Aksesoris', 'Bonus']],
  ['Tipe_Kontak', ['Supplier', 'Pelanggan', 'Keduanya']],
  ['Jenis_Servis', ['Internal', 'Pelanggan']],
  ['Pelaksana_Servis', ['Teknisi sendiri', 'Vendor luar']],
  ['Status_Servis', ['Antri', 'Dikerjakan', 'Selesai', 'Diambil', 'Batal']],
  ['Jenis_Klaim', ['Klaim garansi', 'Retur', 'Refund', 'Tukar unit']],
  ['Status_Klaim', ['Dibuka', 'Diproses', 'Selesai', 'Ditolak']],
  ['Jenis_Tagihan', ['Piutang pelanggan', 'Hutang supplier']],
  ['Kategori_Biaya', ['Sewa', 'Listrik', 'Internet', 'Gaji', 'Transport', 'Iklan', 'Lainnya']],
  ['Kategori_Aksesoris', ['Casing', 'Charger', 'Kabel', 'Pelindung layar', 'Lainnya']],
  ['Kondisi_TT', ['Baik', 'Cacat']],
  ['Jenis_Referensi_Berkas', ['Unit', 'Servis', 'Pembelian', 'Pembayaran', 'Biaya', 'Klaim']],
  ['Status_Berkas', ['Aktif', 'Terhapus']],
  ['Ya_Tidak', ['Ya', 'Tidak']],
];

export function daftarReferensi(kelompok: string): string[] {
  return DATA_REFERENSI.find(([k]) => k === kelompok)?.[1] ?? [];
}

/** Versi skema; naikkan setiap kali kolom berubah (migrasi: PRD 06 bagian 7) */
export const VERSI_SKEMA = 3;
