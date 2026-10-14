// Code.ts — pintu masuk backend. Semua fungsi `export` di berkas ini otomatis dibuat
// global (bisa dipanggil google.script.run dan trigger) oleh skrip build (scripts/gas-wrappers.mjs).
// Fungsi yang tidak boleh dipanggil dari browser tidak diekspor dari sini.

import { FAVICON_DATA_URI } from './Favicon';
import { log } from './Log';
import { Db } from './Db';
import { IDEM_TTL_S, SHEET } from './Config';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { tglId, jamId } from './Utils';
import { cariStok as _cariStok, getUnit as _getUnit, FilterStok } from './StokService';
import { simpanPembelian as _simpanPembelian, PembelianInput } from './PembelianService';
import { simpanPenjualan as _simpanPenjualan, batalkanTransaksi as _batalkanTransaksi, PenjualanInput } from './PenjualanService';
import { terimaPembayaran as _terimaPembayaran } from './TagihanService';
import { unggahFoto as _unggahFoto, hapusFoto as _hapusFoto, UnggahFotoInput } from './FotoService';
import { getSemuaData as _getSemuaData } from './DataService';
import { simpanKontak as _simpanKontak, simpanProduk as _simpanProduk, KontakInput, ProdukInput } from './MasterService';
import {
  jalankanBackupHarian, jalankanBackupBulanan, jalankanBackupMingguan, jalankanCekTagihan, jalankanBersihkan,
  jalankanBackupPraRilis, daftarBackupTersedia, jalankanPemulihan,
} from './Jobs';
import { simpanServis as _simpanServis, kirimKeServis as _kirimKeServis, updateStatusServis as _updateStatusServis, ServisInput, SelesaiServisInput } from './ServisService';
import { cekGaransi as _cekGaransi, simpanKlaim as _simpanKlaim, updateStatusKlaim as _updateStatusKlaim, KlaimInput } from './GaransiService';
import { simpanBiaya as _simpanBiaya, BiayaInput } from './BiayaService';
import { buatNota as _buatNota, ambilNota as _ambilNota, terapkanTautanNota } from './Nota';
import { getLaporanBulanan as _getLaporanBulanan, getLaporanLayar as _getLaporanLayar, buatLaporanPdf as _buatLaporanPdf, kunciBulan as _kunciBulan, jalankanLaporanBulanan } from './Laporan';
import { daftarFoto, JenisReferensi } from './FotoService';
import { ubahStatusUnit as _ubahStatusUnit } from './StokService';
import { jalankanCekKonsistensi } from './Konsistensi';
import { bacaPengaturan, PENGATURAN_BAWAAN } from './Pengaturan';

// ── Respons standar ───────────────────────────────────────────────────────────

export type Respons<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; kode: string; pesan: string };

function ok<T>(data: T): Respons<T> {
  return { ok: true, data };
}

function gagal(kode: string, pesan: string): { ok: false; kode: string; pesan: string } {
  return { ok: false, kode, pesan };
}

/** Ubah galat apa pun menjadi respons. Galat bisnis membawa kodenya; sisanya ERROR_SISTEM dan dicatat. */
function keRespons(e: unknown): { ok: false; kode: string; pesan: string } {
  if (e instanceof GalatBisnis) return gagal(e.kode, e.message);
  const pesan = e instanceof Error ? e.message : String(e);
  log('Sistem', 'Code', 'ERROR', pesan);
  return gagal('ERROR_SISTEM', `Terjadi kesalahan di server: ${pesan}`);
}

function tangani<T>(fn: () => T): Respons<T> {
  try {
    return ok(fn());
  } catch (e) {
    return keRespons(e);
  }
}

// ── Kunci anti-ganda (idemKey) ────────────────────────────────────────────────
// Catatan: disimpan di CacheService (10 menit). Cache bisa hilang sewaktu-waktu, jadi ini
// pengaman utama terhadap ketukan ganda/koneksi putus-sambung, bukan jaminan mutlak.

function cekIdem(idemKey?: string): Respons | null {
  if (!idemKey) return null;
  const existing = CacheService.getScriptCache().get('idem_' + idemKey);
  return existing ? (JSON.parse(existing) as Respons) : null;
}

function simpanIdem(idemKey: string | undefined, hasil: Respons): void {
  if (!idemKey || !hasil.ok) return; // hanya hasil sukses yang diingat; gagal boleh dicoba lagi
  CacheService.getScriptCache().put('idem_' + idemKey, JSON.stringify(hasil), IDEM_TTL_S);
}

/** Jalankan fungsi tulis: satu kunci, cek idemKey di dalam kunci, simpan hasil sukses. */
function tulis<T>(idemKey: string | undefined, fn: () => T): Respons<T> {
  try {
    return denganLock(() => {
      const cached = cekIdem(idemKey);
      if (cached) return cached as Respons<T>;
      const hasil = tangani(fn);
      simpanIdem(idemKey, hasil);
      return hasil;
    });
  } catch (e) {
    return keRespons(e);
  }
}

// ── doGet ─────────────────────────────────────────────────────────────────────

export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  const out = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Epic Phone')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  // Ikon tab browser = logo Epic Phone. Tag <link rel=icon> di dalam halaman diabaikan oleh Apps Script
  // (halaman tampil di iframe), jadi harus lewat setFaviconUrl. Kegagalan di sini tidak boleh merusak aplikasi.
  try { out.setFaviconUrl(FAVICON_DATA_URI); } catch { /* tanpa ikon khusus */ }
  return out;
}

// ── Baca ──────────────────────────────────────────────────────────────────────

/** Semua daftar untuk layar dalam satu panggilan (stok, aksesoris, transaksi, tagihan, kontak, katalog). */
export function getSemuaData(): Respons {
  return tangani(() => _getSemuaData());
}

/** Cari stok HP. Hasil: { items, total, halaman, ukuran } (maks 50 per halaman). */
export function cariStok(query?: string, filterJson?: string, halaman?: number): Respons {
  return tangani(() => {
    const filter: FilterStok = filterJson ? JSON.parse(filterJson) : {};
    return _cariStok(query || '', filter, halaman || 1);
  });
}

export function getUnit(idUnit: string): Respons {
  return tangani(() => {
    const unit = _getUnit(idUnit);
    if (!unit) throw new GalatBisnis('UNIT_TIDAK_ADA', `Unit ${idUnit} tidak ditemukan.`);
    return unit;
  });
}

// ── Tulis transaksi ───────────────────────────────────────────────────────────

export function simpanPembelian(dataInput: PembelianInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanPembelian(dataInput));
}

export function simpanPenjualan(dataInput: PenjualanInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanPenjualan(dataInput));
}

export function batalkanTransaksi(idTransaksi: string, alasan: string, catatan?: string, idemKey?: string): Respons {
  return tulis(idemKey, () => _batalkanTransaksi(idTransaksi, alasan, catatan || ''));
}

export function terimaPembayaran(idTagihan: string, jumlah: number, metode: string, catatan?: string, idemKey?: string): Respons {
  return tulis(idemKey, () => _terimaPembayaran(idTagihan, jumlah, metode, catatan || ''));
}

// ── Data master ───────────────────────────────────────────────────────────────

export function simpanKontak(dataInput: KontakInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanKontak(dataInput));
}

export function simpanProduk(dataInput: ProdukInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanProduk(dataInput));
}

// ── Servis, garansi, biaya, nota, laporan ─────────────────────────────────────

export function simpanServis(dataInput: ServisInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanServis(dataInput));
}

export function kirimKeServis(idUnit: string, dataInput: { keluhan: string; estimasiBiaya?: number; pelaksana?: 'Teknisi sendiri' | 'Vendor luar'; namaVendor?: string }, idemKey?: string): Respons {
  return tulis(idemKey, () => _kirimKeServis(idUnit, dataInput));
}

export function updateStatusServis(idServis: string, status: string, opsi?: SelesaiServisInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _updateStatusServis(idServis, status, opsi || {}));
}

export function ubahStatusUnit(idUnit: string, status: string, idemKey?: string): Respons {
  return tulis(idemKey, () => _ubahStatusUnit(idUnit, status));
}

/** Cari nota/IMEI dan hitung status garansi */
export function cekGaransi(query: string): Respons {
  return tangani(() => _cekGaransi(query));
}

export function simpanKlaim(dataInput: KlaimInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanKlaim(dataInput));
}

export function updateStatusKlaim(idKlaim: string, status: string, idemKey?: string): Respons {
  return tulis(idemKey, () => _updateStatusKlaim(idKlaim, status));
}

export function simpanBiaya(dataInput: BiayaInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _simpanBiaya(dataInput));
}

/** Buat (atau buat ulang) nota PDF. Gagal membuat nota tidak membatalkan penjualan: tampil tombol Buat Ulang Nota. */
export function buatNota(idPenjualan: string): Respons {
  return tulis(undefined, () => _buatNota(idPenjualan));
}

/** Buka nota yang sudah ada (dari Riwayat) tanpa membuat versi baru; dibuat bila belum ada */
export function ambilNota(idPenjualan: string): Respons {
  return tulis(undefined, () => _ambilNota(idPenjualan));
}

export function getLaporanBulanan(bulan: string): Respons {
  return tangani(() => _getLaporanBulanan(bulan));
}

/** Semua angka layar Laporan. periode: hari-ini | 7-hari | bulan-ini | bulan-lalu | YYYY-MM */
export function getLaporanLayar(periode: string): Respons {
  return tangani(() => _getLaporanLayar(periode));
}

/** PDF laporan satu bulan (disimpan di 06_LAPORAN) */
export function buatLaporanPdf(bulan: string): Respons {
  return tangani(() => _buatLaporanPdf(bulan));
}

export function kunciBulan(bulan: string): Respons {
  return tangani(() => _kunciBulan(bulan));
}

export function getPaketBonus(): Respons {
  return tangani(() => {
    const p = Db.findById(SHEET.PENGATURAN, 'PAKET_BONUS');
    try { return p ? JSON.parse(String(p.Nilai)) : []; } catch { throw new GalatBisnis('PAKET_BONUS_RUSAK', 'Pengaturan PAKET_BONUS bukan JSON yang valid.'); }
  });
}

/** Foto aktif suatu referensi lengkap dengan gambar kecil (data URI) untuk galeri */
export function getFotoReferensi(jenis: JenisReferensi, idReferensi: string): Respons {
  return tangani(() => daftarFoto(jenis, idReferensi));
}

// ── Foto unit & bukti (PRD 09) ────────────────────────────────────────────────

export function unggahFoto(dataInput: UnggahFotoInput, idemKey?: string): Respons {
  return tulis(idemKey, () => _unggahFoto(dataInput));
}

export function hapusFoto(idBerkas: string): Respons {
  return tulis(undefined, () => {
    if (!_hapusFoto(idBerkas)) throw new GalatBisnis('BERKAS_TIDAK_ADA', `Berkas ${idBerkas} tidak ditemukan.`);
    return 'Foto dipindahkan ke _TERHAPUS';
  });
}

// ── Pengaturan ────────────────────────────────────────────────────────────────

export function getPengaturan(): Respons {
  return tangani(() => {
    const rows = Db.getAll(SHEET.PENGATURAN);
    return Object.fromEntries(rows.map(r => [String(r['Kunci']), r['Nilai']]));
  });
}

/** Cek Konsistensi (PRD 05 bagian 7): selisih antara angka tersimpan dan hitungan ulang */
export function cekKonsistensi(): Respons {
  return tangani(() => jalankanCekKonsistensi());
}

/** Backup database sekarang juga (selain jadwal harian). Salinan diverifikasi sebelum dianggap berhasil. */
export function backupSekarang(): Respons {
  return tangani(() => {
    jalankanBackupHarian();
    return { pesan: 'Backup selesai dan terverifikasi.' };
  });
}

/** Catatan aktivitas terbaru (terbaru dulu) untuk layar Pengaturan */
export function getLogTerbaru(jumlah?: number): Respons {
  return tangani(() => {
    const n = Math.min(Math.max(Math.floor(Number(jumlah) || 100), 1), 500);
    return Db.getAll(SHEET.LOG_AKTIVITAS).slice(-n).reverse().map(l => ({
      tanggal: tglId(l.Tanggal), jam: jamId(l.Jam), aksi: String(l.Aksi), sheet: String(l.Sheet), id: String(l.ID_Data), ringkasan: String(l.Ringkasan),
    }));
  });
}

/** Salinan backup yang tersedia (terbaru dulu, maksimal 15) untuk layar Pengaturan */
export function getDaftarBackup(): Respons {
  return tangani(() => daftarBackupTersedia().slice(0, 15));
}

/** Kondisi sistem yang nyata: trigger terpasang, pemakaian Drive, versi skema, jumlah baris data utama */
export function getStatusSistem(): Respons {
  return tangani(() => {
    const harapan = ['jobBackupHarian', 'jobBackupBulanan', 'jobLaporanBulanan', 'jobBersihkan', 'jobBackupMingguan', 'jobCekTagihan'];
    const terpasang = new Set(ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()));
    const p = bacaPengaturan();
    const baris: Record<string, number> = {};
    [SHEET.STOK_HP, SHEET.PENJUALAN, SHEET.PEMBELIAN, SHEET.PEMBAYARAN, SHEET.SERVIS].forEach(n => { baris[n] = Db.getAll(n).length; });
    return {
      trigger: { aktif: harapan.filter(h => terpasang.has(h)).length, total: harapan.length, hilang: harapan.filter(h => !terpasang.has(h)) },
      drive: { terpakaiGB: Math.round((DriveApp.getStorageUsed() / 1073741824) * 10) / 10, batasGB: Math.round((DriveApp.getStorageLimit() / 1073741824) * 10) / 10 },
      versi: p.VERSI || '', versiSkema: p.VERSI_SKEMA || '', baris,
    };
  });
}

export function simpanPengaturan(data: Record<string, string>): Respons {
  return tulis(undefined, () => {
    Object.keys(data).forEach(kunci => {
      if (kunci === 'PAKET_BONUS') {
        try { JSON.parse(String(data[kunci])); } catch { throw new GalatBisnis('PAKET_BONUS_RUSAK', 'PAKET_BONUS harus berupa JSON yang valid.'); }
      }
      if (!Db.updateById(SHEET.PENGATURAN, kunci, { Nilai: data[kunci] })) {
        // Kunci baku yang belum ada di sheet lama ditambahkan; kunci asing ditolak
        if (!(kunci in PENGATURAN_BAWAAN)) throw new GalatBisnis('PENGATURAN_TIDAK_DIKENAL', `Pengaturan "${kunci}" tidak dikenal.`);
        Db.append(SHEET.PENGATURAN, { Kunci: kunci, Nilai: data[kunci], Keterangan: '' });
      }
    });
    // Tautan nota mengikuti pengaturan: dimatikan = semua nota lama kembali privat (PRD 06 bagian 3.3)
    if (data.NOTA_LINK_PUBLIK !== undefined) terapkanTautanNota(data.NOTA_LINK_PUBLIK !== 'Tidak');
    return 'Pengaturan disimpan.';
  });
}

// ── Pekerjaan terjadwal (dipasang trigger oleh setupAwal) ─────────────────────

export function jobBackupHarian(): void { jalankanBackupHarian(); }
export function jobBackupBulanan(): void { jalankanBackupBulanan(); }
export function jobBackupMingguan(): void { jalankanBackupMingguan(); }
export function jobLaporanBulanan(): void {
  try { jalankanLaporanBulanan(); } catch (e) { log('Sistem', 'Jobs', 'jobLaporanBulanan', 'GAGAL: ' + (e instanceof Error ? e.message : String(e))); throw e; }
}
export function jobCekTagihan(): void {
  jalankanCekTagihan();
  // Cek Konsistensi harian: selisih dicatat di log dan tampil di Pengaturan
  try {
    const h = jalankanCekKonsistensi();
    log('Sistem', 'Jobs', 'jobCekKonsistensi', h.ok ? 'Tidak ada selisih.' : `${h.selisih.length} selisih: ${h.selisih.slice(0, 3).map(x => `${x.kode} ${x.id}`).join(', ')}`);
  } catch (e) {
    log('Sistem', 'Jobs', 'jobCekKonsistensi', 'GAGAL: ' + (e instanceof Error ? e.message : String(e)));
  }
}
export function jobBersihkan(): void { jalankanBersihkan(); }

// ── Pemeliharaan (dijalankan manual dari editor Apps Script) ──────────────────

/** Jalankan sebelum rilis kode baru. Versi dibaca dari Pengaturan (VERSI). */
export function backupPraRilis(): void {
  const v = Db.findById(SHEET.PENGATURAN, 'VERSI');
  jalankanBackupPraRilis(v ? String(v.Nilai) : '0.0.0');
}

/** Lihat daftar backup yang tersedia di log editor, terbaru dulu */
export function daftarBackup(): void {
  daftarBackupTersedia().forEach(b => Logger.log(`${b.tanggal}  ${b.jenis}  ${b.nama}  id=${b.id}`));
}

/**
 * Pulihkan database dari backup. Langkah: (1) jalankan daftarBackup() dan salin id backup,
 * (2) isi Properti Skrip PULIH_ID_BACKUP dengan id itu dan PULIH_KONFIRMASI=YA, (3) jalankan fungsi ini.
 */
export function pulihkanDariBackup(): void {
  const p = PropertiesService.getScriptProperties();
  const hasil = jalankanPemulihan(String(p.getProperty('PULIH_ID_BACKUP') || ''), String(p.getProperty('PULIH_KONFIRMASI') || ''));
  p.deleteProperty('PULIH_KONFIRMASI');
  Logger.log(hasil);
}
